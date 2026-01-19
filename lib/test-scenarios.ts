/**
 * Test Scenarios for Warehouse Robot Control System
 */

export interface TestScenario {
  id?: string;
  role: {
    description: string;
    responsibilities: string[];
  };
  warehouseMap: {
    dimensions: {
      rows: number;
      columns: number;
      gridIndices: string;
    };
    legend: {
      [key: string]: string;
    };
    specialZones: {
      chargingArea: number[];
      loadingArea: number[];
      unloadingArea: number[];
    };
    grid: string[][];
  };
  globalState: {
    robots: {
      [robotId: string]: {
        position: { row: number; col: number };
        batteryPercent: number;
        status?: string;
        chargingStationId?: number;
      };
    };
  };
  operatorCommands: {
    taskPool: Array<{
      taskId: string;
      description: string;
      destination?: { row: number; col: number };
      targetCoordinate?: { row: number; col: number };
      shelves?: number[];
    }>;
  };
  agentInstructions: {
    allocation: string;
    safety: string;
    constraints: string[];
  };
  expectedOutputFormat: {
    allocationSummary: string;
    paths: {
      [robotId: string]: string;
    };
  };
}

export const testScenarios: TestScenario[] = [
  {
  id: "scenario-1",
  role: {
    description: "Autonomous Central Dispatcher for an IIoT Warehouse",
    responsibilities: [
      "Control 4 robots on an 18x16 grid",
      "Allocate tasks efficiently",
      "Ensure battery safety",
      "Generate collision-free paths"
    ]
  },

  warehouseMap: {
    dimensions: {
      rows: 16,
      columns: 18,
      gridIndices: "0-287"
    },
    legend: {
      ".": "Path",
      S: "Shelf (Obstacle)",
      C: "Charging Area",
      L: "Loading Area",
      U: "Unloading Area"
    },
    specialZones: {
      chargingArea: [270, 271, 272, 273],
      loadingArea: [277, 278, 279, 280],
      unloadingArea: [284, 285, 286, 287]
    },
    grid: [
      ["R1",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R3",".","."],
      ["C","C","C","C",".",".","L","L","L","L",".",".","U","U","U","U",".","R2"]
    ]
  },

  globalState: {
    robots: {
      R1: {
        position: { row: 0, col: 0 },
        batteryPercent: 85
      },
      R2: {
        position: { row: 15, col: 17 },
        batteryPercent: 75
      },
      R3: {
        position: { row: 14, col: 16 },
        batteryPercent: 90
      },
      R4: {
        position: { row: 13, col: 0 }, // Moved from (15,0) charging area to (13,0) path
        batteryPercent: 100, // Start at 100% battery
        status: "working" // Start as working, not at charging station
      }
    }
  },

  operatorCommands: {
    taskPool: [
      {
        taskId: "Alpha",
        description: "Move 1 item from Loading Area to Shelf 97",
        destination: { row: 5, col: 13 }
      },
      {
        taskId: "Beta",
        description: "Move 1 item from Unloading Area to Shelf 38",
        destination: { row: 2, col: 2 }
      },
      {
        taskId: "Gamma",
        description: "Move 1 item from Loading Area to Shelf 42",
        destination: { row: 2, col: 6 }
      }
    ]
  },

  agentInstructions: {
    allocation:
      "Assign tasks based on distance and battery health. Robots may perform multiple tasks sequentially.",
    safety:
      "Robots with battery below 20% must go to charging stations (270-273) and cannot accept tasks.",
    constraints: [
      "No shelf collisions",
      "No multi-robot collisions at the same coordinate and time"
    ]
  },

  expectedOutputFormat: {
    allocationSummary:
      "Explain task-to-robot assignment and charging decisions",
    paths: {
      R1: "[[row, col], ...]",
      R2: "[[row, col], ...]",
      R3: "[[row, col], ...]",
      R4: "[[row, col], ...]"
    }
  }
  },
 {
  id: "scenario-2",
  role: {
    description: "Autonomous Central Dispatcher for an IIoT Warehouse",
    responsibilities: [
      "Control 4 robots on an 18x16 grid",
      "Allocate tasks efficiently",
      "Ensure battery safety",
      "Generate collision-free paths"
    ]
  },

  warehouseMap: {
    dimensions: {
      rows: 16,
      columns: 18,
      gridIndices: "0-287"
    },
    legend: {
      ".": "Path",
      S: "Shelf (Obstacle)",
      C: "Charging Area",
      L: "Loading Area",
      U: "Unloading Area"
    },
    specialZones: {
      chargingArea: [270, 271, 272, 273],
      loadingArea: [277, 278, 279, 280],
      unloadingArea: [284, 285, 286, 287]
    },
    grid: [
      ["R1",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R3",".","."],
      ["C","R4","C","C",".",".","L","L","L","L",".",".","U","U","U","U",".","R2"]
    ]
  },

  globalState: {
    robots: {
      R1: {
        position: { row: 0, col: 0 },
        batteryPercent: 88
      },
      R2: {
        position: { row: 15, col: 17 },
        batteryPercent: 14,
        status: "CRITICAL"
      },
      R3: {
        position: { row: 14, col: 16 },
        batteryPercent: 92
      },
      R4: {
        position: { row: 15, col: 1 },
        batteryPercent: 19,
        status: "CRITICAL"
      }
    }
  },

  operatorCommands: {
    taskPool: [
      {
        taskId: "Alpha",
        description: "Move 1 item from Loading Area to Shelf 97",
        destination: { row: 5, col: 13 }
      },
      {
        taskId: "Beta",
        description: "Move 1 item from Unloading Area to Shelf 38",
        destination: { row: 2, col: 2 }
      },
      {
        taskId: "Gamma",
        description: "Move 1 item from Loading Area to Shelf 42",
        destination: { row: 2, col: 6 }
      }
    ]
  },

  agentInstructions: {
    allocation:
      "Assign tasks based on distance and battery health. Robots may perform multiple tasks sequentially.",
    safety:
      "Robots with battery below 20% must go to charging stations (270-273) and cannot accept tasks.",
    constraints: [
      "No shelf collisions",
      "No multi-robot collisions at the same coordinate and time"
    ]
  },

  expectedOutputFormat: {
    allocationSummary:
      "Explain which robot was assigned to which task and why R2/R4 were sent to charge.",
    paths: {
      R1: "[[row, col], ...]",
      R2: "[[row, col], ...]",
      R3: "[[row, col], ...]",
      R4: "[[row, col], ...]"
    }
  }
},
 {
  id: "scenario-3",
  role: {
    description: "Autonomous Central Dispatcher for an IIoT Warehouse",
    responsibilities: [
      "Control 4 robots on an 18x16 grid",
      "Allocate tasks efficiently",
      "Ensure battery safety",
      "Generate collision-free paths"
    ]
  },

  warehouseMap: {
    dimensions: {
      rows: 16,
      columns: 18,
      gridIndices: "0-287"
    },
    legend: {
      ".": "Path",
      S: "Shelf (Obstacle)",
      C: "Charging Area",
      L: "Loading Area",
      U: "Unloading Area"
    },
    specialZones: {
      chargingArea: [270, 271, 272, 273],
      loadingArea: [277, 278, 279, 280],
      unloadingArea: [284, 285, 286, 287]
    },
    grid: [
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","R3",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R1",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R2",".","."],
      ["C","C","C","C",".",".","L","L","L","L",".",".","U","U","U","U","R4","."]
    ]
  },

  globalState: {
    robots: {
      R1: {
        position: { row: 12, col: 16 },
        batteryPercent: 45
      },
      R2: {
        position: { row: 14, col: 16 },
        batteryPercent: 65
      },
      R3: {
        position: { row: 7, col: 1 },
        batteryPercent: 32
      },
      R4: {
        position: { row: 15, col: 16 },
        batteryPercent: 85
      }
    }
  },

  operatorCommands: {
    taskPool: [
      {
        taskId: "Alpha",
        description:
          "Collect 2 items from Loading Area and deliver to Unloading Area"
      },
      {
        taskId: "Beta",
        description:
          "Move 1 item from Shelf 97 to Loading Area"
      },
      {
        taskId: "Gamma",
        description:
          "Relocate items from Shelf 38 to Shelf 213"
      },
      {
        taskId: "Delta",
        description:
          "Perform emergency battery check on all robots"
      }
    ]
  },

  agentInstructions: {
    allocation:
      "Assign tasks based on distance and battery health. Robots may perform multiple tasks sequentially.",
    safety:
      "Robots with battery below 20% must go to charging stations (270-273) and cannot accept tasks.",
    constraints: [
      "No shelf collisions",
      "No multi-robot collisions at the same coordinate and time"
    ]
  },

  expectedOutputFormat: {
    allocationSummary:
      "Explain which robot was assigned to which task and why R2/R4 were sent to charge.",
    paths: {
      R1: "[[row, col], ...]",
      R2: "[[row, col], ...]",
      R3: "[[row, col], ...]",
      R4: "[[row, col], ...]"
    }
  }
},
 {
  id: "scenario-4",
  role: {
    description: "Autonomous Central Dispatcher for an IIoT Warehouse",
    responsibilities: [
      "Control 4 robots on an 18x16 grid",
      "Allocate tasks efficiently",
      "Ensure battery safety",
      "Generate collision-free paths"
    ]
  },

  warehouseMap: {
    dimensions: {
      rows: 16,
      columns: 18,
      gridIndices: "0-287"
    },
    legend: {
      ".": "Path",
      S: "Shelf (Obstacle)",
      C: "Charging Area",
      L: "Loading Area",
      U: "Unloading Area"
    },
    specialZones: {
      chargingArea: [270, 271, 272, 273],
      loadingArea: [277, 278, 279, 280],
      unloadingArea: [284, 285, 286, 287]
    },
    grid: [
      ["R1",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".","S","S",".",".","S","S",".",".","S","S",".",".","S","S",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R3","."],
      [".",".",".",".",".",".",".",".",".",".",".",".",".",".",".","R2",".","."],
      ["C","C","C","C",".",".","L","L","L","L",".",".","U","U","U","U",".","R4"]
    ]
  },

  globalState: {
    robots: {
      R1: {
        position: { row: 0, col: 0 },
        batteryPercent: 25,
        status: "NEAR_CRITICAL"
      },
      R2: {
        position: { row: 14, col: 16 },
        batteryPercent: 18,
        status: "CRITICAL"
      },
      R3: {
        position: { row: 13, col: 16 },
        batteryPercent: 35
      },
      R4: {
        position: { row: 15, col: 17 },
        batteryPercent: 85
      }
    }
  },

  operatorCommands: {
    taskPool: [
      {
        taskId: "Alpha",
        description:
          "Process all 4 pending deliveries from Loading to Unloading"
      },
      {
        taskId: "Beta",
        description:
          "Send robot with lowest battery to charge immediately"
      },
      {
        taskId: "Gamma",
        description:
          "Clear path for emergency maintenance at coordinate (6,8)",
        targetCoordinate: { row: 6, col: 8 }
      },
      {
        taskId: "Delta",
        description:
          "Perform inventory check at Shelves 38, 97, and 213",
        shelves: [38, 97, 213]
      }
    ]
  },

  agentInstructions: {
    allocation:
      "Assign tasks based on distance and battery health. Robots may perform multiple tasks sequentially.",
    safety:
      "Robots with battery below 20% must go to charging stations (270-273) and cannot accept tasks.",
    constraints: [
      "No shelf collisions",
      "No multi-robot collisions at the same coordinate and time"
    ]
  },

  expectedOutputFormat: {
    allocationSummary:
      "Explain which robot was assigned to which task and why R2/R4 were sent to charge.",
    paths: {
      R1: "[[row, col], ...]",
      R2: "[[row, col], ...]",
      R3: "[[row, col], ...]",
      R4: "[[row, col], ...]"
    }
  }
},
];
