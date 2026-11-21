import { useState } from 'react'
import { RichText, SourceBadge, goalName, timeAgo } from './common.jsx'

/** Follow-up question box anchored to an explanation/change (or general when proposalId is null). */
export default function AskBox({ view, call, proposalId, showRef, placeholder, title }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const thread = view.conversation.filter((c) => c.mode === 'followup' && (c.proposal_id || null) === (proposalId || null))

  const send = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      await call('/ask', { mode: 'followup', question: q, proposal_id: proposalId })
      setQ('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="askbox">
      {title && <h4>{title}</h4>}
      {thread.map((c) => (
        <div key={c.id} className="qa">
          <div className="qa-q"><span className="muted small">You · {timeAgo(c.at)}</span><div>{c.question}</div></div>
          <div className="qa-a">
            <div className="qa-meta"><SourceBadge source={c.source} />
              <span className="muted small">answered for goal: {c.goals.map(goalName).join(' + ')}</span></div>
            <RichText text={c.answer} onRef={(r) => showRef(r, 'AI answer')} />
          </div>
        </div>
      ))}
      <form className="ask-form" onSubmit={send}>
        <textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder || 'Ask a follow-up question…'}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e) }} />
        <button className="btn btn-secondary" disabled={busy || !q.trim()}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
    </div>
  )
}
