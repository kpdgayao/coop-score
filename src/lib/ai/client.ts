import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || "2048");
const RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || "30");

// Simple token bucket rate limiter
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms

  constructor(maxPerMinute: number) {
    this.maxTokens = maxPerMinute;
    this.tokens = maxPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = maxPerMinute / 60000;
  }

  async waitForToken(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT);

interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  await rateLimiter.waitForToken();

  const start = Date.now();
  let lastError: Error | null = null;

  // Retry up to 3 times with exponential backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: options.maxTokens || MAX_TOKENS,
        temperature: options.temperature ?? 0.3,
        system: options.systemPrompt,
        messages: [{ role: "user", content: options.userPrompt }],
      });

      const latencyMs = Date.now() - start;
      const textContent = response.content.find((c) => c.type === "text");

      return {
        content: textContent?.text || "",
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        latencyMs,
      };
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error("AI call failed after 3 attempts");
}

export async function callAIStreaming(options: AICallOptions) {
  await rateLimiter.waitForToken();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: options.maxTokens || MAX_TOKENS,
    temperature: options.temperature ?? 0.3,
    system: options.systemPrompt,
    messages: [{ role: "user", content: options.userPrompt }],
  });

  return stream;
}

export { client, MODEL, MAX_TOKENS };
