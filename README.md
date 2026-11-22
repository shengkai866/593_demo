# Code Helper: AI-assisted programming study demo

A web app for running a user study on AI help in programming. For each task, the participant uploads their own Python
code and learning materials (or picks a built-in example). They then work through the problem with an AI assistant,
and answer a short questionnaire about the task. A final questionnaire ends the session.

- **Frontend**: React + Vite (JavaScript), in `frontend/`
- **Backend**: Python + FastAPI, in `backend/`
- **AI**: Claude via the Anthropic API (optional, see below)

## Requirements

| Tool | Version | Check with |
|---|---|---|
| Python | 3.10 or newer | `python3 --version` |
| Node.js | 18 or newer (npm included) | `node --version` |

On macOS, if your `python3` is older than 3.10: `brew install python@3.12`.

## Setup (first time only)

### 1. Configure `.env`

From the project root:

```bash
cp .env.example .env
```

Open `.env` and set your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

You can leave the key empty. Here's what still works without it:

| | With a key | Without a key |
|---|---|---|
| Example tasks | Everything works | Everything works. AI answers are replaced by scripted text labeled **Scripted (AI offline)**. |
| Uploaded code | The AI writes the task description, checks, explanations, and proposed changes where your files don't provide them | You can view and run your code, run your own test files, and add checks. There are no explanations or proposed changes. |

### 2. Install backend dependencies

```bash
cd backend
python3 -m venv .venv            # use python3.12 (or any 3.10+) if python3 is older
.venv/bin/pip install -r requirements.txt
cd ..
```

On Windows, use `.venv\Scripts\pip` instead of `.venv/bin/pip`.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

## Running

### Option A: one command (macOS / Linux)

```bash
./dev.sh
```

This starts both servers. Press `Ctrl+C` to stop both. On first run, it also creates `.env`, the Python virtual
environment, and `node_modules` if they're missing, so you can skip the setup steps above if you like.

### Option B: two terminals

Terminal 1, backend (port 8000):

```bash
cd backend
.venv/bin/uvicorn app:app --reload --port 8000
```

Terminal 2, frontend (port 5173):

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173**.

The top-right corner shows **AI connected** if the key works, or **AI offline: scripted answers** if not.

## Using the app

1. **Start**: read the consent text, check the consent and eligibility boxes, optionally enter a participant label
   (e.g. `P07`), and click Start.
2. **Background questionnaire**: a short set of questions about programming/Python/AI-tool experience.
3. **Tasks** (3 by default). Each task starts with a setup page (with `STUDY_MODE=1`, uploading is disabled and the
   task goes straight to the fixed example):
   - **Upload your files** (drag and drop, or click):
     - `.py` files are your code. Files named `test_*.py` or `*_test.py` are treated as tests.
     - `.txt`, `.md`, and `.pdf` files are learning materials (assignment instructions, lecture notes). PDFs need
       selectable text; scanned images won't work.
     - If there are several code files, choose which one runs the program, or let the tool pick (`main.py`, or a file
       containing `__main__`).
   - **Or use an example task**: a small built-in bug. Each participant gets the examples in a random order.

   The tool uses what your files provide, and fills in the rest with the AI:

   | Part of the task | Taken from your files when… | Otherwise |
   |---|---|---|
   | Task description | You uploaded materials (the AI summarizes them) | The AI infers one from your code |
   | Checks | You uploaded `test_*.py` (each `test_` function becomes a check) | The AI writes 4-6 checks |
   | Explanations and proposed changes | (always generated) | The AI writes 3 after you describe the problem: one real fix and two plausible ones that don't fix it, in random order |

   Then work through the four steps:
   1. *Ask for help*: choose a goal (understand the code, fix it, or both), describe the problem, and choose what the AI can see.
   2. *Explanations*: click code references to highlight them, and ask follow-up questions.
   3. *Proposed changes*: review each change, try it on the checks without applying it, apply some or all of it, reject it, or undo it.
   4. *Run checks*: test the current code, add your own checks, or open **Still stuck?** for more help.

   Uploaded materials appear as 📄 tabs next to the code files. Click **I'm done with this task** to answer a short
   questionnaire about the task.
