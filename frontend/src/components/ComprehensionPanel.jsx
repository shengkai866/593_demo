import { useState } from 'react'

const KEYS = ['localization', 'root_cause', 'fix_rationale']
const LABELS = {
  localization: 'Where in the code (R5)',
  root_cause: 'Root cause (R6)',
  fix_rationale: 'Fix rationale (R6)',
}

export default function ComprehensionPanel({ view, call, log }) {
  const comp = view.comprehension
  const [choice, setChoice] = useState({})
  const [busy, setBusy] = useState(false)
  const [showMissing, setShowMissing] = useState(false)

  if (!comp) {
    return (
      <div className="panel">
        <h3>Comprehension check</h3>
        <p className="muted">These questions are only available for the built-in example tasks, once the AI's
          explanations and proposed changes are ready.</p>
      </div>
    )
  }

  if (comp.answered) {
    return (
      <div className="panel">
        <h3>Comprehension check</h3>
        <p className="muted">You've answered these questions for this task. Thanks! You can move on to running
          checks, or finish the task.</p>
      </div>
    )
  }

  const missing = KEYS.filter((k) => !choice[k])

  const submit = async () => {
    if (missing.length) {
      setShowMissing(true)
      document.getElementById(`comp-${missing[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      await call('/comprehension', { answers: choice })
      log('comprehension_submitted', { answers: choice })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-intro">
        A few questions about the explanation and the proposed change for this task. There's no right-or-wrong
        feedback shown here — just answer as best you can, then you can move on.
      </div>
      {KEYS.map((k) => {
        const q = comp.questions[k]
        return (
          <div key={k} id={`comp-${k}`} className={`question ${showMissing && !choice[k] ? 'question-missing' : ''}`}>
            <div className="question-text"><b>{LABELS[k]}</b><br />{q.prompt}</div>
            <div className="options">
              {q.options.map((o) => (
                <label key={o.id} className={`option ${choice[k] === o.id ? 'selected' : ''}`}>
                  <input type="radio" name={k} checked={choice[k] === o.id}
                    onChange={() => setChoice((c) => ({ ...c, [k]: o.id }))} /> {o.text}
                </label>
              ))}
            </div>
          </div>
        )
      })}
      {showMissing && missing.length > 0 && <p className="error-text">Please answer all {KEYS.length} questions.</p>}
      <button className="btn btn-primary" disabled={busy} onClick={submit}>Submit answers</button>
    </div>
  )
}
