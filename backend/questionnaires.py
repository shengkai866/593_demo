"""Quantitative questionnaires shown inside the demo (after each task, and at the end).

Question types: single, multi, likert (scale + labels), number, text.
`required` defaults to True except for text questions.
"""

# Pre-study background questionnaire (Protocol Part III, "Pre-Study Background Questionnaire").
# Wording and options are copied verbatim from the group's shared study protocol.
BACKGROUND = {
    "id": "background",
    "title": "Background questionnaire",
    "intro": "Before starting the tasks, please complete this brief background questionnaire about your "
             "programming experience, familiarity with Python, and previous use of AI programming assistants. "
             "Your responses will help us better understand the backgrounds of participants in this study.",
    "questions": [
        {"id": "proficiency", "type": "single",
         "text": "How would you rate your overall programming proficiency?",
         "options": ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"]},
        {"id": "python_experience", "type": "single",
         "text": "How would you describe your experience with Python?",
         "options": [
             "I have never used Python.",
             "I have used Python a few times.",
             "I have some experience writing Python programs.",
             "I regularly write Python programs.",
             "I have extensive experience with Python programming.",
         ]},
        {"id": "python_frequency", "type": "single",
         "text": "How often have you used Python for programming tasks in the past three months?",
         "options": ["Never", "Less than once a month", "A few times a month", "A few times a week",
                     "Daily or almost daily"]},
        {"id": "ai_usage_frequency", "type": "single",
         "text": "How often have you used AI programming assistants (e.g., ChatGPT, GitHub Copilot, Cursor, or "
                 "Claude) for programming tasks in the past three months?",
         "options": ["Never", "Less than once a month", "A few times a month", "A few times a week",
                     "Daily or almost daily"]},
        {"id": "ai_tools_used", "type": "multi",
         "text": "Which AI programming assistants have you used for programming tasks? (Select all that apply.)",
         "options": ["ChatGPT", "GitHub Copilot", "Cursor", "Claude", "Gemini", "Other",
                     "I have not used any AI programming assistants"]},
        {"id": "ai_tools_other", "type": "text", "required": False,
         "text": "If you selected \"Other\" above, please specify which AI tool(s)."},
    ],
}

# Post-task questions (Protocol "Post-task questions"), wording copied verbatim.
POST_TASK = {
    "id": "posttask",
    "title": "About this task",
    "intro": "Answer based on the task you just finished.",
    "questions": [
        {"id": "r2_goal_alignment", "type": "likert", "scale": 5,
         "labels": ["Not at all aligned", "Completely aligned"],
         "text": "To what extent did the assistance provided by the prototype align with your initial debugging goal?",
         "requirement": "R2"},
        {"id": "overall_satisfaction", "type": "likert", "scale": 5,
         "labels": ["Very dissatisfied", "Very satisfied"],
         "text": "Overall, how satisfied are you with the prototype's support for completing this debugging task?"},
    ],
}

# Closing and debriefing (Protocol Part III): one open-ended question, read verbally by the
# evaluator in the original protocol - captured here as free text instead.
FINAL = {
    "id": "final",
    "title": "Closing",
    "questions": [
        {"id": "debrief", "type": "text", "required": False,
         "text": "Is there anything else you would like to share about your experience using the prototype? For "
                 "example, did you encounter any difficulties, confusing features, or limitations that we have not "
                 "discussed?"},
    ],
}


ALL = {"background": BACKGROUND, "posttask": POST_TASK, "final": FINAL}
