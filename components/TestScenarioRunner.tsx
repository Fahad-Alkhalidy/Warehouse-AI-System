"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Play, Download, Loader2, CheckCircle2, XCircle, FileText, Plus, Edit2, Trash2, Save, X, Info, Bot, Settings, Grid3x3 } from 'lucide-react';
import { testScenarios, TestScenario } from '@/lib/test-scenarios';
import WarehouseGridVisualization from './WarehouseGridVisualization';

interface TestResult {
  scenario: string;
  evaluation: {
    totalScore: number;
    maxTotalScore: number;
    percentage: number;
    responseTime: { score: number; details: string };
    jsonValidity: { score: number; details: string };
    safetyCompliance: { score: number; details: string };
    taskAllocation: { score: number; details: string };
    pathQuality: { score: number; details: string };
  };
  commands: {
    R1: string;
    R2: string;
    R3: string;
    R4: string;
  };
  scenarioData?: {
    grid: string[][];
    robots: { [robotId: string]: { row: number; col: number; battery: number; status: string } };
    tasks: { [robotId: string]: { robotId: string; task: string; path?: Array<[number, number]> } };
  };
}

export default function TestScenarioRunner() {
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [customScenarios, setCustomScenarios] = useState<TestScenario[]>([]);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null);
  
  // Load custom scenarios from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('customScenarios');
    if (stored) {
      try {
        setCustomScenarios(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom scenarios:', e);
      }
    }
  }, []);
  
  // Save custom scenarios to localStorage whenever they change
  useEffect(() => {
    if (customScenarios.length > 0) {
      localStorage.setItem('customScenarios', JSON.stringify(customScenarios));
    } else {
      localStorage.removeItem('customScenarios');
    }
  }, [customScenarios]);
  
  // Merge default and custom scenarios
  const allScenarios = useMemo(() => {
    return [...testScenarios, ...customScenarios];
  }, [customScenarios]);
  
  // Default initial state - show grid with robots at starting positions
  // This is visible BEFORE applying any scenario
  const initialGridState = useMemo(() => {
    // Use the first scenario's grid as default, or create empty grid
    const defaultScenario = allScenarios[0];
    const defaultGrid = defaultScenario?.warehouseMap?.grid || [];
    
    // Default robot positions (all at 100% battery, working status)
    // R4 moved from (15,0) which is in charging area to (13,0) which is a path
    const defaultRobots: { [key: string]: { row: number; col: number; battery: number; status: string } } = {
      R1: { row: 0, col: 0, battery: 100, status: "working" },
      R2: { row: 15, col: 17, battery: 100, status: "working" },
      R3: { row: 14, col: 16, battery: 100, status: "working" },
      R4: { row: 13, col: 0, battery: 100, status: "working" }, // Moved from (15,0) charging area to path
    };
    
    // Update with scenario positions if available
    // BUT: Override R4 if it's in charging area (row 15, col 0-3) to move it to a path
    if (defaultScenario?.globalState?.robots) {
      Object.entries(defaultScenario.globalState.robots).forEach(([robotId, robot]: [string, any]) => {
        if (defaultRobots[robotId]) {
          const scenarioRow = robot.position?.row;
          const scenarioCol = robot.position?.col;
          
          // Special case: If R4 is in charging area (row 15, col 0-3), move it to path
          if (robotId === 'R4' && scenarioRow === 15 && scenarioCol !== undefined && scenarioCol >= 0 && scenarioCol <= 3) {
            defaultRobots[robotId] = {
              row: 13, // Move to path row
              col: 0,  // Keep same column but on path
              battery: 100,
              status: "working",
            };
          } else {
            defaultRobots[robotId] = {
              row: scenarioRow || defaultRobots[robotId].row,
              col: scenarioCol || defaultRobots[robotId].col,
              battery: 100,
              status: "working",
            };
          }
        }
      });
    }
    
    return {
      grid: defaultGrid,
      robots: defaultRobots,
      tasks: {} as { [key: string]: { robotId: string; task: string; path?: Array<[number, number]> } },
    };
  }, []);

  const models = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Google) - FREE ⭐', group: 'free' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google) - FREE', group: 'free' },
    { id: 'gemini-pro', name: 'Gemini Pro (Google) - FREE', group: 'free' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Anthropic)', group: 'paid' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (Anthropic)', group: 'paid' },
    { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', group: 'paid' },
  ];

  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const runTests = async () => {
    if (selectedScenarios.length === 0) {
      setError('Please select at least one test scenario');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      // Get selected scenarios (both default and custom)
      const selectedScenarioObjects = allScenarios.filter(s => selectedScenarios.includes(s.id || ""));
      const customSelected = selectedScenarioObjects.filter(s => customScenarios.some(cs => cs.id === s.id));
      
      const response = await fetch('/api/test-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          scenarioIds: selectedScenarios,
          customScenarios: customSelected.length > 0 ? customSelected : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test execution failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadPDF = () => {
    if (!results?.pdfBase64) {
      setError('PDF not available');
      return;
    }

    const pdfBlob = new Blob(
      [Uint8Array.from(atob(results.pdfBase64), c => c.charCodeAt(0))],
      { type: 'application/pdf' }
    );
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-test-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Warehouse Agentic Graph System</h1>
          <p className="text-slate-400">LangGraph-based cyclic workflow for robot control</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Test Configuration</h2>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                LLM Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="🆓 Free Models">
                  {models.filter(m => m.group === 'free').map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </optgroup>
                <optgroup label="💳 Paid Models">
                  {models.filter(m => m.group === 'paid').map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Scenario Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Test Scenarios
                </label>
                <button
                  onClick={() => {
                    setEditingScenario(null);
                    setShowCustomBuilder(true);
                  }}
                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Custom
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Default Scenarios */}
                {testScenarios.map(scenario => (
                  <label
                    key={scenario.id}
                    className="flex items-start p-3 bg-slate-900 rounded border border-slate-700 cursor-pointer hover:border-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScenarios.includes(scenario.id || "")}
                      onChange={() => toggleScenario(scenario.id || "")}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{scenario.id}</div>
                      <div className="text-xs text-slate-400 mt-1">{scenario.role.description}</div>
                    </div>
                  </label>
                ))}
                {/* Custom Scenarios */}
                {customScenarios.map(scenario => (
                  <label
                    key={scenario.id}
                    className="flex items-start p-3 bg-slate-900 rounded border border-green-700 cursor-pointer hover:border-green-600 relative group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScenarios.includes(scenario.id || "")}
                      onChange={() => toggleScenario(scenario.id || "")}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white flex items-center">
                        {scenario.id}
                        <span className="ml-2 text-xs text-green-400">(Custom)</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{scenario.role.description}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingScenario(scenario);
                          setShowCustomBuilder(true);
                        }}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete custom scenario "${scenario.id}"?`)) {
                            setCustomScenarios(prev => prev.filter(s => s.id !== scenario.id));
                            setSelectedScenarios(prev => prev.filter(id => id !== scenario.id));
                          }
                        }}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runTests}
              disabled={isRunning || selectedScenarios.length === 0}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Run Test Scenarios
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Warehouse Grid & Test Results</h2>
              {results && (
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              )}
            </div>

            {/* Initial Grid View - Always Visible */}
            {!results && !isRunning && (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Initial Warehouse State</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    All robots start at 100% battery and working status. Select a scenario and click "Run Test Scenarios" to see task allocation.
                  </p>
                  <WarehouseGridVisualization
                    grid={initialGridState.grid}
                    robots={initialGridState.robots}
                    tasks={initialGridState.tasks}
                    width={18}
                    height={16}
                  />
                </div>
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select scenarios and click "Run Test Scenarios" to begin</p>
                </div>
              </div>
            )}

            {isRunning && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="text-slate-400">Running test scenarios...</p>
              </div>
            )}

            {results && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Total Tests</div>
                      <div className="text-2xl font-bold text-white">{results.summary.totalTests}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Passed</div>
                      <div className="text-2xl font-bold text-green-400">{results.summary.passedTests}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Failed</div>
                      <div className="text-2xl font-bold text-red-400">{results.summary.failedTests}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Average Score</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {results.summary.averageScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Results */}
                {results.report.results.map((result: TestResult, index: number) => (
                  <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">{result.scenario}</h4>
                      {result.evaluation.percentage >= 70 ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div>
                        <div className="text-xs text-slate-400">Response Time</div>
                        <div className="text-sm font-medium text-white">
                          {result.evaluation.responseTime.score}/20
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">JSON Validity</div>
                        <div className="text-sm font-medium text-white">
                          {result.evaluation.jsonValidity.score}/15
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Safety</div>
                        <div className="text-sm font-medium text-white">
                          {result.evaluation.safetyCompliance.score}/25
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Task Allocation</div>
                        <div className="text-sm font-medium text-white">
                          {result.evaluation.taskAllocation.score}/20
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Path Quality</div>
                        <div className="text-sm font-medium text-white">
                          {result.evaluation.pathQuality.score}/20
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium text-slate-300 mb-1">
                        Total Score: {result.evaluation.totalScore}/{result.evaluation.maxTotalScore} ({result.evaluation.percentage.toFixed(1)}%)
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            result.evaluation.percentage >= 70 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${result.evaluation.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Warehouse Grid Visualization - ALWAYS VISIBLE */}
                    <div className="mt-4 bg-slate-800 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-slate-300 mb-4">Warehouse Grid Visualization</h5>
                      {result.scenarioData ? (
                        <WarehouseGridVisualization
                          grid={result.scenarioData.grid || []}
                          robots={result.scenarioData.robots || {}}
                          tasks={result.scenarioData.tasks || {}}
                          width={18}
                          height={16}
                        />
                      ) : (
                        <div className="text-slate-400 text-center py-8">
                          <p className="mb-2">⚠️ Grid visualization data not available</p>
                          <p className="text-xs">This may happen if the scenario failed to execute. Check the error messages above.</p>
                          <details className="mt-4 text-left">
                            <summary className="text-xs text-slate-500 cursor-pointer">Debug Info</summary>
                            <pre className="text-xs mt-2 p-2 bg-slate-900 rounded overflow-auto max-h-40">
                              {JSON.stringify({ hasScenarioData: !!result.scenarioData, resultKeys: Object.keys(result) }, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>

                    {/* Robot Commands - Always visible below visualization */}
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-slate-300 mb-2">Robot Commands & Tasks:</h5>
                      <div className="space-y-2 text-xs">
                        <div className="bg-slate-800 rounded p-2">
                          <span className="text-blue-400 font-semibold">R1:</span> <span className="text-slate-300">{result.commands.R1 || "No task assigned"}</span>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                          <span className="text-green-400 font-semibold">R2:</span> <span className="text-slate-300">{result.commands.R2 || "No task assigned"}</span>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                          <span className="text-purple-400 font-semibold">R3:</span> <span className="text-slate-300">{result.commands.R3 || "No task assigned"}</span>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                          <span className="text-orange-400 font-semibold">R4:</span> <span className="text-slate-300">{result.commands.R4 || "No task assigned"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Custom Scenario Builder Modal */}
      {showCustomBuilder && (
        <CustomScenarioBuilder
          scenario={editingScenario}
          onSave={(scenario) => {
            if (editingScenario) {
              // Update existing
              setCustomScenarios(prev => prev.map(s => s.id === editingScenario.id ? scenario : s));
            } else {
              // Add new
              setCustomScenarios(prev => [...prev, scenario]);
            }
            setShowCustomBuilder(false);
            setEditingScenario(null);
          }}
          onCancel={() => {
            setShowCustomBuilder(false);
            setEditingScenario(null);
          }}
        />
      )}
    </div>
  );
}

// Custom Scenario Builder Component
interface CustomScenarioBuilderProps {
  scenario: TestScenario | null;
  onSave: (scenario: TestScenario) => void;
  onCancel: () => void;
}

function CustomScenarioBuilder({ scenario, onSave, onCancel }: CustomScenarioBuilderProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'robots' | 'tasks' | 'grid'>('basic');
  const [formData, setFormData] = useState<TestScenario>(() => {
    if (scenario) {
      return scenario;
    }
    // Default empty scenario
    const emptyGrid: string[][] = Array(16).fill(null).map(() => Array(18).fill('.'));
    // Add default shelves
    for (let row = 2; row <= 5; row++) {
      for (let col of [1, 2, 5, 6, 8, 9, 13, 14]) {
        emptyGrid[row][col] = 'S';
      }
    }
    for (let row = 8; row <= 11; row++) {
      for (let col of [1, 2, 5, 6, 8, 9, 13, 14]) {
        emptyGrid[row][col] = 'S';
      }
    }
    // Add charging area
    for (let col = 0; col <= 4; col++) {
      emptyGrid[15][col] = 'C';
    }
    // Add loading area
    for (let col = 5; col <= 8; col++) {
      emptyGrid[14][col] = 'L';
    }
    // Add unloading area
    for (let col = 11; col <= 14; col++) {
      emptyGrid[14][col] = 'U';
    }
    
    const defaultScenario: TestScenario = {
      id: scenario?.id || `custom-${Date.now()}`,
      role: {
        description: scenario?.role?.description || '',
        responsibilities: scenario?.role?.responsibilities || [],
      },
      warehouseMap: {
        dimensions: {
          rows: 16,
          columns: 18,
          gridIndices: "0-287",
        },
        legend: {
          ".": "Path",
          "S": "Shelf (Obstacle)",
          "C": "Charging Area",
          "L": "Loading Area",
          "U": "Unloading Area",
        },
        specialZones: {
          chargingArea: [270, 271, 272, 273],
          loadingArea: [277, 278, 279, 280],
          unloadingArea: [284, 285, 286, 287],
        },
        grid: emptyGrid,
      },
      globalState: {
        robots: scenario?.globalState?.robots || {
          R1: { position: { row: 0, col: 0 }, batteryPercent: 100, status: "working" },
          R2: { position: { row: 15, col: 17 }, batteryPercent: 100, status: "working" },
          R3: { position: { row: 14, col: 16 }, batteryPercent: 100, status: "working" },
          R4: { position: { row: 13, col: 0 }, batteryPercent: 100, status: "working" },
        },
      },
      operatorCommands: {
        taskPool: scenario?.operatorCommands?.taskPool || [],
      },
      agentInstructions: {
        allocation: scenario?.agentInstructions?.allocation || '',
        safety: scenario?.agentInstructions?.safety || '',
        constraints: scenario?.agentInstructions?.constraints || [],
      },
      expectedOutputFormat: {
        allocationSummary: scenario?.expectedOutputFormat?.allocationSummary || '',
        paths: scenario?.expectedOutputFormat?.paths || {},
      },
    };
    return defaultScenario;
  });

  const updateGridCell = (row: number, col: number, value: string) => {
    const newGrid = formData.warehouseMap!.grid.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? value : c))
    );
    setFormData(prev => ({
      ...prev,
      warehouseMap: {
        ...prev.warehouseMap!,
        grid: newGrid,
      },
    }));
  };

  const updateRobotPosition = (robotId: string, row: number, col: number) => {
    setFormData(prev => ({
      ...prev,
      globalState: {
        ...prev.globalState!,
        robots: {
          ...prev.globalState!.robots,
          [robotId]: {
            ...prev.globalState!.robots[robotId],
            position: { row, col },
          },
        },
      },
    }));
  };

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      operatorCommands: {
        ...prev.operatorCommands!,
        taskPool: [
          ...(prev.operatorCommands?.taskPool || []),
          { taskId: `task-${Date.now()}`, description: '' },
        ],
      },
    }));
  };

  const updateTask = (index: number, field: string, value: string | number) => {
    setFormData(prev => {
      const tasks = [...(prev.operatorCommands?.taskPool || [])];
      tasks[index] = { ...tasks[index], [field]: value };
      return {
        ...prev,
        operatorCommands: {
          ...prev.operatorCommands!,
          taskPool: tasks,
        },
      };
    });
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      operatorCommands: {
        ...prev.operatorCommands!,
        taskPool: (prev.operatorCommands?.taskPool || []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleSave = () => {
    if (!formData.id || !formData.role?.description) {
      alert('Please fill in at least Scenario ID and Description');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {scenario ? 'Edit Custom Scenario' : 'Create Custom Scenario'}
              </h2>
              <p className="text-sm text-slate-400">Configure your warehouse scenario settings</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 bg-slate-800/50 px-6">
          <div className="flex gap-1">
            {[
              { id: 'basic', label: 'Basic Info', icon: Info },
              { id: 'robots', label: 'Robots', icon: Bot },
              { id: 'tasks', label: 'Tasks', icon: FileText },
              { id: 'grid', label: 'Warehouse Grid', icon: Grid3x3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 py-3 flex items-center gap-2 font-medium transition-all ${
                  activeTab === id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-400" />
                    Scenario Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        Scenario ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="e.g., custom-scenario-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">Unique identifier for this scenario</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.role?.description || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          role: { ...prev.role!, description: e.target.value },
                        }))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Brief description of the scenario"
                      />
                      <p className="text-xs text-slate-500 mt-1">Describe what this scenario tests</p>
                    </div>
                  </div>
                </div>

                {/* Agent Instructions */}
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Agent Instructions
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Task Allocation Instructions
                      </label>
                      <textarea
                        value={formData.agentInstructions?.allocation || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          agentInstructions: {
                            ...prev.agentInstructions!,
                            allocation: e.target.value,
                          },
                        }))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        rows={4}
                        placeholder="Instructions for how the agent should allocate tasks to robots..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Safety Instructions
                      </label>
                      <textarea
                        value={formData.agentInstructions?.safety || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          agentInstructions: {
                            ...prev.agentInstructions!,
                            safety: e.target.value,
                          },
                        }))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        rows={4}
                        placeholder="Safety guidelines and constraints for robot operations..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Robots Tab */}
            {activeTab === 'robots' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-400" />
                    Robot Starting Positions
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">Set the initial position for each robot (0-15 rows, 0-17 columns)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['R1', 'R2', 'R3', 'R4'].map(robotId => {
                      const robot = formData.globalState?.robots[robotId];
                      const colors: { [key: string]: { bg: string; border: string; text: string } } = {
                        R1: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
                        R2: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
                        R3: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
                        R4: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
                      };
                      const color = colors[robotId];
                      
                      return (
                        <div key={robotId} className={`bg-slate-900 rounded-lg p-4 border-2 ${color.border} ${color.bg}`}>
                          <div className={`text-base font-bold mb-3 flex items-center gap-2 ${color.text}`}>
                            <div className={`w-3 h-3 rounded-full ${color.border.replace('border-', 'bg-')}`}></div>
                            {robotId}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Row (0-15)</label>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                value={robot?.position.row ?? 0}
                                onChange={(e) => updateRobotPosition(robotId, parseInt(e.target.value) || 0, robot?.position.col || 0)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Column (0-17)</label>
                              <input
                                type="number"
                                min="0"
                                max="17"
                                value={robot?.position.col ?? 0}
                                onChange={(e) => updateRobotPosition(robotId, robot?.position.row || 0, parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            Current: ({robot?.position.row ?? 0}, {robot?.position.col ?? 0})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-yellow-400" />
                      Task Pool
                    </h3>
                    <button
                      onClick={addTask}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Task
                    </button>
                  </div>
                  
                  {(formData.operatorCommands?.taskPool || []).length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                      <p className="text-slate-400 mb-2">No tasks added yet</p>
                      <p className="text-sm text-slate-500">Click "Add Task" to create your first task</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(formData.operatorCommands?.taskPool || []).map((task, index) => (
                        <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Task ID</label>
                                <input
                                  type="text"
                                  value={task.taskId || ''}
                                  onChange={(e) => updateTask(index, 'taskId', e.target.value)}
                                  placeholder="e.g., task-alpha"
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                                <input
                                  type="text"
                                  value={task.description || ''}
                                  onChange={(e) => updateTask(index, 'description', e.target.value)}
                                  placeholder="e.g., Move item from Loading to Shelf 5"
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeTask(index)}
                              className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove task"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Grid Editor Tab */}
            {activeTab === 'grid' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Grid3x3 className="w-5 h-5 text-cyan-400" />
                      Warehouse Grid Editor
                    </h3>
                    <div className="text-sm text-slate-400">
                      Click cells to cycle: <span className="text-white">Path</span> → <span className="text-white">Shelf</span> → <span className="text-yellow-300">Charging</span> → <span className="text-blue-300">Loading</span> → <span className="text-green-300">Unloading</span>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="mb-4 flex flex-wrap gap-4 p-4 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-50 border border-slate-600 rounded flex items-center justify-center text-xs text-gray-600">.</div>
                      <span className="text-sm text-slate-300">Path</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-800 border border-slate-600 rounded flex items-center justify-center text-xs text-white">S</div>
                      <span className="text-sm text-slate-300">Shelf</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-yellow-200 border border-slate-600 rounded flex items-center justify-center text-xs text-yellow-900">C</div>
                      <span className="text-sm text-slate-300">Charging</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-200 border border-slate-600 rounded flex items-center justify-center text-xs text-blue-900">L</div>
                      <span className="text-sm text-slate-300">Loading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-200 border border-slate-600 rounded flex items-center justify-center text-xs text-green-900">U</div>
                      <span className="text-sm text-slate-300">Unloading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 border-2 border-blue-700 rounded flex items-center justify-center text-xs text-white font-bold">R</div>
                      <span className="text-sm text-slate-300">Robot Position</span>
                    </div>
                  </div>
                  
                  {/* Grid */}
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                    <div className="inline-block">
                      {/* Column headers */}
                      <div className="text-xs text-slate-400 mb-1 flex">
                        <div className="w-10"></div>
                        {Array.from({ length: 18 }, (_, i) => (
                          <div key={i} className="w-8 text-center font-medium">{i}</div>
                        ))}
                      </div>
                      {/* Grid rows */}
                      {formData.warehouseMap?.grid.map((row, rowIdx) => (
                        <div key={rowIdx} className="flex">
                          <div className="w-10 text-xs text-slate-400 text-right pr-2 font-medium flex items-center justify-end">{rowIdx}</div>
                          {row.map((cell, colIdx) => {
                            const isRobot = Object.values(formData.globalState?.robots || {}).some(
                              r => r.position.row === rowIdx && r.position.col === colIdx
                            );
                            const robotId = Object.keys(formData.globalState?.robots || {}).find(
                              id => formData.globalState?.robots[id].position.row === rowIdx &&
                                    formData.globalState?.robots[id].position.col === colIdx
                            );
                            const cellOptions = ['.', 'S', 'C', 'L', 'U'];
                            const currentIndex = cellOptions.indexOf(cell);
                            const nextIndex = (currentIndex + 1) % cellOptions.length;
                            
                            return (
                              <button
                                key={colIdx}
                                onClick={() => !isRobot && updateGridCell(rowIdx, colIdx, cellOptions[nextIndex])}
                                className={`w-8 h-8 border-2 text-xs font-medium flex items-center justify-center transition-all ${
                                  isRobot
                                    ? 'bg-blue-500 text-white border-blue-700 shadow-lg scale-105'
                                    : cell === 'S'
                                    ? 'bg-gray-800 text-white border-gray-600 hover:border-gray-500'
                                    : cell === 'C'
                                    ? 'bg-yellow-200 text-yellow-900 border-yellow-400 hover:border-yellow-300'
                                    : cell === 'L'
                                    ? 'bg-blue-200 text-blue-900 border-blue-400 hover:border-blue-300'
                                    : cell === 'U'
                                    ? 'bg-green-200 text-green-900 border-green-400 hover:border-green-300'
                                    : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-200'
                                } ${!isRobot ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}`}
                                title={isRobot ? `${robotId} at (${rowIdx}, ${colIdx})` : `(${rowIdx}, ${colIdx}) - Click to change`}
                              >
                                {isRobot ? robotId : cell}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer with Save/Cancel */}
        <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all"
          >
            <Save className="w-5 h-5" />
            Save Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
