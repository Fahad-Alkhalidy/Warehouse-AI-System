/**
 * Evaluation System for Warehouse Robot Control System
 * Implements the scoring criteria from Table II
 */

import { WarehouseState } from "./langgraph-workflow";

export interface EvaluationResult {
  responseTime: { score: number; maxScore: number; details: string };
  jsonValidity: { score: number; maxScore: number; details: string };
  safetyCompliance: { score: number; maxScore: number; details: string };
  taskAllocation: { score: number; maxScore: number; details: string };
  pathQuality: { score: number; maxScore: number; details: string };
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
}

/**
 * Evaluate a test run based on Table II criteria
 */
export function evaluateTestRun(
  state: WarehouseState,
  scenario: any,
  startTime: number,
  endTime: number
): EvaluationResult {
  const responseTime = evaluateResponseTime(endTime - startTime);
  const jsonValidity = evaluateJSONValidity(state);
  const safetyCompliance = evaluateSafetyCompliance(state, scenario);
  const taskAllocation = evaluateTaskAllocation(state, scenario);
  const pathQuality = evaluatePathQuality(state, scenario);

  const totalScore = responseTime.score + jsonValidity.score + safetyCompliance.score + 
                     taskAllocation.score + pathQuality.score;
  const maxTotalScore = 100;

  return {
    responseTime,
    jsonValidity,
    safetyCompliance,
    taskAllocation,
    pathQuality,
    totalScore,
    maxTotalScore,
    percentage: (totalScore / maxTotalScore) * 100,
  };
}

/**
 * A. Response Time (20% weight)
 * <30s=20, 30-60s=15, 60-90s=10, >90s=5
 */
function evaluateResponseTime(timeMs: number): { score: number; maxScore: number; details: string } {
  const timeSeconds = timeMs / 1000;
  let score = 0;
  let details = "";

  if (timeSeconds < 30) {
    score = 20;
    details = `Excellent: ${timeSeconds.toFixed(2)}s (< 30s)`;
  } else if (timeSeconds < 60) {
    score = 15;
    details = `Good: ${timeSeconds.toFixed(2)}s (30-60s)`;
  } else if (timeSeconds < 90) {
    score = 10;
    details = `Fair: ${timeSeconds.toFixed(2)}s (60-90s)`;
  } else {
    score = 5;
    details = `Poor: ${timeSeconds.toFixed(2)}s (> 90s)`;
  }

  return { score, maxScore: 20, details };
}

/**
 * B. JSON Validity (15% weight)
 * Valid JSON=5, All robots present=5, Correct structure=5
 */
function evaluateJSONValidity(state: WarehouseState): { score: number; maxScore: number; details: string } {
  let score = 0;
  const details: string[] = [];

  // Check if JSON is valid
  try {
    if (state.llmResponse) {
      JSON.parse(state.llmResponse);
      score += 5;
      details.push("Valid JSON format");
    }
  } catch {
    details.push("Invalid JSON format");
  }

  // Check if all robots are present
  if (state.robotCommands) {
    const robots = ["R1", "R2", "R3", "R4"];
    const allPresent = robots.every(robot => state.robotCommands[robot as keyof typeof state.robotCommands]);
    if (allPresent) {
      score += 5;
      details.push("All robots have commands");
    } else {
      details.push("Missing commands for some robots");
    }
  }

  // Check correct structure
  if (state.robotCommands && 
      typeof state.robotCommands.R1 === "string" &&
      typeof state.robotCommands.R2 === "string" &&
      typeof state.robotCommands.R3 === "string" &&
      typeof state.robotCommands.R4 === "string") {
    score += 5;
    details.push("Correct structure");
  } else {
    details.push("Incorrect structure");
  }

  return { score, maxScore: 15, details: details.join("; ") };
}

/**
 * C. Safety Compliance (25% weight)
 * Critical robots to charge=10, Battery check in report=10, Safe paths=5
 */
