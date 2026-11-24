"""Claude wrapper for follow-up questions and the "Still stuck?" options.

If ANTHROPIC_API_KEY is not set (or a call fails), callers get a scripted
fallback answer instead, so the demo still runs end to end without a key.
"""

import logging
import os

import anthropic

log = logging.getLogger("ai")

MODEL = os.getenv("AI_MODEL", "claude-opus-5-5")
EFFORT = os.getenv("AI_EFFORT", "low")  # low | medium | high | xhigh | max
MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "4000"))
ENABLED = bool(os.getenv("ANTHROPIC_API_KEY")) and os.getenv("AI_DISABLED", "").lower() not in ("1", "true", "yes")

_client = anthropic.Anthropic() if ENABLED else None

SYSTEM_PROMPT = """You are a programming tutor embedded in a learning tool for university students in an introductory programming course.

How to answer:
- Keep answers short: at most about 120 words unless the student asks for more.
- Whenever you mention code, cite it as [file.py:N] or [file.py:N-M] using the line numbers shown in the context. The interface turns these into links that highlight the code, so be precise.
- Respect the student's current goals. If their goals do NOT include "fix", do not write corrected code; help them understand and let them find the change. If "fix" is included, you may show a minimal change.
- Respect the course rules given in the context (for example, forbidden functions).
- Be honest about proposed changes. If a change would not affect behavior, or its stated rationale does not support it, say so plainly. Distinguish clearly between what the current code does ("current behavior") and what correct code should do ("correct behavior").
- Use plain text. You may use short numbered lists. No markdown headings."""

MODE_INSTRUCTIONS = {
    "followup": "Answer the student's follow-up question.",
    "explain_again": (
        "The student is still stuck. Explain the cause of the currently failing check(s) again in different, "
        "simpler words than the earlier explanation. Do not change their code and do not give a full solution."
    ),
    "new_approach": (
        "The student is still stuck. Suggest a different way to investigate the problem (for example, comparing "
        "two inputs, tracing by hand, or adding a temporary print). Give 2-4 concrete steps. Do not give the fix."
    ),
    "office_hours": (
        "Write a short draft question (4-7 sentences, first person) the student could bring to office hours. "
        "Use ONLY the facts in the ACTION LOG. Never claim the student tried, ran, traced, or applied anything "
        "that is not listed there. Include the failing input, expected value, and actual value if available. "
        "End with one specific question. Output only the draft text."
    ),
}


def ask(mode: str, context: str, question: str, history: list) -> str:
    """Call Claude. Raises on failure; caller decides on fallback."""
    if not ENABLED:
        raise RuntimeError("AI disabled")
    messages = []
    for turn in history[-6:]:
        messages.append({"role": "user", "content": turn["question"] or "(no question text)"})
        messages.append({"role": "assistant", "content": turn["answer"]})
    messages.append({
        "role": "user",
        "content": f"{context}\n\nTASK: {MODE_INSTRUCTIONS[mode]}\n\nSTUDENT: {question or '(no extra text)'}",
    })
    response = _client.beta.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=messages,
        output_config={"effort": EFFORT},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Model declined to answer")
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    if not text:
        raise RuntimeError("Empty response")
    return text


# --------------------------------------------------------------------------- #
# Generating task content for uploaded code (structured JSON output)
# --------------------------------------------------------------------------- #
GEN_EFFORT = os.getenv("AI_GEN_EFFORT", "medium")


def _obj(props, required=None):
    return {"type": "object", "properties": props, "required": required or list(props), "additionalProperties": False}


STR = {"type": "string"}

TASK_INFO_SCHEMA = _obj({
    "title": STR,
    "assignment": STR,
    "checks": {"type": "array", "items": _obj({
        "name": STR, "module": STR, "function": STR, "args_json": STR, "expected_json": STR,
    })},
})

PROPOSALS_SCHEMA = _obj({
    "proposal": _obj({
        "summary": STR,
        "code_refs": {"type": "array", "items": STR},
        "code_explanation": STR,
        "refs": {"type": "array", "items": STR},
        "why_fails": STR,
        "current_behavior": STR,
        "correct_behavior": STR,
        "change": _obj({
            "why": STR,
            "claimed_effect": STR,
            "hunks": {"type": "array", "items": _obj({"file": STR, "label": STR, "old": STR, "new": STR})},
        }),
    }),
    "explain_again": STR,
    "new_approach": STR,
})

