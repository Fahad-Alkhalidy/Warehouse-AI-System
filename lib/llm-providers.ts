/**
 * LLM Provider Interface and Implementations
 * Supports multiple LLM providers: Anthropic, OpenAI, xAI (Grok), Google Gemini
 */

export interface LLMProvider {
  generateTasks(prompt: string, environment: any, model: string): Promise<RobotTasks>;
}

export interface RobotTasks {
  R1?: string;
  R2?: string;
  R3?: string;
  R4?: string;
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTasks(prompt: string, environment: any, model: string): Promise<RobotTasks> {
    const systemPrompt = `You are a robot orchestration system. Given a user prompt and environment data, you must divide the overall task among 4 robots (R1, R2, R3, R4) to accomplish it together.

CRITICAL REQUIREMENT: ALL 4 ROBOTS MUST receive tasks. Do NOT leave any robot idle or without a task assignment.

All robots have the SAME capabilities:
- Path planning and route optimization
- Obstacle avoidance and navigation
- Object grasping and manipulation
- Environmental sensing and data collection
- Inter-robot coordination and communication

Your job is to intelligently divide the overall task into subtasks that can be executed in parallel by the 4 robots to achieve the goal efficiently.

FULL SCENARIO DATA (Complete JavaScript Object as JSON):
${JSON.stringify(environment.scenario || environment, null, 2)}

Environment Grid:
${JSON.stringify(environment.environmentMatrix || [], null, 2)}

Robot Current Positions:
${JSON.stringify(environment.robotStatuses || {}, null, 2)}

User Request:
${prompt}

TASK DISTRIBUTION RULES:
1. ALL 4 robots (R1, R2, R3, R4) MUST be assigned tasks
2. Divide tasks based on proximity: assign each robot to the task closest to their starting position
3. If there are fewer tasks than robots, assign supporting roles (coordination, monitoring, backup, inspection) to remaining robots
4. Do NOT assign all tasks to one robot - distribute the work
5. Each robot's task should:
   - Be clear and actionable (not "remain idle")
   - Include destination coordinates if movement is needed
   - Include a path as an array of [row, col] coordinates: path: [[row, col], [row, col], ...]
   - Specify actions: pickup, dropoff, charge, navigate, inspect, coordinate, monitor, etc.
   - Consider the robot's current position and battery level

Return ONLY valid JSON in this exact format with no additional text or markdown:
{
  "R1": "task description with path: [[row, col], ...]",
  "R2": "task description with path: [[row, col], ...]",
  "R3": "task description with path: [[row, col], ...]",
  "R4": "task description with path: [[row, col], ...]"
}

Remember: ALL 4 robots must have non-empty task descriptions.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: systemPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || "Unknown error";
      
      // Provide helpful messages for common errors
      if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
        throw new Error(`Anthropic quota exceeded. Please check your billing or try using OpenAI GPT or Grok models instead. Original error: ${errorMessage}`);
      }
      
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = await response.json();
    const text = data.content.find((c: any) => c.type === "text")?.text;
    
    if (!text) {
      throw new Error("No text content in response");
    }

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    
    let tasks: any;
    try {
      tasks = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Cleaned text:", cleaned);
      throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
    }

    // Validate task structure - at least 2 out of 4 robots should have meaningful tasks
    // (Some scenarios may only need 2-3 robots, but we want at least 2 to be active)
    const taskCount = [tasks.R1, tasks.R2, tasks.R3, tasks.R4].filter(t => t && t.trim().length > 0 && !t.toLowerCase().includes("remain idle") && !t.toLowerCase().includes("not assigned")).length;
    
    if (taskCount < 2) {
      console.error("Invalid task structure - not enough robots assigned:", tasks);
      throw new Error(`Invalid task structure: Only ${taskCount} out of 4 robots received tasks. At least 2 robots must be assigned tasks.`);
    }
    
    // Warn if less than 4 robots have tasks, but don't fail
    if (taskCount < 4) {
      console.warn(`Warning: Only ${taskCount} out of 4 robots received tasks. Consider assigning tasks to all robots.`);
    }

    return tasks as RobotTasks;
  }
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTasks(prompt: string, environment: any, model: string): Promise<RobotTasks> {
    const systemPrompt = `You are a robot orchestration system. Given a user prompt and environment data, you must divide the overall task among 4 robots (R1, R2, R3, R4) to accomplish it together.

CRITICAL REQUIREMENT: ALL 4 ROBOTS MUST receive tasks. Do NOT leave any robot idle or without a task assignment.

All robots have the SAME capabilities:
- Path planning and route optimization
- Obstacle avoidance and navigation
- Object grasping and manipulation
- Environmental sensing and data collection
- Inter-robot coordination and communication

Your job is to intelligently divide the overall task into subtasks that can be executed in parallel by the 4 robots to achieve the goal efficiently.

TASK DISTRIBUTION RULES:
1. ALL 4 robots (R1, R2, R3, R4) MUST be assigned tasks
2. Divide tasks based on proximity: assign each robot to the task closest to their starting position
3. If there are fewer tasks than robots, assign supporting roles (coordination, monitoring, backup, inspection) to remaining robots
4. Do NOT assign all tasks to one robot - distribute the work

Generate a specific, actionable task for each robot based on the user request and environment. Each task should be clear, executable, and include paths as arrays of [row, col] coordinates.

Always respond with valid JSON only, no markdown formatting.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `FULL SCENARIO DATA (Complete JavaScript Object as JSON):\n${JSON.stringify(environment.scenario || environment, null, 2)}\n\nEnvironment Grid:\n${JSON.stringify(environment.environmentMatrix || [], null, 2)}\n\nRobot Current Positions:\n${JSON.stringify(environment.robotStatuses || {}, null, 2)}\n\nUser Request:\n${prompt}\n\nReturn ONLY valid JSON:\n{\n  "R1": "task description with path: [[row, col], ...]",\n  "R2": "task description with path: [[row, col], ...]",\n  "R3": "task description with path: [[row, col], ...]",\n  "R4": "task description with path: [[row, col], ...]"\n}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || "Unknown error";
      
      // Provide helpful messages for common errors
      if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
        throw new Error(`OpenAI quota exceeded. Please check your billing or try using Anthropic Claude or Grok models instead. Original error: ${errorMessage}`);
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    
    let tasks: any;
    try {
      tasks = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Cleaned content:", cleaned);
      throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
    }

    // Validate task structure - at least 2 out of 4 robots should have meaningful tasks
    // (Some scenarios may only need 2-3 robots, but we want at least 2 to be active)
    const taskCount = [tasks.R1, tasks.R2, tasks.R3, tasks.R4].filter(t => t && t.trim().length > 0 && !t.toLowerCase().includes("remain idle") && !t.toLowerCase().includes("not assigned")).length;
    
    if (taskCount < 2) {
      console.error("Invalid task structure - not enough robots assigned:", tasks);
      throw new Error(`Invalid task structure: Only ${taskCount} out of 4 robots received tasks. At least 2 robots must be assigned tasks.`);
    }
    
    // Warn if less than 4 robots have tasks, but don't fail
    if (taskCount < 4) {
      console.warn(`Warning: Only ${taskCount} out of 4 robots received tasks. Consider assigning tasks to all robots.`);
    }

    return tasks as RobotTasks;
  }
}

export class GrokProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTasks(prompt: string, environment: any, model: string): Promise<RobotTasks> {
    const systemPrompt = `You are a robot orchestration system. Given a user prompt and environment data, you must divide the overall task among 4 robots (R1, R2, R3, R4) to accomplish it together.

CRITICAL REQUIREMENT: ALL 4 ROBOTS MUST receive tasks. Do NOT leave any robot idle or without a task assignment.

All robots have the SAME capabilities:
- Path planning and route optimization
- Obstacle avoidance and navigation
- Object grasping and manipulation
- Environmental sensing and data collection
- Inter-robot coordination and communication

Your job is to intelligently divide the overall task into subtasks that can be executed in parallel by the 4 robots to achieve the goal efficiently.

TASK DISTRIBUTION RULES:
1. ALL 4 robots (R1, R2, R3, R4) MUST be assigned tasks
2. Divide tasks based on proximity: assign each robot to the task closest to their starting position
3. If there are fewer tasks than robots, assign supporting roles (coordination, monitoring, backup, inspection) to remaining robots
4. Do NOT assign all tasks to one robot - distribute the work

Generate a specific, actionable task for each robot based on the user request and environment. Each task should be clear, executable, and include paths as arrays of [row, col] coordinates.

Always respond with valid JSON only, no markdown formatting.`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `FULL SCENARIO DATA (Complete JavaScript Object as JSON):\n${JSON.stringify(environment.scenario || environment, null, 2)}\n\nEnvironment Grid:\n${JSON.stringify(environment.environmentMatrix || [], null, 2)}\n\nRobot Current Positions:\n${JSON.stringify(environment.robotStatuses || {}, null, 2)}\n\nUser Request:\n${prompt}\n\nReturn ONLY valid JSON:\n{\n  "R1": "task description with path: [[row, col], ...]",\n  "R2": "task description with path: [[row, col], ...]",\n  "R3": "task description with path: [[row, col], ...]",\n  "R4": "task description with path: [[row, col], ...]"\n}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || "Unknown error";
      
      // Provide helpful messages for common errors
      if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
        throw new Error(`Grok quota exceeded. Please check your billing or try using Anthropic Claude or OpenAI GPT models instead. Original error: ${errorMessage}`);
      }
      
