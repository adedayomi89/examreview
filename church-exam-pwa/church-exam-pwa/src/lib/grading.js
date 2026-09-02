// A single source of truth for "was this question answered correctly",
// used when submitting an exam, showing a result, and building class
// insights — so scoring can never drift between those three places.

function normalizeText(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// `given` shape depends on question_type:
//   single / multiple / true_false -> array of selected option ids
//   fill_blank                     -> array with one typed string, e.g. ["paris"]
//   matching                       -> object { [optionId]: chosenRightText }
export function isQuestionCorrect(question, given) {
  const type = question.question_type

  if (type === 'fill_blank') {
    const typed = normalizeText(Array.isArray(given) ? given[0] : given)
    if (!typed) return false
    return question.options.some((o) => normalizeText(o.option_html) === typed)
  }

  if (type === 'matching') {
    const answers = given && typeof given === 'object' ? given : {}
    if (question.options.length === 0) return false
    return question.options.every((o) => normalizeText(answers[o.id]) === normalizeText(o.match_text) && o.match_text)
  }

  // single / multiple / true_false — exact set match against correct options
  const correctIds = question.options.filter((o) => o.is_correct).map((o) => o.id).sort()
  const givenIds = [...(Array.isArray(given) ? given : [])].sort()
  return correctIds.length > 0 && correctIds.length === givenIds.length && correctIds.every((id, i) => id === givenIds[i])
}

export function scoreAttempt(questions, answers) {
  let score = 0
  let totalPoints = 0
  questions.forEach((q) => {
    totalPoints += q.points
    if (isQuestionCorrect(q, answers[q.id])) score += q.points
  })
  return { score, totalPoints }
}
