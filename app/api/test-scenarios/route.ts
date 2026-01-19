import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, detectProviderFromModel } from "@/lib/llm-providers";
import { executeWarehouseGraph, WarehouseState } from "@/lib/langgraph-workflow";
import { testScenarios } from "@/lib/test-scenarios";
import { createTestEnvironment } from "@/lib/environment-matrix";
import { evaluateTestRun } from "@/lib/evaluation";
import { generatePDFReport, TestRunResult, TestReport } from "@/lib/pdf-generator";

export async function POST(req: NextRequest) {
  try {
    const { model, scenarioIds, customScenarios } = await req.json();

    if (!model) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    // Detect provider and get API key
    const provider = detectProviderFromModel(model);
    let apiKey: string;

    if (provider === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
      }
    } else if (provider === "openai") {
      apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
      }
    } else if (provider === "grok") {
      apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json({ error: "GROK_API_KEY not set" }, { status: 500 });
      }
    } else if (provider === "gemini") {
      apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: `Unsupported model: ${model}` }, { status: 400 });
    }

    const llmProvider = getLLMProvider(provider, apiKey);

    // Merge default and custom scenarios
    const allAvailableScenarios = customScenarios && Array.isArray(customScenarios)
      ? [...testScenarios, ...customScenarios]
      : testScenarios;
    
    // Get scenarios to run
    const scenariosToRun = scenarioIds
      ? allAvailableScenarios.filter(s => scenarioIds.includes(s.id))
      : allAvailableScenarios;

    const results: TestRunResult[] = [];

    // Run each scenario
    for (const scenario of scenariosToRun) {
      const startTime = Date.now();

      // Create initial state - all robots start at 100% battery and WORKING status
      // Use scenario positions if available, otherwise use defaults
      // R4 moved from (15,0) which is in charging area to (13,0) which is a path
      const robotStatuses: WarehouseState["robotStatuses"] = {
        R1: { position: { row: 0, col: 0 }, battery: 100, status: "working" },
        R2: { position: { row: 15, col: 17 }, battery: 100, status: "working" },
        R3: { position: { row: 14, col: 16 }, battery: 100, status: "working" },
        R4: { position: { row: 13, col: 0 }, battery: 100, status: "working" }, // Moved from charging area to path
      };

      // Update with scenario-specific positions (but keep battery at 100% and status as "working")
      // Special handling: Move R4 if it's in charging area
      if (scenario.globalState?.robots) {
        Object.entries(scenario.globalState.robots).forEach(([robotId, robot]: [string, any]) => {
          if (robotStatuses[robotId as keyof typeof robotStatuses]) {
            const scenarioRow = robot.position?.row || 0;
            const scenarioCol = robot.position?.col || 0;
            
            // Special case: If R4 is in charging area (row 15, col 0-3), move it to path
            let finalRow = scenarioRow;
            let finalCol = scenarioCol;
            if (robotId === 'R4' && scenarioRow === 15 && scenarioCol >= 0 && scenarioCol <= 3) {
              finalRow = 13; // Move to path row
              finalCol = 0;  // Keep same column but on path
            }
            
            robotStatuses[robotId as keyof typeof robotStatuses] = {
              position: { row: finalRow, col: finalCol },
              battery: 100, // Always start at 100% battery
              status: "working", // Always start as working (not idle, not charging)
            };
          }
        });
      }

      // Send the FULL scenario object as JSON to the LLM
      const fullScenarioData = {
        scenarioId: scenario.id,
        warehouseMap: scenario.warehouseMap,
        globalState: {
          robots: robotStatuses, // Use our standardized robot statuses
        },
        operatorCommands: scenario.operatorCommands,
        agentInstructions: scenario.agentInstructions,
      };

      // Build user command with the full scenario JSON
      const taskDescriptions = scenario.operatorCommands?.taskPool?.map((t: any) => t.description).join("; ") || "Allocate tasks for warehouse";
      const userCommand = `Tasks: ${taskDescriptions}\n\nFull Scenario Data (JSON):\n${JSON.stringify(fullScenarioData, null, 2)}`;

      const initialState: WarehouseState = {
        userCommand,
        robotStatuses,
        sensorData: fullScenarioData, // Store full scenario in sensorData for reference
        llmPrompt: "",
        llmResponse: "",
        robotCommands: {
          R1: "",
          R2: "",
          R3: "",
          R4: "",
        },
        humanReadableResponse: "",
        executedCommands: [],
        operatorMessage: "",
        iteration: 0,
        shouldContinue: true,
        taskComplete: false,
        environmentMatrix: scenario.warehouseMap.grid,
      };

      // Execute graph
      const finalState = await executeWarehouseGraph(initialState, llmProvider, model, 3);

      const endTime = Date.now();

      // Evaluate
      const evaluation = evaluateTestRun(finalState, scenario, startTime, endTime);

      results.push({
        scenario,
        state: finalState,
        evaluation,
        startTime,
        endTime,
      });
    }

    // Generate report
    const summary = {
      averageScore: results.reduce((sum, r) => sum + r.evaluation.percentage, 0) / results.length,
      totalTests: results.length,
      passedTests: results.filter(r => r.evaluation.percentage >= 70).length,
      failedTests: results.filter(r => r.evaluation.percentage < 70).length,
    };

    const report: TestReport = {
      title: "Warehouse Robot Control System - Test Report",
      date: new Date().toISOString(),
      model,
      results,
      summary,
    };

    // Generate PDF
    const pdfBuffer = generatePDFReport(report);

    // Extract paths from robot commands for visualization
    const extractPath = (command: string, scenarioGrid?: string[][]): Array<[number, number]> | undefined => {
      if (!command) return undefined;
      try {
        // Try multiple patterns to extract path - use bracket counting to get complete path
        let pathMatch: RegExpMatchArray | null = null;
        
        // Pattern 1: "Path: [[row,col], [row,col], ...]" - use bracket counting
        const pathPattern1 = /path:\s*(\[\[[\s\S]*)/i;
        const match1 = command.match(pathPattern1);
        if (match1) {
          let bracketCount = 0;
          let pathStr = '';
          let foundStart = false;
          for (let i = match1.index! + match1[0].indexOf('[['); i < command.length; i++) {
            const char = command[i];
            if (char === '[') {
              bracketCount++;
              foundStart = true;
            } else if (char === ']') {
              bracketCount--;
            }
            pathStr += char;
            if (foundStart && bracketCount === 0) {
              pathMatch = [match1[0], pathStr];
              break;
            }
          }
        }
        
        // Pattern 2: Look for array of arrays directly with bracket counting
        if (!pathMatch) {
          const bracketStart = command.indexOf('[[');
          if (bracketStart !== -1) {
            let bracketCount = 0;
            let pathStr = '';
            for (let i = bracketStart; i < command.length; i++) {
              const char = command[i];
              if (char === '[') bracketCount++;
              if (char === ']') bracketCount--;
              pathStr += char;
              if (bracketCount === 0 && pathStr.length > 2) {
                pathMatch = ['', pathStr];
                break;
              }
            }
          }
        }
        
        if (pathMatch) {
          let pathStr = pathMatch[1];
          // Clean up the path string
          pathStr = pathStr.trim();
          
          // Try to parse as JSON
          let parsed: any;
          try {
            parsed = JSON.parse(pathStr);
          } catch (parseErr) {
            // If direct parse fails, try to fix common issues
            pathStr = pathStr.replace(/,\s+/g, ',');
            pathStr = pathStr.replace(/\s*\[\s*/g, '[').replace(/\s*\]\s*/g, ']');
            try {
              parsed = JSON.parse(pathStr);
            } catch {
              // Last resort: extract coordinates manually
              const coordMatches = pathStr.matchAll(/\[(\d+)\s*,\s*(\d+)\]/g);
              const coords: Array<[number, number]> = [];
              for (const match of coordMatches) {
                coords.push([Number(match[1]), Number(match[2])]);
              }
              if (coords.length > 0) {
                parsed = coords;
              } else {
                throw parseErr;
              }
            }
          }
          
          // Ensure it's an array of [row, col] tuples
          if (Array.isArray(parsed) && parsed.length > 0) {
            const result = parsed.map((item: any) => {
              if (Array.isArray(item) && item.length >= 2) {
                return [Number(item[0]), Number(item[1])] as [number, number];
              }
              return null;
            }).filter((item: any) => item !== null) as Array<[number, number]>;
            
            if (result.length > 0) {
              // Filter out paths that go through obstacles (shelves) if grid is provided
              if (scenarioGrid && Array.isArray(scenarioGrid)) {
                const filteredResult = result.filter(([row, col]) => {
                  // Check bounds and if this cell is an obstacle
                  if (row >= 0 && row < scenarioGrid.length && 
                      col >= 0 && col < scenarioGrid[row]?.length &&
                      scenarioGrid[row][col] === 'S') {
                    return false;
                  }
                  return true;
                });
                
                if (filteredResult.length < result.length) {
                  console.warn(`Filtered ${result.length - filteredResult.length} obstacle cells from path`);
                }
                
                return filteredResult.length > 0 ? filteredResult : result;
              }
              
              return result;
            }
          }
        }
      } catch (e) {
        console.error('Path extraction error:', e, 'Command:', command.substring(0, 300));
      }
      return undefined;
    };

    // Return results and PDF as base64
    return NextResponse.json({
      success: true,
      report: {
        ...report,
        results: results.map(r => {
          // Get scenario grid and robot positions
          const scenarioGrid = r.scenario.warehouseMap?.grid || [];
          const robotPositions: { [key: string]: { row: number; col: number; battery: number; status: string } } = {};
          
          // Extract robot positions from final state (use initial positions from scenario)
          Object.entries(r.state.robotStatuses).forEach(([robotId, status]) => {
            robotPositions[robotId] = {
              row: status.position.row,
              col: status.position.col,
              battery: status.battery,
              status: status.status,
            };
          });

          // Extract tasks and paths from robot commands
          const robotTasks: { [key: string]: { robotId: string; task: string; path?: Array<[number, number]> } } = {};
          Object.entries(r.state.robotCommands).forEach(([robotId, command]) => {
            if (command) {
              const extractedPath = extractPath(command, scenarioGrid);
              robotTasks[robotId] = {
                robotId,
                task: command,
                path: extractedPath,
              };
              // Debug logging
              if (extractedPath && extractedPath.length > 0) {
                console.log(`✓ Extracted path for ${robotId}: ${extractedPath.length} waypoints - ${JSON.stringify(extractedPath.slice(0, 3))}...`);
              } else {
                console.warn(`⚠ No path extracted for ${robotId}. Command preview: ${command.substring(0, 150)}`);
              }
            }
          });
          
          // Log all extracted paths for debugging
          console.log('All extracted robot tasks:', Object.keys(robotTasks).map(id => ({
            robotId: id,
            hasPath: !!robotTasks[id].path,
            pathLength: robotTasks[id].path?.length || 0
          })));

          return {
            scenario: r.scenario.id || "Unknown",
            evaluation: r.evaluation,
            commands: r.state.robotCommands,
            scenarioData: {
              grid: scenarioGrid,
              robots: robotPositions,
              tasks: robotTasks,
            },
          };
        }),
      },
      pdfBase64: pdfBuffer.toString("base64"),
      summary,
    });
  } catch (err: any) {
    console.error("Test scenario error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