TASK_INFO_PROMPT = """You are preparing a debugging exercise for a university intro-programming student from files they uploaded.

{context}

Return JSON with:
- title: a short title like "first_index: searching a list".
- assignment: {assignment_instruction}
- checks: {checks_instruction}
  Each check calls one top-level function: module is the file name without .py, function is the function name,
  args_json is a JSON array of the positional arguments (e.g. "[[10, 20, 30], 99]"), expected_json is the JSON
  value correct code must return (e.g. "-1", "true", "\\"abc\\""). Use only JSON-representable values. name says in
  plain words what the check tests (e.g. "Missing target in a nonempty list"). Expected values must follow the
  assignment / intended behavior, NOT what the current (possibly buggy) code returns."""

PROPOSALS_PROMPT = """You are an AI programming assistant helping a university intro-programming student debug.
Given the student's code, materials, and problem below, produce exactly ONE proposal: the explanation that best
accounts for the root cause of the student's problem, plus ONE minimal code change that fixes it.

The proposal:
- summary: a short phrase naming the root cause.
- code_explanation: 1-2 sentences explaining what one relevant piece of the code does (e.g. a loop or a condition).
  Plain text, no line numbers. code_refs: the code reference(s) that sentence describes.
- why_fails: 1-3 sentences explaining why the original code produces the wrong behavior. refs: 1-3 code references
  to the lines responsible.
- Code references have the form "file.py:N" or "file.py:N-M" using the line numbers shown.
- why_fails, current_behavior, correct_behavior may cite code inline as [file.py:N] or [file.py:N-M].
- current_behavior: what the CURRENT code does for a concrete input. correct_behavior: what correct code should do.
- change.why: 1-2 sentences on how the change fixes the problem. change.claimed_effect: the result after the change
  for the same concrete input.
- change.hunks: the complete fix, usually 1 edit. "old" must be one or more COMPLETE consecutive lines copied EXACTLY
  from the current file (same indentation, no line numbers); "new" is the replacement lines. Include only edits that
  are needed for the fix (no unrelated cleanups). label briefly describes the edit.
Also return:
- explain_again: a simpler re-explanation of the real cause (3-4 sentences, cite lines, no full fix).
- new_approach: a different way to investigate (e.g. compare two inputs), 2-4 steps, no fix.

{context}"""


def ask_json(prompt: str, schema: dict, max_tokens: int = 16000) -> dict:
    if not ENABLED:
        raise RuntimeError("AI disabled")
    import json
    with _client.beta.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        output_config={"effort": GEN_EFFORT, "format": {"type": "json_schema", "schema": schema}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    ) as stream:
        response = stream.get_final_message()
    if response.stop_reason == "refusal":
        raise RuntimeError("Model declined")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Response was cut off")
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def safe_json(prompt, schema):
    """Returns (data, error_message)."""
    try:
        return ask_json(prompt, schema), None
    except anthropic.AuthenticationError:
        return None, "The API key was rejected."
    except anthropic.RateLimitError:
        return None, "Rate limited by the API. Try again in a moment."
    except anthropic.APIStatusError as e:
        return None, f"API error {e.status_code}: {e.message}"
    except anthropic.APIConnectionError:
        return None, "Could not reach the AI service."
    except (RuntimeError, ValueError, StopIteration) as e:
        return None, f"AI generation failed: {e}"


def safe_ask(mode, context, question, history):
    """Returns (text, source) where source is 'ai' or 'scripted' (None text => use fallback)."""
    try:
        return ask(mode, context, question, history), "ai"
    except anthropic.AuthenticationError:
        log.error("Anthropic API key was rejected; using scripted fallback")
    except anthropic.RateLimitError:
        log.warning("Rate limited; using scripted fallback")
    except anthropic.APIStatusError as e:
        log.error("Anthropic API error %s: %s", e.status_code, e.message)
    except anthropic.APIConnectionError:
        log.error("Could not reach the Anthropic API; using scripted fallback")
    except RuntimeError as e:
        if ENABLED:
            log.warning("AI call failed: %s", e)
    return None, "scripted"
