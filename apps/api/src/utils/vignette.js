'use strict'

const db = require('../../db/models')
const { getAIClient } = require('../config/ai')
const {
   safeParseJSON
} = require('./safe-json')

function buildPrompt(disease, difficulty, locale) {
   const difficultyPrompts = {
      easy: 'Create a straightforward clinical case with classic presentation.',
      medium: 'Create a moderately challenging case with some atypical features.',
      hard: 'Create a complex case with unusual presentation or comorbidities.'
   }
   const lang =
    locale === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English'

   return `You are generating a clinical vignette for medical students about "${disease.name}" (ICD-11: ${disease.icd_code}).

Difficulty: ${difficulty}. ${difficultyPrompts[difficulty]}
Language: ${lang}.

CRITICAL RULES:
- Respond with ONLY a single JSON object. No markdown, no prose, no code fences.
- "caseText" MUST be a continuous 3rd-person clinical narrative (age, sex, chief complaint, HPI, exam, labs, imaging) written as 5-7 short progressive sentences that read like a story, one new fact per sentence, ordered from least to most specific. Do NOT name the disease or ICD code in the text.
- "clues" MUST be those same sentences from caseText, in the exact same order, each 1 sentence (1-2 short clauses). This is what the student sees revealed one-by-one. Exactly 5 clues.
- "correctDiagnosis" must equal the canonical disease name (in ${lang}).
- The first revealed clue should open with the patient presentation; the last should be the confirming imaging/lab finding.
- Do NOT repeat the disease name or ICD code in clues.

Example clue progression (style only, not content):
1. "A 2-year-old boy is brought to the ED after 2 days of intermittent vomiting."
2. "The vomitus has been yellow and his abdomen seems to hurt."
3. "Nobody else in the family has been ill or has similar symptoms."
4. "He has dry mucous membranes and is diffusely tender, with guarding in the right upper quadrant."
5. "Ultrasound shows a bowel segment with concentric hyperechoic and hypoechoic rings, resembling a target."

JSON shape (strict):
{
  "caseText": "...",
  "correctDiagnosis": "...",
  "clues": ["Clue 1...", "Clue 2...", "Clue 3...", "Clue 4...", "Clue 5..."],
  "distractors": ["Similar condition 1", "Similar condition 2", "Similar condition 3"]
}`
}

function parseVignette(content) {
   const parsed = safeParseJSON(content)
   if (parsed) return parsed

   console.warn('Failed to parse AI response as JSON, using raw content')
   const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
   return {
      caseText: cleaned,
      correctDiagnosis: '',
      clues: [],
      distractors: []
   }
}

function deriveCluesFromCase(caseText) {
   if (!caseText) return []
   const sentences = caseText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 220)
   return sentences
}

function normalizeClues(parsed, disease) {
   const diseaseName = (disease.name || '').toLowerCase()

   // Primary: derive progressive one-sentence clues from caseText, in story order.
   const fromCase = deriveCluesFromCase(parsed.caseText).filter(
      (s) => !s.toLowerCase().includes(diseaseName)
   )

   if (fromCase.length >= 5) {
      return fromCase.slice(0, 5)
   }

   // Fallback: use AI-provided clues array if caseText too short.
   const base = Array.isArray(parsed.clues)
      ? parsed.clues.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean)
      : []

   const merged = [...fromCase, ...base].filter(
      (value, index, self) => self.indexOf(value) === index
   )

   // If still fewer than 5, pad from any remaining case sentences.
   if (merged.length < 5) {
      const extra = deriveCluesFromCase(parsed.caseText).filter(
         (s) => !merged.includes(s) && !s.toLowerCase().includes(diseaseName)
      )
      merged.push(...extra)
   }

   return merged.slice(0, 5)
}

/**
 * Generate a vignette + clues for a disease via AI.
 * Returns the created QuizVignette instance.
 */
async function generateForDisease(disease, locale = 'id', difficulty = 'medium') {
   const aiClient = getAIClient()

   const prompt = buildPrompt(disease, difficulty, locale)
   const completion = await aiClient.chat.completions.create({
      model: process.env.AI_COMBOS,
      messages: [
         {
            role: 'system',
            content:
          'You are a medical education expert creating clinical vignettes for medical students.'
         },
         { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
   })

   const content = completion.choices[0].message.content
   const parsed = parseVignette(content)
   const clueTexts = normalizeClues(parsed, disease)

   const variantName = `auto-${Date.now()}-${disease.id}`
   console.log('[generateForDisease] variantName:', variantName, 'disease.id:', disease.id)

   const vignette = await db.QuizVignette.create({
      disease_id: disease.id,
      variant_name: variantName
   })

   await db.Clue.bulkCreate(
      clueTexts.map((text, i) => ({
         vignette_id: vignette.id,
         clue_number: i + 1,
         content: text,
         type: i === 0 ? 'history' : 'clinical'
      }))
   )

   return vignette
}

module.exports = { buildPrompt, parseVignette, normalizeClues, generateForDisease }
