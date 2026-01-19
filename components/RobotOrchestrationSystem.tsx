"use client";
import React, { useState } from 'react';
import { Loader2, Upload, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import WarehouseGridVisualization from './WarehouseGridVisualization';

interface RobotTasks {
  R1?: string;
  R2?: string;
  R3?: string;
  R4?: string;
  // Fallback for old format
  navigation?: string;
  manipulation?: string;
  sensing?: string;
  communication?: string;
  [key: string]: string | undefined;
}

const RobotOrchestrationSystem = () => {
  const [prompt, setPrompt] = useState('');
  const [environment, setEnvironment] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [robotTasks, setRobotTasks] = useState<RobotTasks | null>(null);
  const [error, setError] = useState<string | null>(null);

  const models: Array<{ id: string; name: string; group: 'free' | 'paid' }> = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Google) - FREE ⭐', group: 'free' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google) - FREE', group: 'free' },
    { id: 'gemini-pro', name: 'Gemini Pro (Google) - FREE', group: 'free' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google) - FREE', group: 'free' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Anthropic)', group: 'paid' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (Anthropic)', group: 'paid' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4 (Anthropic)', group: 'paid' },
    { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', group: 'paid' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (OpenAI)', group: 'paid' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (OpenAI)', group: 'paid' },
    { id: 'grok-beta', name: 'Grok Beta (xAI)', group: 'paid' },
    { id: 'grok-2', name: 'Grok-2 (xAI)', group: 'paid' },
    { id: 'grok-2-1212', name: 'Grok-2 1212 (xAI)', group: 'paid' }
  ];

  const robots = [
    { id: 1, name: 'Robot R1', color: 'bg-blue-500', role: 'R1' },
    { id: 2, name: 'Robot R2', color: 'bg-green-500', role: 'R2' },
    { id: 3, name: 'Robot R3', color: 'bg-purple-500', role: 'R3' },
    { id: 4, name: 'Robot R4', color: 'bg-orange-500', role: 'R4' }
  ];

  // Extract grid and robot positions from environment
  const getGridFromEnvironment = (): string[][] => {
    if (!environment) return [];
    if (environment.warehouseMap?.grid) return environment.warehouseMap.grid;
    if (environment.environmentMatrix) return environment.environmentMatrix;
    if (Array.isArray(environment.grid)) return environment.grid;
    return [];
  };

  const getRobotPositions = (): { [robotId: string]: { row: number; col: number; battery?: number; status?: string } } => {
    if (!environment) return {};
    const positions: { [robotId: string]: { row: number; col: number; battery?: number; status?: string } } = {};
    
    if (environment.globalState?.robots) {
      Object.entries(environment.globalState.robots).forEach(([robotId, robot]: [string, any]) => {
        let row = robot.position?.row || 0;
        let col = robot.position?.col || 0;
        
        // Special case: If R4 is in charging area (row 15, col 0-3), move it to path
        if (robotId === 'R4' && row === 15 && col >= 0 && col <= 3) {
          row = 13; // Move to path row
          col = 0;  // Keep same column but on path
        }
        
        positions[robotId] = {
          row,
          col,
          battery: robot.batteryPercent || robot.battery || 100,
          status: robot.status || "working",
        };
      });
    }
    
    return positions;
  };

  const getRobotTasks = (): { [robotId: string]: { robotId: string; task: string; path?: Array<[number, number]> } } => {
    if (!robotTasks) return {};
    const tasks: { [robotId: string]: { robotId: string; task: string; path?: Array<[number, number]> } } = {};
    
    Object.entries(robotTasks).forEach(([robotId, task]) => {
      if (task && typeof task === 'string') {
        // Try to extract path from task string
        let path: Array<[number, number]> | undefined;
        try {
          const pathMatch = task.match(/path:\s*(\[[\s\S]*?\])/i);
          if (pathMatch) {
            path = JSON.parse(pathMatch[1]);
          }
        } catch (e) {
          // Path parsing failed
        }
        
        tasks[robotId] = {
          robotId,
          task,
          path,
        };
      }
    });
    
    return tasks;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setEnvironment(json);
          setError(null);
        } catch (err) {
          setError('Invalid JSON file. Please upload a valid JSON.');
          setEnvironment(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const generateRobotTasks = async () => {
    if (!prompt || !environment) {
      setError('Please provide both a prompt and environment JSON.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setRobotTasks(null);

    try {
      // Call the centralized API endpoint
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          environment,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMsg = errorData.error || `API request failed with status ${response.status}`;
        const details = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
        throw new Error(`${errorMsg}${details}`);
      }

      const data = await response.json();
      
      if (data.success && data.tasks) {
        setRobotTasks(data.tasks);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error generating tasks:', err);
      let errorMessage = 'Unknown error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if it's a network error
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error: Could not connect to server. Make sure the dev server is running.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Robot Orchestration System</h1>
          <p className="text-slate-400">Centralized AI-powered task distribution for multi-robot coordination</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Input Panel */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Input Configuration</h2>
            
            {/* Prompt Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Task Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the overall task you want the robots to accomplish..."
                className="w-full h-32 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Environment Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Environment JSON
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full px-4 py-3 bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400 mr-2" />
                  <span className="text-slate-300">
                    {environment ? 'Environment Loaded ✓' : 'Upload Environment JSON'}
                  </span>
                </label>
              </div>
              {environment && (
                <div className="mt-2 p-2 bg-slate-900 rounded text-xs text-slate-400 max-h-24 overflow-auto">
                  {JSON.stringify(environment, null, 2)}
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                LLM Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="🆓 Free Models (Google Gemini)">
                  {models.filter(m => m.group === 'free').map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="💳 Paid Models">
                  {models.filter(m => m.group === 'paid').map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={generateRobotTasks}
              disabled={isProcessing || !prompt || !environment}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Generate Robot Tasks
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-300 text-sm font-medium mb-1">Error</p>
                    <pre className="text-red-200 text-xs whitespace-pre-wrap break-words">{error}</pre>
                    {error.includes("quota") && (
                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/50 rounded">
                        <p className="text-blue-300 text-xs font-medium mb-1">💡 Suggestion:</p>
                        <p className="text-blue-200 text-xs">
                          Try switching to a different model provider. You can use:
                        </p>
                        <ul className="text-blue-200 text-xs mt-1 ml-4 list-disc">
                          <li>Anthropic Claude models (if you have an Anthropic API key)</li>
                          <li>Grok models (if you have a Grok API key)</li>
                          <li>Or add billing credits to your current provider</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Robot Status Panel */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Robot Fleet</h2>
            <div className="space-y-4">
              {robots.map(robot => (
                <div
                  key={robot.id}
                  className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-3 h-3 rounded-full ${robot.color} mr-3`}></div>
                    <h3 className="font-semibold text-white">{robot.name}</h3>
                    {robotTasks && robotTasks[robot.role] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">All robots have the same capabilities</p>
                  {robotTasks && robotTasks[robot.role] && (
                    <div className="mt-2 p-3 bg-slate-800 rounded border border-slate-600">
                      <p className="text-sm text-slate-300">{robotTasks[robot.role]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visualization Panel */}
        {environment && robotTasks && (
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Warehouse Grid Visualization</h2>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <WarehouseGridVisualization
                grid={getGridFromEnvironment()}
                robots={getRobotPositions()}
                tasks={getRobotTasks()}
                width={18}
                height={16}
              />
            </div>
          </div>
        )}

        {/* Task Output Panel */}
        {robotTasks && (
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Generated Task Distribution</h2>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <pre className="text-sm text-slate-300 overflow-auto">
                {JSON.stringify(robotTasks, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotOrchestrationSystem;