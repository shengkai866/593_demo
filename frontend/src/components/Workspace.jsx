import { useCallback, useEffect, useState } from 'react'
import { api, logEvent } from '../api.js'
import CodeViewer from './CodeViewer.jsx'
import RequestPanel from './RequestPanel.jsx'
import ExplanationPanel from './ExplanationPanel.jsx'
import ChangesPanel from './ChangesPanel.jsx'
import ComprehensionPanel from './ComprehensionPanel.jsx'
import ChecksPanel from './ChecksPanel.jsx'
import HistoryDrawer from './HistoryDrawer.jsx'
import TaskSetup from './TaskSetup.jsx'
import { goalName, Collapsible } from './common.jsx'

const STAGES = [
  { id: 'request', n: 1, title: 'Ask for help' },
  { id: 'explain', n: 2, title: 'Explanations' },
  { id: 'changes', n: 3, title: 'Proposed changes' },
  { id: 'comprehension', n: 4, title: 'Check your understanding' },
  { id: 'checks', n: 5, title: 'Run checks' },
]

export default function Workspace({ pid, idx, studyMode, onFinished }) {
  const [view, setView] = useState(null)
  const [stage, setStage] = useState('request')
  const [focus, setFocus] = useState(null)
  const [activeFile, setActiveFile] = useState(null)
  const [activeProposal, setActiveProposal] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const base = `/sessions/${pid}/tasks/${idx}`
  const log = useCallback((type, data) => logEvent(pid, idx, type, data), [pid, idx])

  useEffect(() => {
    api.get(base).then((v) => {
      setView(v)
      if (!v.scenario) return
      setActiveFile(v.file_order[0])
      if (v.request) {
        setStage('explain')
        setActiveProposal(v.proposals[0]?.id)
      }
    }).catch((e) => setError(e.message))
  }, [base])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  /** POST to a task endpoint; updates the view. Returns the raw response. */
  const call = useCallback(async (path, body, method = 'post') => {
    setError(null)
    try {
      const res = method === 'del' ? await api.del(base + path) : await api.post(base + path, body)
      if (res.task) setView(res.task)
      else if (res.files) setView(res)
      return res
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [base])

  const showRef = useCallback((r, label) => {
    setActiveFile(r.file)
    setFocus({ ...r, label })
    log('ref_clicked', { ...r, label })
  }, [log])

  const goStage = (s, data) => {
    setStage(s)
    log('stage_opened', { stage: s, ...data })
  }

  const openProposal = (id, s = 'explain') => {
    setActiveProposal(id)
    goStage(s, { proposal: id })
    const p = view.proposals.find((x) => x.id === id)
    if (p?.refs?.length) {
      const [file, range] = p.refs[0].split(':')
      const [a, b] = range.split('-').map(Number)
      showRef({ file, start: a, end: b || a }, p.explanation_label)
    }
  }

  const finish = async () => {
    if (view.comprehension && !view.comprehension.answered) {
      setError('Please answer the comprehension questions before finishing this task.')
      setStage('comprehension')
      return
    }
    if (!window.confirm("Finish this task and go to the questions about it? You won't be able to come back to this task.")) return
    try {
      const s = await api.post(`${base}/finish`)
      onFinished(s)
      window.scrollTo(0, 0)
    } catch (e) {
      setError(e.message)
    }
  }

  if (!view) return <div className="center-page muted">{error || 'Loading task…'}</div>

  if (!view.scenario) {
    return (
      <div className="workspace">
        <div className="task-header"><div>
          <div className="eyebrow">Task {idx + 1} of {view.total}</div>
          <h2>Set up this task</h2>
        </div></div>
        <TaskSetup view={view} error={error} studyMode={studyMode} onSetup={async (body) => {
          const v = await call('/setup', body)
          setActiveFile(v.file_order[0])
          log('setup_done', { mode: body.mode })
        }} />
      </div>
    )
  }

  const sent = !!view.request
  const lastRun = view.runs[view.runs.length - 1]
  const stageMeta = {
    request: sent ? 'sent' : 'start here',
    explain: sent ? (view.proposals.length ? `${view.proposals.length} explanations` : (view.generation?.status === 'failed' ? 'generation failed' : 'not available')) : '',
    changes: sent ? (view.applied.length ? `${view.applied.length} in effect` : 'none applied') : '',
    comprehension: sent ? (view.comprehension ? (view.comprehension.answered ? 'answered' : 'not answered yet') : 'not available') : '',
    checks: lastRun ? `${lastRun.results.filter((r) => r.status === 'pass').length}/${lastRun.results.length} passed` : 'not run yet',
  }

  return (
    <div className="workspace">
      <div className="task-header">
        <div>
          <div className="eyebrow">Task {idx + 1} of {view.total}</div>
          <h2>{view.scenario.title}</h2>
        </div>
        <div className="task-header-actions">
          <button className="btn" onClick={() => { setDrawer(true); log('history_opened') }}>
            History ({view.history.length + view.conversation.length})
          </button>
          <button className="btn btn-done" onClick={finish}>I'm done with this task</button>
        </div>
      </div>

      <Assignment view={view} defaultOpen={!sent}
        openDoc={(name) => { setActiveFile(`doc:${name}`); log('doc_opened', { doc: name }) }} />

      {sent && <GoalBar view={view} call={call} setToast={setToast} goStage={goStage} />}

      <nav className="stepper">
        {STAGES.map((s) => (
          <button key={s.id} disabled={!sent && (s.id === 'explain' || s.id === 'changes' || s.id === 'comprehension')}
            className={`step ${stage === s.id ? 'active' : ''}`} onClick={() => goStage(s.id)}>
            <span className="step-n">{s.n}</span>
            <span className="step-title">{s.title}</span>
            <span className="step-meta">{stageMeta[s.id]}</span>
          </button>
        ))}
      </nav>

      {error && <div className="error-banner">{error} <button className="btn-link" onClick={() => setError(null)}>dismiss</button></div>}
      {toast && <div className="toast">{toast}</div>}

      <div className="split">
        <div className="split-left">
          <CodeViewer files={view.files} fileOrder={view.file_order} activeFile={activeFile}
            setActiveFile={(f) => { setActiveFile(f); log('file_opened', { file: f }) }}
            docs={view.docs} focus={focus} modified={view.modified_lines} stateLabel={view.state_label}
            onClearFocus={() => setFocus(null)} />
        </div>
        <div className="split-right">
          {stage === 'request' && (
            <RequestPanel view={view} call={call} showRef={showRef} log={log}
              onSent={(v) => { setActiveProposal(v.proposals[0]?.id); openFirst(v) }} />
          )}
          {stage === 'explain' && sent && (
            <ExplanationPanel view={view} call={call} showRef={showRef} log={log}
              active={activeProposal} setActive={(id) => openProposal(id, 'explain')}
              toChange={(id) => openProposal(id, 'changes')} goStage={goStage} />
          )}
          {stage === 'changes' && sent && (
            <ChangesPanel view={view} call={call} showRef={showRef} log={log} setToast={setToast}
              active={activeProposal} setActive={setActiveProposal}
              toExplanation={(id) => openProposal(id, 'explain')} goStage={goStage} />
          )}
          {stage === 'comprehension' && sent && (
            <ComprehensionPanel view={view} call={call} log={log} />
          )}
          {stage === 'checks' && (
            <ChecksPanel view={view} call={call} showRef={showRef} log={log} goStage={goStage} />
          )}
        </div>
      </div>

      {drawer && (
        <HistoryDrawer view={view} onClose={() => setDrawer(false)} showRef={showRef}
          openProposal={(id, s) => { setDrawer(false); openProposal(id, s) }} />
      )}
    </div>
  )

  function openFirst(v) {
    setStage('explain')
    const p = v.proposals[0]
    if (p?.refs?.length) {
      const [file, range] = p.refs[0].split(':')
      const [a, b] = range.split('-').map(Number)
      setActiveFile(file)
      setFocus({ file, start: a, end: b || a, label: p.explanation_label })
    }
  }
}

function GoalBar({ view, call, setToast, goStage }) {
  const [editing, setEditing] = useState(false)
  const [goals, setGoals] = useState(view.goal.goals)
  const [text, setText] = useState(view.goal.text)

  const toggle = (g) => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g])
  const save = async () => {
    await call('/goal', { goals, text })
    setEditing(false)
    setToast('Goal updated. Your request, materials, explanations, and code changes are all kept.')
    if (goals.includes('fix') && !view.goal.goals.includes('fix')) goStage('changes')
  }

  if (!editing) {
    return (
      <div className="goal-bar">
        <span className="goal-label">Current goal:</span>
        {view.goal.goals.map((g) => <span key={g} className={`goal-chip goal-${g}`}>{goalName(g)}</span>)}
        {view.goal.text && <span className="goal-text">"{view.goal.text}"</span>}
        <button className="btn btn-small" onClick={() => { setGoals(view.goal.goals); setText(view.goal.text); setEditing(true) }}>
          Change goal
        </button>
      </div>
    )
  }
  return (
    <div className="goal-bar editing">
      <span className="goal-label">Change goal to:</span>
      {['understand', 'fix'].map((g) => (
        <label key={g} className={`goal-toggle ${goals.includes(g) ? 'on' : ''}`}>
          <input type="checkbox" checked={goals.includes(g)} onChange={() => toggle(g)} /> {goalName(g)}
        </label>
      ))}
      <input className="goal-input" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="In your own words (optional)" />
      <button className="btn btn-primary btn-small" disabled={!goals.length} onClick={save}>Save goal</button>
      <button className="btn-link small" onClick={() => setEditing(false)}>Cancel</button>
      <div className="muted small goal-note">
        Changing your goal changes how the AI answers from now on. Nothing is lost: your request, shared materials,
        explanations, and applied changes stay as they are.
      </div>
    </div>
  )
}

