/**
 * Scoring: fewer clues revealed → higher score
 */
const SCORE_TABLE = { 1: 500, 2: 400, 3: 300, 4: 200, 5: 100 }
const MAX_CLUES = 5

function scoreForClues(cluesRevealed) {
  return SCORE_TABLE[cluesRevealed] || 0
}

module.exports = { SCORE_TABLE, MAX_CLUES, scoreForClues }
