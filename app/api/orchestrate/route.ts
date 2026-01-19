import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, detectProviderFromModel } from "@/lib/llm-providers";
import { RobotOrchestrator } from "@/lib/robots";

export async function POST(req: NextRequest) {
  try {
    const { prompt, environment, model } = await req.json();

    // Validate inputs
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    if (!environment || typeof environment !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid environment JSON" },
        { status: 400 }
      );
    }

    if (!model || typeof model !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid model" },
        { status: 400 }
      );
    }

    // Detect provider and get API key
    const provider = detectProviderFromModel(model);
    let apiKey: string;

    if (provider === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY environment variable is not set" },
          { status: 500 }
        );
      }
    } else if (provider === "openai") {
      apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY environment variable is not set" },
          { status: 500 }
        );
      }
    } else if (provider === "grok") {
      apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json(
          { error: "GROK_API_KEY or XAI_API_KEY environment variable is not set" },
          { status: 500 }
        );
      }
    } else if (provider === "gemini") {
      apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported model: ${model}` },
        { status: 400 }
      );
    }

    // Get LLM provider and generate tasks
    const llmProvider = getLLMProvider(provider, apiKey);
    const tasks = await llmProvider.generateTasks(prompt, environment, model);

    // Distribute tasks to robots
    const orchestrator = new RobotOrchestrator();
    const robotTasks = await orchestrator.distributeTasks(tasks);

    return NextResponse.json({
      success: true,
      tasks,
      robotTasks,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Orchestration error:", error);
    console.error("Error stack:", error.stack);
    
    // Provide more specific error messages
    let errorMessage = error.message || "Internal server error";
    
    // Check for common error types
    if (error.message?.includes("API key") || error.message?.includes("ANTHROPIC_API_KEY") || error.message?.includes("OPENAI_API_KEY")) {
      errorMessage = "API key is missing. Please create a .env file with your API key and restart the server.";
    } else if (error.message?.includes("parse") || error.message?.includes("JSON")) {
      errorMessage = `JSON parsing error: ${error.message}`;
    } else if (error.message?.includes("API error") || error.message?.includes("Anthropic") || error.message?.includes("OpenAI")) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
