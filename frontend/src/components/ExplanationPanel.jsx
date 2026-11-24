import { useEffect } from 'react'
import { parseRef, RefChip, RichText } from './common.jsx'
import AskBox from './AskBox.jsx'
import NoProposals from './NoProposals.jsx'

export default function ExplanationPanel(props) {
  return props.view.proposals.length ? <Explanation {...props} /> : <NoProposals {...props} />
}

/** The task's single AI explanation: what the relevant code does, then why the code fails. */
function Explanation({ view, call, showRef, log, toChange }) {
  const p = view.proposals[0]

  useEffect(() => {
    log('explanation_viewed', { proposal: p.id })
  }, [p.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = (r) => showRef(r, p.explanation_label)

  return (
    <div className="panel">
      <div className="panel-intro">
        Read the AI's explanation against the code on the left. Click a code reference to highlight that code.
      </div>

      <div className="explanation">
        <h3>AI explanation</h3>

        {p.code_explanation && (
          <>
            <h4>What this code does</h4>
            {p.code_refs?.length > 0 && (
              <div className="refers">
                <span className="refers-label">Refers to:</span>
                {p.code_refs.map((ref) => <RefChip key={ref} r={parseRef(ref)} onRef={show} />)}
              </div>
            )}
            <RichText text={p.code_explanation} onRef={show} />
          </>
        )}

        <h4>Why the current code fails</h4>
        <div className="refers">
          <span className="refers-label">Refers to:</span>
          {p.refs.map((ref) => <RefChip key={ref} r={parseRef(ref)} onRef={show} />)}
        </div>
        <RichText text={p.why_fails} onRef={show} />

        <div className="behavior-grid">
          <div className="behavior current">
            <div className="behavior-label">What the code does now</div>
            <RichText text={p.current_behavior} onRef={show} />
          </div>
          <div className="behavior correct">
            <div className="behavior-label">What correct code should do</div>
            <RichText text={p.correct_behavior} onRef={show} />
          </div>
        </div>

        <div className="explanation-actions">
          <button className="btn btn-preview" onClick={() => toChange(p.id)}>Review the suggested change →</button>
        </div>
      </div>

      <AskBox view={view} call={call} proposalId={p.id} showRef={showRef}
        title="Ask about this explanation"
        placeholder={`e.g. Why would ${p.refs[0]} cause this?`} />
    </div>
  )
}
