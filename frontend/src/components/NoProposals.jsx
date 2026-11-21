import { useState } from 'react'
import AskBox from './AskBox.jsx'

/** Shown when the AI could not (or cannot) generate explanations and changes for uploaded code. */
export default function NoProposals({ view, call, showRef, goStage }) {
  const [busy, setBusy] = useState(false)
  const g = view.generation || {}
  const retry = async () => {
    setBusy(true)
    try {
      await call('/generate')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="panel">
      <h3>{g.status === 'failed' ? "The AI couldn't generate explanations" : 'Explanations need the AI'}</h3>
      <p>{g.message || 'No explanations are available for this task.'}</p>
      <div className="row">
        {g.status === 'failed' && view.ai_enabled && (
          <button className="btn btn-primary" disabled={busy} onClick={retry}>{busy ? 'Generating… (can take a minute)' : 'Try again'}</button>
        )}
        <button className="btn" onClick={() => goStage('checks')}>Go to Run checks</button>
      </div>
      {view.ai_enabled && <AskBox view={view} call={call} proposalId={null} showRef={showRef} title="Ask the AI about your code" />}
    </div>
  )
}
