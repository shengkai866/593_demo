import { useState } from 'react'

function isRequired(q) {
  return q.required ?? q.type !== 'text'
}

function answered(q, v) {
  if (q.type === 'multi') return Array.isArray(v) && v.length > 0
  return v !== undefined && v !== null && String(v).trim() !== ''
}

export default function Questionnaire({ form, subtitle, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [showMissing, setShowMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))
  const missing = form.questions.filter((q) => isRequired(q) && !answered(q, answers[q.id]))

  const submit = async (e) => {
    e.preventDefault()
    if (missing.length) {
      setShowMissing(true)
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      await onSubmit(answers)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="questionnaire card" onSubmit={submit}>
      <h1>{form.title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {form.intro && <p className="muted">{form.intro}</p>}
      {form.questions.map((q, i) => (
        <div key={q.id} id={`q-${q.id}`}
          className={`question ${showMissing && missing.includes(q) ? 'question-missing' : ''}`}>
          <div className="question-text">
            <span className="qnum">{i + 1}.</span> {q.text}
            {!isRequired(q) && <span className="muted small"> (optional)</span>}
          </div>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
        </div>
      ))}
      {showMissing && missing.length > 0 && (
        <p className="error-text">Please answer the {missing.length} highlighted question(s).</p>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>Continue</button>
    </form>
  )
}

function QuestionInput({ q, value, onChange }) {
  if (q.type === 'likert') {
    const nums = Array.from({ length: q.scale }, (_, i) => i + 1)
    return (
      <div className="likert">
        <span className="likert-label">{q.labels[0]}</span>
        <div className="likert-scale" role="radiogroup">
          {nums.map((n) => (
            <button type="button" key={n} role="radio" aria-checked={value === n}
              className={`likert-btn ${value === n ? 'selected' : ''}`} onClick={() => onChange(n)}>{n}</button>
          ))}
        </div>
        <span className="likert-label">{q.labels[1]}</span>
      </div>
    )
  }
  if (q.type === 'single') {
    return (
      <div className="options">
        {q.options.map((o) => (
          <label key={o} className={`option ${value === o ? 'selected' : ''}`}>
            <input type="radio" name={q.id} checked={value === o} onChange={() => onChange(o)} /> {o}
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'multi') {
    const arr = value || []
    const toggle = (o) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
    return (
      <div className="options">
        {q.options.map((o) => (
          <label key={o} className={`option ${arr.includes(o) ? 'selected' : ''}`}>
            <input type="checkbox" checked={arr.includes(o)} onChange={() => toggle(o)} /> {o}
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'number') {
    return (
      <input type="number" className="input-narrow" min={q.min} max={q.max} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
    )
  }
  return <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} />
}
