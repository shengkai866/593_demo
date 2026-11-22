import { useEffect, useState } from 'react'
import { api, logEvent } from './api.js'
import Questionnaire from './components/Questionnaire.jsx'
import Workspace from './components/Workspace.jsx'

const PID_KEY = 'study_pid'

const ELIGIBILITY_ITEMS = [
  { id: 'age', text: 'I am at least 18 years old.' },
  { id: 'student', text: 'I am currently enrolled as a university student.' },
  { id: 'level', text: 'I have prior experience writing or reading basic Python code (functions, loops, '
      + 'conditionals), and I would describe my overall programming level as beginner to intermediate '
      + '(not advanced or expert).' },
  { id: 'uninvolved', text: 'I was not directly involved in developing this prototype or preparing its tasks.' },
]

function readPid() {
  try {
    return localStorage.getItem(PID_KEY)
  } catch {
    return null
  }
}
function writePid(pid) {
  try {
    if (pid) localStorage.setItem(PID_KEY, pid)
    else localStorage.removeItem(PID_KEY)
  } catch {
    /* storage unavailable */
  }
}

export default function App() {
  const [config, setConfig] = useState(null)
  const [forms, setForms] = useState(null)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [eligibility, setEligibility] = useState({})

  useEffect(() => {
    Promise.all([api.get('/config'), api.get('/questionnaires')])
      .then(([c, q]) => {
        setConfig(c)
        setForms(q)
      })
      .catch((e) => setError(`Cannot reach the backend (${e.message}). Is it running on port 8000?`))
    const pid = readPid()
    if (pid) {
      api.get(`/sessions/${pid}`).then(setSession).catch(() => writePid(null))
    }
  }, [])

  const canStart = consent && ELIGIBILITY_ITEMS.every((it) => eligibility[it.id])

  const start = async () => {
    if (!canStart) return
    setBusy(true)
    try {
      const s = await api.post('/sessions', { participant_label: label })
      writePid(s.pid)
      logEvent(s.pid, null, 'consent_and_eligibility_confirmed', { consent, eligibility })
      setSession(s)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    if (!window.confirm('Start over with a new participant? The current session stays saved on the server.')) return
    writePid(null)
    setSession(null)
  }

  const submit = (path) => async (answers) => {
    const s = await api.post(`/sessions/${session.pid}/${path}`, { answers })
    setSession(s)
    window.scrollTo(0, 0)
  }

  if (error) return <div className="center-page"><div className="card error-card">{error}</div></div>
  if (!config || !forms) return <div className="center-page muted">Loading…</div>

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Code Helper <span className="muted">· study prototype</span></div>
        {session && <Progress session={session} />}
        <div className="topbar-right">
          <span className={`pill ${config.ai_enabled ? 'pill-ok' : 'pill-warn'}`}
            title={config.ai_enabled ? `Model: ${config.model}` : 'Set ANTHROPIC_API_KEY in .env to enable live AI answers'}>
            {config.ai_enabled ? 'AI connected' : 'AI offline: scripted answers'}
          </span>
          {session && <span className="muted small">ID {session.pid}</span>}
          {session && <button className="btn-link small" onClick={reset}>New participant</button>}
        </div>
      </header>

      {!session && (
        <div className="center-page">
          <div className="card welcome">
            <h1>Welcome</h1>
            <p>We are evaluating a high-fidelity prototype of an AI-assisted programming tool designed to support
              university students during programming tasks. During this session, you will be asked to complete
              {' '}{config.tasks_per_participant} Python debugging task{config.tasks_per_participant > 1 ? 's' : ''}
              {' '}using the prototype. <b>We are evaluating the design of the tool rather than your programming
              abilities</b> — your performance will not be used to assess your programming skills. This evaluation
              will take approximately 30 minutes. Your participation is voluntary, and you may stop at any time.</p>
            <p className="muted">We record your answers and your interactions with the tool. Please don't enter personal
              information in the text fields.</p>

            <label className="option">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              {' '}I have read the above and consent to participate in this study.
            </label>

            <p><b>Before we continue, please confirm the following:</b></p>
            {ELIGIBILITY_ITEMS.map((it) => (
              <label key={it.id} className="option">
                <input type="checkbox" checked={!!eligibility[it.id]}
                  onChange={(e) => setEligibility((cur) => ({ ...cur, [it.id]: e.target.checked }))} />
                {' '}{it.text}
              </label>
            ))}
            <p className="muted small">If you do not meet these criteria, or do not wish to continue, please let the
              evaluator know instead of proceeding.</p>

            <label className="field">
              <span>Participant label (optional, for the facilitator)</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. P07" />
            </label>
            <button className="btn btn-primary" disabled={busy || !canStart} onClick={start}>Start</button>
          </div>
        </div>
      )}

      {session?.phase === 'background' && (
        <Questionnaire form={forms.background} onSubmit={submit('background')} />
      )}
      {session?.phase === 'task' && (
        <Workspace key={`${session.pid}-${session.task}`} pid={session.pid} idx={session.task}
          studyMode={config.study_mode} onFinished={setSession} />
      )}
      {session?.phase === 'posttask' && (
        <Questionnaire key={`post-${session.task}`} form={forms.posttask}
          subtitle={`Task ${session.task + 1} of ${session.task_count}: ${session.task_titles[session.task]}`}
          onSubmit={submit(`tasks/${session.task}/posttask`)} />
      )}
      {session?.phase === 'final' && <Questionnaire form={forms.final} onSubmit={submit('final')} />}
      {session?.phase === 'done' && (
        <div className="center-page">
          <div className="card welcome">
            <h1>Thank you!</h1>
            <p>You've finished the study. Your responses are saved under participant ID <b>{session.pid}</b>.</p>
            <button className="btn" onClick={reset}>Start a new participant</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Progress({ session }) {
  const steps = [...session.task_titles.map((_, i) => `Task ${i + 1}`), 'Wrap-up']
  let current = -1
  if (session.phase === 'task' || session.phase === 'posttask') current = session.task
  if (session.phase === 'final') current = steps.length - 1
  if (session.phase === 'done') current = steps.length
  return (
    <ol className="progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''}>{s}</li>
      ))}
    </ol>
  )
}
