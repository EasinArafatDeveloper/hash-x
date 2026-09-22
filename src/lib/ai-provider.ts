/**
 * Universal AI Provider Gateway for Morpheus DataFlow
 * 
 * Powered by OpenAI GPT-4o / GPT-4o-mini
 */

export interface AIProviderConfig {
  provider: 'openai' | 'fallback';
  apiKey: string;
  apiUrl: string;
  model: string;
}

export function getActiveAIConfig(preferredModel?: string): AIProviderConfig {
  const rawOpenAiKey =
    process.env.GPT_4o_API_KEY ||
    process.env.GPT_4O_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GPT4O_API_KEY ||
    '';

  const openAiKey = rawOpenAiKey.trim().replace(/^['"]+|['"]+$/g, '');

  if (openAiKey && openAiKey.length > 8) {
    return {
      provider: 'openai',
      apiKey: openAiKey,
      apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: preferredModel || 'gpt-4o',
    };
  }

  return {
    provider: 'fallback',
    apiKey: '',
    apiUrl: '',
    model: 'heuristic-engine',
  };
}

export interface CallAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CallAIOptions {
  messages: CallAIMessage[];
  preferredModel?: string; // 'gpt-4o' | 'gpt-4o-mini'
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  tools?: AIToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
}

export interface CallAIResult {
  content: string;
  toolCalls: AIToolCall[];
  provider: string;
  model: string;
}

export async function callAIModel({
  messages,
  preferredModel = 'gpt-4o',
  jsonMode = true,
  temperature = 0.2,
  maxTokens = 2000,
  timeoutMs = 20000,
  tools,
  toolChoice = 'auto',
}: CallAIOptions): Promise<CallAIResult> {
  const config = getActiveAIConfig(preferredModel);

  if (config.provider === 'fallback' || !config.apiKey) {
    throw new Error('No valid OpenAI API key found (Please set GPT_4o_API_KEY in .env.local)');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, any> = {
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // JSON mode and tool-calling are mutually exclusive on the Chat Completions
    // API in practice (a tool-calling turn returns tool_calls, not JSON content) —
    // only force json_object formatting on turns that aren't offering tools.
    if (jsonMode && !tools?.length) {
      requestBody.response_format = { type: 'json_object' };
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI API error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message || {};

    return {
      content: message.content || '',
      toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
      provider: 'openai',
      model: config.model,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}
