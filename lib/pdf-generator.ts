/**
 * PDF Report Generator for Test Results
 */

import { jsPDF } from "jspdf";
import { EvaluationResult } from "./evaluation";
import { TestScenario } from "./test-scenarios";
import { WarehouseState } from "./langgraph-workflow";

export interface TestRunResult {
  scenario: TestScenario;
  state: WarehouseState;
  evaluation: EvaluationResult;
  startTime: number;
  endTime: number;
}

export interface TestReport {
  title: string;
  date: string;
  model: string;
  results: TestRunResult[];
  summary: {
    averageScore: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}

/**
 * Generate PDF report from test results
 */
export function generatePDFReport(report: TestReport): Buffer {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text(report.title, 105, yPos, { align: "center" });
  yPos += 10;

  // Date and Model
  doc.setFontSize(12);
  doc.text(`Date: ${report.date}`, 20, yPos);
  doc.text(`Model: ${report.model}`, 105, yPos);
  yPos += 15;

  // Summary
  doc.setFontSize(16);
  doc.text("Summary", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.text(`Total Tests: ${report.summary.totalTests}`, 20, yPos);
  yPos += 7;
  doc.text(`Passed Tests: ${report.summary.passedTests}`, 20, yPos);
  yPos += 7;
  doc.text(`Failed Tests: ${report.summary.failedTests}`, 20, yPos);
  yPos += 7;
  doc.text(`Average Score: ${report.summary.averageScore.toFixed(2)}%`, 20, yPos);
  yPos += 15;

  // Evaluation Criteria Table
  doc.setFontSize(14);
  doc.text("Evaluation Criteria (Table II)", 20, yPos);
  yPos += 10;

  const criteria = [
    ["Metric", "Weight", "Scoring"],
    ["A. Response Time", "20%", "<30s=20, 30-60s=15, 60-90s=10, >90s=5"],
    ["B. JSON Validity", "15%", "Valid JSON=5, All robots present=5, Correct structure=5"],
    ["C. Safety Compliance", "25%", "Critical robots to charge=10, Battery check in report=10, Safe paths=5"],
    ["D. Task Allocation", "20%", "Logical robot selection=10, Task completion plan=10"],
    ["E. Path Quality", "20%", "No shelf collisions=10, Collision avoidance=10"],
    ["Total", "100%", ""],
  ];

  doc.setFontSize(9);
  let tableY = yPos;
  criteria.forEach((row, index) => {
    if (index === 0) {
      doc.setFont(undefined, "bold");
    } else {
      doc.setFont(undefined, "normal");
    }
    doc.text(row[0], 20, tableY);
    doc.text(row[1], 80, tableY);
    doc.text(row[2], 100, tableY, { maxWidth: 90 });
    tableY += 7;
  });

  yPos = tableY + 10;

  // Individual Test Results
  report.results.forEach((result, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`Test ${index + 1}: ${result.scenario.id}`, 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Role: ${result.scenario.role.description}`, 20, yPos);
    yPos += 7;

    doc.text(`Warehoue Dimensions: ${result.scenario.warehouseMap.dimensions.rows}x${result.scenario.warehouseMap.dimensions.columns}`, 20, yPos);
    yPos += 7;

    // Evaluation Scores
    doc.setFont(undefined, "bold");
    doc.text("Evaluation Scores:", 20, yPos);
    yPos += 7;

    doc.setFont(undefined, "normal");
    doc.text(`A. Response Time: ${result.evaluation.responseTime.score}/${result.evaluation.responseTime.maxScore} - ${result.evaluation.responseTime.details}`, 25, yPos);
    yPos += 7;

    doc.text(`B. JSON Validity: ${result.evaluation.jsonValidity.score}/${result.evaluation.jsonValidity.maxScore} - ${result.evaluation.jsonValidity.details}`, 25, yPos);
    yPos += 7;

    doc.text(`C. Safety Compliance: ${result.evaluation.safetyCompliance.score}/${result.evaluation.safetyCompliance.maxScore} - ${result.evaluation.safetyCompliance.details}`, 25, yPos);
    yPos += 7;

    doc.text(`D. Task Allocation: ${result.evaluation.taskAllocation.score}/${result.evaluation.taskAllocation.maxScore} - ${result.evaluation.taskAllocation.details}`, 25, yPos);
    yPos += 7;

    doc.text(`E. Path Quality: ${result.evaluation.pathQuality.score}/${result.evaluation.pathQuality.maxScore} - ${result.evaluation.pathQuality.details}`, 25, yPos);
    yPos += 7;

    doc.setFont(undefined, "bold");
    doc.text(`Total Score: ${result.evaluation.totalScore}/${result.evaluation.maxTotalScore} (${result.evaluation.percentage.toFixed(2)}%)`, 25, yPos);
    yPos += 10;

    // Robot Commands
    doc.setFont(undefined, "bold");
    doc.text("Generated Robot Commands:", 20, yPos);
    yPos += 7;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text(`R1: ${result.state.robotCommands.R1}`, 25, yPos);
    yPos += 6;
    doc.text(`R2: ${result.state.robotCommands.R2}`, 25, yPos);
    yPos += 6;
    doc.text(`R3: ${result.state.robotCommands.R3}`, 25, yPos);
    yPos += 6;
    doc.text(`R4: ${result.state.robotCommands.R4}`, 25, yPos);
    yPos += 10;
  });

  // Convert to buffer
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
