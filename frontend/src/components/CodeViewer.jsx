import { useEffect, useRef } from 'react'
import { PyLine, refLabel } from './common.jsx'

/**
 * Shows the *whole* current file so referenced lines can be read in context.
 * Uploaded learning materials appear as extra tabs (activeFile = "doc:<name>").
 * focus = {file, start, end, label}: highlighted and scrolled into view.
 */
export default function CodeViewer({ files, fileOrder, docs = [], activeFile, setActiveFile, focus, modified, stateLabel, onClearFocus }) {
  const lineRefs = useRef({})
  const isDoc = activeFile?.startsWith('doc:')
  const doc = isDoc ? docs.find((d) => `doc:${d.name}` === activeFile) : null
  const text = isDoc ? '' : files[activeFile] || ''
  const lines = text.replace(/\n$/, '').split('\n')
  const mod = new Set(modified?.[activeFile] || [])

  useEffect(() => {
    if (focus && focus.file === activeFile) {
      lineRefs.current[focus.start]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [focus, activeFile])

  const inFocus = (n) => focus && focus.file === activeFile && n >= focus.start && n <= focus.end

  return (
    <div className="code-viewer">
      <div className="file-tabs">
        {fileOrder.map((f) => (
          <button key={f} className={`file-tab ${f === activeFile ? 'active' : ''}`} onClick={() => setActiveFile(f)}>
            {f}
            {modified?.[f]?.length > 0 && <span className="dot" title="Changed from your original code" />}
            {focus?.file === f && f !== activeFile && <span className="dot dot-focus" title="Referenced code is in this file" />}
          </button>
        ))}
        {docs.map((d) => (
          <button key={d.name} className={`file-tab doc-tab ${`doc:${d.name}` === activeFile ? 'active' : ''}`}
            onClick={() => setActiveFile(`doc:${d.name}`)} title="Learning material">
            📄 {d.name}
          </button>
        ))}
      </div>

      {doc ? (
        <>
          <div className="focus-bar doc-bar"><span>Learning material (read-only)</span></div>
          <div className="doc-body">{doc.text}</div>
        </>
      ) : (
        <>
          {focus && (
            <div className="focus-bar">
              <span>
                Showing <b>{refLabel(focus)}</b>
                {focus.label && <> · referenced by <b>{focus.label}</b></>}
              </span>
              <button className="btn-link small" onClick={onClearFocus}>Clear highlight</button>
            </div>
          )}
          <pre className="code">
            {lines.map((l, i) => {
              const n = i + 1
              return (
                <div key={n} ref={(el) => (lineRefs.current[n] = el)}
                  className={`code-line ${inFocus(n) ? 'hl' : ''} ${mod.has(n) ? 'modified' : ''}`}>
                  <span className="ln">{n}</span>
                  <span className="lc"><PyLine text={l} /></span>
                </div>
              )
            })}
          </pre>
        </>
      )}
      <div className="code-state">
        <span className="muted small">Code state:</span> <b className="small">{stateLabel}</b>
        {Object.values(modified || {}).some((a) => a.length) && (
          <span className="legend small"><span className="legend-mod" /> changed line</span>
        )}
      </div>
    </div>
  )
}
