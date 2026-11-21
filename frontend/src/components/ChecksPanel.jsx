import { useState } from 'react'
import { parseRef, RefChip, RichText, SourceBadge, timeAgo } from './common.jsx'
import { Status } from './ChangesPanel.jsx'
import { ContextToggles } from './RequestPanel.jsx'
import AskBox from './AskBox.jsx'

const CHECK_SOURCE = {
  course: 'Course staff wrote the default checks.',
  tests: 'The checks are the test functions from your uploaded test file(s).',
  ai: 'The AI wrote the default checks from the intended behavior. Their expected values may be wrong.',
  none: 'There are no default checks for this task.',
}

export default function ChecksPanel({ view, call, showRef, log, goStage }) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)
  const last = view.runs[view.runs.length - 1]
  const stale = last && last.state !== view.state_label
  const repeated = last ? last.results.filter((r) => r.failed_before_under?.length) : []

  const run = async () => {
    setBusy(true)
    try {
      await call('/run')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="testing-banner">
        <div>
          <div className="muted small">Code being tested</div>
          <b>{view.state_label}</b>
        </div>
        <button className="btn-link small" onClick={() => goStage('changes')}>View / undo applied changes</button>
      </div>
      <p className="muted small">
        Clicking <b>Run checks</b> makes this tool run your <i>current</i> code against each check and also runs the program.
        You don't need to run anything yourself. {CHECK_SOURCE[view.scenario.checks_source]} You can add your own below.
      </p>
      <button className="btn btn-run" disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run checks'}</button>
      {stale && <span className="stale small">Your code changed since the last run. Run again to see current results.</span>}

      {last && (
        <>
          <h4>Results <span className="muted small">· {timeAgo(last.at)} on {last.state}</span></h4>
          {last.error && <pre className="error-pre">{last.error}</pre>}
          {repeated.length > 0 && (
            <div className="repeat-banner">
              <b>Same failure after different code.</b>{' '}
              {repeated.map((r) => `"${r.name}"`).join(', ')} also failed on: {repeated[0].failed_before_under.join('; ')}.
              The changes you've tried so far may not address this check. Compare the explanations again, or use <b>Still stuck?</b> below.
            </div>
          )}
          <table className="table">
            <thead>
              <tr><th>Check</th><th>Expected (correct)</th><th>Actual (your code)</th><th>Result</th><th /></tr>
            </thead>
            <tbody>
              {last.results.map((r) => (
                <FragmentRow key={r.id} r={r} open={open === r.id}
                  toggle={() => { setOpen(open === r.id ? null : r.id); log('check_details', { check: r.id }) }}
                  showRef={showRef} />
              ))}
            </tbody>
          </table>
        </>
      )}

      <AddCheck view={view} call={call} />

      <div className="output-box">
        <div className="row space">
          <b>Latest program output</b>
          <span className="muted small">{view.latest_output?.command}</span>
        </div>
        <pre className="output">{view.latest_output ? ((view.latest_output.stdout + view.latest_output.stderr).trim() || '(no output)') : 'Not run yet.'}</pre>
      </div>

      <div className="context-box">
        <b>Include results when you ask the AI?</b>
        <ContextToggles view={view} call={call} only={['output', 'checks']} />
      </div>

      {view.runs.length > 1 && (
        <div className="history-box">
          <h4>Earlier runs</h4>
          <ul className="timeline">
            {[...view.runs].reverse().slice(1).map((r) => (
              <li key={r.run_id}><span className="muted small">{timeAgo(r.at)}</span> {r.state}: {r.results.filter((x) => x.status === 'pass').length}/{r.results.length} passed</li>
            ))}
          </ul>
        </div>
      )}

      <AskBox view={view} call={call} proposalId={null} showRef={showRef} title="Ask about these results"
        placeholder="e.g. Why does this check still fail?" />

      <StillStuck view={view} call={call} showRef={showRef} log={log} />
    </div>
  )
}

