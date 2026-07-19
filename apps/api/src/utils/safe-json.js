function tryParseJSON(value) {
   try {
      return {
         success: true,
         data: JSON.parse(value)
      }
   } catch {
      return {
         success: false,
         data: null
      }
   }
}

function extractJSONObject(raw) {
   const cleaned = String(raw || '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

   const firstBrace = cleaned.indexOf('{')
   const lastBrace = cleaned.lastIndexOf('}')

   if (firstBrace === -1) {
      return cleaned
   }

   if (lastBrace < firstBrace) {
      return cleaned.slice(firstBrace)
   }

   return cleaned.slice(firstBrace, lastBrace + 1)
}

function safeParseJSON(raw) {
   const text = extractJSONObject(raw)
   const candidates = [text]

   const withoutTrailingCommas = text.replace(
      /,\s*([}\]])/g,
      '$1'
   )

   if (withoutTrailingCommas !== text) {
      candidates.push(withoutTrailingCommas)
   }

   const openBraces = (text.match(/\{/g) || []).length
   const closingBraces = (text.match(/\}/g) || []).length

   if (openBraces > closingBraces) {
      const completed =
            text + '}'.repeat(openBraces - closingBraces)

      candidates.push(completed)
      candidates.push(
         completed.replace(/,\s*([}\]])/g, '$1')
      )
   }

   for (const candidate of [...new Set(candidates)]) {
      const result = tryParseJSON(candidate)

      if (result.success) {
         return result.data
      }
   }

   throw new Error(
      'Failed to parse AI response as JSON'
   )
}

module.exports = {
   safeParseJSON,
   tryParseJSON
}
