/**
 * AI API Client for makanai-flow
 * 
 * Calls Cloudflare Worker proxy to communicate with AI providers.
 * Supports: OpenAI, Google Gemini, Anthropic Claude
 * 
 * All responses are normalized to a consistent format.
 */

// TODO: Update this URL after deploying the Cloudflare Worker
const AI_PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL || 'https://makanai-flow-ai-proxy.YOUR_SUBDOMAIN.workers.dev';

export type AIProvider = 'openai' | 'gemini' | 'anthropic';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateOptions = {
  /** AI provider to use. Default: 'gemini' */
  provider?: AIProvider;
  /** Model name. Uses provider default if not specified */
  model?: string;
  /** Temperature (0-1). Default: 0.7 */
  temperature?: number;
  /** Max tokens. Default: 1024 */
  max_tokens?: number;
};

export type AIResponse = {
  provider?: AIProvider;
  model?: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type AIError = {
  error: string;
};

/**
 * Available models per provider
 */
export const AI_MODELS = {
  openai: {
    'gpt-4o-mini': 'GPT-4o Mini (速い・安い)',
    'gpt-4o': 'GPT-4o (高性能)',
  },
  gemini: {
    'gemini-2.5-flash': 'Gemini 2.5 Flash (速い・安い)',
    'gemini-2.5-pro': 'Gemini 2.5 Pro (高性能)',
  },
  anthropic: {
    'claude-3-haiku-20240307': 'Claude 3 Haiku (速い・安い)',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet (高性能)',
  },
} as const;

/**
 * Generate AI response via Cloudflare Worker proxy
 */
export async function generateAIResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<AIResponse> {
  const response = await fetch(`${AI_PROXY_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: options.provider,
      model: options.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as AIError;
    throw new Error(errorData.error || `AI request failed with status ${response.status}`);
  }

  return data as AIResponse;
}

/**
 * Extract text content from AI response
 */
export function extractContent(response: AIResponse): string {
  return response.choices[0]?.message?.content || '';
}

/**
 * Simple helper to generate a single response
 * 
 * @example
 * // Using default provider (Gemini)
 * const answer = await askAI('今日の献立を提案して');
 * 
 * // Using specific provider
 * const answer = await askAI('今日の献立を提案して', undefined, { provider: 'openai' });
 */
export async function askAI(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {}
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await generateAIResponse(messages, options);
  return extractContent(response);
}

// ============================================
// Training Plan Generation
// ============================================

export type TrainingDayPlan = {
  dayOfWeek: string;
  date: string;
  bodyPart: string;
  totalMinutes: number;
  isRestDay: boolean;
  exercises?: Array<{
    name: string;
    sets: number;
    reps: number;
    rest: number;
  }>;
};

export type UserProfileForAI = {
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  environment: string;
  sessionMinutes: number;
};

const TRAINING_SYSTEM_PROMPT = `あなたはパーソナルトレーナーです。JSONのみ返してください。

ルール：
- 7日分のプラン
- 休息日は週2日（日・火推奨）
- 水曜は脚の日
- 環境に合った種目
- 各トレーニング日は2-4種目

回答形式（JSONのみ、説明不要）：
{"plans":[{"dayOfWeek":"月","bodyPart":"胸","totalMinutes":30,"isRestDay":false},{"dayOfWeek":"火","bodyPart":"休息日","totalMinutes":0,"isRestDay":true}]}`;

/**
 * Generate personalized weekly training plan using AI
 */
export async function generateTrainingPlan(
  profile: UserProfileForAI,
  options: GenerateOptions = {}
): Promise<TrainingDayPlan[]> {
  const today = new Date();
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const prompt = `以下のプロフィールのユーザーに最適な1週間のトレーニングプランを作成してください。

プロフィール：
- 性別: ${profile.gender}
- 年齢: ${profile.age}歳
- 身長: ${profile.height}cm
- 体重: ${profile.weight}kg
- 目標: ${profile.goal}
- 環境: ${profile.environment}
- 1回のトレーニング時間: ${profile.sessionMinutes}分

今日は${WEEKDAYS[today.getDay()]}曜日（${today.getMonth() + 1}/${today.getDate()}）です。
今日から7日間のプランを作成してください。`;

  try {
    const response = await askAI(prompt, TRAINING_SYSTEM_PROMPT, {
      ...options,
      temperature: 0.5,
      max_tokens: 2048,
    });

    console.log('AI Raw Response:', response);
    console.log('AI Response length:', response.length);

    if (!response || response.trim().length === 0) {
      throw new Error('AI returned empty response');
    }

    // Parse JSON from response - handle markdown code blocks
    let jsonStr = response.trim();
    
    // Remove markdown code block if present
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
      console.log('Extracted from code block:', jsonStr);
    }
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI response was not JSON:', response);
      throw new Error('Failed to parse AI response as JSON');
    }

    let jsonToParse = jsonMatch[0];
    console.log('JSON to parse (first 500 chars):', jsonToParse.substring(0, 500));

    // Try to fix incomplete JSON (truncated response)
    // Count opening and closing braces/brackets
    const openBraces = (jsonToParse.match(/\{/g) || []).length;
    const closeBraces = (jsonToParse.match(/\}/g) || []).length;
    const openBrackets = (jsonToParse.match(/\[/g) || []).length;
    const closeBrackets = (jsonToParse.match(/\]/g) || []).length;

    // Add missing closing brackets/braces
    if (openBrackets > closeBrackets || openBraces > closeBraces) {
      console.log('Detected incomplete JSON, attempting to fix...');
      // Remove trailing incomplete content after last complete item
      jsonToParse = jsonToParse.replace(/,\s*[^}\]]*$/, '');
      // Add missing closures
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        jsonToParse += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        jsonToParse += '}';
      }
      console.log('Fixed JSON (last 200 chars):', jsonToParse.slice(-200));
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonToParse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed JSON string (last 500 chars):', jsonToParse.slice(-500));
      throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    if (!parsed.plans || !Array.isArray(parsed.plans)) {
      console.error('Invalid plans structure:', parsed);
      throw new Error('AI response missing "plans" array');
    }

    console.log('Successfully parsed plans count:', parsed.plans.length);

    console.log('Parsed plans count:', parsed.plans.length);

    const plans: TrainingDayPlan[] = [];

    // Add dates to the plans
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const weekday = date.getDay();

      const aiPlan = parsed.plans[i];
      if (aiPlan) {
        plans.push({
          dayOfWeek: WEEKDAYS[weekday],
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          bodyPart: aiPlan.bodyPart || '休息日',
          totalMinutes: aiPlan.totalMinutes || 0,
          isRestDay: aiPlan.isRestDay === true,
          exercises: aiPlan.exercises,
        });
      } else {
        // Fallback if AI didn't return enough days
        plans.push({
          dayOfWeek: WEEKDAYS[weekday],
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          bodyPart: '休息日',
          totalMinutes: 0,
          isRestDay: true,
        });
      }
    }

    console.log('Generated plans:', plans);
    return plans;
  } catch (error) {
    console.error('Failed to generate training plan with AI:', error);
    throw error;
  }
}
