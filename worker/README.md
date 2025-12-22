# Makanai Flow AI Proxy

Cloudflare Worker that proxies AI requests to multiple providers.

## Architecture

Two separate Workers are deployed:

| Environment | Worker Name | URL |
|-------------|-------------|-----|
| Development/Staging | `makanai-flow-ai-proxy-dev` | `https://makanai-flow-ai-proxy-dev.xxx.workers.dev` |
| Production | `makanai-flow-ai-proxy` | `https://makanai-flow-ai-proxy.xxx.workers.dev` |

Each Worker has its own environment variables. **The codebase is identical.**

## Supported Providers

| Provider | Models |
|----------|--------|
| **gemini** (default) | `gemini-1.5-flash`, `gemini-1.5-pro` |
| **openai** | `gpt-4o-mini`, `gpt-4o` |
| **anthropic** | `claude-3-haiku-20240307`, `claude-3-sonnet-20240229` |

## Setup

1. Install dependencies:
```bash
cd worker
npm install
```

2. Login to Cloudflare (初回のみ):
```bash
npm run login
```
ブラウザが開くので、Cloudflareアカウントでログインして認証を許可してください。

3. Set API keys as secrets:

**Development環境:**
```bash
npm run secret:dev
# プロンプトが出たらAPIキーを入力
```

**Production環境:**
```bash
npm run secret:prod
# プロンプトが出たらAPIキーを入力
```

4. Deploy Workers:

**Development環境:**
```bash
npm run deploy:dev
# → https://makanai-flow-ai-proxy-dev.xxx.workers.dev
```

**Production環境:**
```bash
npm run deploy:prod
# → https://makanai-flow-ai-proxy.xxx.workers.dev
```

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

For local development with secrets, create a `.dev.vars` file:
```
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

## API

### POST /generate

Request body:
```json
{
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

**Parameters:**
- `provider` (optional): `"gemini"` | `"openai"` | `"anthropic"`. Default: `"gemini"`
- `model` (optional): Model name. Uses provider default if not specified.
- `messages` (required): Array of chat messages.
- `temperature` (optional): 0-1. Default: 0.7
- `max_tokens` (optional): Default: 1024

**Response (normalized format):**
```json
{
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

## Notes

- No data is stored
- No authentication required
- No logging or analytics
- Completely stateless
- All provider responses are normalized to a consistent format
- No environment switching inside Worker (each has its own config)
