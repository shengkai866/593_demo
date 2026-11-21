"""Quantitative questionnaires shown inside the demo (after each task, and at the end).

Question types: single, multi, likert (scale + labels), number, text.
`required` defaults to True except for text questions.
"""

LIKERT7 = {"type": "likert", "scale": 7, "labels": ["Strongly disagree", "Strongly agree"]}
LIKERT5 = {"type": "likert", "scale": 5, "labels": ["Strongly disagree", "Strongly agree"]}


def L7(qid, text, req=None):
    q = {"id": qid, "text": text, **LIKERT7}
    if req:
        q["requirement"] = req
    return q


POST_TASK = {
    "id": "posttask",
    "title": "About this task",
    "intro": "Answer based on the task you just finished. 1 = strongly disagree, 7 = strongly agree.",
    "questions": [
        {"id": "seq", "type": "likert", "scale": 7, "labels": ["Very difficult", "Very easy"],
         "text": "Overall, how difficult or easy was this task?"},
        L7("r2_express", "I could tell the AI what I wanted (understand the code, fix it, or both).", "R2"),
        L7("r2_update", "When my goal changed, I could update it without losing information I had already provided.", "R2"),
        L7("r5_locate", "I could find the code that each explanation referred to.", "R5"),
        L7("r5_context", "I could see enough surrounding code to understand each explanation.", "R5"),
        L7("r5_revisit", "I could go back to an earlier explanation and its code when I needed to.", "R5"),
        L7("r6_cause", "I understood the proposed cause of the failure.", "R6"),
        L7("r6_judge", "I could judge whether each proposed change would actually affect the failing behavior.", "R6"),
        L7("r6_rationale", "I could tell whether the AI's stated reason actually supported each proposed change.", "R6"),
        L7("r8_choose", "I could choose exactly which changes to apply.", "R8"),
        L7("r8_state", "After acting, I could tell which changes had taken effect.", "R8"),
        L7("r8_undo", "I could undo a change I didn't want.", "R8"),
        {"id": "tlx_mental", "type": "likert", "scale": 7, "labels": ["Very low", "Very high"],
         "text": "Mental demand: how mentally demanding was the task?"},
        {"id": "tlx_frustration", "type": "likert", "scale": 7, "labels": ["Very low", "Very high"],
         "text": "Frustration: how insecure, discouraged, or annoyed were you?"},
        {"id": "confidence", "type": "likert", "scale": 7, "labels": ["Not at all confident", "Completely confident"],
         "text": "How confident are you that your final code is correct?"},
        {"id": "no_effect", "type": "text", "required": False,
         "text": "Did any proposed change seem unhelpful or have no effect? Which one, and why?"},
    ],
}

FINAL = {
    "id": "final",
    "title": "Overall experience",
    "intro": "These questions are about the tool as a whole. 1 = strongly disagree, 5 = strongly agree.",
    "questions": [
        {"id": f"sus{i+1}", "text": t, **LIKERT5} for i, t in enumerate([
            "I think that I would like to use this system frequently.",
            "I found the system unnecessarily complex.",
            "I thought the system was easy to use.",
            "I think that I would need the support of a technical person to be able to use this system.",
            "I found the various functions in this system were well integrated.",
            "I thought there was too much inconsistency in this system.",
            "I would imagine that most people would learn to use this system very quickly.",
            "I found the system very cumbersome to use.",
            "I felt very confident using the system.",
            "I needed to learn a lot of things before I could get going with this system.",
        ])
    ] + [
        {"id": "prefer", "type": "single", "text": "Compared with the AI tools you normally use, this tool was...",
         "options": ["Much worse", "Worse", "About the same", "Better", "Much better", "I don't normally use AI tools"]},
        {"id": "liked", "type": "text", "required": False, "text": "What was most helpful?"},
        {"id": "disliked", "type": "text", "required": False, "text": "What was confusing or should change?"},
    ],
}


def sus_score(answers: dict):
    try:
        vals = [int(answers[f"sus{i}"]) for i in range(1, 11)]
    except (KeyError, ValueError, TypeError):
        return None
    total = sum((v - 1) if i % 2 == 0 else (5 - v) for i, v in enumerate(vals))
    return total * 2.5


ALL = {"posttask": POST_TASK, "final": FINAL}
