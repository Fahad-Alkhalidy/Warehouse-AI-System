/**
 * Robot Service Classes
 * All robots have the same capabilities and can perform any task
 */

import type { RobotTasks } from './llm-providers';

export interface RobotTask {
  robotId: string;
  robotName: string;
  task: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: Date;
  path?: Array<[number, number]>; // Path as array of [row, col] coordinates
}

export class Robot {
  protected id: string;
  protected name: string;
  protected currentTask: string | null = null;
  public status: "idle" | "working" | "error" | "charging" = "working"; // Default to working
  protected position: { row: number; col: number } = { row: 0, col: 0 };
  protected battery: number = 100;

  constructor(id: string, name: string, initialPosition?: { row: number; col: number }, initialBattery?: number) {
    this.id = id;
    this.name = name;
    if (initialPosition) {
      this.position = initialPosition;
    }
    if (initialBattery !== undefined) {
      this.battery = initialBattery;
    }
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getStatus(): "idle" | "working" | "error" | "charging" {
    return this.status;
  }

  getCurrentTask(): string | null {
    return this.currentTask;
  }

  getPosition(): { row: number; col: number } {
    return this.position;
  }

  getBattery(): number {
    return this.battery;
  }

  setPosition(position: { row: number; col: number }): void {
    this.position = position;
  }

  setBattery(battery: number): void {
    this.battery = battery;
  }

  // All robots have the same capabilities
  getCapabilities(): string[] {
    return [
      "Path planning and route optimization",
      "Obstacle avoidance",
      "Spatial positioning and mapping",
      "Movement coordination",
      "Location tracking",
      "Object grasping and manipulation",
      "Precision movement",
      "Tool usage",
      "Object placement",
      "Physical interaction",
      "Environmental data collection",
      "Object detection and recognition",
      "Sensor data monitoring",
      "Condition assessment",
      "Real-time data gathering",
      "Inter-robot coordination",
      "Status reporting",
      "Task synchronization",
      "Message routing",
      "System monitoring",
    ];
  }

  async executeTask(task: string): Promise<void> {
    this.currentTask = task;
    this.status = "working";
    
    // Simulate task execution
    // In a real system, this would interface with actual robot hardware/API
    console.log(`[${this.name}] Executing task: ${task}`);
    
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    this.status = "idle";
    this.currentTask = null;
  }
}

export class RobotOrchestrator {
  private robots: Map<string, Robot>;

  constructor() {
    this.robots = new Map();
    // Initialize 4 robots with same capabilities - all start at 100% battery and working status
    // R4 moved from (15,0) which is in charging area to (13,0) which is a path
    const r1 = new Robot("R1", "Robot R1", { row: 0, col: 0 }, 100);
    const r2 = new Robot("R2", "Robot R2", { row: 15, col: 17 }, 100);
    const r3 = new Robot("R3", "Robot R3", { row: 14, col: 16 }, 100);
    const r4 = new Robot("R4", "Robot R4", { row: 13, col: 0 }, 100); // Moved from charging area to path
    
    // Set all robots to working status
    r1.status = "working";
    r2.status = "working";
    r3.status = "working";
    r4.status = "working";
    
    this.robots.set("R1", r1);
    this.robots.set("R2", r2);
    this.robots.set("R3", r3);
    this.robots.set("R4", r4);
  }

  getRobot(robotId: string): Robot | undefined {
    return this.robots.get(robotId);
  }

  getAllRobots(): Robot[] {
    return Array.from(this.robots.values());
  }

  async distributeTasks(tasks: RobotTasks): Promise<RobotTask[]> {
    const robotTasks: RobotTask[] = [];

    for (const [robotId, task] of Object.entries(tasks)) {
      if (task === undefined || !task) continue; // Skip undefined or empty tasks
      
      const robot = this.robots.get(robotId);
      if (robot) {
        // Extract path from task if present (format: path: [[row, col], ...])
        let path: Array<[number, number]> | undefined;
        try {
          const pathMatch = task.match(/path:\s*(\[[\s\S]*?\])/i);
          if (pathMatch) {
            path = JSON.parse(pathMatch[1]);
          }
        } catch (e) {
          // Path parsing failed, continue without path
        }

        const robotTask: RobotTask = {
          robotId,
          robotName: robot.getName(),
          task,
          status: "pending",
          timestamp: new Date(),
          path,
        };
        robotTasks.push(robotTask);

        // Execute task asynchronously
        robot.executeTask(task).then(() => {
          robotTask.status = "completed";
        }).catch(() => {
          robotTask.status = "failed";
        });
      }
    }

    return robotTasks;
  }
}
