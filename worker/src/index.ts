/**
 * Cloudflare Worker - AI Proxy for makanai-flow
 * 
 * Stateless proxy that forwards requests to various AI providers.
 * No data storage, no authentication, no logging.
 * 
 * Supported providers:
 * - openai (GPT-4o, GPT-4o-mini)
 * - gemini (Gemini 1.5 Flash, Gemini 1.5 Pro)
 * - anthropic (Claude 3 Haiku, Claude 3 Sonnet)
 */

interface Env {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

type Provider = 'openai' | 'gemini' | 'anthropic';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateRequest {
  provider?: Provider;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Default models per provider
const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-3-haiku-20240307',
};

/**
 * Forward request to OpenAI
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Forward request to Google Gemini
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
  // Convert messages to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system')?.content;
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string; code?: number };
  };

  console.log('Gemini raw response:', JSON.stringify(data));

  // Check for Gemini API errors
  if (data.error) {
    return new Response(
      JSON.stringify({ error: data.error.message || 'Gemini API error', raw: data }),
      { status: response.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Extract text from candidates
  const textContent = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text)
    ?.filter(Boolean)
    ?.join('') || '';
  
  console.log('Gemini extracted content:', textContent);

  // Normalize to OpenAI-like format for consistent client handling
  const normalizedResponse = {
    provider: 'gemini',
    model,
    choices: [{
      message: {
        role: 'assistant',
        content: textContent,
      },
      finish_reason: data.candidates?.[0]?.finishReason?.toLowerCase() || 'stop',
    }],
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount || 0,
      completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_tokens: (data.usageMetadata.promptTokenCount || 0) + (data.usageMetadata.candidatesTokenCount || 0),
    } : undefined,
  };

  return new Response(JSON.stringify(normalizedResponse), {
    status: response.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Forward request to Anthropic Claude
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const requestBody: Record<string, unknown> = {
    model,
    messages: chatMessages,
    max_tokens: maxTokens,
    temperature,
  };

  if (systemMessage) {
    requestBody.system = systemMessage;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  // Normalize to OpenAI-like format
  const normalizedResponse = {
    provider: 'anthropic',
    model,
    choices: [{
      message: {
        role: 'assistant',
        content: data.content?.[0]?.text || '',
      },
      finish_reason: 'stop',
    }],
    usage: data.usage ? {
      prompt_tokens: data.usage.input_tokens || 0,
      completion_tokens: data.usage.output_tokens || 0,
      total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  };

  return new Response(JSON.stringify(normalizedResponse), {
    status: response.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Only POST /generate is allowed
    if (request.method !== 'POST' || url.pathname !== '/generate') {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: GenerateRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Basic validation
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Determine provider (default: gemini)
    const provider: Provider = body.provider || 'gemini';
    const model = body.model || DEFAULT_MODELS[provider];
    const temperature = body.temperature ?? 0.7;
    const maxTokens = body.max_tokens ?? 1024;

    // Get API key for provider
    const apiKeys: Record<Provider, string | undefined> = {
      openai: env.OPENAI_API_KEY,
      gemini: env.GEMINI_API_KEY,
      anthropic: env.ANTHROPIC_API_KEY,
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `API key not configured for provider: ${provider}` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Forward to appropriate provider
    try {
      switch (provider) {
        case 'openai':
          return await callOpenAI(apiKey, model, body.messages, temperature, maxTokens);
        case 'gemini':
          return await callGemini(apiKey, model, body.messages, temperature, maxTokens);
        case 'anthropic':
          return await callAnthropic(apiKey, model, body.messages, temperature, maxTokens);
        default:
          return new Response(
            JSON.stringify({ error: `Unknown provider: ${provider}` }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: `Failed to reach ${provider} API` }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  },
};
