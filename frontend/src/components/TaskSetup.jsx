import { useRef, useState } from 'react'

const CODE = ['.py']
const MATERIAL = ['.txt', '.md', '.markdown', '.rst', '.pdf']

function ext(name) {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}
function kindOf(name) {
  const e = ext(name)
  const stem = name.slice(0, name.length - e.length)
  if (CODE.includes(e)) return stem.startsWith('test_') || stem.endsWith('_test') ? 'test' : 'code'
  if (MATERIAL.includes(e)) return 'material'
  return 'unsupported'
}
const KIND_LABEL = { code: 'Code', test: 'Tests', material: 'Learning material', unsupported: 'Not supported' }

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(r.error)
    if (ext(file.name) === '.pdf') {
      r.onload = () => resolve({ name: file.name, b64: String(r.result).split(',')[1] })
      r.readAsDataURL(file)
    } else {
      r.onload = () => resolve({ name: file.name, text: String(r.result) })
      r.readAsText(file)
    }
  })
}

export default function TaskSetup({ view, onSetup, error, studyMode }) {
  const [files, setFiles] = useState([])
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(null)
  const [drag, setDrag] = useState(false)
  const input = useRef()

  const add = (list) => {
    const incoming = Array.from(list)
    setFiles((cur) => [...cur.filter((f) => !incoming.some((n) => n.name === f.name)), ...incoming])
  }
  const remove = (name) => setFiles(files.filter((f) => f.name !== name))

  const codeFiles = files.filter((f) => kindOf(f.name) === 'code')
  const hasTests = files.some((f) => kindOf(f.name) === 'test')
  const hasMaterials = files.some((f) => kindOf(f.name) === 'material')
  const unsupported = files.filter((f) => kindOf(f.name) === 'unsupported')
  const canUpload = codeFiles.length > 0 && unsupported.length === 0

  const upload = async () => {
    setBusy('upload')
    try {
      const payload = await Promise.all(files.map(readFile))
      await onSetup({ mode: 'upload', files: payload, entry: entry || null })
    } catch {
      setBusy(null)
    }
  }
  const example = async () => {
    setBusy('example')
    try {
      await onSetup({ mode: 'example' })
    } catch {
      setBusy(null)
    }
  }

  return (
    <div className="setup">
      {studyMode && (
        <div className="card setup-card setup-example">
          <h3>This task uses a fixed example</h3>
          <p className="muted small">Uploading your own code is disabled during this study, so that every
            participant works on the same tasks.</p>
          <button className="btn btn-primary" disabled={!!busy} onClick={example}>{busy === 'example' ? 'Loading…' : 'Continue'}</button>
        </div>
      )}
      {!studyMode && <div className="card setup-card">
        <h2>Upload your code</h2>
        <p className="muted">
          Add the Python files you're working on and any learning materials (assignment instructions, lecture notes).
          The tool shows and runs <b>your</b> files.
        </p>

        <div className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
          onClick={() => input.current.click()}>
          <b>Drop files here</b> or click to choose
          <div className="small muted">Code: .py (files named test_*.py are used as tests) · Materials: .txt .md .pdf</div>
          <input ref={input} type="file" multiple hidden accept=".py,.txt,.md,.markdown,.rst,.pdf"
            onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </div>

        {files.length > 0 && (
          <table className="table file-table">
            <tbody>
              {files.map((f) => (
                <tr key={f.name}>
                  <td><code>{f.name}</code></td>
                  <td><span className={`pill small ${kindOf(f.name) === 'unsupported' ? 'pill-warn' : 'pill-neutral'}`}>{KIND_LABEL[kindOf(f.name)]}</span></td>
                  <td className="muted small">{(f.size / 1024).toFixed(1)} KB</td>
                  <td><button className="btn-link small" onClick={() => remove(f.name)}>remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {codeFiles.length > 1 && (
          <label className="field">
            <span>Which file runs the program?</span>
            <select value={entry} onChange={(e) => setEntry(e.target.value)}>
              <option value="">Choose automatically (main.py, or a file with __main__)</option>
              {codeFiles.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </label>
        )}

        {files.length > 0 && (
          <div className="will-send">
            <b>What happens next</b>
            <ul>
              <li>Task description: {hasMaterials ? 'taken from your materials' : (view.ai_enabled ? 'the AI writes one from your code' : 'none (no materials uploaded, AI offline)')}</li>
              <li>Checks: {hasTests ? 'your test functions (test_*)' : (view.ai_enabled ? 'the AI writes checks based on the intended behavior' : 'none yet; you can add your own')}</li>
              <li>Explanations and proposed changes: {view.ai_enabled ? 'generated by the AI after you describe the problem' : 'need the AI. It is offline, so you can only view, run, and check the code.'}</li>
            </ul>
          </div>
        )}

        {unsupported.length > 0 && <p className="error-text small">Remove unsupported files: {unsupported.map((f) => f.name).join(', ')}</p>}
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={!canUpload || !!busy} onClick={upload}>
          {busy === 'upload' ? (view.ai_enabled && (!hasTests || !hasMaterials) ? 'Setting up… the AI is reading your files' : 'Setting up…') : 'Use these files'}
        </button>
        {!codeFiles.length && files.length > 0 && <p className="muted small">Add at least one .py file that isn't a test file.</p>}
      </div>}

      {!studyMode && view.examples_left && (
        <div className="card setup-card setup-example">
          <h3>No code of your own?</h3>
          <p className="muted small">Use a ready-made example task with a small bug. Explanations and changes work even without the AI.</p>
          <button className="btn" disabled={!!busy} onClick={example}>{busy === 'example' ? 'Loading…' : 'Use an example task'}</button>
        </div>
      )}
    </div>
  )
}
