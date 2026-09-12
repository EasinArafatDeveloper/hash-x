/**
 * Universal AI Provider Gateway for Morpheus DataFlow
 * 
 * Supports:
 * 1. OpenAI GPT-4o / GPT-4o-mini (Primary flagship intelligence engine)
 * 2. DeepSeek Chat (Fallback & secondary model)
 * 3. Deterministic Local AI Heuristics
 */

export interface AIProviderConfig {
  provider: 'openai' | 'deepseek' | 'fallback';
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

  const rawDeepseekKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
  const deepseekKey = rawDeepseekKey.trim().replace(/^['"]+|['"]+$/g, '');

  if (openAiKey && openAiKey.length > 8) {
    return {
      provider: 'openai',
      apiKey: openAiKey,
      apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: preferredModel || 'gpt-4o',
    };
  }

  if (deepseekKey && deepseekKey.length > 8) {
    return {
      provider: 'deepseek',
      apiKey: deepseekKey,
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat',
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
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallAIOptions {
  messages: CallAIMessage[];
  preferredModel?: string; // 'gpt-4o' | 'gpt-4o-mini' | 'deepseek-chat'
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function callAIModel({
  messages,
  preferredModel = 'gpt-4o',
  jsonMode = true,
  temperature = 0.2,
  maxTokens = 2000,
  timeoutMs = 12000,
}: CallAIOptions): Promise<{ content: string; provider: string; model: string }> {
  const config = getActiveAIConfig(preferredModel);

  if (config.provider === 'fallback' || !config.apiKey) {
    throw new Error('No valid AI API key found (Please set GPT_4o_API_KEY in .env.local)');
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

    if (jsonMode) {
      requestBody.response_format = { type: 'json_object' };
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
      throw new Error(`AI API error (${config.provider} - HTTP ${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: config.provider,
      model: config.model,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If primary OpenAI threw error and DeepSeek key exists, attempt fallback
    if (config.provider === 'openai' && process.env.DEEPSEEK_API_KEY) {
      try {
        const fallbackRes = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: jsonMode ? { type: 'json_object' } : undefined,
          }),
        });

        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          const fbContent = fbData?.choices?.[0]?.message?.content || '';
          return {
            content: fbContent,
            provider: 'deepseek-fallback',
            model: 'deepseek-chat',
          };
        }
      } catch {}
    }

    throw error;
  }
}
