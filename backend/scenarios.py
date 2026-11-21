"""Scripted study scenarios.

Each scenario is one "assigned task" for a participant. Task order is randomized
per participant, and so is the order of the proposals (explanation + change)
inside each task. Every scenario contains at least one *necessary* change.

`kind` is researcher-only metadata and is never sent to the browser:
  necessary   - fixes the failing behavior
  partial     - fixes something, but not the failure the learner asked about
  ineffective - has no effect on behavior, although its rationale says it does
  incorrect   - makes things worse

Explanation text may reference code as [file.py:N] or [file.py:N-M]; the
frontend turns these into links that jump to (and highlight) that code.
Hunks are matched as whole lines: `old` must appear verbatim as consecutive
lines in the file and is replaced by `new`.
"""

SCENARIOS = {
    # ------------------------------------------------------------------ #
    "first_index": {
        "id": "first_index",
        "title": "first_index: searching a list",
        "assignment": (
            "Implement first_index(values, target). It returns the index of the "
            "first element of values that equals target, or -1 if target does not "
            "appear in values."
        ),
        "knowledge": "Intro programming course: loops, lists, functions, return values.",
        "rules": "Allowed: for/while loops, enumerate. Not allowed: list.index(), recursion.",
        "problem_hint": "When I search for a number that isn't in the list, the program says it was found at index 0.",
        "entry": "main.py",
        "module": "search",
        "function": "first_index",
        "files": {
            "search.py": (
                "def first_index(values, target):\n"
                "    for i, value in enumerate(values):\n"
                "        if value == target:\n"
                "            return i\n"
                "    return 0\n"
            ),
            "main.py": (
                "from search import first_index\n"
                "\n"
                "scores = [10, 20, 30]\n"
                "wanted = 99\n"
                "\n"
                "position = first_index(scores, wanted)\n"
                "if position == -1:\n"
                "    print(f\"{wanted} is not in the list\")\n"
                "else:\n"
                "    print(f\"{wanted} found at index {position}\")\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Target at the first position", "args": [[10, 20, 30], 10], "expected": 0},
            {"id": "c2", "name": "Target in the middle", "args": [[10, 20, 30], 20], "expected": 1},
            {"id": "c3", "name": "Missing target in a nonempty list", "args": [[10, 20, 30], 99], "expected": -1,
             "investigate": "search.py:5"},
            {"id": "c4", "name": "Empty list", "args": [[], 5], "expected": -1, "investigate": "search.py:2-5"},
        ],
        "proposals": [
            {
                "id": "swap",
                "kind": "ineffective",
                "refs": ["search.py:3"],
                "summary": "Comparison between value and target",
                "why_fails": (
                    "The unexpected result may come from the comparison between the current "
                    "value and the target on [search.py:3]."
                ),
                "approach": "Review the comparison and try swapping the two operands.",
                "steps": [
                    "Look at the condition on [search.py:3].",
                    "Trace first_index([10, 20, 30], 99): on which iterations is the condition true?",
                    "Compare `value == target` with `target == value` for the same two numbers.",
                ],
                "current_behavior": "With the starter code, first_index([10, 20, 30], 99) returns 0.",
                "correct_behavior": "The assignment says it should return -1.",
                "change": {
                    "why": "Adjust the comparison condition so matching values are detected.",
                    "claimed_effect": "Matching values will be detected more reliably.",
                    "hunks": [
                        {"id": "h1", "file": "search.py", "label": "Swap the operands of ==",
                         "old": "        if value == target:", "new": "        if target == value:"},
                    ],
                },
            },
            {
                "id": "empty_guard",
                "kind": "partial",
                "refs": ["search.py:1-2"],
                "summary": "Empty-list handling",
                "why_fails": (
                    "The function may mishandle empty lists. With no elements to search, the "
                    "loop on [search.py:2] never runs and execution falls through to [search.py:5]."
                ),
                "approach": "Add an early return of -1 for empty input.",
                "steps": [
                    "Call first_index([], 5) by hand.",
                    "Does the loop body on [search.py:2-4] run at all?",
                    "Which line produces the return value?",
                ],
                "current_behavior": "With the starter code, first_index([], 5) returns 0.",
                "correct_behavior": "The assignment says it should return -1.",
                "change": {
                    "why": "Handle empty lists before the loop.",
                    "claimed_effect": "Empty lists return -1.",
                    "hunks": [
                        {"id": "h1", "file": "search.py", "label": "Add an empty-list guard before the loop",
                         "old": "    for i, value in enumerate(values):",
                         "new": "    if not values:\n        return -1\n    for i, value in enumerate(values):"},
                    ],
                },
            },
            {
                "id": "fallback",
                "kind": "necessary",
                "refs": ["search.py:5", "main.py:7"],
                "summary": "Fallback return after the loop",
                "why_fails": (
                    "When the target is absent, the loop on [search.py:2-4] finishes without "
                    "returning, so [search.py:5] returns 0. But 0 is also a valid index: it means "
                    "\"found at the first position\". The caller on [main.py:7] checks for -1, so it "
                    "reports 99 as found at index 0."
                ),
                "approach": "Check the fallback return after the loop. Use -1 for \"not found\".",
                "steps": [
                    "Use [10, 20, 30] and search for 99.",
                    "Trace what happens after the loop ends.",
                    "Write down the returned value and compare it with what [main.py:7] expects.",
                ],
                "current_behavior": "With the starter code, first_index([10, 20, 30], 99) returns 0.",
                "correct_behavior": "The assignment says it should return -1.",
                "change": {
                    "why": "0 is a valid index. Use -1 when the target is absent, as the assignment specifies.",
                    "claimed_effect": "Missing targets return -1; targets that are found are unchanged.",
                    "hunks": [
                        {"id": "h1", "file": "search.py", "label": "Return -1 instead of 0 after the loop",
                         "old": "    return 0", "new": "    return -1"},
                        {"id": "h2", "file": "search.py", "label": "Add a docstring describing the return value",
                         "old": "def first_index(values, target):",
                         "new": "def first_index(values, target):\n    \"\"\"Return the index of the first match, or -1 if target is absent.\"\"\""},
                    ],
                },
            },
        ],
        "explain_again": (
            "Why does the function return 0?\n"
            "The loop on [search.py:2-4] only returns when it finds a match. If it never finds "
            "one, Python continues to [search.py:5], which returns 0. The caller can't tell this "
            "0 apart from \"found at index 0\". Look at line 5 again."
        ),
        "new_approach": (
            "Compare two cases.\n"
            "1. Trace first_index([10, 20, 30], 10). Which line returns, and what value?\n"
            "2. Trace first_index([10, 20, 30], 99). Which line returns, and what value?\n"
            "If both calls give the same answer, the caller can't tell them apart."
        ),
    },
    # ------------------------------------------------------------------ #
    "average": {
        "id": "average",
        "title": "average: mean of a list",
        "assignment": (
            "Implement average(nums). It returns the arithmetic mean of a nonempty list of "
            "numbers as a float."
        ),
        "knowledge": "Intro programming course: loops, range(), indexing, arithmetic.",
        "rules": "Allowed: for/while loops, range(), len(). Not allowed: sum(), statistics module.",
        "problem_hint": "The average of [2, 4, 6] comes out as 3.33 instead of 4.",
        "entry": "report.py",
        "module": "stats",
        "function": "average",
        "files": {
            "stats.py": (
                "def average(nums):\n"
                "    total = 0\n"
                "    for i in range(1, len(nums)):\n"
                "        total += nums[i]\n"
                "    return total / len(nums)\n"
            ),
            "report.py": (
                "from stats import average\n"
                "\n"
                "quiz_scores = [2, 4, 6]\n"
                "print(\"Average quiz score:\", average(quiz_scores))\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Three positive numbers", "args": [[2, 4, 6]], "expected": 4.0,
             "investigate": "stats.py:3-4"},
            {"id": "c2", "name": "A single number", "args": [[5]], "expected": 5.0, "investigate": "stats.py:3"},
            {"id": "c3", "name": "Negative numbers", "args": [[-1, -3]], "expected": -2.0},
            {"id": "c4", "name": "Largest value comes first", "args": [[10, 1, 1]], "expected": 4.0},
        ],
        "proposals": [
            {
                "id": "range_start",
                "kind": "necessary",
                "refs": ["stats.py:3-4"],
                "summary": "Where the loop starts",
                "why_fails": (
                    "The loop on [stats.py:3] starts at index 1, so nums[0] is never added to "
                    "total. [stats.py:5] still divides by len(nums), which counts that element."
                ),
                "approach": "Check which indexes the loop visits. It should visit every element.",
                "steps": [
                    "Write out list(range(1, 3)) for nums = [2, 4, 6].",
                    "Which elements are added to total on [stats.py:4]?",
                    "Compare total with 2 + 4 + 6.",
                ],
                "current_behavior": "With the starter code, average([2, 4, 6]) returns 3.333...",
                "correct_behavior": "It should return 4.0.",
                "change": {
                    "why": "Start the loop at index 0 so every element is added.",
                    "claimed_effect": "total includes nums[0]; average([2, 4, 6]) returns 4.0.",
                    "hunks": [
                        {"id": "h1", "file": "stats.py", "label": "Loop over every index",
                         "old": "    for i in range(1, len(nums)):", "new": "    for i in range(len(nums)):"},
                    ],
                },
            },
            {
                "id": "float_cast",
                "kind": "ineffective",
                "refs": ["stats.py:5"],
                "summary": "Division on the return line",
                "why_fails": "The result may be truncated by integer division on [stats.py:5].",
                "approach": "Convert total to a float before dividing.",
                "steps": [
                    "Look at the division on [stats.py:5].",
                    "What type does 10 / 3 produce in Python 3?",
                    "Is the result of average([2, 4, 6]) missing a decimal part, or is it a different number?",
                ],
                "current_behavior": "With the starter code, average([2, 4, 6]) returns 3.333...",
                "correct_behavior": "It should return 4.0.",
                "change": {
                    "why": "Make sure the division keeps the decimal part.",
                    "claimed_effect": "The average will no longer lose its decimal part, so results will be accurate.",
                    "hunks": [
                        {"id": "h1", "file": "stats.py", "label": "Convert total to float before dividing",
                         "old": "    return total / len(nums)", "new": "    return float(total) / len(nums)"},
                    ],
                },
            },
            {
                "id": "divisor",
                "kind": "incorrect",
                "refs": ["stats.py:3", "stats.py:5"],
                "summary": "Divisor vs. number of loop iterations",
                "why_fails": (
                    "The loop on [stats.py:3] runs len(nums) - 1 times, but [stats.py:5] divides by "
                    "len(nums). The divisor doesn't match the number of values that were added."
                ),
                "approach": "Make the divisor match the number of loop iterations.",
                "steps": [
                    "Count how many times the loop body on [stats.py:4] runs for [2, 4, 6].",
                    "Compare that count with len(nums).",
                    "Think about which of the two should change.",
                ],
                "current_behavior": "With the starter code, average([2, 4, 6]) returns 3.333...",
                "correct_behavior": "It should return 4.0.",
                "change": {
                    "why": "Divide by the number of values the loop actually added.",
                    "claimed_effect": "The divisor matches the loop, so the average is consistent.",
                    "hunks": [
                        {"id": "h1", "file": "stats.py", "label": "Divide by len(nums) - 1",
                         "old": "    return total / len(nums)", "new": "    return total / (len(nums) - 1)"},
                    ],
                },
            },
        ],
        "explain_again": (
            "Why is the average too small?\n"
            "range(1, len(nums)) on [stats.py:3] produces 1, 2, ... and never 0. So total only "
            "holds 4 + 6 = 10 for [2, 4, 6], and 10 / 3 = 3.33. The division on [stats.py:5] is "
            "fine. The missing value comes from the loop."
        ),
        "new_approach": (
            "Add a print inside the loop.\n"
            "Temporarily print i and nums[i] on each iteration of [stats.py:3-4] for [2, 4, 6]. "
            "Which value never gets printed? Then try average([5]). What is total after the loop?"
        ),
    },
    # ------------------------------------------------------------------ #
    "palindrome": {
        "id": "palindrome",
        "title": "is_palindrome: ignoring case and spaces",
        "assignment": (
            "Implement is_palindrome(text). It returns True if text reads the same forwards and "
            "backwards, ignoring spaces and letter case, and False otherwise."
        ),
        "knowledge": "Intro programming course: strings, slicing, string methods.",
        "rules": "Allowed: string methods, slicing. Not allowed: importing modules.",
        "problem_hint": "\"Racecar\" is reported as not a palindrome.",
        "entry": "main.py",
        "module": "text_utils",
        "function": "is_palindrome",
        "files": {
            "text_utils.py": (
                "def is_palindrome(text):\n"
                "    cleaned = text.replace(\" \", \"\")\n"
                "    return cleaned == cleaned[::-1]\n"
            ),
            "main.py": (
                "from text_utils import is_palindrome\n"
                "\n"
                "for word in [\"level\", \"Racecar\", \"hello\"]:\n"
                "    print(word, \"->\", is_palindrome(word))\n"
            ),
        },
        "checks": [
            {"id": "c1", "name": "Simple lowercase palindrome", "args": ["level"], "expected": True},
            {"id": "c2", "name": "Not a palindrome", "args": ["hello"], "expected": False},
            {"id": "c3", "name": "Capitalized palindrome", "args": ["Racecar"], "expected": True,
             "investigate": "text_utils.py:2-3"},
            {"id": "c4", "name": "Phrase with spaces and capitals", "args": ["Never odd or even"],
             "expected": True, "investigate": "text_utils.py:2"},
        ],
        "proposals": [
            {
                "id": "lower_clean",
                "kind": "necessary",
                "refs": ["text_utils.py:2"],
                "summary": "Cleaning step ignores case",
                "why_fails": (
                    "[text_utils.py:2] removes spaces but keeps capital letters, so \"Racecar\" "
                    "becomes \"Racecar\" and its reverse is \"racecaR\". The comparison on "
                    "[text_utils.py:3] is case-sensitive, so they don't match."
                ),
                "approach": "Normalize letter case while cleaning the text, before comparing.",
                "steps": [
                    "Write down cleaned for text = \"Racecar\".",
                    "Write down cleaned[::-1].",
                    "Are they equal character by character?",
                ],
                "current_behavior": "With the starter code, is_palindrome(\"Racecar\") returns False.",
                "correct_behavior": "It should return True.",
                "change": {
                    "why": "Lowercase the cleaned text so both sides of the comparison use the same case.",
                    "claimed_effect": "Capitalized palindromes and phrases are recognized.",
                    "hunks": [
                        {"id": "h1", "file": "text_utils.py", "label": "Lowercase while cleaning",
                         "old": "    cleaned = text.replace(\" \", \"\")",
                         "new": "    cleaned = text.replace(\" \", \"\").lower()"},
                    ],
                },
            },
            {
                "id": "reversed_join",
                "kind": "ineffective",
                "refs": ["text_utils.py:3"],
                "summary": "How the string is reversed",
                "why_fails": (
                    "The reversal on [text_utils.py:3] uses slicing, which may not reverse the "
                    "string the way you expect."
                ),
                "approach": "Use reversed() to reverse the string explicitly.",
                "steps": [
                    "Evaluate \"Racecar\"[::-1] by hand.",
                    "Evaluate \"\".join(reversed(\"Racecar\")) by hand.",
                    "Do the two results differ?",
                ],
                "current_behavior": "With the starter code, is_palindrome(\"Racecar\") returns False.",
                "correct_behavior": "It should return True.",
                "change": {
                    "why": "Reverse the string with reversed() instead of slicing.",
                    "claimed_effect": "The string is reversed reliably, so palindromes are detected.",
                    "hunks": [
                        {"id": "h1", "file": "text_utils.py", "label": "Reverse with reversed()",
                         "old": "    return cleaned == cleaned[::-1]",
                         "new": "    return cleaned == \"\".join(reversed(cleaned))"},
                    ],
                },
            },
            {
                "id": "lower_one_side",
                "kind": "partial",
                "refs": ["text_utils.py:3"],
                "summary": "Case-sensitive comparison",
                "why_fails": (
                    "The comparison on [text_utils.py:3] is case-sensitive, so capital letters "
                    "make otherwise matching strings unequal."
                ),
                "approach": "Lowercase the text in the comparison.",
                "steps": [
                    "Look at both sides of == on [text_utils.py:3].",
                    "For \"Racecar\", what is cleaned.lower()? What is cleaned[::-1]?",
                    "Do both sides have the same case after the change?",
                ],
                "current_behavior": "With the starter code, is_palindrome(\"Racecar\") returns False.",
                "correct_behavior": "It should return True.",
                "change": {
                    "why": "Ignore case when comparing.",
                    "claimed_effect": "Capitalized palindromes will be recognized.",
                    "hunks": [
                        {"id": "h1", "file": "text_utils.py", "label": "Lowercase the left side of the comparison",
                         "old": "    return cleaned == cleaned[::-1]",
                         "new": "    return cleaned.lower() == cleaned[::-1]"},
                    ],
                },
            },
        ],
        "explain_again": (
            "Why is \"Racecar\" not a palindrome here?\n"
            "Python compares strings character by character, and \"R\" != \"r\". After "
            "[text_utils.py:2], cleaned is \"Racecar\" and the reverse is \"racecaR\". The first "
            "characters already differ. Both sides need the same case."
        ),
        "new_approach": (
            "Compare two inputs.\n"
            "Trace is_palindrome(\"racecar\") and is_palindrome(\"Racecar\"). The only difference "
            "is one capital letter. Which line of [text_utils.py:2-3] treats them differently?"
        ),
    },
}


