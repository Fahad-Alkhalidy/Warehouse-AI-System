# Quick Setup Guide

## Step 1: Create Environment File

Create a `.env` file in the `warehouse-ai-system` directory with your API keys:

```env
# Recommended: FREE option (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# OR paid options:
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
# GROK_API_KEY=your_grok_api_key_here
```

### How to Get API Keys:

**🆓 Google Gemini (FREE - Recommended):**
1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy and paste it into `.env` as `GEMINI_API_KEY`
5. **Free tier includes:** 15 requests per minute, generous daily limits

**Anthropic (Claude):**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into `.env`

**OpenAI (GPT):**
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy and paste it into `.env`

**xAI (Grok):**
1. Go to https://console.x.ai/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into `.env` as `GROK_API_KEY` or `XAI_API_KEY`

## Step 2: Restart Dev Server

After creating/updating `.env`:
1. Stop the dev server (Ctrl+C)
2. Start it again: `npm run dev`

**Important:** Next.js only loads `.env` files when the server starts, so you must restart after creating or modifying the `.env` file.

## Step 3: Verify Setup

1. Open http://localhost:3000/api/health in your browser
2. You should see a JSON response showing your API key status
3. If keys are missing, you'll see a warning message

## Step 4: Test the System

1. Go to http://localhost:3000
2. Enter a prompt
3. Upload `test-case.json` as the environment
4. Select a model
5. Click "Generate Robot Tasks"

## Troubleshooting 500 Error

If you get a 500 error:

1. **Check API Key:**
   - Visit http://localhost:3000/api/health
   - Verify your API key is loaded
   - Make sure there are no extra spaces or quotes in `.env`

2. **Check .env File Format:**
   ```env
   # Correct format (no quotes, no spaces around =)
   ANTHROPIC_API_KEY=sk-ant-api03-...
   
   # Wrong formats:
   ANTHROPIC_API_KEY="sk-ant-api03-..."  # Don't use quotes
   ANTHROPIC_API_KEY = sk-ant-api03-...   # No spaces around =
   ```

3. **Restart Server:**
   - Always restart after creating/modifying `.env`

4. **Check Server Logs:**
   - Look at the terminal where `npm run dev` is running
   - Error messages will show what's wrong

5. **Verify API Key is Valid:**
   - Make sure your API key has credits/quota
   - Test it directly with the API provider

## Example .env File

```env
# Use at least one of these
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
