import { NextResponse } from "next/server";

export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasGrokKey = !!(process.env.GROK_API_KEY || process.env.XAI_API_KEY);
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  
  return NextResponse.json({
    status: "ok",
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAnthropicKey,
      hasOpenAIKey,
      hasGrokKey,
      hasGeminiKey,
      anthropicKeyLength: hasAnthropicKey ? process.env.ANTHROPIC_API_KEY?.length : 0,
      openAIKeyLength: hasOpenAIKey ? process.env.OPENAI_API_KEY?.length : 0,
      grokKeyLength: hasGrokKey ? (process.env.GROK_API_KEY || process.env.XAI_API_KEY)?.length : 0,
      geminiKeyLength: hasGeminiKey ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.length : 0,
    },
    message: hasAnthropicKey || hasOpenAIKey || hasGrokKey || hasGeminiKey
      ? "API keys are configured" 
      : "WARNING: No API keys found. Please set GEMINI_API_KEY (FREE), ANTHROPIC_API_KEY, OPENAI_API_KEY, or GROK_API_KEY in .env file"
  });
}
