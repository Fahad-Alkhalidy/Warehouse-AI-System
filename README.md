# Robot Orchestration System

A Next.js application that provides a centralized system for orchestrating tasks across four specialized robots using LLM-powered task generation.

## Overview

This system consists of:
- **Centralized Orchestration API**: Takes user prompts, environment JSON, and LLM model selection to generate specific tasks for each robot
- **Four Specialized Robots**:
  1. **Navigation Robot** - Handles movement, pathfinding, and spatial positioning
  2. **Manipulation Robot** - Manages object grasping, movement, and physical interactions
  3. **Sensing Robot** - Collects environmental data, detects objects, and monitors conditions
  4. **Communication Robot** - Coordinates between robots and manages status reporting

## Features

- 🤖 Multi-robot task orchestration
- 🧠 Support for multiple LLM providers (Anthropic Claude, OpenAI GPT)
- 📋 JSON-based environment configuration
- 🎯 Intelligent task distribution based on robot capabilities
- 🖥️ Modern, responsive UI built with Next.js and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- API keys for at least one LLM provider:
  - Anthropic API key (for Claude models)
  - OpenAI API key (for GPT models)

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

4. Edit `.env` and add your API keys:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
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

1. **Enter a Task Prompt**: Describe the overall task you want the robots to accomplish
2. **Upload Environment JSON**: Provide a JSON file representing the robot environment (e.g., warehouse layout, object locations, etc.)
3. **Select LLM Model**: Choose from available models (Claude or GPT models)
4. **Generate Tasks**: Click "Generate Robot Tasks" to let the system create specific tasks for each robot
5. **View Results**: See the generated tasks displayed for each robot

### Example Environment JSON

```json
{
  "warehouse": {
    "dimensions": {"width": 100, "height": 50, "depth": 30},
    "shelves": [
      {"id": "A1", "position": {"x": 10, "y": 5}, "items": ["box1", "box2"]},
      {"id": "A2", "position": {"x": 20, "y": 5}, "items": ["box3"]}
    ],
    "obstacles": [{"x": 15, "y": 10, "type": "pallet"}],
    "target_location": {"x": 90, "y": 45}
  },
  "robots": {
    "navigation": {"position": {"x": 0, "y": 0}, "battery": 85},
    "manipulation": {"position": {"x": 5, "y": 0}, "battery": 90},
    "sensing": {"position": {"x": 2, "y": 0}, "battery": 95},
    "communication": {"position": {"x": 1, "y": 0}, "battery": 88}
  }
}
```

## Architecture

### API Endpoint

`POST /api/orchestrate`
- Accepts: `{ prompt: string, environment: object, model: string }`
- Returns: `{ success: boolean, tasks: RobotTasks, robotTasks: RobotTask[], timestamp: string }`

### Core Components

- **`lib/llm-providers.ts`**: LLM provider implementations (Anthropic, OpenAI)
- **`lib/robots.ts`**: Robot service classes and orchestrator
- **`components/RobotOrchestrationSystem.tsx`**: Main UI component
- **`app/api/orchestrate/route.ts`**: Centralized orchestration API endpoint

## Supported Models

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

### Google Gemini (FREE)
- `gemini-1.5-flash` ⭐ Recommended free option
- `gemini-1.5-pro`
- `gemini-pro`

## Project Structure

```
warehouse-ai-system/
├── app/
│   ├── api/
│   │   └── orchestrate/
│   │       └── route.ts          # Centralized API endpoint
│   ├── page.tsx                  # Main page
│   └── layout.tsx                # Root layout
├── components/
│   └── RobotOrchestrationSystem.tsx  # Main UI component
├── lib/
│   ├── llm-providers.ts          # LLM provider implementations
│   └── robots.ts                 # Robot classes and orchestrator
└── .env.example                  # Environment variables template
```

## Development

The project uses:
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

## License

This project is open source and available for use.
