/**
 * LangGraph-based Agentic Warehouse Robot Control System
 * Implements a cyclic workflow with 5 nodes for robot orchestration
 */

// Custom StateGraph implementation for Next.js compatibility
// Simplified version that mimics LangGraph behavior

// State structure for the graph
export interface WarehouseState {
  // Node 1: Natural language command
  userCommand: string;
  
  // Node 2: Robot statuses (4 robots: R1, R2, R3, R4)
  robotStatuses: {
    R1: { position: { row: number; col: number }; battery: number; status: string };
    R2: { position: { row: number; col: number }; battery: number; status: string };
    R3: { position: { row: number; col: number }; battery: number; status: string };
    R4: { position: { row: number; col: number }; battery: number; status: string };
  };
  sensorData?: any;
  
  // Node 3: LLM response
  llmPrompt: string;
  llmResponse: string;
  robotCommands: {
    R1: string;
    R2: string;
    R3: string;
    R4: string;
  };
  humanReadableResponse: string;
  
  // Node 4: Broken down commands (stored for execution)
  executedCommands: Array<{
    robotId: string;
    command: string;
    timestamp: Date;
  }>;
  
  // Node 5: Operator interface message
  operatorMessage: string;
  
  // Control flow
  iteration: number;
  shouldContinue: boolean;
  taskComplete: boolean;
  
  // Environment representation (18x16 matrix)
  environmentMatrix: string[][];
  
  // Evaluation metrics
  evaluationMetrics?: {
    responseTime: number;
    jsonValidity: number;
    safetyCompliance: number;
    taskAllocation: number;
    pathQuality: number;
    totalScore: number;
  };
}

// Node 1: Process Natural Language Commands
export async function processUserCommand(state: WarehouseState): Promise<Partial<WarehouseState>> {
  console.log(`[Node 1] Processing user command: ${state.userCommand}`);
  
  return {
    userCommand: state.userCommand,
    iteration: (state.iteration || 0) + 1,
  };
}

// Node 2: Query Robot Statuses (4 robots for navigation tasks)
export async function queryRobotStatus(state: WarehouseState): Promise<Partial<WarehouseState>> {
  console.log("[Node 2] Querying robot statuses");
  
  // Use robot statuses from state (set from test scenario)
  // If not set, use defaults - all robots start at 100% battery and working status
  // R4 moved from (15,0) which is in charging area to (13,0) which is a path
  const robotStatuses = state.robotStatuses || {
    R1: { position: { row: 0, col: 0 }, battery: 100, status: "working" },
    R2: { position: { row: 15, col: 17 }, battery: 100, status: "working" },
    R3: { position: { row: 14, col: 16 }, battery: 100, status: "working" },
    R4: { position: { row: 13, col: 0 }, battery: 100, status: "working" }, // Moved from charging area to path
  };
  
  return {
    robotStatuses,
  };
}

// Node 3: LLM Node - Build prompt and call LLM
export async function llmReasoningNode(
  state: WarehouseState,
  llmProvider: any,
  model: string
): Promise<Partial<WarehouseState>> {
  console.log("[Node 3] Building prompt and calling LLM");
  
  const startTime = Date.now();
  
  // Build structured prompt with 6 sections
  const prompt = buildStructuredPrompt(state);
  
  // Call LLM with the structured prompt
  // The LLM provider expects (prompt, environment, model)
  // Pass the FULL scenario data as JSON to the LLM
  const environmentData = {
    // Full scenario object as JSON
    scenario: state.sensorData || {},
    environmentMatrix: state.environmentMatrix,
    robotStatuses: state.robotStatuses,
    userCommand: state.userCommand, // Includes full scenario JSON
  };
  
  // Use the structured prompt as the main prompt
  const llmResponse = await llmProvider.generateTasks(
    prompt, // Use the full structured prompt
    environmentData,
    model
  );
  
  const responseTime = (Date.now() - startTime) / 1000; // in seconds
  
  // Parse LLM response to extract commands for each robot
  // The LLM response is already in RobotTasks format (R1, R2, R3, R4)
  const robotCommands = {
    R1: llmResponse.R1 || "",
    R2: llmResponse.R2 || "",
    R3: llmResponse.R3 || "",
    R4: llmResponse.R4 || "",
  };
  
  return {
    llmPrompt: prompt,
    llmResponse: JSON.stringify(llmResponse),
    robotCommands,
    humanReadableResponse: `Generated tasks for all robots. Response time: ${responseTime.toFixed(2)}s`,
    evaluationMetrics: {
      ...state.evaluationMetrics,
      responseTime,
    },
  };
}

// Node 4: Break down commands and send to robots
export async function executeCommands(state: WarehouseState): Promise<Partial<WarehouseState>> {
  console.log("[Node 4] Breaking down and executing commands");
  
  const executedCommands = [];
  
  for (const [robotId, command] of Object.entries(state.robotCommands)) {
    if (command) {
      executedCommands.push({
        robotId,
        command,
        timestamp: new Date(),
      });
    }
  }
  
  return {
    executedCommands,
  };
}

// Node 5: Broadcast human-readable response
export async function broadcastResponse(state: WarehouseState): Promise<Partial<WarehouseState>> {
  console.log("[Node 5] Broadcasting response to operator interface");
  
  const operatorMessage = state.humanReadableResponse || "Task completed successfully";
  
  return {
    operatorMessage,
  };
}

// Conditional edge: Check if should continue or end
export function shouldContinue(state: WarehouseState): string {
  if (state.taskComplete || (state.iteration || 0) >= 10) {
    return "end";
  }
  return "continue";
}

