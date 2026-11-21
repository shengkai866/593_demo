"""Run participant code and checks in a separate Python process.

This is a demo for a controlled study, not a sandbox: code is executed with a
timeout in a temporary directory, but is otherwise not isolated.

Two kinds of checks:
  call - call module.function(*args) and compare with `expected`
  test - call a test function from an uploaded test file (e.g. test_x() in
         test_search.py); it passes if it raises nothing. For simple
         `assert left == right` statements we also report both values.
"""

import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

TIMEOUT_S = 5

HARNESS = r'''
import ast, importlib, inspect, json, sys, textwrap, traceback
sys.path.insert(0, sys.argv[1])
spec = json.loads(sys.stdin.read())

def describe_assert(fn, mod):
    """Find the first failing `assert a == b` in fn and evaluate both sides (globals only)."""
    try:
        tree = ast.parse(textwrap.dedent(inspect.getsource(fn)))
    except Exception:
        return None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assert) and isinstance(node.test, ast.Compare) and len(node.test.ops) == 1 \
                and isinstance(node.test.ops[0], ast.Eq):
            try:
                left = eval(compile(ast.Expression(node.test.left), "<a>", "eval"), vars(mod))
                right = eval(compile(ast.Expression(node.test.comparators[0]), "<a>", "eval"), vars(mod))
            except Exception:
                continue
            if left != right:
                return {"call": ast.unparse(node.test.left), "actual": repr(left), "expected": repr(right),
                        "source": ast.unparse(node)}
    return None

out = []
for c in spec["checks"]:
    try:
        mod = importlib.import_module(c["module"])
        fn = getattr(mod, c["function"])
    except Exception as e:
        out.append({"id": c["id"], "ok": False, "error": "Could not load " + c["module"] + "." + c["function"] + ": "
                    + type(e).__name__ + ": " + str(e)})
        continue
    try:
        if c.get("kind") == "test":
            fn()
            out.append({"id": c["id"], "ok": True, "value": None, "repr": "passed"})
        else:
            r = fn(*c["args"])
            out.append({"id": c["id"], "ok": True, "value": r, "repr": repr(r)})
    except AssertionError as e:
        out.append({"id": c["id"], "ok": False, "assertion": True, "error": "AssertionError" + (": " + str(e) if str(e) else ""),
                    "detail": describe_assert(fn, mod)})
    except Exception as e:
        out.append({"id": c["id"], "ok": False, "error": type(e).__name__ + ": " + str(e)})
print(json.dumps({"results": out}, default=repr))
'''


def _write_files(tmp: Path, files: dict):
    for name, text in files.items():
        p = tmp / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)


def _same(expected, actual):
    num = (int, float)
    if isinstance(expected, bool) or isinstance(actual, bool):
        return type(expected) is type(actual) and expected == actual
    if isinstance(expected, num) and isinstance(actual, num):
        return math.isclose(expected, actual, rel_tol=1e-9, abs_tol=1e-9)
    if isinstance(expected, list) and isinstance(actual, tuple):
        return expected == list(actual)
    return expected == actual


def call_repr(function: str, args: list) -> str:
    return f"{function}({', '.join(repr(a) for a in args)})"


def check_call(c) -> str:
    if c.get("kind") == "test":
        return f"{c['module']}.{c['function']}()"
    return call_repr(c["function"], c["args"])


def check_expected(c) -> str:
    return "no failed assertion" if c.get("kind") == "test" else repr(c["expected"])


def run_checks(files: dict, checks: list) -> dict:
    if not checks:
        return {"error": None, "results": []}
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _write_files(tmp, files)
        harness = tmp / "_harness.py"
        harness.write_text(HARNESS)
        spec = {"checks": [{"id": c["id"], "module": c["module"], "function": c["function"],
                            "kind": c.get("kind", "call"), "args": c.get("args", [])} for c in checks]}
        try:
            proc = subprocess.run(
                [sys.executable, "-E", "-s", str(harness), str(tmp)],
                input=json.dumps(spec), capture_output=True, text=True,
                timeout=TIMEOUT_S * 2, cwd=tmp,
            )
        except subprocess.TimeoutExpired:
            return {"error": f"Checks timed out after {TIMEOUT_S * 2}s (possible infinite loop).", "results": []}
    try:
        payload = json.loads(proc.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        return {"error": (proc.stderr or proc.stdout or "No output from checks")[-2000:], "results": []}

    by_id = {r["id"]: r for r in payload["results"]}
    results = []
    for c in checks:
        r = by_id.get(c["id"], {"ok": False, "error": "not run"})
        call, expected = check_call(c), check_expected(c)
        if c.get("kind") == "test":
            passed = r["ok"]
            actual = "passed" if passed else r["error"]
            detail = r.get("detail")
            if detail:
                call, expected, actual = detail["call"], detail["expected"], detail["actual"]
        elif r["ok"]:
            passed = _same(c["expected"], r["value"])
            actual = r["repr"]
        else:
            passed = False
            actual = r["error"]
        results.append({
            "id": c["id"],
            "name": c["name"],
            "author": c.get("author", "Course staff"),
            "call": call,
            "expected": expected,
            "actual": actual,
            "raised": not r["ok"] and not r.get("assertion"),
            "status": "pass" if passed else "fail",
            "investigate": c.get("investigate"),
        })
    return {"error": None, "results": results}


def run_program(files: dict, entry: str) -> dict:
    if not entry or entry not in files:
        return {"command": "(no program to run)", "stdout": "", "stderr": "", "exit_code": None}
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _write_files(tmp, files)
        try:
            proc = subprocess.run(
                [sys.executable, "-E", "-s", entry], capture_output=True, text=True,
                timeout=TIMEOUT_S, cwd=tmp, stdin=subprocess.DEVNULL,
            )
        except subprocess.TimeoutExpired:
            return {"command": f"python {entry}", "stdout": "", "stderr": f"Timed out after {TIMEOUT_S}s", "exit_code": None}
    return {"command": f"python {entry}", "stdout": proc.stdout[-5000:], "stderr": proc.stderr[-2000:],
            "exit_code": proc.returncode}
