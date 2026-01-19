# Warehouse Agentic Graph System Architecture

## Overview

This system implements a LangGraph-based agentic loop for warehouse robot control, following the architecture described in the research paper. The system uses a cyclic workflow with 5 functional nodes connected by edges, with a shared state structure for data exchange.

## System Architecture (Fig. 1)

### Graph Structure

The workflow is implemented as a directed graph with the following nodes:

```
START → Node 1 → Node 2 → Node 3 → Node 4 → Node 5 → [Conditional Edge]
                                                          ↓
                                                    Continue/End
```

### Node Descriptions

#### Node 1: Process Natural Language Commands
- **Function**: `processUserCommand()`
- **Purpose**: Processes natural language commands entered by human operator
- **Input**: User command from state
- **Output**: Stores command in state, increments iteration counter

#### Node 2: Query Robot Statuses and Sensor Data
- **Function**: `queryRobotStatus()`
- **Purpose**: Queries real-time statuses of robots and sensor data
- **Note**: MQTT broker integration is simulated (not implemented)
- **Output**: Robot positions, battery levels, sensor readings stored in state

#### Node 3: LLM Reasoning Node
- **Function**: `llmReasoningNode()`
- **Purpose**: Builds structured prompt and calls LLM API
- **Input**: State data (environment, robot statuses, user command)
- **Output**: Robot commands and human-readable response stored in state

#### Node 4: Execute Commands
- **Function**: `executeCommands()`
- **Purpose**: Breaks down individual commands and prepares them for robots
- **Note**: MQTT broadcasting is simulated (commands stored in state)
- **Output**: Executed commands array in state

#### Node 5: Broadcast Response
- **Function**: `broadcastResponse()`
- **Purpose**: Reads human-readable response and prepares for operator interface
- **Note**: MQTT broadcasting is simulated (message stored in state)
- **Output**: Operator message in state

### Conditional Edge

After Node 5, a conditional edge checks:
- If `taskComplete` is true → END
- If `iteration >= maxIterations` → END
- Otherwise → Continue to Node 1 (new iteration)

## State Structure

The shared state (`WarehouseState`) contains:

```typescript
{
  userCommand: string;              // Node 1 output
  robotStatuses: {...};             // Node 2 output
  sensorData: {...};                // Node 2 output
  llmPrompt: string;                // Node 3 input/output
  llmResponse: string;              // Node 3 output
  robotCommands: {...};             // Node 3 output
  humanReadableResponse: string;    // Node 3 output
  executedCommands: Array<...>;     // Node 4 output
  operatorMessage: string;          // Node 5 output
  iteration: number;                // Control flow
  shouldContinue: boolean;          // Control flow
  taskComplete: boolean;            // Control flow
  environmentMatrix: string[][];    // 18x16 grid
  evaluationMetrics: {...};          // Evaluation data
}
```

## Environment Representation (Fig. 3)

The warehouse environment is represented as an **18x16 matrix** where:
- Each cell = 1x1 meter physical space
- **Cell Types**:
  - `.` = Empty space
  - `S` = Shelf
  - `O` = Obstacle
  - `R` = Robot position
  - `C` = Charging station

The matrix is converted to text format for LLM processing, enabling the model to understand spatial relationships, obstacles, and pathways.

## LLM Prompt Design (Table I)

The prompt is structured with 6 sections:

### 1. Role Definition (Constant)
Establishes AI's operational identity and primary objective.

### 2. Environment Representation (Constant)
Provides the fixed 18x16 spatial model as text format.

### 3. System State Input (Variable)
Supplies dynamic, real-time data:
- Current robot positions and battery levels
- Sensor data (temperature, humidity, obstacles)

### 4. Operational Commands (Variable)
User-defined tasks or goals from the natural language input.

### 5. Constraints & Rules (Constant)
Hard rules and safety protocols:
- Safety: Robots with battery < 20% must charge
- Collision avoidance
- Path optimization
- Task priority
- Battery management
- Logical allocation

### 6. Output Format Specification (Constant)
Mandates precise JSON structure:
```json
{
  "navigation": "...",
  "manipulation": "...",
  "sensing": "...",
  "communication": "..."
}
```

## Test Scenarios

Four test scenarios are implemented:

1. **Simple Route Generation**: Basic task allocation
2. **Critical Battery Conditions**: Safety requirements for low battery
3. **Joint Routes for Multiple Tasks**: Multi-robot coordination
4. **Stress Test**: Priority delivery, charging, and inventory checks

## Evaluation Criteria (Table II)

| Metric | Weight | Scoring |
|--------|--------|---------|
| A. Response Time | 20% | <30s=20, 30-60s=15, 60-90s=10, >90s=5 |
| B. JSON Validity | 15% | Valid JSON=5, All robots present=5, Correct structure=5 |
| C. Safety Compliance | 25% | Critical robots to charge=10, Battery check in report=10, Safe paths=5 |
| D. Task Allocation | 20% | Logical robot selection=10, Task completion plan=10 |
| E. Path Quality | 20% | No shelf collisions=10, Collision avoidance=10 |
| **Total** | **100%** | |

## PDF Report Generation

The system generates comprehensive PDF reports containing:
- Test summary (total tests, passed/failed, average score)
- Evaluation criteria table
- Individual test results with:
  - Scenario details
  - Evaluation scores for each metric
  - Generated robot commands
  - Total score and percentage

## Implementation Notes

- **MQTT Integration**: Simulated (not implemented) - commands and statuses are stored in state
- **Graph Execution**: Custom implementation compatible with Next.js (no external LangGraph dependency)
- **LLM Providers**: Supports Anthropic Claude, OpenAI GPT, xAI Grok, and Google Gemini
- **Environment Matrix**: 18x16 grid with automatic text formatting for LLM

## File Structure

```
lib/
├── langgraph-workflow.ts    # Graph nodes and execution
├── environment-matrix.ts    # 18x16 matrix representation
├── test-scenarios.ts        # 4 test scenarios
├── evaluation.ts            # Scoring system (Table II)
├── pdf-generator.ts         # PDF report generation
└── llm-providers.ts         # LLM provider implementations

app/api/
└── test-scenarios/
    └── route.ts             # API endpoint for running tests

components/
└── TestScenarioRunner.tsx   # UI for test execution
```