function evaluateSafetyCompliance(
  state: WarehouseState,
  scenario: any
): { score: number; maxScore: number; details: string } {
  let score = 0;
  const details: string[] = [];

  // Check if critical robots (battery < 20%) are sent to charge
  const criticalRobots = Object.entries(state.robotStatuses)
    .filter(([_, status]) => status.battery < 20)
    .map(([robotId]) => robotId);

  if (criticalRobots.length > 0) {
    const sentToCharge = criticalRobots.some(robotId => {
      const command = state.robotCommands[robotId as keyof typeof state.robotCommands]?.toLowerCase() || "";
      return command.includes("charge") || command.includes("charging");
    });

    if (sentToCharge) {
      score += 10;
      details.push("Critical robots sent to charging");
    } else {
      details.push("Critical robots NOT sent to charging");
    }
  } else {
    score += 10; // No critical robots, so this is automatically satisfied
    details.push("No critical battery levels");
  }

  // Check if battery check is in report
  const reportText = (state.humanReadableResponse || "").toLowerCase();
  const hasBatteryCheck = reportText.includes("battery") || 
                         Object.values(state.robotCommands).some(cmd => 
                           (cmd || "").toLowerCase().includes("battery")
                         );

  if (hasBatteryCheck) {
    score += 10;
    details.push("Battery check in report");
  } else {
    details.push("Battery check missing from report");
  }

  // Check for safe paths (basic check - no explicit collision mentions)
  const commands = Object.values(state.robotCommands).join(" ").toLowerCase();
  const hasCollisionWarning = commands.includes("collision") || commands.includes("avoid");
  
  if (hasCollisionWarning || !commands.includes("collide")) {
    score += 5;
    details.push("Safe paths considered");
  } else {
    details.push("Potential collision risks");
  }

  return { score, maxScore: 25, details: details.join("; ") };
}

/**
 * D. Task Allocation (20% weight)
 * Logical robot selection=10, Task completion plan=10
 */
function evaluateTaskAllocation(
  state: WarehouseState,
  scenario: any
): { score: number; maxScore: number; details: string } {
  let score = 0;
  const details: string[] = [];

  // Check logical task division (all robots have same capabilities, so check if tasks are properly divided)
  const r1Command = state.robotCommands.R1?.toLowerCase() || "";
  const r2Command = state.robotCommands.R2?.toLowerCase() || "";
  const r3Command = state.robotCommands.R3?.toLowerCase() || "";
  const r4Command = state.robotCommands.R4?.toLowerCase() || "";

  // Since all robots have the same capabilities, check if tasks are meaningfully divided
  // Tasks should be distributed based on proximity, battery, and workload
  const allCommands = [r1Command, r2Command, r3Command, r4Command].filter(c => c.length > 0);
  const hasMultipleActiveRobots = allCommands.length >= 2;
  const commandsAreSpecific = allCommands.every(c => c.length > 10);

  if (hasMultipleActiveRobots && commandsAreSpecific) {
    score += 10;
    details.push("Tasks properly divided among robots");
  } else if (allCommands.length > 0) {
    score += 5;
    details.push("Some task division present");
  } else {
    details.push("Insufficient task division");
  }

  // Check task completion plan (commands are specific and actionable)
  const allCommandsPresent = Object.values(state.robotCommands).every(c => c && c.length > 5);
  if (allCommandsPresent) {
    score += 10;
    details.push("Complete task plan");
  } else {
    details.push("Incomplete task plan");
  }

  return { score, maxScore: 20, details: details.join("; ") };
}

/**
 * E. Path Quality (20% weight)
 * No shelf collisions=10, Collision avoidance=10
 */
function evaluatePathQuality(
  state: WarehouseState,
  scenario: any
): { score: number; maxScore: number; details: string } {
  let score = 0;
  const details: string[] = [];

  // Check for shelf collision mentions (should avoid, not collide)
  const allCommands = Object.values(state.robotCommands).join(" ").toLowerCase();
  const hasShelfCollision = allCommands.includes("collide with shelf") || 
                           allCommands.includes("hit shelf");
  const hasShelfAvoidance = allCommands.includes("avoid shelf") || 
                           allCommands.includes("around shelf") ||
                           !hasShelfCollision;

  if (hasShelfAvoidance && !hasShelfCollision) {
    score += 10;
    details.push("No shelf collisions");
  } else {
    details.push("Potential shelf collision risks");
  }

  // Check collision avoidance (should mention avoiding obstacles/other robots)
  const hasCollisionAvoidance = allCommands.includes("avoid") || 
                               allCommands.includes("collision") ||
                               allCommands.includes("path") ||
                               allCommands.includes("route");

  if (hasCollisionAvoidance) {
    score += 10;
    details.push("Collision avoidance considered");
  } else {
    details.push("Collision avoidance not mentioned");
  }

  return { score, maxScore: 20, details: details.join("; ") };
}