4. **Final questionnaire**, then a thank-you screen.

To start over with a new participant, click **New participant** in the top-right corner. Refreshing the page resumes
the current participant.

## Collected data

Each participant is saved as one file: `backend/data/sessions/<participant-id>.json`. It contains the uploaded files,
questionnaire answers, the state of each task, and a timestamped event log of their actions.

The backend also has endpoints for researchers:

- http://localhost:8000/api/admin/sessions lists all participants and how far they got.
- http://localhost:8000/api/admin/sessions/<participant-id> gives a per-task summary and the raw session. For each
  proposed change, the summary shows which kind it was (necessary / ineffective / partial / incorrect), how many
  checks it actually makes pass (`verified`), whether the participant applied or rejected it, and whether their
  stated predicted effect for it matched its actual kind (`effect_judgment_correct`). It also includes the
  comprehension-question answers and correctness, final pass/fail, and time on task.
- http://localhost:8000/api/admin/export.csv downloads a CSV with one row per participant per completed task, using
  the same column names for every evaluator (background, goal, R2/R5/R6 measures, task duration, completion status)
  — this is the file to share for the Individual report's raw data and to merge for the Group analysis.

To clear all test data, stop the backend and delete `backend/data/`.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Claude API key. See the table above for what works without it. |
| `AI_MODEL` | `claude-opus-5-5` | Claude model used for everything |
| `AI_EFFORT` | `low` | Effort for chat answers (`low` / `medium` / `high` / `xhigh` / `max`). Higher is more thorough but slower. |
| `AI_GEN_EFFORT` | `medium` | Effort for generating task content from uploads |
| `AI_MAX_TOKENS` | `4000` | Max length of one chat answer |
| `AI_DISABLED` | `0` | `1` forces scripted answers even if a key is set |
| `TASKS_PER_PARTICIPANT` | `3` | Number of tasks per participant |
| `STUDY_MODE` | `0` | `1` disables "upload your own code" during formal study sessions, so every participant uses the same fixed example tasks |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed frontend origins |

Restart the backend after changing `.env`.

## Project structure

```
demo/
├── .env.example          # copy to .env
├── dev.sh                # starts backend + frontend
├── backend/
│   ├── app.py            # API routes, task setup, session and code-state logic
│   ├── uploads.py        # sorts uploaded files into code / tests / materials, reads PDFs
│   ├── ai.py             # Claude prompts and API calls, with scripted fallback
│   ├── scenarios.py      # built-in example tasks
│   ├── questionnaires.py # post-task and final questionnaires
│   ├── runner.py         # runs participant code, checks, and test functions in a subprocess
│   └── requirements.txt
└── frontend/
    ├── vite.config.js    # forwards /api to the backend on port 8000
    └── src/
        ├── App.jsx       # study flow (welcome → tasks → final questionnaire → done)
        └── components/   # TaskSetup (upload), Workspace, code viewer, explanation/change/check panels, etc.
```

To change the example tasks, edit `backend/scenarios.py`. To change the questions, edit `backend/questionnaires.py`.
Restart the backend afterwards.

## Troubleshooting

| Problem | Fix |
|---|---|
| Page says "Cannot reach the backend" | The backend isn't running. Start it on port 8000 (see Running). |
| `Address already in use` | Another process is using port 8000 or 5173. Stop it, or run on another port (`--port 8001` for the backend, then `API_URL=http://127.0.0.1:8001 npm run dev` for the frontend). |
| `pip install` fails on `anthropic` | Your Python is older than 3.10. Delete `backend/.venv` and recreate it with `python3.12 -m venv .venv`. |
| Key is set but it still says "AI offline" | Check there are no quotes or spaces around the key in `.env`, then restart the backend. The backend terminal logs the reason if a call fails. |
| "The PDF has no extractable text" | The PDF is a scanned image. Upload a text-based PDF, or paste the text into a `.txt` / `.md` file. |
| "The AI couldn't generate explanations" | Click **Try again**. If it keeps failing, the backend terminal shows the error. |

Note: participant code runs on your machine in a separate process with a timeout. That's fine for a lab study, but it
is not a sandbox for running untrusted code.
