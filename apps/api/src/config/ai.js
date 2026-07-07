const OpenAI = require('openai')

let client = null

function getAIClient() {
  if (client) return client

  if (!process.env.AI_API_KEY) {
    console.warn('AI_API_KEY not set, AI features disabled')
    return null
  }

  client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.AI_SITE_URL || 'https://clinIQ-AI.app',
      'X-Title': process.env.AI_SITE_NAME || 'ClinIQ-AI'
    }
  })

  return client
}

module.exports = { getAIClient }
