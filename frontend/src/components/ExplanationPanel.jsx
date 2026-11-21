import { useEffect, useState } from 'react'
import { parseRef, RefChip, RichText } from './common.jsx'
import AskBox from './AskBox.jsx'
import NoProposals from './NoProposals.jsx'

export default function ExplanationPanel(props) {
  return props.view.proposals.length ? <Explanations {...props} /> : <NoProposals {...props} />
}

function Explanations({ view, call, showRef, log, active, setActive, toChange, goStage }) {
  const p = view.proposals.find((x) => x.id === active) || view.proposals[0]
  const understand = view.goal.goals.includes('understand')
  const fix = view.goal.goals.includes('fix')
  const [smaller, setSmaller] = useState(understand)

  useEffect(() => {
    setSmaller(understand)
    log('explanation_viewed', { proposal: p.id })
  }, [p.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = (r) => showRef(r, p.explanation_label)

  return (
    <div className="panel">
      <div className="panel-intro">
        The AI suggested <b>{view.proposals.length} possible explanations</b>. They may not all be right. Read each one
        against the code on the left.
      </div>
      <div className="tabs">
        {view.proposals.map((x) => (
          <button key={x.id} className={`tab ${x.id === p.id ? 'active' : ''}`} onClick={() => setActive(x.id)}>
            {x.explanation_label}
            <span className="tab-sub">{x.summary}</span>
            {x.decision?.decision === 'reject' && <span className="pill pill-muted small">rejected</span>}
          </button>
        ))}
      </div>

      <div className="explanation">
        <div className="refers">
          <span className="refers-label">Refers to:</span>
          {p.refs.map((ref) => <RefChip key={ref} r={parseRef(ref)} onRef={show} />)}
        </div>

        <h4>Why the current code fails</h4>
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

        <h4>Suggested approach</h4>
        <RichText text={p.approach} onRef={show} />

        <div className="steps-box">
          <div className="steps-head">
            <b>Investigate it yourself</b>
            <button className="btn btn-small" onClick={() => { setSmaller(!smaller); log('make_smaller', { proposal: p.id, open: !smaller }) }}>
              {smaller ? 'Hide steps' : 'Break into smaller steps'}
            </button>
          </div>
          {smaller && (
            <>
              <ol className="steps">
                {p.steps.map((s, i) => (
                  <li key={i} className={p.steps_done.includes(i) ? 'done' : ''}>
                    <label>
                      <input type="checkbox" checked={p.steps_done.includes(i)}
                        onChange={(e) => call('/step', { proposal_id: p.id, step: i, done: e.target.checked })} />
                      <RichText text={s} onRef={show} className="inline" />
                    </label>
                  </li>
                ))}
              </ol>
              <p className="muted small">Checking a step only tracks your own progress. It doesn't run or change anything.</p>
            </>
          )}
        </div>

        <div className="explanation-actions">
          {fix ? (
            <button className="btn btn-preview" onClick={() => toChange(p.id)}>Review proposed {p.label} →</button>
          ) : (
            <div className="muted small">
              Your goal is <b>Understand</b> only, so proposed code changes are hidden.{' '}
              <button className="btn-link small" onClick={() => goStage('changes')}>See what changing your goal would show</button>
            </div>
          )}
        </div>
      </div>

      <AskBox view={view} call={call} proposalId={p.id} showRef={showRef}
        title={`Ask about ${p.explanation_label}`}
        placeholder={`e.g. Why would ${p.refs[0]} cause this?`} />
    </div>
  )
}
