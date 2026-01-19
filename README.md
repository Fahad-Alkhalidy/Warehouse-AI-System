# Warehouse AI Robot Orchestration System

A Next.js application that provides an intelligent system for orchestrating tasks across four unified robots using LLM-powered task generation and LangGraph-based cyclic workflows.

## Overview

This system implements a **LangGraph-based agentic loop** for warehouse robot control with:
- **Centralized Orchestration API**: Takes user prompts, environment JSON, and LLM model selection to generate specific tasks for each robot
- **Four Unified Robots (R1, R2, R3, R4)**: All robots have identical capabilities including navigation, manipulation, sensing, and communication
- **18x16 Warehouse Grid Visualization**: Interactive grid showing robot positions, paths, and environment
- **Test Scenario System**: Pre-built and custom test scenarios with automated evaluation
- **Path Planning with Obstacle Avoidance**: Automatic path generation that avoids shelves and obstacles

## Features

### Core Features
- 🤖 **Multi-robot task orchestration** - Intelligently divides tasks among 4 robots
- 🧠 **Multiple LLM providers** - Support for Anthropic Claude, OpenAI GPT, Google Gemini (FREE), and xAI Grok
- 📋 **JSON-based environment configuration** - Flexible warehouse layout definition
- 🎯 **Intelligent task distribution** - Proximity-based and workload-balanced task allocation
- 🖥️ **Modern, responsive UI** - Built with Next.js, TypeScript, and Tailwind CSS
- 📊 **Test scenario runner** - Automated testing with evaluation metrics
- 📄 **PDF report generation** - Detailed test reports with scores and analysis

### Visualization Features
- 🗺️ **Interactive warehouse grid** - 18x16 grid visualization with real-time updates
- 🎨 **Color-coded robot paths** - Distinct colors for each robot's path (R1=Blue, R2=Green, R3=Purple, R4=Orange)
- 🚧 **Obstacle avoidance visualization** - Paths automatically route around shelves
- 📍 **Path start/end markers** - Clear indication of path origins and destinations
- 🔄 **Continuous path rendering** - Smooth interpolation between waypoints

### Customization Features
- ✏️ **Custom scenario builder** - Create your own test scenarios with visual grid editor
- 💾 **LocalStorage persistence** - Custom scenarios saved in browser
- 🎛️ **Tabbed scenario editor** - Organized interface for Basic Info, Robots, Tasks, and Grid
- 🗑️ **Edit/Delete scenarios** - Manage your custom scenarios easily

### Technical Features
- 🔄 **Automatic retry logic** - Exponential backoff for transient API errors (503, 429, etc.)
- 🛡️ **Robust JSON parsing** - Handles malformed LLM responses with repair logic
- ⚡ **Path extraction** - Advanced regex and bracket counting for reliable path parsing
- 🚫 **Obstacle filtering** - Automatic removal of paths through shelves
- 📈 **Performance metrics** - Response time, JSON validity, safety compliance tracking

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- API keys for at least one LLM provider (Gemini is FREE):
  - **Google Gemini API key** (FREE) - Recommended for testing
  - Anthropic API key (for Claude models)
  - OpenAI API key (for GPT models)
  - xAI API key (for Grok models)

### Installation

1. Clone the repository and navigate to the project:
```bash
cd warehouse-ai-system
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your API keys (at least one):
```env
# FREE option - Recommended for testing
GEMINI_API_KEY=your_gemini_api_key_here

# Paid options
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GROK_API_KEY=your_grok_api_key_here
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Test Scenario Runner (Main Interface)

1. **Select LLM Model**: Choose from available models (Gemini 1.5 Flash is FREE and recommended)
2. **Select Test Scenarios**: Check one or more pre-built scenarios, or create custom ones
3. **Run Tests**: Click "Run Test Scenarios" to execute
4. **View Results**: See evaluation scores, robot tasks, paths, and grid visualization
5. **Download PDF**: Export detailed test reports as PDF

### Creating Custom Scenarios

1. Click the **"Custom"** button next to "Test Scenarios"
2. Fill in the scenario details:
   - **Basic Info**: Scenario ID and description
   - **Robots**: Set starting positions for R1, R2, R3, R4
   - **Tasks**: Add tasks to the task pool
   - **Warehouse Grid**: Click cells to toggle between Path, Shelf, Charging, Loading, Unloading
3. Click **"Save Scenario"** to add it to your list
4. Custom scenarios are saved in browser localStorage

### Robot Orchestration (Alternative Interface)

1. **Enter a Task Prompt**: Describe the overall task you want the robots to accomplish
2. **Upload Environment JSON**: Provide a JSON file representing the robot environment
3. **Select LLM Model**: Choose from available models
4. **Generate Tasks**: Click "Generate Robot Tasks" to let the system create specific tasks for each robot
5. **View Results**: See the generated tasks displayed for each robot with paths

## Robot System

### Unified Robot Capabilities

All four robots (R1, R2, R3, R4) have **identical capabilities**:
- Path planning and route optimization
- Obstacle avoidance and navigation
- Object grasping and manipulation
- Environmental sensing and data collection
- Inter-robot coordination and communication
- Battery management and charging
- Task execution and status reporting

