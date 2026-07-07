const OpenAI = require('openai')

function requiredEnv(name) {
   const value = process.env[name]
   if (!value) throw new Error(`Missing required environment variable: ${name}`)
   return value
}

const AI_BASE_URL = requiredEnv('AI_BASE_URL')
const AI_API_KEY = requiredEnv('AI_API_KEY')
const AI_MODEL = requiredEnv('AI_MODEL')

const AI_CHAT_COMPLETIONS_PATH =
  process.env.AI_CHAT_COMPLETIONS_PATH?.trim() || '/chat/completions'
const AI_PROVIDER_NAME =
  process.env.AI_PROVIDER_NAME?.trim() || 'OpenAI-compatible provider'
const AI_REQUEST_TIMEOUT_MS = Number(
   process.env.AI_REQUEST_TIMEOUT_MS ?? 60_000
)

let client = null

function getAIClient() {
   if (client) return client

   client = new OpenAI({
      apiKey: AI_API_KEY,
      baseURL: AI_BASE_URL,
      defaultHeaders: {
         'HTTP-Referer': process.env.AI_SITE_URL || 'https://clinIQ-AI.app',
         'X-Title': process.env.AI_SITE_NAME || 'ClinIQ-AI'
      },
      timeout: AI_REQUEST_TIMEOUT_MS,
      maxRetries: 1
   })

   return client
}

module.exports = { getAIClient }