const SOURCE_NOTE = {
  example: null,
  ai: 'Written by the AI from your code (you did not upload assignment instructions). It may be wrong.',
  materials: 'Summary of your uploaded materials, written by the AI.',
}

function Assignment({ view, defaultOpen, openDoc }) {
  const sc = view.scenario
  return (
    <Collapsible title="Task" defaultOpen={defaultOpen}>
      {sc.assignment && <p className="assignment">{sc.assignment}</p>}
      {SOURCE_NOTE[sc.assignment_source] && sc.assignment && <p className="muted small">{SOURCE_NOTE[sc.assignment_source]}</p>}
      {view.docs.length > 0 && (
        <p className="small">Your materials:{' '}
          {view.docs.map((d) => <button key={d.name} className="btn-link small" onClick={() => openDoc(d.name)}>{d.name}</button>)}
        </p>
      )}
      {!sc.assignment && !view.docs.length && <p className="muted small">No task description: you didn't upload instructions, and the AI is offline.</p>}
      {sc.setup_warning && <p className="warn-text small">The AI couldn't prepare part of this task: {sc.setup_warning}</p>}
      <p className="muted small">Program: <code>python {sc.entry}</code>. The tool runs the code for you when you click <b>Run checks</b>.</p>
    </Collapsible>
  )
}
