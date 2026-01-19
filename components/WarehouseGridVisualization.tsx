"use client";
import React from 'react';
import { MapPin, Battery } from 'lucide-react';

interface RobotPosition {
  row: number;
  col: number;
  battery?: number;
  status?: string;
}

interface RobotTask {
  robotId: string;
  task: string;
  path?: Array<[number, number]>;
}

interface WarehouseGridVisualizationProps {
  grid: string[][]; // 18x16 grid
  robots: {
    [robotId: string]: RobotPosition;
  };
  tasks?: {
    [robotId: string]: RobotTask;
  };
  width?: number; // Grid width (columns)
  height?: number; // Grid height (rows)
}

const WarehouseGridVisualization: React.FC<WarehouseGridVisualizationProps> = ({
  grid,
  robots,
  tasks = {},
  width = 18,
  height = 16,
}) => {
  const getCellContent = (row: number, col: number): { content: string; type: string; robotId?: string } => {
    // FIRST: Check if there's a robot at this position from the robots prop
    // This takes precedence over grid data
    for (const [robotId, robotPos] of Object.entries(robots)) {
      if (robotPos.row === row && robotPos.col === col) {
        return { content: robotId, type: 'robot', robotId };
      }
    }

    // SECOND: Check grid content (grid is row-major: grid[row][col])
    // Only show grid content if there's NO robot at this position from the robots prop
    if (grid && Array.isArray(grid) && grid[row] && Array.isArray(grid[row]) && grid[row][col]) {
      const cell = grid[row][col];
      
      // Skip robot markers in grid if we have that robot in props (to avoid duplicates)
      if (cell.startsWith('R')) {
        // Check if this robot ID exists in the robots prop (regardless of position)
        // If it exists in props, don't show the grid marker to avoid duplicates
        const robotIdFromGrid = cell; // e.g., "R3"
        const hasRobotInProps = Object.keys(robots).includes(robotIdFromGrid);
        if (hasRobotInProps) {
          // This robot exists in props, so hide the grid marker to avoid showing it twice
          return { content: '.', type: 'path' };
        }
        // Robot doesn't exist in props, so show the grid marker
        return { content: cell, type: 'robot', robotId: cell };
      }
      
      // Handle other grid content
      if (cell === 'S') return { content: 'S', type: 'shelf' };
      if (cell === 'C') return { content: 'C', type: 'charging' };
      if (cell === 'L') return { content: 'L', type: 'loading' };
      if (cell === 'U') return { content: 'U', type: 'unloading' };
    }

    return { content: '.', type: 'path' };
  };

  // Helper function to check if a cell is an obstacle
  const isObstacle = (row: number, col: number): boolean => {
    if (!grid || !Array.isArray(grid) || row < 0 || row >= grid.length) return false;
    if (!Array.isArray(grid[row]) || col < 0 || col >= grid[row].length) return false;
    const cell = grid[row][col];
    // Obstacles are: 'S' (shelf), and potentially other non-traversable cells
    // Note: 'C' (charging), 'L' (loading), 'U' (unloading) are traversable
    return cell === 'S';
  };

  // Generate all cells in a path by interpolating between waypoints
  // Uses pathfinding to avoid obstacles when interpolating
  const getPathCells = (robotId: string): Set<string> => {
    const task = tasks[robotId];
    if (!task || !task.path || !Array.isArray(task.path) || task.path.length === 0) {
      return new Set();
    }

    const pathCells = new Set<string>();
    
    // Simple pathfinding helper: find a path between two points avoiding obstacles
    // Uses simple linear interpolation but skips obstacle cells
    const findPathBetween = (start: [number, number], end: [number, number]): Array<[number, number]> => {
      const [r1, c1] = start;
      const [r2, c2] = end;
      const path: Array<[number, number]> = [];
      
      // Calculate steps needed
      const rowDiff = Math.abs(r2 - r1);
      const colDiff = Math.abs(c2 - c1);
      const steps = Math.max(rowDiff, colDiff);
      
      // Simple linear interpolation, but skip obstacle cells
      for (let step = 0; step <= steps; step++) {
        const ratio = steps > 0 ? step / steps : 0;
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const c = Math.round(c1 + (c2 - c1) * ratio);
        
        // Only add if not an obstacle and within bounds
        if (!isObstacle(r, c) && r >= 0 && r < (grid?.length || 16) && c >= 0 && c < (grid?.[r]?.length || 18)) {
          path.push([r, c]);
        }
      }
      
      return path;
    };
    
    // Add all waypoints (but skip if they're obstacles)
    task.path.forEach(([r, c]) => {
      const row = Number(r);
      const col = Number(c);
      // Only add if not an obstacle
      if (!isObstacle(row, col)) {
        pathCells.add(`${row},${col}`);
      }
    });

    // Interpolate between consecutive waypoints using pathfinding
    for (let i = 0; i < task.path.length - 1; i++) {
      const [r1, c1] = task.path[i];
      const [r2, c2] = task.path[i + 1];
      
      const row1 = Number(r1);
      const col1 = Number(c1);
      const row2 = Number(r2);
      const col2 = Number(c2);
      
      // Use pathfinding to find a path between waypoints that avoids obstacles
      const intermediatePath = findPathBetween([row1, col1], [row2, col2]);
      intermediatePath.forEach(([r, c]) => {
        if (!isObstacle(r, c)) {
          pathCells.add(`${r},${c}`);
        }
      });
    }
    
    return pathCells;
  };

  // Pre-compute path cells for all robots for better performance
  const pathCellsMap: { [robotId: string]: Set<string> } = {};
  Object.keys(tasks || {}).forEach(robotId => {
    const pathCells = getPathCells(robotId);
    pathCellsMap[robotId] = pathCells;
    // Debug logging
    if (typeof window !== 'undefined' && pathCells.size > 0) {
      console.log(`Path cells computed for ${robotId}: ${pathCells.size} cells`);
    }
  });

  const isInPath = (row: number, col: number, robotId: string): boolean => {
    // Use pre-computed path cells for better performance
    const pathCells = pathCellsMap[robotId];
    if (!pathCells) return false;
    return pathCells.has(`${Number(row)},${Number(col)}`);
  };

  const getPathColor = (robotId: string): string => {
    const colors: { [key: string]: string } = {
      R1: 'bg-blue-300',
      R2: 'bg-green-300',
      R3: 'bg-purple-300',
      R4: 'bg-orange-300',
    };
    return colors[robotId] || 'bg-gray-300';
  };

  const getRobotColor = (robotId: string): string => {
    const colors: { [key: string]: string } = {
      R1: 'bg-blue-600 text-white',
      R2: 'bg-green-600 text-white',
      R3: 'bg-purple-600 text-white',
      R4: 'bg-orange-600 text-white',
    };
    return colors[robotId] || 'bg-gray-600 text-white';
  };

  const robotColors: { [key: string]: { bg: string; text: string; border: string } } = {
    R1: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    R2: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
    R3: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500' },
    R4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  };

  // Debug: Log what we're receiving
  if (typeof window !== 'undefined') {
    const pathsInfo: { [key: string]: { waypoints: number; cells: number; sample: string } } = {};
    Object.entries(tasks || {}).forEach(([robotId, task]) => {
      if (task?.path && Array.isArray(task.path) && task.path.length > 0) {
        const cells = pathCellsMap[robotId] || new Set();
        pathsInfo[robotId] = {
          waypoints: task.path.length,
          cells: cells.size,
          sample: JSON.stringify(task.path.slice(0, 3))
        };
      }
    });
    console.log('WarehouseGridVisualization props:', { 
      gridRows: grid?.length, 
      robotsCount: Object.keys(robots || {}).length,
      tasksCount: Object.keys(tasks || {}).length,
      pathsInfo
    });
  }

  return (
    <div className="w-full space-y-4">
      {/* Grid Visualization */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Warehouse Grid (18x16) - Showing Robots, Environment, and Paths</h3>
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-600"></div>
            {Array.from({ length: width }, (_, i) => (
              <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-600">
                {i}
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {Array.from({ length: height }, (_, row) => (
            <div key={row} className="flex">
              {/* Row header */}
              <div className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-600 border-r border-gray-300">
                {row}
              </div>
              
              {/* Grid cells */}
              {Array.from({ length: width }, (_, col) => {
                const cell = getCellContent(row, col);
                const isPath = Object.keys(tasks).some(robotId => isInPath(row, col, robotId));
                const pathRobotId = Object.keys(tasks).find(robotId => isInPath(row, col, robotId));
                // Check if this is a path start/end, but only if it's not an obstacle
                const isPathStart = pathRobotId && !isObstacle(row, col) && 
                                  tasks[pathRobotId]?.path?.[0]?.[0] === row && 
                                  tasks[pathRobotId]?.path?.[0]?.[1] === col;
                const isPathEnd = pathRobotId && !isObstacle(row, col) && 
                                  tasks[pathRobotId]?.path && tasks[pathRobotId].path.length > 0 && 
                                  tasks[pathRobotId].path[tasks[pathRobotId].path.length - 1]?.[0] === row && 
                                  tasks[pathRobotId].path[tasks[pathRobotId].path.length - 1]?.[1] === col;
                
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-bold relative ${
                      cell.type === 'robot'
                        ? `${getRobotColor(cell.robotId || '')} border-2 border-gray-800 z-10`
                        : cell.type === 'shelf'
                        ? 'bg-gray-800 text-white border-gray-600'
                        : cell.type === 'charging'
                        ? 'bg-yellow-200 text-yellow-900 border-yellow-400'
                        : cell.type === 'loading'
                        ? 'bg-blue-200 text-blue-900 border-blue-400'
                        : cell.type === 'unloading'
                        ? 'bg-green-200 text-green-900 border-green-400'
                        : isPath && pathRobotId
                        ? `${getPathColor(pathRobotId)} border-${pathRobotId === 'R1' ? 'blue' : pathRobotId === 'R2' ? 'green' : pathRobotId === 'R3' ? 'purple' : 'orange'}-600 border-2`
                        : 'bg-gray-50 text-gray-600 border-gray-300'
                    }`}
                    title={`Row ${row}, Col ${col}${cell.robotId ? ` - ${cell.robotId}` : ''}${isPath && pathRobotId ? ` - ${pathRobotId} path` : ''}${isPathStart ? ' (START)' : ''}${isPathEnd ? ' (END)' : ''}`}
                  >
                    {cell.type === 'robot' ? (
                      <span className="z-20 relative font-bold">{cell.content}</span>
                    ) : isPathStart ? (
                      <span className="text-xs font-bold">S</span>
                    ) : isPathEnd ? (
                      <span className="text-xs font-bold">E</span>
                    ) : (
                      cell.content
                    )}
                    {/* Path overlay - more visible */}
                    {isPath && pathRobotId && cell.type !== 'robot' && (
                      <div 
                        className={`absolute inset-0 ${getPathColor(pathRobotId)} opacity-60 border-2 ${
                          pathRobotId === 'R1' ? 'border-blue-600' : 
                          pathRobotId === 'R2' ? 'border-green-600' : 
                          pathRobotId === 'R3' ? 'border-purple-600' : 
                          'border-orange-600'
                        }`}
                        style={{ zIndex: 1 }}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-300"></div>
            <span>Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800"></div>
            <span>Shelf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200"></div>
            <span>Charging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200"></div>
            <span>Loading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200"></div>
            <span>Unloading</span>
          </div>
          {Object.keys(tasks).length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-300 border-2 border-blue-600"></div>
                <span>R1 Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-300 border-2 border-green-600"></div>
                <span>R2 Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-300 border-2 border-purple-600"></div>
                <span>R3 Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-300 border-2 border-orange-600"></div>
                <span>R4 Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">S</span>
                <span>Path Start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">E</span>
                <span>Path End</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Robot Tasks Panel */}
      {Object.keys(tasks).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Robot Tasks & Paths</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(tasks).map(([robotId, task]) => {
              const robot = robots[robotId];
              const colors = robotColors[robotId] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500' };
              
              return (
                <div
                  key={robotId}
                  className={`border-2 ${colors.border} rounded-lg p-4 ${colors.bg}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full ${getRobotColor(robotId)} flex items-center justify-center text-xs font-bold`}>
                      {robotId}
                    </div>
                    <h4 className={`font-bold ${colors.text}`}>{robotId}</h4>
                    {robot && (
                      <div className="ml-auto flex items-center gap-2 text-xs">
                        <Battery className="w-4 h-4" />
                        <span>{robot.battery || 'N/A'}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <p className={`text-sm ${colors.text} font-medium mb-1`}>Task:</p>
                    <p className={`text-sm ${colors.text}`}>{task.task}</p>
                  </div>
                  
                  {task.path && task.path.length > 0 && (
                    <div>
                      <p className={`text-sm ${colors.text} font-medium mb-1`}>Path ({task.path.length} steps):</p>
                      <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
                        <div className="text-xs font-mono text-gray-700">
                          {task.path.map(([row, col], idx) => (
                            <span key={idx} className="mr-2">
                              [{row},{col}]{idx < task.path!.length - 1 ? '→' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {robot && (
                    <div className="mt-2 text-xs text-gray-600">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Start: ({robot.row}, {robot.col})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseGridVisualization;
