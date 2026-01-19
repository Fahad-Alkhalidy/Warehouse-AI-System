"use client";
import React, { useState, useEffect } from 'react';
import { 
  Battery, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Zap,
  Activity
} from 'lucide-react';

interface RobotStatus {
  robotId: string;
  robotName: string;
  status: 'idle' | 'working' | 'error' | 'charging';
  currentTask: string | null;
  batteryPercent: number;
  position: { row: number; col: number };
  tasksCompleted: number;
  tasksInQueue: number;
  lastUpdated: string;
  capabilities: string[];
}

interface RobotStatusDashboardProps {
  robots: RobotStatus[];
  onRefresh?: () => void;
}

const RobotStatusDashboard: React.FC<RobotStatusDashboardProps> = ({ 
  robots, 
  onRefresh 
}) => {
  const [selectedRobot, setSelectedRobot] = useState<string | null>(
    robots.length > 0 ? robots[0].robotId : null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'idle':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'charging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <Activity className="w-5 h-5" />;
      case 'idle':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'charging':
        return <Zap className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const selectedRobotData = robots.find(r => r.robotId === selectedRobot);
  const batteryColor = 
    selectedRobotData && selectedRobotData.batteryPercent < 20 ? 'text-red-600' :
    selectedRobotData && selectedRobotData.batteryPercent < 50 ? 'text-yellow-600' :
    'text-green-600';

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Robot Status Monitor</h2>
        <p className="text-slate-600 text-sm">Real-time monitoring of warehouse robots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {robots.map((robot) => (
          <div
            key={robot.robotId}
            onClick={() => setSelectedRobot(robot.robotId)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedRobot === robot.robotId
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{robot.robotName}</h3>
              <div className={`p-2 rounded-full ${getStatusColor(robot.status)}`}>
                {getStatusIcon(robot.status)}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Battery:</span>
                <span className={`font-medium ${batteryColor}`}>
                  {robot.batteryPercent}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tasks Done:</span>
                <span className="font-medium">{robot.tasksCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">In Queue:</span>
                <span className="font-medium">{robot.tasksInQueue}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedRobotData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            {selectedRobotData.robotName} - Detailed Status
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            {/* Status */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Status</p>
              <div className={`flex items-center gap-2 ${getStatusColor(selectedRobotData.status)} p-2 rounded`}>
                {getStatusIcon(selectedRobotData.status)}
                <span className="capitalize font-semibold">
                  {selectedRobotData.status}
                </span>
              </div>
            </div>

            {/* Battery */}
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Battery Level</p>
              <div className="flex items-center gap-2">
                <Battery className={`w-6 h-6 ${batteryColor}`} />
                <div className="flex-1">
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedRobotData.batteryPercent < 20 ? 'bg-red-500' :
                        selectedRobotData.batteryPercent < 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${selectedRobotData.batteryPercent}%` }}
                    ></div>
                  </div>
                  <span className="font-semibold">{selectedRobotData.batteryPercent}%</span>
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Position</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">
                  Row {selectedRobotData.position.row}, Col {selectedRobotData.position.col}
                </span>
              </div>
            </div>

            {/* Tasks Completed */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Tasks Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {selectedRobotData.tasksCompleted}
              </p>
            </div>

            {/* Queue */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Tasks in Queue</p>
              <p className="text-3xl font-bold text-orange-600">
                {selectedRobotData.tasksInQueue}
              </p>
            </div>

            {/* Last Updated */}
            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-slate-600 text-sm font-medium mb-2">Last Updated</p>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">{selectedRobotData.lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Current Task */}
          {selectedRobotData.currentTask && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Current Task</p>
              <p className="text-slate-800 font-semibold">{selectedRobotData.currentTask}</p>
            </div>
          )}

          {/* Capabilities */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Capabilities</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {selectedRobotData.capabilities.map((capability, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-100 rounded text-sm text-slate-700 border border-slate-200"
                >
                  • {capability}
                </div>
              ))}
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RobotStatusDashboard;
