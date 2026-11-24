"""Scripted study scenarios (the three debugging tasks from the group's study protocol).

Each scenario is one "assigned task" for a participant. Task order is counterbalanced per
participant (see TASK_ORDERS in app.py).

Every scenario has exactly ONE proposal: one AI explanation plus one suggested change that
fixes the bug. The explanation has two parts, both copied verbatim from the protocol:
  code_explanation - the "AI explanation" shown with the R5 question (what a piece of code does)
  why_fails        - the "AI explanation" shown with the R6 questions (why the code fails)
change.why is the protocol's "AI suggested fix". The comprehension questions show the same
text from the proposal, so the AI panel and the questions always quote the same explanation.

`kind` is researcher-only metadata and is never sent to the browser.

Explanation text may reference code as [file.py:N] or [file.py:N-M]; the frontend turns
these into links that jump to (and highlight) that code. Hunks are matched as whole lines:
`old` must appear verbatim as consecutive lines in the file and is replaced by `new`.

Comprehension options use fixed ids A-D in the protocol's order; `correct` is the protocol's
answer key. Option order is NOT shuffled, so the CSV can be scored with the protocol's key.
"""

R5_PROMPT = "Which of the following code segments does the AI explanation refer to?"

SCENARIOS = {
    # ------------------------------------------------------------------ #
    # Protocol Task 1
    "first_index": {
        "id": "first_index",
        "title": "Finding the first index of a value",
        "assignment": (
            "You are working on a Python function that should return the index of the first occurrence of a "
            "target value in a list. If the target is not present, the function should return -1. However, the "
            "function sometimes returns -1 even when the target is present. Use the AI programming assistant to "
            "understand the issue and review the suggested modifications."
        ),
        "example": {"call": "first_index([4, 7, 2, 9], 2)", "observed": "-1", "expected": "2"},
        "knowledge": "Intro programming course: loops, lists, functions, conditionals.",
        "rules": "",
        "problem_hint": "first_index([4, 7, 2, 9], 2) returns -1, but 2 is in the list at index 2.",
        "entry": "main.py",
        "module": "search",
        "function": "first_index",
        "files": {
            "search.py": (
                "def first_index(items, target):\n"
                "    result = -1\n"
                "    for i, value in enumerate(items):\n"
                "        if value == target:\n"
                "            result = i\n"
                "            break\n"
                "        else:\n"
                "            break\n"
                "    return result\n"
            ),
            "main.py": (
                "from search import first_index\n"
                "\n"
                "print(first_index([4, 7, 2, 9], 2))\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Target in the middle (task example)", "args": [[4, 7, 2, 9], 2], "expected": 2,
             "investigate": "search.py:7-8"},
            {"id": "c2", "name": "Target at the first position", "args": [[4, 7, 2, 9], 4], "expected": 0},
            {"id": "c3", "name": "Target at the last position", "args": [[4, 7, 2, 9], 9], "expected": 3,
             "investigate": "search.py:7-8"},
            {"id": "c4", "name": "Target not in the list", "args": [[4, 7, 2, 9], 5], "expected": -1},
        ],
        "proposals": [
            {
                "id": "fix",
                "kind": "necessary",
                "summary": "The else: break branch stops the search early",
                "code_refs": ["search.py:3-4"],
                "code_explanation": (
                    "The enumerate() function provides both the index and value of each element. The condition "
                    "checks whether the current value matches the target."
                ),
                "refs": ["search.py:7-8"],
                "why_fails": (
                    "The function exits the loop when the first element does not match the target because the "
                    "else branch contains a break statement. As a result, later elements are never checked."
                ),
                "current_behavior": "With the current code, `first_index([4, 7, 2, 9], 2)` returns `-1`.",
                "correct_behavior": "It should return `2`.",
                "change": {
                    "why": (
                        "Removing this branch allows the loop to continue searching until a match is found or all "
                        "elements have been examined."
                    ),
                    "claimed_effect": "`first_index([4, 7, 2, 9], 2)` returns `2`.",
                    "hunks": [
                        {"id": "h1", "file": "search.py", "label": "Remove the else: break branch",
                         "old": "            break\n        else:\n            break",
                         "new": "            break"},
                    ],
                },
            },
        ],
        "questions": {
            "localization": {
                "prompt": R5_PROMPT,
                "code_options": True,
                "options": [
                    {"id": "A", "text": "result = -1"},
                    {"id": "B", "text": "if value == target: result = i; break"},
                    {"id": "C", "text": "for i, value in enumerate(items): if value == target:"},
                    {"id": "D", "text": "else: break"},
                ],
                "correct": "C",
            },
            "root_cause": {
                "prompt": "Why does the original function return -1 for [4, 7, 2, 9] when the target is 2?",
                "options": [
                    {"id": "A", "text": "enumerate() starts indexing at 1."},
                    {"id": "B", "text": "The function stops searching after the first nonmatching element."},
                    {"id": "C", "text": "The list must be sorted before searching."},
                    {"id": "D", "text": "result cannot be updated inside a loop."},
                ],
                "correct": "B",
            },
            "fix_rationale": {
                "prompt": "Why does removing the else: break branch fix the problem?",
                "options": [
                    {"id": "A", "text": "It changes the starting index of the loop."},
                    {"id": "B", "text": "It makes the function return the last element."},
                    {"id": "C", "text": "It allows the loop to continue checking elements after a nonmatch."},
                    {"id": "D", "text": "It automatically resets the result to zero."},
                ],
                "correct": "C",
            },
        },
        "explain_again": (
            "Why does the function give up so early?\n"
            "On the first iteration, value is 4 and the target is 2. They don't match, so Python runs the else "
            "branch on [search.py:7-8], and its break ends the loop. The loop never reaches 7, 2, or 9, so result "
            "is still -1 on [search.py:9]."
        ),
        "new_approach": (
            "Trace the loop by hand.\n"
            "For first_index([4, 7, 2, 9], 2), write down i and value on each iteration of [search.py:3-8]. How "
            "many iterations actually run? Then try first_index([2, 7], 2). Why does that one work?"
        ),
    },
    # ------------------------------------------------------------------ #
    # Protocol Task 2
    "moving_averages": {
        "id": "moving_averages",
        "title": "Moving averages",
        "assignment": (
            "You are working on a Python function that calculates moving averages using a fixed-size window. "
            "Given [2, 4, 6, 8] with a window size of 2, the function should return [3.0, 5.0, 7.0], representing "
            "the averages of [2, 4], [4, 6], and [6, 8]. However, the function does not calculate the final moving "
            "average. Use the AI programming assistant to investigate the issue and review the suggested changes. "
            "You can assume the window size is a positive integer no greater than the list length."
        ),
        "example": {"call": "moving_averages([2, 4, 6, 8], 2)", "observed": "[3.0, 5.0]",
                    "expected": "[3.0, 5.0, 7.0]"},
        "knowledge": "Intro programming course: loops, nested loops, range(), lists, indexing.",
        "rules": "",
        "problem_hint": "moving_averages([2, 4, 6, 8], 2) returns [3.0, 5.0] instead of [3.0, 5.0, 7.0].",
        "entry": "main.py",
        "module": "moving",
        "function": "moving_averages",
        "files": {
            "moving.py": (
                "def moving_averages(values, window):\n"
                "    averages = []\n"
                "    for start in range(len(values) - window):\n"
                "        total = 0\n"
                "        for offset in range(window):\n"
                "            total += values[start + offset]\n"
                "        averages.append(total / window)\n"
                "    return averages\n"
            ),
            "main.py": (
                "from moving import moving_averages\n"
                "\n"
                "print(moving_averages([2, 4, 6, 8], 2))\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Window of 2 (task example)", "args": [[2, 4, 6, 8], 2], "expected": [3.0, 5.0, 7.0],
             "investigate": "moving.py:3"},
            {"id": "c2", "name": "Window of 3", "args": [[1, 3, 5, 7, 9], 3], "expected": [3.0, 5.0, 7.0],
             "investigate": "moving.py:3"},
            {"id": "c3", "name": "Window as long as the list", "args": [[1, 2, 3], 3], "expected": [2.0],
             "investigate": "moving.py:3"},
            {"id": "c4", "name": "Window of 1", "args": [[5, 7], 1], "expected": [5.0, 7.0]},
        ],
        "proposals": [
            {
                "id": "fix",
                "kind": "necessary",
                "summary": "The outer loop skips the last window",
                "code_refs": ["moving.py:5-6"],
                "code_explanation": (
                    "The inner loop calculates the sum of the values in one window. It accesses elements using the "
                    "current starting position and the offset within that window."
                ),
                "refs": ["moving.py:3"],
                "why_fails": (
                    "The outer loop uses range(len(values) - window), which excludes the last valid starting "
                    "position. For a list of length n and a window size of w, there are n - w + 1 valid windows."
                ),
                "current_behavior": "With the current code, `moving_averages([2, 4, 6, 8], 2)` returns `[3.0, 5.0]`.",
                "correct_behavior": "It should return `[3.0, 5.0, 7.0]`.",
                "change": {
                    "why": (
                        "Changing the range to range(len(values) - window + 1) ensures that the function processes "
                        "the final window."
                    ),
                    "claimed_effect": "`moving_averages([2, 4, 6, 8], 2)` returns `[3.0, 5.0, 7.0]`.",
                    "hunks": [
                        {"id": "h1", "file": "moving.py", "label": "Add + 1 to the outer loop's range",
                         "old": "    for start in range(len(values) - window):",
                         "new": "    for start in range(len(values) - window + 1):"},
                    ],
                },
            },
        ],
        "questions": {
            "localization": {
                "prompt": R5_PROMPT,
                "code_options": True,
                "options": [
                    {"id": "A", "text": "for start in range(len(values) - window):"},
                    {"id": "B", "text": "averages.append(total / window)"},
                    {"id": "C", "text": "total = 0"},
                    {"id": "D", "text": "for offset in range(window): total += values[start + offset]"},
                ],
                "correct": "D",
            },
            "root_cause": {
                "prompt": "Why is the final moving average missing?",
                "options": [
                    {"id": "A", "text": "The inner loop sums too many elements."},
                    {"id": "B", "text": "The outer loop excludes the last valid starting position."},
                    {"id": "C", "text": "The function divides by the wrong denominator."},
                    {"id": "D", "text": "Python cannot calculate moving averages using nested loops."},
                ],
                "correct": "B",
            },
            "fix_rationale": {
                "prompt": "Why does adding +1 to the outer loop's range solve the problem?",
                "options": [
                    {"id": "A", "text": "It increases the number of elements in each window."},
                    {"id": "B", "text": "It causes the function to skip the first window."},
                    {"id": "C", "text": "It changes the average from a float to an integer."},
                    {"id": "D", "text": "It allows the outer loop to include the final valid window."},
                ],
                "correct": "D",
            },
        },
        "explain_again": (
            "Why is the last average missing?\n"
            "For [2, 4, 6, 8] and window 2, the windows start at positions 0, 1, and 2. But range(4 - 2) on "
            "[moving.py:3] is range(2), which only produces 0 and 1. The window starting at position 2, [6, 8], "
            "is never visited."
        ),
        "new_approach": (
            "List the starting positions.\n"
            "Write out list(range(len(values) - window)) for [2, 4, 6, 8] and window 2. Then write down every "
            "starting position a window of size 2 can have in that list. Which one is missing?"
        ),
    },
    # ------------------------------------------------------------------ #
    # Protocol Task 3
    "longest_streak": {
        "id": "longest_streak",
        "title": "Longest streak of identical values",
        "assignment": (
            "You are implementing a function that finds the length of the longest consecutive streak of identical "
            "values in a list. For example, the list [3, 3, 5, 5, 5] contains two consecutive 3s and three "
            "consecutive 5s, so the function should return 3. However, your function returns a smaller number "
            "than expected. Use the AI assistant to understand the implementation and evaluate the suggested "
            "changes."
        ),
        "example": {"call": "longest_streak([3, 3, 5, 5, 5])", "observed": "2", "expected": "3"},
        "knowledge": "Intro programming course: loops, range(), indexing, conditionals, max().",
        "rules": "",
        "problem_hint": "longest_streak([3, 3, 5, 5, 5]) returns 2 instead of 3.",
        "entry": "main.py",
        "module": "streak",
        "function": "longest_streak",
        "files": {
            "streak.py": (
                "def longest_streak(values):\n"
                "    if not values:\n"
                "        return 0\n"
                "    longest = 1\n"
                "    current = 1\n"
                "    for i in range(1, len(values)):\n"
                "        if values[i] == values[i - 1]:\n"
                "            current += 1\n"
                "        else:\n"
                "            current = 0\n"
                "        longest = max(longest, current)\n"
                "    return longest\n"
            ),
            "main.py": (
                "from streak import longest_streak\n"
                "\n"
                "print(longest_streak([3, 3, 5, 5, 5]))\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Longest streak comes second (task example)", "args": [[3, 3, 5, 5, 5]],
             "expected": 3, "investigate": "streak.py:9-10"},
            {"id": "c2", "name": "Longest streak comes first", "args": [[4, 4, 4, 1, 2]], "expected": 3},
            {"id": "c3", "name": "Streak of 2 at the end", "args": [[7, 8, 8]], "expected": 2,
             "investigate": "streak.py:9-10"},
            {"id": "c4", "name": "Empty list", "args": [[]], "expected": 0},
        ],
        "proposals": [
            {
                "id": "fix",
                "kind": "necessary",
                "summary": "The counter resets to 0 instead of 1",
                "code_refs": ["streak.py:7-8"],
                "code_explanation": (
                    "The function compares the current value with the previous value. If they match, it increases "
                    "the counter tracking the current streak."
                ),
                "refs": ["streak.py:9-10"],
                "why_fails": (
                    "When two consecutive values differ, a new streak begins with the current element. However, "
                    "the code sets current to 0, even though the new streak already contains one element. This "
                    "causes subsequent streaks to be undercounted."
                ),
                "current_behavior": "With the current code, `longest_streak([3, 3, 5, 5, 5])` returns `2`.",
                "correct_behavior": "It should return `3`.",
                "change": {
                    "why": "Changing the reset value to 1 correctly counts the first element of every new streak.",
                    "claimed_effect": "`longest_streak([3, 3, 5, 5, 5])` returns `3`.",
                    "hunks": [
                        {"id": "h1", "file": "streak.py", "label": "Reset current to 1 instead of 0",
                         "old": "            current = 0", "new": "            current = 1"},
                    ],
                },
            },
        ],
        "questions": {
            "localization": {
                "prompt": R5_PROMPT,
                "code_options": True,
                "options": [
                    {"id": "A", "text": "longest = max(longest, current)"},
                    {"id": "B", "text": "if values[i] == values[i - 1]: current += 1"},
                    {"id": "C", "text": "if not values: return 0"},
                    {"id": "D", "text": "else: current = 0"},
                ],
                "correct": "B",
            },
            "root_cause": {
                "prompt": "Why does the function underestimate some streak lengths?",
                "options": [
                    {"id": "A", "text": "The loop skips the first item in the list."},
                    {"id": "B", "text": "The counter resets to 0 instead of counting the first element of a new streak."},
                    {"id": "C", "text": "The max() function always returns the smaller value."},
                    {"id": "D", "text": "The function stops as soon as two different values are found."},
                ],
                "correct": "B",
            },
            "fix_rationale": {
                "prompt": "Why is resetting current to 1 appropriate?",
                "options": [
                    {"id": "A", "text": "Every new streak already contains the current element."},
                    {"id": "B", "text": "All streaks must have a minimum length of 2."},
                    {"id": "C", "text": "The loop should count only values that differ."},
                    {"id": "D", "text": "It prevents longest from being updated."},
                ],
                "correct": "A",
            },
        },
        "explain_again": (
            "Why is the streak of 5s counted as 2?\n"
            "When the loop reaches the first 5, it differs from the 3 before it, so [streak.py:10] sets current to "
            "0. The next two 5s add 1 each, so current ends at 2. The first 5 was never counted."
        ),
        "new_approach": (
            "Track current by hand.\n"
            "For [3, 3, 5, 5, 5], write down current after each iteration of [streak.py:6-11]. Then count the 5s "
            "yourself. At which iteration does current fall behind the real count?"
        ),
    },
}