### Task Distribution

The system intelligently divides tasks based on:
- **Proximity**: Assigns tasks to robots closest to the target location
- **Battery levels**: Prioritizes robots with sufficient battery
- **Workload balance**: Distributes tasks evenly across all robots
- **Supporting roles**: Assigns coordination/monitoring tasks when needed

## Supported Models

### Google Gemini (FREE) ⭐ Recommended
- `gemini-1.5-flash` - Fast and free, perfect for testing
- `gemini-1.5-pro` - More capable free option
- `gemini-pro` - Original Gemini model

### Anthropic Claude
- `claude-sonnet-4-20250514`
- `claude-opus-4-20250514`
- `claude-haiku-4-20250514`

### OpenAI GPT
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

### xAI Grok
- `grok-beta`
- `grok-2`
- `grok-2-1212`

## Architecture

### LangGraph Workflow

The system implements a 5-node cyclic workflow:

1. **Process Natural Language Commands** - Receives user input
2. **Query Robot Statuses** - Gathers current robot states
3. **LLM Reasoning** - Generates task allocation using LLM
4. **Execute Commands** - Prepares commands for robots
5. **Broadcast Response** - Returns human-readable response

### API Endpoints

- `POST /api/orchestrate` - Main orchestration endpoint
- `POST /api/test-scenarios` - Test scenario execution
- `GET /api/health` - System health check

### Core Components

- **`lib/langgraph-workflow.ts`**: LangGraph workflow implementation
- **`lib/llm-providers.ts`**: LLM provider implementations (Anthropic, OpenAI, Gemini, Grok)
- **`lib/robots.ts`**: Robot classes and orchestrator
- **`lib/test-scenarios.ts`**: Test scenario definitions
- **`lib/evaluation.ts`**: Test evaluation metrics
- **`lib/pdf-generator.ts`**: PDF report generation
- **`components/TestScenarioRunner.tsx`**: Main test interface
- **`components/WarehouseGridVisualization.tsx`**: Grid visualization component
- **`components/RobotOrchestrationSystem.tsx`**: Alternative orchestration UI

## Warehouse Grid

The warehouse is represented as an **18x16 grid** where:
- Each cell = 1x1 meter physical space
- **Cell Types**:
  - `.` = Path (traversable)
  - `S` = Shelf (obstacle - robots cannot pass)
  - `C` = Charging station
  - `L` = Loading area
  - `U` = Unloading area
  - `R1`, `R2`, `R3`, `R4` = Robot positions

## Path Planning

- **Automatic path extraction** from LLM responses
- **Obstacle avoidance** - Paths automatically route around shelves
- **Continuous visualization** - Smooth paths between waypoints
- **Color coding** - Each robot has a distinct path color
- **Start/End markers** - Clear path visualization

## Test Evaluation

Tests are evaluated on:
- **Response Time** (20 points) - How quickly the system responds
- **JSON Validity** (15 points) - Correctness of JSON output
- **Safety Compliance** (25 points) - Adherence to safety rules
- **Task Allocation** (20 points) - Proper distribution of tasks
- **Path Quality** (20 points) - Efficiency and correctness of paths

**Total Score**: 100 points (70+ = Pass)

## Project Structure

```
warehouse-ai-system/
├── app/
│   ├── api/
│   │   ├── orchestrate/
│   │   │   └── route.ts          # Main orchestration API
│   │   ├── test-scenarios/
│   │   │   └── route.ts          # Test scenario execution
│   │   └── health/
│   │       └── route.ts          # Health check
│   ├── page.tsx                  # Main page
│   └── layout.tsx                # Root layout
├── components/
│   ├── TestScenarioRunner.tsx    # Main test interface
│   ├── WarehouseGridVisualization.tsx  # Grid visualization
│   ├── RobotOrchestrationSystem.tsx   # Alternative UI
│   └── RobotStatusDashboard.tsx  # Robot status display
├── lib/
│   ├── langgraph-workflow.ts     # LangGraph workflow
│   ├── llm-providers.ts          # LLM provider implementations
│   ├── robots.ts                 # Robot classes
│   ├── test-scenarios.ts         # Test scenarios
│   ├── evaluation.ts             # Evaluation metrics
│   ├── pdf-generator.ts          # PDF reports
│   └── environment-matrix.ts    # Grid utilities
└── .env.example                  # Environment variables template
```

## Development

The project uses:
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **LangGraph** concepts for workflow management

## Error Handling

- **Automatic retry** for transient API errors (503, 429, 500, 502, 504)
- **Exponential backoff** (1s, 2s, 4s delays)
- **JSON repair** for malformed LLM responses
- **Graceful degradation** when API keys are missing

## License

This project is open source and available for use.

## Getting Help

- Check `TROUBLESHOOTING.md` for common issues
- Review `ARCHITECTURE.md` for system design details
- See `TEST_CASE.md` for test scenario examples
- Check `SETUP.md` for detailed setup instructions
