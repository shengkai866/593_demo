import { useEffect, useState } from 'react'
import { RichText, timeAgo } from './common.jsx'
import DiffView from './DiffView.jsx'
import AskBox from './AskBox.jsx'
import NoProposals from './NoProposals.jsx'

const REJECT_REASONS = [
  "It wouldn't change what the code does",
  "It doesn't address the failure",
  'It would make things worse',
  "I'd rather fix it myself",
  'Other',
]

function changeStatus(p) {
  const hs = p.change.hunks
  const applied = hs.filter((h) => h.status === 'applied').length
  if (applied === hs.length) return { text: 'Applied', cls: 'pill-ok' }
  if (applied) return { text: `Partly applied (${applied}/${hs.length})`, cls: 'pill-ok' }
  if (p.decision?.decision === 'reject') return { text: 'Rejected', cls: 'pill-muted' }
  return { text: 'Not decided', cls: 'pill-neutral' }
}

export default function ChangesPanel({ view, call, showRef, log, setToast, active, setActive, toExplanation, goStage }) {
  const fix = view.goal.goals.includes('fix')
  const p = view.proposals.find((x) => x.id === active) || view.proposals[0]

  if (!view.proposals.length) return <NoProposals view={view} call={call} showRef={showRef} goStage={goStage} />

  if (!fix) {
    return (
      <div className="panel">
        <h3>Proposed changes are hidden</h3>
        <p>Your current goal is <b>Understand the code</b>, so the AI isn't proposing edits. Add <b>Fix the code</b> to
          your goal to see them. Your explanations and follow-up questions are kept.</p>
        <button className="btn btn-primary" onClick={async () => {
          await call('/goal', { goals: [...view.goal.goals, 'fix'], text: view.goal.text })
          setToast('Goal updated: Understand + Fix. Everything you had is kept.')
        }}>Add "Fix the code" to my goal</button>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-intro">
        Each change comes with the explanation it is based on. <b>Changes take effect only when you apply them</b>, and
        you can undo any applied change.
      </div>
      <div className="tabs">
        {view.proposals.map((x) => {
          const st = changeStatus(x)
          return (
            <button key={x.id} className={`tab ${x.id === p.id ? 'active' : ''}`}
              onClick={() => { setActive(x.id); log('change_viewed', { proposal: x.id }) }}>
              {x.label}
              <span className={`pill small ${st.cls}`}>{st.text}</span>
            </button>
          )
        })}
      </div>

      <ChangeCard key={p.id} p={p} view={view} call={call} showRef={showRef} log={log} setToast={setToast}
        toExplanation={toExplanation} goStage={goStage} />

      <InEffect view={view} call={call} setToast={setToast} />
      <div className="history-box">
        <h4>Change history</h4>
        {view.history.filter((h) => ['apply', 'undo', 'reject', 'reconsider'].includes(h.action)).length === 0 &&
          <p className="muted small">Nothing applied or rejected yet.</p>}
        <ul className="timeline">
          {view.history.filter((h) => ['apply', 'undo', 'reject', 'reconsider'].includes(h.action)).map((h, i) => (
            <li key={i} className={`tl-${h.action}`}><span className="muted small">{timeAgo(h.at)}</span> {h.text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ChangeCard({ p, view, call, showRef, log, setToast, toExplanation, goStage }) {
  const pending = p.change.hunks.filter((h) => h.status === 'pending').map((h) => h.id)
  const [selected, setSelected] = useState(pending)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [sim, setSim] = useState(null)
  const [busy, setBusy] = useState(false)
  const a = p.assessment || {}

  useEffect(() => setSelected(p.change.hunks.filter((h) => h.status === 'pending').map((h) => h.id)),
    [p.change.hunks.map((h) => h.status).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = (r) => showRef(r, p.label)
  const assess = (patch) => call('/assess', { proposal_id: p.id, rationale_supports: a.rationale_supports ?? null,
    predicted_effect: a.predicted_effect ?? null, note: a.note || '', ...patch })

  const apply = async () => {
    setBusy(true)
    try {
      await call('/apply', { proposal_id: p.id, hunk_ids: selected })
      setToast(`${p.label} applied (${selected.length} of ${p.change.hunks.length} part${p.change.hunks.length > 1 ? 's' : ''}). Run checks to see its effect, or undo it below.`)
      setSim(null)
    } finally {
      setBusy(false)
    }
  }

  const simulate = async () => {
    setBusy(true)
    try {
      const ids = selected.length ? selected : pending
      const r = await call('/simulate', { proposal_id: p.id, hunk_ids: ids })
      setSim(r)
    } catch {
      /* error shown by caller */
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    await call('/decision', { proposal_id: p.id, decision: 'reject', reason, note })
    setRejecting(false)
    setToast(`${p.label} rejected. Your code is unchanged.`)
  }

  const st = changeStatus(p)
  return (
    <div className="change-card">
      <div className="change-head">
        <h3>{p.label} <span className="muted">· {p.change.hunks[0].file}</span></h3>
        <span className={`pill ${st.cls}`}>{st.text}</span>
      </div>

      <div className="linked-explanation">
        <div className="small"><b>Where it goes wrong</b> (according to {p.explanation_label})
          <button className="btn-link small" onClick={() => toExplanation(p.id)}>open explanation</button></div>
        <RichText text={p.why_fails} onRef={show} />
      </div>

      <h4>Parts of this change</h4>
      {p.change.hunks.length > 1 && <p className="muted small">This change has {p.change.hunks.length} parts. Choose which ones to apply.</p>}
      {p.change.hunks.map((h) => (
        <div key={h.id} className={`hunk hunk-${h.status}`}>
          <label className="hunk-head">
            {h.status === 'pending' ? (
              <input type="checkbox" checked={selected.includes(h.id)}
                onChange={() => setSelected(selected.includes(h.id) ? selected.filter((x) => x !== h.id) : [...selected, h.id])} />
            ) : <span className="hunk-icon">{h.status === 'applied' ? '✓' : '!'}</span>}
            <span>{h.label}</span>
            <span className={`pill small ${h.status === 'applied' ? 'pill-ok' : h.status === 'conflict' ? 'pill-warn' : 'pill-neutral'}`}>
              {h.status === 'applied' ? 'in effect' : h.status === 'conflict' ? 'conflicts with current code' : 'not applied'}
            </span>
          </label>
          <DiffView rows={h.rows} onLine={(row) => row.b && showRef({ file: h.file, start: row.b, end: row.b }, p.label)} />
        </div>
      ))}

      <dl className="kv">
        <dt>Why this change</dt><dd><RichText text={p.change.why} onRef={show} /></dd>
        <dt>AI's claimed effect</dt><dd><RichText text={p.change.claimed_effect} onRef={show} />
          <div className="muted small">This is the AI's claim. Check it against the code and the failing check.</div></dd>
      </dl>

      <div className="reasoning">
        <div className="reasoning-q">
          <span>Does the AI's reason actually support this change?</span>
          <Seg value={a.rationale_supports} onChange={(v) => assess({ rationale_supports: v })}
            options={[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']]} />
        </div>
        <div className="reasoning-q">
          <span>What do you think this change will do to the failing behavior?</span>
          <Seg value={a.predicted_effect} onChange={(v) => assess({ predicted_effect: v })}
            options={[['fixes', 'Fix it'], ['partial', 'Fix part of it'], ['no_effect', 'No effect'], ['worse', 'Make it worse'], ['unsure', 'Not sure']]} />
        </div>
        <p className="muted small">Your answers are just for your own reasoning. "No effect" can be a correct conclusion.</p>
      </div>

      <div className="change-actions">
        {pending.length > 0 && (
          <>
            <button className="btn btn-apply" disabled={!selected.length || busy} onClick={apply}>
              Apply {selected.length === pending.length ? (pending.length > 1 ? 'all parts' : 'change') : `${selected.length} selected part${selected.length > 1 ? 's' : ''}`}
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={simulate}>Try on checks without applying</button>
            {p.decision?.decision === 'reject' ? (
              <button className="btn" onClick={() => call('/decision', { proposal_id: p.id, decision: 'clear' })}>Reconsider</button>
            ) : (
              <button className="btn btn-reject" onClick={() => setRejecting(!rejecting)}>Reject…</button>
            )}
          </>
        )}
        {pending.length === 0 && p.change.hunks.some((h) => h.status === 'applied') && (
          <span className="muted small">Applied. Use <b>Changes in effect</b> below to undo it.
            <button className="btn-link small" onClick={() => goStage('checks')}>Run checks →</button></span>
        )}
      </div>

      {rejecting && (
        <div className="reject-form">
          <b>Why reject {p.label}?</b>
          <div className="options">
            {REJECT_REASONS.map((r) => (
              <label key={r} className={`option ${reason === r ? 'selected' : ''}`}>
                <input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}
              </label>
            ))}
          </div>
          <input placeholder="Anything else? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            <button className="btn btn-reject" disabled={!reason} onClick={reject}>Reject {p.label}</button>
            <button className="btn-link" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
          <p className="muted small">Rejecting doesn't change your code. You can reconsider later.</p>
        </div>
      )}
      {p.decision?.decision === 'reject' && (
        <p className="muted small">You rejected this change{p.decision.reason ? `: "${p.decision.reason}"` : ''}.</p>
      )}

      {sim && <SimulationResult sim={sim} label={p.label} onClose={() => setSim(null)} />}

      <AskBox view={view} call={call} proposalId={p.id} showRef={showRef}
        title={`Ask about ${p.label}`} placeholder="e.g. Would this change affect the failing check?" />
    </div>
  )
}

function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  )
}

function SimulationResult({ sim, label, onClose }) {
  const changedCount = sim.rows.filter((r) => r.before !== r.after).length
  return (
    <div className="simulation">
      <div className="row space">
        <b>Preview: checks with {label} vs. your current code</b>
        <button className="btn-link small" onClick={onClose}>close</button>
      </div>
      <p className="small">
        {changedCount === 0
          ? <>This change <b>did not change any check result</b>. Every check returned the same value as before.</>
          : <>{changedCount} check result{changedCount > 1 ? 's' : ''} changed. Your code was <b>not</b> modified.</>}
      </p>
      {sim.error && <pre className="error-pre">{sim.error}</pre>}
      <table className="table">
        <thead><tr><th>Check</th><th>Expected</th><th>Now</th><th>With change</th></tr></thead>
        <tbody>
          {sim.rows.map((r) => (
            <tr key={r.name} className={r.before !== r.after ? 'row-changed' : ''}>
              <td><div>{r.name}</div><code className="small">{r.call}</code></td>
              <td><code>{r.expected}</code></td>
              <td><code>{r.before}</code> <Status s={r.before_status} /></td>
              <td><code>{r.after}</code> <Status s={r.after_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Status({ s }) {
  return <span className={`status status-${s}`}>{s === 'pass' ? 'Pass' : 'Fail'}</span>
}

function InEffect({ view, call, setToast }) {
  const undo = async (app_id, hunk_id, label) => {
    await call('/undo', { app_id, hunk_id })
    setToast(`Undid ${label}. That code is back to how it was before the change.`)
  }
  return (
    <div className="in-effect">
      <h4>Changes in effect</h4>
      {view.applied.length === 0 && <p className="muted small">No changes applied. Your code matches the starter code.</p>}
      {view.applied.map((a) => (
        <div key={a.app_id} className="in-effect-row">
          <div>
            <b>{a.label}</b> <span className="muted small">applied {timeAgo(a.at)}</span>
            <ul>
              {a.hunks.map((h) => (
                <li key={h.id}>{h.label}
                  {a.hunks.length > 1 && <button className="btn-link small" onClick={() => undo(a.app_id, h.id, `${a.label}: ${h.label}`)}>undo this part</button>}
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-small" onClick={() => undo(a.app_id, null, a.label)}>Undo {a.label}</button>
        </div>
      ))}
    </div>
  )
}
