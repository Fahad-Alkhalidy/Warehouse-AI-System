"use client";

import TestScenarioRunner from "@/components/TestScenarioRunner";
import RobotStatusDashboard from "@/components/RobotStatusDashboard";

export default function HomePage() {
  // Sample robot data - all robots have the same capabilities
  const commonCapabilities = [
    'Path planning', 'Route optimization', 'Obstacle avoidance', 'Location tracking',
    'Object grasping', 'Precision movement', 'Tool usage', 'Object placement',
    'Object detection', 'Environmental monitoring', 'Data collection',
    'Inter-robot coordination', 'Status reporting', 'Task synchronization'
  ];

  const mockRobots = [
    {
      robotId: 'R1',
      robotName: 'Robot R1',
      status: 'working' as const,
      currentTask: 'Ready for task assignment',
      batteryPercent: 100,
      position: { row: 0, col: 0 },
      tasksCompleted: 0,
      tasksInQueue: 0,
      lastUpdated: new Date().toLocaleTimeString(),
      capabilities: commonCapabilities
    },
    {
      robotId: 'R2',
      robotName: 'Robot R2',
      status: 'working' as const,
      currentTask: 'Ready for task assignment',
      batteryPercent: 100,
      position: { row: 15, col: 17 },
      tasksCompleted: 0,
      tasksInQueue: 0,
      lastUpdated: new Date().toLocaleTimeString(),
      capabilities: commonCapabilities
    },
    {
      robotId: 'R3',
      robotName: 'Robot R3',
      status: 'working' as const,
      currentTask: 'Ready for task assignment',
      batteryPercent: 100,
      position: { row: 14, col: 16 },
      tasksCompleted: 0,
      tasksInQueue: 0,
      lastUpdated: new Date().toLocaleTimeString(),
      capabilities: commonCapabilities
    },
    {
      robotId: 'R4',
      robotName: 'Robot R4',
      status: 'working' as const,
      currentTask: 'Ready for task assignment',
      batteryPercent: 100,
      position: { row: 13, col: 0 }, // Moved from (15,0) charging area to (13,0) path
      tasksCompleted: 0,
      tasksInQueue: 0,
      lastUpdated: new Date().toLocaleTimeString(),
      capabilities: commonCapabilities
    }
  ];

  const handleRefresh = () => {
    console.log('Refreshing robot status...');
    // Add your refresh logic here
  };

  return (
    <div className="space-y-8 p-4">
      <RobotStatusDashboard robots={mockRobots} onRefresh={handleRefresh} />
      <TestScenarioRunner />
    </div>
  );
}