      throw new Error(`Grok API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    
    let tasks: any;
    try {
      tasks = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Cleaned content:", cleaned);
      throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
    }

    // Validate task structure - at least 2 out of 4 robots should have meaningful tasks
    // (Some scenarios may only need 2-3 robots, but we want at least 2 to be active)
    const taskCount = [tasks.R1, tasks.R2, tasks.R3, tasks.R4].filter(t => t && t.trim().length > 0 && !t.toLowerCase().includes("remain idle") && !t.toLowerCase().includes("not assigned")).length;
    
    if (taskCount < 2) {
      console.error("Invalid task structure - not enough robots assigned:", tasks);
      throw new Error(`Invalid task structure: Only ${taskCount} out of 4 robots received tasks. At least 2 robots must be assigned tasks.`);
    }
    
    // Warn if less than 4 robots have tasks, but don't fail
    if (taskCount < 4) {
      console.warn(`Warning: Only ${taskCount} out of 4 robots received tasks. Consider assigning tasks to all robots.`);
    }

    return tasks as RobotTasks;
  }
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private availableModels: string[] | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async getAvailableModels(): Promise<string[]> {
    if (this.availableModels) {
      return this.availableModels;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models
          ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          ?.map((m: any) => m.name.replace('models/', '')) || [];
        this.availableModels = models;
        return models;
      }
    } catch (err) {
      console.error('Failed to fetch available models:', err);
    }

    // Fallback to known working models
    return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  }

  async generateTasks(prompt: string, environment: any, model: string): Promise<RobotTasks> {
    const systemPrompt = `You are a robot orchestration system. Divide tasks among 4 robots (R1, R2, R3, R4) with identical capabilities.

CRITICAL: ALL 4 ROBOTS MUST receive tasks. If fewer than 4 primary tasks exist, assign supporting roles (monitoring, coordination, standby) to remaining robots.

IMPORTANT: Keep paths SHORT - use only key waypoints (start, major turns, destination). Maximum 10-15 waypoints per path. Do NOT list every single cell.

Response format (JSON only, no markdown):
{
  "R1": "task description. Path: [[row,col], [row,col], ...]",
  "R2": "task description. Path: [[row,col], [row,col], ...]",
  "R3": "task description. Path: [[row,col], [row,col], ...]",
  "R4": "task description. Path: [[row,col], [row,col], ...]"
}

Keep descriptions concise. Use short paths with key waypoints only.`;

    const userContent = `FULL SCENARIO DATA (Complete JavaScript Object as JSON):\n${JSON.stringify(environment.scenario || environment, null, 2)}\n\nEnvironment Grid:\n${JSON.stringify(environment.environmentMatrix || [], null, 2)}\n\nRobot Current Positions:\n${JSON.stringify(environment.robotStatuses || {}, null, 2)}\n\nUser Request:\n${prompt}\n\nReturn ONLY valid JSON:\n{\n  "R1": "task description with path: [[row, col], ...]",\n  "R2": "task description with path: [[row, col], ...]",\n  "R3": "task description with path: [[row, col], ...]",\n  "R4": "task description with path: [[row, col], ...]"\n}`;

    // Get available models and find a working one
    const availableModels = await this.getAvailableModels();
    
    // Map user-friendly model names to try in order
    const modelPriority: Record<string, string[]> = {
      'gemini-pro': ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
      'gemini-1.5-flash': ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'],
      'gemini-1.5-pro': ['gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-pro'],
    };

    const modelsToTry = modelPriority[model] || [model, 'gemini-1.5-flash', 'gemini-pro'];
    
    // Find the first model that's available
    const apiModelName = modelsToTry.find(m => availableModels.includes(m)) || availableModels[0] || 'gemini-1.5-flash';

    // Retry logic for transient errors (503, 429, 500, etc.)
    const maxRetries = 3;
    const retryableStatuses = [503, 429, 500, 502, 504];
    let lastError: Error | null = null;
    let successfulResponse: Response | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Try v1beta API first (supports JSON mode)
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModelName}:generateContent?key=${this.apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16000, // Increased to handle all 4 robots with paths
              responseMimeType: "application/json",
            },
          }),
        });

        // If v1beta fails with model not found, try v1 API
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || "";
          
          if (errorMessage.includes("not found") || response.status === 404) {
            // Try v1 API (without responseMimeType)
            response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${apiModelName}:generateContent?key=${this.apiKey}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: `${systemPrompt}\n\n${userContent}` }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 16000, // Increased to handle all 4 robots with paths
                },
              }),
            });
          }
        }

        // Check if response is successful
        if (response.ok) {
          // Store successful response and break out of retry loop
          successfulResponse = response;
          break;
        }

        // Handle error response - only retry on specific status codes
        const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}: ${response.statusText}` } }));
        const errorMessage = error.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Check if this is a retryable error
        if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.warn(`Gemini API returned ${response.status} (${errorMessage}). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          lastError = new Error(`Gemini API error: ${errorMessage}`);
          continue; // Retry
        }
        
        // Non-retryable error or max retries reached
        if (errorMessage.includes("quota") || errorMessage.includes("billing") || errorMessage.includes("API_KEY_INVALID")) {
          throw new Error(`Gemini API error: ${errorMessage}. Please check your API key at https://aistudio.google.com/apikey`);
        }
        
        throw new Error(`Gemini API error: ${errorMessage}`);
      } catch (error) {
        // Check if this is a retryable network/API error
        const isRetryable = error instanceof Error && (
          error.message.includes("503") || 
          error.message.includes("429") || 
          error.message.includes("500") ||
          error.message.includes("502") ||
          error.message.includes("504") ||
          error.message.includes("Service Unavailable")
        );
        
        // If it's the last attempt or a non-retryable error, throw
        if (attempt === maxRetries || !isRetryable) {
          throw error;
        }
        lastError = error as Error;
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all retries failed
    if (lastError) {
      throw lastError;
    }
    if (!successfulResponse) {
      throw new Error("Gemini API request failed after all retries");
    }
    
    // Parse the successful response
    const data = await successfulResponse.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in response");
    }

    // Clean the content - remove markdown code blocks
    let cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    
    // Try to extract JSON object if it's embedded in text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Remove JavaScript string concatenation patterns first (e.g., '...',\n' + '...')
    cleaned = cleaned.replace(/(["}])\s*,\s*[\n\r]+\s*['"]\s*\+\s*['"]/g, '$1, "');
    cleaned = cleaned.replace(/\s*\+\s*['"]/g, '');
    
    // Fix control characters (newlines, tabs, etc.) in JSON strings
    // These must be escaped in JSON - but only if they're inside string values
    cleaned = cleaned.replace(/(:\s*")([^"]*?)([\n\r\t])/g, (_match: string, prefix: string, before: string, controlChar: string) => {
      // Escape control characters
      const escaped = controlChar === '\n' ? '\\n' : controlChar === '\r' ? '\\r' : controlChar === '\t' ? '\\t' : controlChar;
      return `${prefix}${before}${escaped}`;
    });
    
    // Remove any remaining newlines/carriage returns between properties (outside strings)
    cleaned = cleaned.replace(/(["}])\s*[\n\r]+\s*"/g, '$1, "');
    cleaned = cleaned.replace(/(["}])\s*[\n\r]+\s*}/g, '$1}');

    // CRITICAL: Fix unescaped quotes within string values BEFORE first JSON.parse attempt
    // Use a character-by-character state machine that properly tracks string boundaries
    let fixedJson = '';
    let inStringValue = false;
    let escapeNext = false;
    let i = 0;
    
    while (i < cleaned.length) {
      const char = cleaned[i];
      
      if (escapeNext) {
        fixedJson += char;
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        fixedJson += char;
        escapeNext = true;
        i++;
        continue;
      }
      
      if (char === '"') {
        if (!inStringValue) {
          // Check if this quote starts a string value (must be after a colon)
          let j = i - 1;
          while (j >= 0 && /\s/.test(cleaned[j])) j--; // Skip whitespace backwards
          if (j >= 0 && cleaned[j] === ':') {
            inStringValue = true;
            fixedJson += char; // Opening quote of string value
          } else {
            // This is a key quote or closing quote of a previous value
            fixedJson += char;
          }
        } else {
          // We're inside a string value - determine if this quote closes it or is unescaped
          // Look ahead to see what follows this quote
          let j = i + 1;
          while (j < cleaned.length && /\s/.test(cleaned[j])) j++; // Skip whitespace
          
          const nextChar = j < cleaned.length ? cleaned[j] : '';
          const lookAhead = cleaned.substring(j, Math.min(j + 20, cleaned.length));
          
          // This quote closes the string value if followed by:
          // - Comma (next property)
          // - Closing brace/bracket (end of object/array)
          // - Another quote followed by a colon (next key like "R2":)
          // - End of string
          // - Newline/carriage return (end of property)
          const closesString = 
            nextChar === ',' || 
            nextChar === '}' || 
            nextChar === ']' || 
            j >= cleaned.length ||
            nextChar === '\n' ||
            nextChar === '\r' ||
            lookAhead.match(/^"[R1-R4]\s*:/) || // Pattern: "R2": indicates next key
            lookAhead.match(/^"\s*[,}\]\n\r]/); // Pattern: ", or "} indicates end
          
          // If next char is a letter, digit, or other content (not structural JSON), it's an unescaped quote
          const isUnescapedQuote = !closesString && /[a-zA-Z0-9\[\]()]/.test(nextChar);
          
          if (closesString) {
            inStringValue = false;
            fixedJson += char; // Closing quote of string value
          } else if (isUnescapedQuote) {
            // This quote is inside the string value and should be escaped
            fixedJson += '\\"';
          } else {
            // Default: escape it to be safe
            fixedJson += '\\"';
          }
        }
      } else {
        fixedJson += char;
      }
      
      i++;
    }
    
    cleaned = fixedJson;
    
    // Fix other common JSON issues
    cleaned = cleaned
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')   // Remove trailing commas before ]
      .replace(/([{,]\s*)(\w+)(\s*):/g, '$1"$2":')  // Quote unquoted keys
      .replace(/:\s*([^",{\[\]\s][^,}\]]*?)(\s*[,}])/g, ': "$1"$2'); // Quote unquoted string values
    
    let tasks: any;
    try {
      tasks = JSON.parse(cleaned);
    } catch (parseError) {
      // Try to fix JSON issues: control characters, unescaped quotes, unterminated strings, etc.
      try {
        // More aggressive fix for control characters and unescaped quotes
        let fixedJson = cleaned;
        
        // Remove JavaScript string concatenation patterns (e.g., '...',\n' + '...')
        fixedJson = fixedJson.replace(/(["}])\s*,\s*[\n\r]+\s*['"]\s*\+\s*['"]/g, '$1, "');
        fixedJson = fixedJson.replace(/\s*\+\s*['"]/g, '');
        fixedJson = fixedJson.replace(/\s*\+\s*['"]/g, '');
        
        // First, fix control characters (newlines, tabs, carriage returns) in string values
        // These must be escaped in JSON
        fixedJson = fixedJson.replace(/(:\s*")([^"]*?)([\n\r\t])/g, (_match: string, prefix: string, before: string, controlChar: string) => {
          const escaped = controlChar === '\n' ? '\\n' : controlChar === '\r' ? '\\r' : controlChar === '\t' ? '\\t' : controlChar;
          return `${prefix}${before}${escaped}`;
        });
        
        // Also remove any literal newlines/carriage returns that appear outside of strings (between properties)
        // This handles cases like: "R1": "...",\n  "R2"
        fixedJson = fixedJson.replace(/(["}])\s*[\n\r]+\s*"/g, '$1, "');
        fixedJson = fixedJson.replace(/(["}])\s*[\n\r]+\s*}/g, '$1}');
        
    // Fix unescaped quotes within string values by escaping them
    // Use a character-by-character state machine that properly tracks string boundaries
    let result = '';
    let inStringValue = false;
    let escapeNext = false;
    let i = 0;
    
    while (i < fixedJson.length) {
      const char = fixedJson[i];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        result += char;
        escapeNext = true;
        i++;
        continue;
      }
      
      if (char === '"') {
        if (!inStringValue) {
          // Check if this quote starts a string value (must be after a colon)
          let j = i - 1;
          while (j >= 0 && /\s/.test(fixedJson[j])) j--; // Skip whitespace backwards
          if (j >= 0 && fixedJson[j] === ':') {
            inStringValue = true;
            result += char; // Opening quote of string value
          } else {
            // This is a key quote or closing quote of a previous value
            result += char;
          }
        } else {
          // We're inside a string value - determine if this quote closes it or is unescaped
          // Look ahead to see what follows this quote
          let j = i + 1;
          while (j < fixedJson.length && /\s/.test(fixedJson[j])) j++; // Skip whitespace
          
          const nextChar = j < fixedJson.length ? fixedJson[j] : '';
          const lookAhead = fixedJson.substring(j, Math.min(j + 20, fixedJson.length));
          
          // This quote closes the string value if followed by:
          // - Comma (next property)
          // - Closing brace/bracket (end of object/array)
          // - Another quote followed by a colon (next key like "R2":)
          // - End of string
          const closesString = 
            nextChar === ',' || 
            nextChar === '}' || 
            nextChar === ']' || 
            j >= fixedJson.length ||
            lookAhead.match(/^"[R1-R4]\s*:/) || // Pattern: "R2": indicates next key
            lookAhead.match(/^"\s*[,}\]\n\r]/); // Pattern: ", or "} indicates end
          
          if (closesString) {
            inStringValue = false;
            result += char; // Closing quote of string value
          } else {
            // This quote is inside the string value and should be escaped
            // Examples: "Task: "Navigate" should become "Task: \"Navigate"
            result += '\\"';
          }
        }
      } else {
        result += char;
      }
      
      i++;
    }
    
    fixedJson = result;
    
    // Try parsing the fixed JSON
    try {
      tasks = JSON.parse(fixedJson);
    } catch (parseError2) {
      // If that fails, try a regex-based approach as fallback
      // This handles cases where the state machine might miss some edge cases
      let regexFixed = fixedJson;
      
      // More aggressive regex: find all string values and escape quotes within them
      // Pattern: "key": "value with "unescaped" quotes"
      regexFixed = regexFixed.replace(/"([^"]+)":\s*"([^"]*?)"/g, (match: string, key: string, value: string) => {
        // Escape any quotes in the value that aren't already escaped
        const escapedValue = value.replace(/([^\\])"/g, '$1\\"');
        return `"${key}": "${escapedValue}"`;
      });
      
      try {
        tasks = JSON.parse(regexFixed);
      } catch {
        // If that fails, try to extract and fix more aggressively
        const lastBrace = fixedJson.lastIndexOf('{');
        if (lastBrace !== -1) {
          let partialJson = fixedJson.substring(lastBrace);
          
          // Fix control characters again in the partial JSON
          partialJson = partialJson.replace(/(:\s*")([^"]*?)([\n\r\t])/g, (_match: string, prefix: string, before: string, controlChar: string) => {
            const escaped = controlChar === '\n' ? '\\n' : controlChar === '\r' ? '\\r' : controlChar === '\t' ? '\\t' : controlChar;
            return `${prefix}${before}${escaped}`;
          });
          
          // Remove newlines between properties
          partialJson = partialJson.replace(/(["}])\s*[\n\r]+\s*"/g, '$1, "');
          
          // Fix unescaped quotes by finding string values and escaping quotes within them
          partialJson = partialJson.replace(/"([^"]+)":\s*"([^"]*)/g, (_match: string, key: string, value: string) => {
            // Escape any unescaped quotes in the value (but not the opening quote)
            const escapedValue = value.replace(/([^\\])"/g, '$1\\"');
            return `"${key}": "${escapedValue}`;
          });
          
          // Close any unterminated strings
          const quoteCount = (partialJson.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) {
            partialJson = partialJson + '"';
          }
          
          // Close any unclosed braces
          const openBraces = (partialJson.match(/{/g) || []).length;
          const closeBraces = (partialJson.match(/}/g) || []).length;
          if (openBraces > closeBraces) {
            partialJson += '}'.repeat(openBraces - closeBraces);
          }
          
          tasks = JSON.parse(partialJson);
        } else {
          throw parseError;
        }
      }
    }
  } catch (secondError) {
        console.error("JSON parse error:", parseError);
        console.error("Cleaned content (first 500 chars):", cleaned.substring(0, 500));
        console.error("Full cleaned content length:", cleaned.length);
        
        // Last resort: try to extract task values using regex for R1/R2/R3/R4
        // Handle both complete and incomplete (truncated) responses
        try {
          // Try to extract complete tasks first
          const r1Match = cleaned.match(/"R1"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const r2Match = cleaned.match(/"R2"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const r3Match = cleaned.match(/"R3"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const r4Match = cleaned.match(/"R4"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          
          // If we have matches, use them
          if (r1Match || r2Match || r3Match || r4Match) {
            tasks = {
              R1: r1Match ? r1Match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "",
              R2: r2Match ? r2Match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "",
              R3: r3Match ? r3Match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "",
              R4: r4Match ? r4Match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "",
            };
          } else {
            // Try to extract incomplete tasks (response was truncated)
            const extractIncompleteTask = (robotId: string): string => {
              const robotPattern = new RegExp(`"${robotId}"\\s*:\\s*"([^"]*)`, 'i');
              const match = cleaned.match(robotPattern);
              if (match) {
                return match[1] || "";
              }
              return "";
            };
            
            const r1Task = extractIncompleteTask("R1");
            const r2Task = extractIncompleteTask("R2");
            const r3Task = extractIncompleteTask("R3");
            const r4Task = extractIncompleteTask("R4");
            
            if (r1Task || r2Task || r3Task || r4Task) {
              tasks = {
                R1: r1Task || "",
                R2: r2Task || "",
                R3: r3Task || "",
                R4: r4Task || "",
              };
            } else {
              throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
            }
          }
        } catch (finalError) {
          throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}. The response may contain invalid JSON formatting or was truncated. Please try again or use a model with higher token limits.`);
        }
      }
    }

    // Validate task structure - check all 4 robots have tasks
    const robotIds = ['R1', 'R2', 'R3', 'R4'] as const;
    const missingRobots: string[] = [];
    const validTasks: string[] = [];
    
    for (const robotId of robotIds) {
      const task = tasks[robotId];
      if (!task || task.trim().length < 5 || 
          task.toLowerCase().includes("idle") || 
          task.toLowerCase().includes("not assigned") ||
          task.toLowerCase().includes("no task")) {
        missingRobots.push(robotId);
      } else {
        validTasks.push(task);
      }
    }
    
    // Check if response was truncated (last task ends abruptly)
    if (validTasks.length > 0) {
      const lastTask = validTasks[validTasks.length - 1];
      const isTruncated = lastTask && (
        (lastTask.includes('Path:') && !lastTask.includes(']]')) ||
        (lastTask.length > 300 && !lastTask.match(/\]\s*"$/m) && !lastTask.endsWith('"'))
      );
      
      if (isTruncated) {
        console.error("LLM response appears truncated. Last task:", lastTask.substring(Math.max(0, lastTask.length - 150)));
        throw new Error(`LLM response was truncated. Only received complete tasks for ${validTasks.length} out of 4 robots. The response may have exceeded token limits. Try: 1) Using a model with higher limits, 2) Simplifying the scenario, or 3) Reducing path detail.`);
      }
    }
    
    if (validTasks.length < 2) {
      console.error("Invalid task structure - not enough robots assigned:", tasks);
      throw new Error(`Invalid task structure: Only ${validTasks.length} out of 4 robots received valid tasks. Missing robots: ${missingRobots.join(', ')}. At least 2 robots must be assigned tasks.`);
    }
    
    // Warn if less than 4 robots have tasks
    if (validTasks.length < 4) {
      console.warn(`Warning: Only ${validTasks.length} out of 4 robots received tasks. Missing: ${missingRobots.join(', ')}`);
    }

    return tasks as RobotTasks;
  }
}

export function getLLMProvider(provider: string, apiKey: string): LLMProvider {
  switch (provider.toLowerCase()) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
      return new OpenAIProvider(apiKey);
    case "grok":
    case "xai":
      return new GrokProvider(apiKey);
    case "gemini":
    case "google":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export function detectProviderFromModel(model: string): string {
  if (model.startsWith("claude") || model.includes("anthropic")) {
    return "anthropic";
  }
  if (model.startsWith("gpt") || model.includes("openai")) {
    return "openai";
  }
  if (model.startsWith("grok") || model.includes("xai") || model.includes("grok")) {
    return "grok";
  }
  if (model.startsWith("gemini") || model.includes("gemini") || model.includes("google")) {
    return "gemini";
  }
  return "gemini"; // default to free option
}