// Build structured prompt for navigation task allocation
function buildStructuredPrompt(state: WarehouseState): string {
  const envMatrix = formatEnvironmentMatrix(state.environmentMatrix);
  const robotStatus = formatRobotStatuses(state.robotStatuses);
  
  // Section 1: Role Definition
  const roleDefinition = `You are an intelligent warehouse task coordinator. Your objective is to divide the overall task among four mobile robots (R1, R2, R3, R4) that all have the same capabilities. Each robot can navigate, manipulate objects, sense the environment, and communicate.`;

  // Section 2: Environment Representation
  const environmentRepresentation = `The warehouse is represented as an 18x16 grid matrix (each cell = 1x1 meter):
${envMatrix}

Legend:
. = Path
S = Shelf (Obstacle)
C = Charging Area (270-273)
L = Loading Area (277-280)
U = Unloading Area (284-287)`;

  // Section 3: Robot Statuses
  const systemStateInput = `Current Robot Statuses:
${robotStatus}`;

  // Section 4: Operational Commands
  const operationalCommands = `Task Request: ${state.userCommand}`;

  // Section 5: Constraints & Rules
  const constraintsRules = `CRITICAL REQUIREMENTS:
1. ALL 4 ROBOTS (R1, R2, R3, R4) MUST receive tasks - do not leave any robot idle unless battery < 20%
2. Divide tasks intelligently: assign different parts of the overall task to different robots for parallel execution
3. Battery Safety: Robots with battery < 20% must go to charging stations (270-273)
4. Collision Avoidance: No collisions between robots or with shelves
5. Path Optimization: Use efficient A* or Dijkstra paths
6. Task Distribution: If there are multiple tasks, assign different tasks to different robots based on proximity
7. All robots must provide paths as [[row, col], ...] format in their task description
8. IMPORTANT: Keep paths SHORT - use only key waypoints (start, major turns, destination). Maximum 10-15 waypoints per path. Do NOT list every single cell.
9. All robots have the same capabilities - divide tasks based on proximity, battery, and workload
10. Example: If there are 3 tasks, assign them to R1, R2, R3, and give R4 a supporting/coordination task`;

  // Section 6: Output Format
  const outputFormat = `CRITICAL: You MUST assign tasks to ALL 4 robots (R1, R2, R3, R4). Do NOT leave any robot without a task.

You MUST respond with ONLY valid JSON using ROBOT IDs as keys:
{
  "R1": "task description for R1 robot with path: [[row, col], [row, col], ...]",
  "R2": "task description for R2 robot with path: [[row, col], [row, col], ...]", 
  "R3": "task description for R3 robot with path: [[row, col], [row, col], ...]",
  "R4": "task description for R4 robot with path: [[row, col], [row, col], ...]"
}

REQUIREMENTS:
- Keys MUST be: "R1", "R2", "R3", "R4" (all 4 required)
- ALL 4 robots MUST have non-empty task descriptions
- Each task must include:
  - Clear description of what the robot should do (not "remain idle" unless battery < 20%)
  - Path as array of [row, col] coordinates: path: [[row, col], [row, col], ...]
  - IMPORTANT: Use SHORT paths with only key waypoints (start, major turns, destination). Maximum 10-15 waypoints. Do NOT list every cell.
  - Destination coordinates
  - Actions: pickup, dropoff, charge, navigate, inspect, coordinate, etc.
  - Consider robot's current position and battery level
- If there are fewer tasks than robots, assign supporting roles (coordination, monitoring, backup) to remaining robots
- Divide the work: don't assign all tasks to one robot`;

  return `${roleDefinition}

${environmentRepresentation}

${systemStateInput}

${operationalCommands}

${constraintsRules}

${outputFormat}`;
}

// Format environment matrix as text
function formatEnvironmentMatrix(matrix: string[][]): string {
  if (!matrix || matrix.length === 0) {
    return "Environment matrix not provided";
  }
  
  let output = "\n";
  for (let y = 0; y < matrix[0].length; y++) {
    let row = "";
    for (let x = 0; x < matrix.length; x++) {
      row += (matrix[x]?.[y] || ".") + " ";
    }
    output += row.trim() + "\n";
  }
  return output;
}

// Format robot statuses
function formatRobotStatuses(statuses: WarehouseState["robotStatuses"]): string {
  return Object.entries(statuses)
    .map(([robotId, status]) => {
      return `- ${robotId}: Position (row: ${status.position.row}, col: ${status.position.col}), Battery: ${status.battery}%, Status: ${status.status}`;
    })
    .join("\n");
}

// Custom graph execution function
export async function executeWarehouseGraph(
  initialState: WarehouseState,
  llmProvider: any,
  model: string,
  maxIterations: number = 5
): Promise<WarehouseState> {
  let state: WarehouseState = {
    ...initialState,
    iteration: 0,
    taskComplete: false,
    shouldContinue: true,
    executedCommands: [],
  };

  // Execute the graph loop
  while (state.shouldContinue && (state.iteration || 0) < maxIterations && !state.taskComplete) {
    // Node 1: Process command
    const node1Result = await processUserCommand(state);
    state = { ...state, ...node1Result };

    // Node 2: Query status
    const node2Result = await queryRobotStatus(state);
    state = { ...state, ...node2Result };

    // Node 3: LLM reasoning
    const node3Result = await llmReasoningNode(state, llmProvider, model);
    state = { ...state, ...node3Result };

    // Node 4: Execute commands
    const node4Result = await executeCommands(state);
    state = { ...state, ...node4Result };

    // Node 5: Broadcast response
    const node5Result = await broadcastResponse(state);
    state = { ...state, ...node5Result };

    // Check if should continue
    const continueDecision = shouldContinue(state);
    if (continueDecision === "end") {
      state.shouldContinue = false;
      state.taskComplete = true;
    }
  }

  return state;
}