function FragmentRow({ r, open, toggle, showRef }) {
  const inv = r.investigate && parseRef(r.investigate)
  return (
    <>
      <tr className={r.status === 'fail' ? 'row-fail' : ''}>
        <td><div>{r.name}</div><code className="small">{r.call}</code>
          {r.author === 'You' && <span className="pill pill-neutral small">yours</span>}</td>
        <td><code>{r.expected}</code></td>
        <td><code>{r.actual}</code></td>
        <td><Status s={r.status} /></td>
        <td><button className="btn-link small" onClick={toggle}>{open ? 'Hide' : 'Details'}</button></td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={5}>
            <div><b>Call:</b> <code>{r.call}</code></div>
            <div><b>Expected:</b> <code>{r.expected}</code> <span className="muted small">(what correct code returns, per the assignment)</span></div>
            <div><b>Actual:</b> <code>{r.actual}</code> <span className="muted small">({r.raised ? 'your code raised an error' : 'what your current code returned'})</span></div>
            <div><b>Written by:</b> {r.author}</div>
            {r.status === 'fail' && inv && (
              <div><b>Where to look:</b> <RefChip r={inv} onRef={(x) => showRef(x, `check "${r.name}"`)} /></div>
            )}
            {r.failed_before_under?.length > 0 && (
              <div className="warn-text small">Also failed on: {r.failed_before_under.join('; ')}</div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function AddCheck({ view, call }) {
  const funcs = view.functions || []
  const [fnKey, setFnKey] = useState(funcs[0] ? `${funcs[0].module}.${funcs[0].function}` : '')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [args, setArgs] = useState('')
  const [expected, setExpected] = useState('')
  const fnInfo = funcs.find((f) => `${f.module}.${f.function}` === fnKey)
  const fn = fnInfo ? fnInfo.function : 'function'
  const add = async (e) => {
    e.preventDefault()
    try {
      await call('/checks', { name, args, expected, function: fnKey })
      setName(''); setArgs(''); setExpected(''); setOpen(false)
    } catch {
      /* error banner shown */
    }
  }
  const mine = view.checks.filter((c) => c.author === 'You')
  return (
    <div className="add-check">
      {mine.length > 0 && (
        <ul className="my-checks">
          {mine.map((c) => (
            <li key={c.id}><code>{c.call}</code> → <code>{c.expected}</code> <span className="muted small">{c.name}</span>
              <button className="btn-link small" onClick={() => call(`/checks/${c.id}`, null, 'del')}>remove</button></li>
          ))}
        </ul>
      )}
      {!funcs.length ? (
        <p className="muted small">No top-level functions found in your code, so custom checks aren't available.</p>
      ) : !open ? (
        <button className="btn btn-small" onClick={() => setOpen(true)}>+ Add my own check</button>
      ) : (
        <form onSubmit={add} className="add-check-form">
          {funcs.length > 1 && (
            <label className="field"><span>Function to call</span>
              <select value={fnKey} onChange={(e) => setFnKey(e.target.value)}>
                {funcs.map((f) => <option key={`${f.module}.${f.function}`} value={`${f.module}.${f.function}`}>{f.file}: {f.signature}</option>)}
              </select></label>
          )}
          {fnInfo && funcs.length === 1 && <p className="muted small">Calls <code>{fnInfo.signature}</code> from {fnInfo.file}</p>}
          <label className="field"><span>Name (what it tests)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Target appears twice" /></label>
          <label className="field"><span>Arguments as a JSON list, so <code>{fn}(…)</code> is called with them</span>
            <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder={'e.g. [[5, 7, 5], 5]'} /></label>
          <label className="field"><span>Expected return value (JSON: numbers, true/false, "text", [lists])</span>
            <input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="e.g. 0" /></label>
          <div className="row">
            <button className="btn btn-primary btn-small" disabled={!args || !expected}>Add check</button>
            <button type="button" className="btn-link" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

const HELP = [
  { mode: 'explain_again', title: 'Explain again', desc: 'Get a new, simpler explanation of the current failure. Your code is not changed.' },
  { mode: 'new_approach', title: 'New approach', desc: 'Get a different way to investigate the problem yourself, like comparing two inputs. Your code is not changed.' },
  { mode: 'office_hours', title: 'Office hours', desc: 'Draft a question for a TA, based only on what you actually did. Nothing is sent. You copy it yourself.' },
]

function StillStuck({ view, call, showRef, log }) {
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(view.office_hours?.draft || '')
  const [copied, setCopied] = useState(false)
  const latest = mode && [...view.conversation].reverse().find((c) => c.mode === mode)

  const choose = async (m) => {
    setMode(m)
    log('still_stuck_option', { mode: m })
    if ([...view.conversation].some((c) => c.mode === m)) return
    await generate(m)
  }
  const generate = async (m) => {
    setBusy(true)
    try {
      const r = await call('/ask', { mode: m })
      if (m === 'office_hours') setDraft(r.entry.answer)
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
    call('/office-hours', { draft })
  }

  return (
    <div className="stuck">
      <h3>Still stuck?</h3>
      <div className="help-options">
        {HELP.map((h) => (
          <button key={h.mode} className={`help-option ${mode === h.mode ? 'on' : ''}`} onClick={() => choose(h.mode)}>
            <b>{h.title}</b>
            <span className="small">{h.desc}</span>
          </button>
        ))}
      </div>
      {mode && (
        <div className="help-result">
          {busy && <p className="muted">Working…</p>}
          {!busy && latest && mode !== 'office_hours' && (
            <>
              <div className="qa-meta"><SourceBadge source={latest.source} /></div>
              <RichText text={latest.answer} onRef={(r) => showRef(r, HELP.find((h) => h.mode === mode).title)} />
              <button className="btn-link small" onClick={() => generate(mode)}>Ask again</button>
            </>
          )}
          {!busy && mode === 'office_hours' && latest && (
            <>
              <div className="row space">
                <span className="pill pill-warn">Draft · not sent to anyone</span>
                <SourceBadge source={latest.source} />
              </div>
              <textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <p className="muted small">Based only on what's in your history. Check that it's accurate before you use it.</p>
              <div className="row">
                <button className="btn btn-small" onClick={copy}>{copied ? 'Copied!' : 'Copy draft'}</button>
                <button className="btn-link small" onClick={() => generate('office_hours')}>Regenerate from my latest history</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
