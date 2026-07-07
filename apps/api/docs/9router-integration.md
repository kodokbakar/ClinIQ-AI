# 9Router Integration for AI Explanations

Connects ClinIQ-AI backend to a [9Router](https://github.com/9Router/9Router) instance (OpenAI-compatible) for generating localized AI explanations and quiz vignettes.

**[CONFIG.md](CONFIG.md) · [rules-ai.md](rules-ai.md) · [GLOSSARY.md](GLOSSARY.md)**

---

## 1. Prerequisites

- Running 9Router instance with a deployed model supporting OpenAI Chat Completions API
- Base URL of your 9Router instance (e.g., `http://localhost:20128`)
- API key for your 9Router instance, if required

---

## 2. Environment Configuration

Set these in `apps/api/.env`. See [CONFIG.md](CONFIG.md) for the full variable reference.

```env
# 9Router / OpenAI-Compatible Endpoint
AI_BASE_URL=http://localhost:20128/v1
AI_API_KEY=sk-placeholder
AI_MODEL=gpt-3.5-turbo
AI_CHAT_COMPLETIONS_PATH=/chat/completions
AI_PROVIDER_NAME=9Router
AI_REQUEST_TIMEOUT_MS=60000
```

**Note:** The `openai-node` client can also read `OPENAI_API_BASE` and `OPENAI_API_KEY` directly if you prefer. The project convention uses `AI_*` prefixes (see [CONFIG.md](CONFIG.md)). Pick one convention and stick with it.

---

## 3. Code Implementation

The backend uses a standard `openai` client initialized from the environment variables:

```typescript
import OpenAI from 'openai';

// Reads AI_BASE_URL, AI_API_KEY from process.env automatically
// when OPENAI_API_BASE is NOT set — otherwise map manually:
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL || 'http://localhost:20128/v1',
  apiKey: process.env.AI_API_KEY || 'sk-placeholder',
});

async function getAIExplanation(
  diseaseName: string,
  clues: string[]
): Promise<string> {
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Anda adalah seorang dokter Indonesia yang ramah. Jelaskan penyakit "${diseaseName}" dalam bahasa Indonesia yang mudah dipahami. Gunakan konteks lokal Indonesia. Tetap akurat secara medis. Maksimal 3-4 paragraf.`,
      },
      {
        role: 'user',
        content: `Berikan penjelasan untuk penyakit ini berdasarkan petunjuk:\n${clues.join('\n')}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return (
    response.choices[0]?.message?.content?.trim() ??
    'Penjelasan tidak tersedia.'
  );
}
```

See [rules-ai.md](rules-ai.md#1-ai-explanation-generation-user-facing) for the full system prompt template.

---

## 4. Verification

1. **Start the API:** `bun run dev` in `apps/api/`
2. **Trigger a quiz:** Call `POST /v1/quiz/submit-diagnosis` with an incorrect answer
3. **Check logs:**
   - ClinIQ-AI logs for `openai` client errors
   - 9Router logs confirming the request was routed and returned a response
   - Confirm the response is returned by the API and cached in `AI_Explanations`

---

## 5. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` | Wrong/missing `AI_API_KEY` | Check key matches 9Router config |
| `ECONNREFUSED` | 9Router not running or wrong `AI_BASE_URL` | Verify 9Router is up and port matches |
| `400 Invalid model` | `AI_MODEL` not recognized by 9Router | Check available models in 9Router config |
| Timeout > 60s | Model too slow or 9Router overloaded | Increase `AI_REQUEST_TIMEOUT_MS` or use faster model |
