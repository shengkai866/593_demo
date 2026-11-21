import { RichText, SourceBadge, goalName, timeAgo } from './common.jsx'

const MODE_TITLE = { followup: 'Follow-up', explain_again: 'Explain again', new_approach: 'New approach', office_hours: 'Office hours draft' }

/** One place to revisit everything: goals, explanations, Q&A, changes, runs. */
export default function HistoryDrawer({ view, onClose, showRef, openProposal }) {
  const items = [
    ...view.goal_history.map((g) => ({ at: g.at, kind: 'goal', g })),
    ...view.conversation.map((c) => ({ at: c.at, kind: 'qa', c })),
    ...view.history.filter((h) => h.action !== 'goal' && h.action !== 'request').map((h) => ({ at: h.at, kind: 'action', h })),
  ].sort((a, b) => b.at - a.at)
  const label = (pid) => view.proposals.find((p) => p.id === pid)

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="row space">
          <h3>History</h3>
          <button className="btn-link" onClick={onClose}>Close ✕</button>
        </div>

        <h4>Explanations</h4>
        <ul className="drawer-list">
          {view.proposals.map((p) => (
            <li key={p.id}>
              <b>{p.explanation_label}</b>: {p.summary}
              <div className="row">
                <button className="btn-link small" onClick={() => openProposal(p.id, 'explain')}>Open explanation + code</button>
                <button className="btn-link small" onClick={() => openProposal(p.id, 'changes')}>Open {p.label}</button>
              </div>
            </li>
          ))}
        </ul>

        <h4>Timeline</h4>
        <ul className="drawer-list">
          {items.map((it, i) => (
            <li key={i}>
              <span className="muted small">{timeAgo(it.at)}</span>{' '}
              {it.kind === 'goal' && <>Goal {it.g.source === 'request' ? 'set' : 'changed'} to <b>{it.g.goals.map(goalName).join(' + ')}</b></>}
              {it.kind === 'action' && it.h.text}
              {it.kind === 'qa' && (
                <div className="drawer-qa">
                  <b>{MODE_TITLE[it.c.mode]}</b>
                  {it.c.proposal_id && <> about <button className="btn-link small" onClick={() => openProposal(it.c.proposal_id, 'explain')}>{label(it.c.proposal_id)?.explanation_label}</button></>}
                  {' '}<SourceBadge source={it.c.source} />
                  {it.c.question && <div className="muted">Q: {it.c.question}</div>}
                  <RichText text={it.c.answer} onRef={(r) => showRef(r, 'History')} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
