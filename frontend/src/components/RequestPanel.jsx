import { useState } from 'react'
import { goalName, Collapsible } from './common.jsx'

const GOAL_INFO = {
  understand: 'Explain why the code behaves this way. Works for any code, including code you didn\'t write.',
  fix: 'Also propose code changes. You review each one and decide what to apply, and you can undo it.',
}

export default function RequestPanel(props) {
  return props.view.request ? <SentRequest {...props} /> : <RequestForm {...props} />
}

function RequestForm({ view, call, showRef, onSent }) {
  const sc = view.scenario
  const [goals, setGoals] = useState([])
  const [goalText, setGoalText] = useState('')
  const [problem, setProblem] = useState('')
  const [knowledge, setKnowledge] = useState(sc.knowledge)
  const [rules, setRules] = useState(sc.rules)
  const [materials, setMaterials] = useState(view.materials.filter((m) => m.kind !== 'checks').map((m) => m.id))
  const [ranges, setRanges] = useState({})
  const [busy, setBusy] = useState(false)

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const lineCount = (f) => view.files[f].replace(/\n$/, '').split('\n').length

  const send = async () => {
    setBusy(true)
    try {
      const v = await call('/request', { goals, goal_text: goalText, problem, knowledge, rules, materials, ranges })
      onSent(v)
    } catch {
      setBusy(false)
    }
  }

  const sentFiles = view.materials.filter((m) => m.kind === 'file' && materials.includes(m.id))

  return (
    <div className="panel">
      <h3>1 · What do you want help with?</h3>
      <p className="muted small">Choose one or both. You can change this later without losing anything.</p>
      <div className="goal-cards">
        {['understand', 'fix'].map((g) => (
          <label key={g} className={`goal-card ${goals.includes(g) ? 'on' : ''}`}>
            <input type="checkbox" checked={goals.includes(g)} onChange={() => toggle(goals, setGoals, g)} />
            <div>
              <b>{goalName(g)}</b>
              <div className="small muted">{GOAL_INFO[g]}</div>
            </div>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Your goal in your own words <span className="muted">(optional)</span></span>
        <input value={goalText} onChange={(e) => setGoalText(e.target.value)}
          placeholder="e.g. Understand why my program gives an unexpected result" />
      </label>

      <h3>2 · Describe the problem</h3>
      <label className="field">
        <span>What happens, and what did you expect?</span>
        <textarea rows={3} value={problem} onChange={(e) => setProblem(e.target.value)}
          placeholder={`e.g. ${sc.problem_hint}`} />
      </label>

      <h3>3 · Choose what the AI can see</h3>
      <p className="muted small">Only checked items are sent. You can change this later.</p>
      <div className="materials">
        {view.materials.map((m) => (
          <div key={m.id} className="material">
            <label>
              <input type="checkbox" checked={materials.includes(m.id)}
                onChange={() => toggle(materials, setMaterials, m.id)} />
              {m.kind === 'file' ? <code>{m.name}</code> : m.kind === 'material' ? <>📄 {m.name}</> : m.name}
            </label>
            {m.kind === 'file' && (
              <span className="material-extra">
                <button className="btn-link small" onClick={() => showRef({ file: m.name, start: 1, end: 1 }, 'preview')}>
                  Preview
                </button>
                {materials.includes(m.id) && (
                  <RangePicker n={lineCount(m.name)} value={ranges[m.name]}
                    onChange={(r) => setRanges((x) => {
                      const y = { ...x }
                      if (r) y[m.name] = r
                      else delete y[m.name]
                      return y
                    })} />
                )}
              </span>
            )}
            {m.kind === 'checks' && <span className="muted small">(available after you run checks)</span>}
          </div>
        ))}
      </div>

      <Collapsible title="Course context (your background and course rules)">
        <p className="muted small">Helps the AI explain at your level and avoid suggesting things your course doesn't allow.</p>
        <label className="field"><span>What you already know</span>
          <input value={knowledge} onChange={(e) => setKnowledge(e.target.value)} /></label>
        <label className="field"><span>Course rules</span>
          <input value={rules} onChange={(e) => setRules(e.target.value)} /></label>
      </Collapsible>

      <div className="will-send">
        <b>The AI will receive:</b>
        <ul>
          <li>Your goal: {goals.length ? goals.map(goalName).join(' + ') : <i>none chosen yet</i>}{goalText && ` ("${goalText}")`}</li>
          {problem && <li>Your problem description</li>}
          {sentFiles.map((m) => (
            <li key={m.id}><code>{m.name}</code>{ranges[m.name] ? ` (lines ${ranges[m.name][0]}-${ranges[m.name][1]} only)` : ' (whole file)'}</li>
          ))}
          {materials.includes('instructions') && <li>Task description</li>}
          {view.materials.filter((m) => m.kind === 'material' && materials.includes(m.id)).map((m) => <li key={m.id}>Material: {m.name}</li>)}
          {materials.includes('output') && <li>Program output from running <code>python {sc.entry}</code></li>}
          {materials.includes('checks') && <li>Check results (once you run them)</li>}
          {(knowledge || rules) && <li>Your background and course rules</li>}
        </ul>
      </div>

      <button className="btn btn-primary btn-wide" disabled={!goals.length || busy} onClick={send}>
        {busy ? (view.scenario.source === 'upload' && view.ai_enabled ? 'Sending… the AI is writing explanations and changes (can take a minute)' : 'Sending…') : 'Send request'}
      </button>
      {!goals.length && <p className="muted small">Choose at least one goal to continue.</p>}
    </div>
  )
}

function RangePicker({ n, value, onChange }) {
  if (!value) {
    return <button className="btn-link small" onClick={() => onChange([1, n])}>Share only some lines…</button>
  }
  const set = (i, v) => {
    const r = [...value]
    r[i] = Math.max(1, Math.min(n, Number(v) || 1))
    onChange(r)
  }
  return (
    <span className="range small">
      lines <input type="number" min={1} max={n} value={value[0]} onChange={(e) => set(0, e.target.value)} />
      – <input type="number" min={1} max={n} value={value[1]} onChange={(e) => set(1, e.target.value)} />
      <button className="btn-link small" onClick={() => onChange(null)}>whole file</button>
    </span>
  )
}

export function ContextToggles({ view, call, only }) {
  const mats = only ? view.materials.filter((m) => only.includes(m.id)) : view.materials
  const toggle = (id) => {
    const cur = view.context_materials
    call('/context', { materials: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }
  return (
    <div className="materials">
      {mats.map((m) => (
        <label key={m.id} className="material">
          <span>
            <input type="checkbox" checked={view.context_materials.includes(m.id)} onChange={() => toggle(m.id)} />
            {m.kind === 'file' ? <code>{m.name}</code> : m.name}
          </span>
          <span className="muted small">{view.context_materials.includes(m.id) ? 'sent with every question' : 'not sent'}</span>
        </label>
      ))}
    </div>
  )
}

function SentRequest({ view, call, log }) {
  const r = view.request
  return (
    <div className="panel">
      <h3>Your request</h3>
      <dl className="kv">
        <dt>Goal</dt><dd>{view.goal.goals.map(goalName).join(' + ')}{view.goal.text && ` ("${view.goal.text}")`}</dd>
        <dt>Problem</dt><dd>{r.problem || <i className="muted">not given</i>}</dd>
        <dt>Background</dt><dd>{r.knowledge || '—'}</dd>
        <dt>Course rules</dt><dd>{r.rules || '—'}</dd>
      </dl>
      <h4>What the AI sees with each question</h4>
      <p className="muted small">The AI always sees your current code, not the starter code. Changes here apply to your next question.</p>
      <ContextToggles view={view} call={call} />
      <Collapsible title="Show the exact text sent to the AI" right={null}>
        <pre className="context-preview" onCopy={() => log('context_copied')}>{view.ai_context}</pre>
      </Collapsible>
    </div>
  )
}
