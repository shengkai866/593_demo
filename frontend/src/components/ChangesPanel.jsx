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
  if (p.change.hunks.every((h) => h.status === 'applied')) return { text: 'Applied', cls: 'pill-ok' }
  if (p.decision?.decision === 'reject') return { text: 'Rejected', cls: 'pill-muted' }
  return { text: 'Not applied', cls: 'pill-neutral' }
}

export default function ChangesPanel({ view, call, showRef, log, setToast, toExplanation, goStage }) {
  const p = view.proposals[0]

  useEffect(() => {
    if (p) log('change_viewed', { proposal: p.id })
  }, [p?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <NoProposals view={view} call={call} showRef={showRef} goStage={goStage} />

  const history = view.history.filter((h) => ['apply', 'undo', 'reject', 'reconsider'].includes(h.action))
  return (
    <div className="panel">
      <div className="panel-intro">
        The AI suggests one change to fix the problem. <b>It takes effect only when you apply it</b>, and you can
        undo it afterwards.
        {!view.goal.goals.includes('fix') && <> Your goal is <b>Understand the code</b>; the change is shown so
          you can see how the fix relates to the explanation. Applying it is up to you.</>}
      </div>

      <ChangeCard key={p.id} p={p} view={view} call={call} showRef={showRef} setToast={setToast}
        toExplanation={toExplanation} goStage={goStage} />

      <InEffect view={view} call={call} setToast={setToast} />
      <div className="history-box">
        <h4>Change history</h4>
        {history.length === 0 && <p className="muted small">Nothing applied or rejected yet.</p>}
        <ul className="timeline">
          {history.map((h, i) => (
            <li key={i} className={`tl-${h.action}`}><span className="muted small">{timeAgo(h.at)}</span> {h.text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ChangeCard({ p, view, call, showRef, setToast, toExplanation, goStage }) {
  const pending = p.change.hunks.some((h) => h.status === 'pending')
  const applied = p.change.hunks.every((h) => h.status === 'applied')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [sim, setSim] = useState(null)
  const [busy, setBusy] = useState(false)

  const show = (r) => showRef(r, p.label)

  const apply = async () => {
    setBusy(true)
    try {
      await call('/apply', { proposal_id: p.id })
      setToast('Suggested change applied. Run checks to see its effect, or undo it below.')
      setSim(null)
    } finally {
      setBusy(false)
    }
  }

  const simulate = async () => {
    setBusy(true)
    try {
      setSim(await call('/simulate', { proposal_id: p.id, hunk_ids: p.change.hunks.map((h) => h.id) }))
    } catch {
      /* error shown by caller */
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    await call('/decision', { proposal_id: p.id, decision: 'reject', reason, note })
    setRejecting(false)
    setToast('Suggested change rejected. Your code is unchanged.')
  }

  const st = changeStatus(p)
  const files = [...new Set(p.change.hunks.map((h) => h.file))].join(', ')
  return (
    <div className="change-card">
      <div className="change-head">
        <h3>{p.label} <span className="muted">· {files}</span></h3>
        <span className={`pill ${st.cls}`}>{st.text}</span>
      </div>

      <div className="linked-explanation">
        <div className="small"><b>Where it goes wrong</b> (from the AI explanation)
          <button className="btn-link small" onClick={() => toExplanation(p.id)}>open explanation</button></div>
        <RichText text={p.why_fails} onRef={show} />
      </div>

      <h4>The change</h4>
      {p.change.hunks.map((h) => (
        <div key={h.id} className={`hunk hunk-${h.status}`}>
          <div className="hunk-head">
            {h.status !== 'pending' && <span className="hunk-icon">{h.status === 'applied' ? '✓' : '!'}</span>}
            <span>{h.label}</span>
            <span className={`pill small ${h.status === 'applied' ? 'pill-ok' : h.status === 'conflict' ? 'pill-warn' : 'pill-neutral'}`}>
              {h.status === 'applied' ? 'in effect' : h.status === 'conflict' ? 'conflicts with current code' : 'not applied'}
            </span>
          </div>
          <DiffView rows={h.rows} onLine={(row) => row.b && showRef({ file: h.file, start: row.b, end: row.b }, p.label)} />
        </div>
      ))}

      <dl className="kv">
        <dt>Why this change</dt><dd><RichText text={p.change.why} onRef={show} /></dd>
        <dt>AI's claimed effect</dt><dd><RichText text={p.change.claimed_effect} onRef={show} />
          <div className="muted small">This is the AI's claim. Check it against the code and the failing check.</div></dd>
      </dl>

      <div className="change-actions">
        {pending && (
          <>
            <button className="btn btn-apply" disabled={busy} onClick={apply}>Apply</button>
            <button className="btn btn-secondary" disabled={busy} onClick={simulate}>Try on checks without applying</button>
            {p.decision?.decision === 'reject' ? (
              <button className="btn" onClick={() => call('/decision', { proposal_id: p.id, decision: 'clear' })}>Reconsider</button>
            ) : (
              <button className="btn btn-reject" onClick={() => setRejecting(!rejecting)}>Reject…</button>
            )}
          </>
        )}
        {applied && (
          <span className="muted small">Applied. Use <b>Change in effect</b> below to undo it.
            <button className="btn-link small" onClick={() => goStage('checks')}>Run checks →</button></span>
        )}
      </div>

      {rejecting && (
        <div className="reject-form">
          <b>Why reject the suggested change?</b>
          <div className="options">
            {REJECT_REASONS.map((r) => (
              <label key={r} className={`option ${reason === r ? 'selected' : ''}`}>
                <input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}
              </label>
            ))}
          </div>
          <input placeholder="Anything else? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            <button className="btn btn-reject" disabled={!reason} onClick={reject}>Reject the change</button>
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
        title="Ask about the suggested change" placeholder="e.g. Would this change affect the failing check?" />
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
  const undo = async (app_id, label) => {
    await call('/undo', { app_id })
    setToast(`Undid the ${label.toLowerCase()}. That code is back to how it was before the change.`)
  }
  return (
    <div className="in-effect">
      <h4>Change in effect</h4>
      {view.applied.length === 0 && <p className="muted small">No change applied. Your code matches the original code.</p>}
      {view.applied.map((a) => (
        <div key={a.app_id} className="in-effect-row">
          <div>
            <b>{a.label}</b> <span className="muted small">applied {timeAgo(a.at)}</span>
          </div>
          <button className="btn btn-small" onClick={() => undo(a.app_id, a.label)}>Undo</button>
        </div>
      ))}
    </div>
  )
}
