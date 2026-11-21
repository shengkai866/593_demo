"""Turn uploaded files into a task: code files, test files, and learning materials."""

import ast
import base64
import io
import re
from pathlib import PurePosixPath

from pypdf import PdfReader

CODE_EXT = {".py"}
TEXT_MATERIAL_EXT = {".txt", ".md", ".markdown", ".rst"}
PDF_EXT = {".pdf"}
MAX_CODE_BYTES = 200_000
MAX_MATERIAL_CHARS = 60_000
MAX_FILES = 20


class UploadError(ValueError):
    pass


def safe_name(name: str) -> str:
    base = PurePosixPath(name.replace("\\", "/")).name
    base = re.sub(r"[^\w.\-]", "_", base)
    if not base or base.startswith("."):
        raise UploadError(f"Invalid file name: {name!r}")
    return base


def is_test_file(name: str) -> bool:
    stem = PurePosixPath(name).stem
    return stem.startswith("test_") or stem.endswith("_test")


def pdf_text(b64: str) -> str:
    try:
        reader = PdfReader(io.BytesIO(base64.b64decode(b64)))
        pages = [(p.extract_text() or "").strip() for p in reader.pages]
    except Exception as e:  # pypdf raises many types
        raise UploadError(f"Could not read PDF: {e}")
    text = "\n\n".join(f"[page {i + 1}]\n{t}" for i, t in enumerate(pages) if t)
    if not text.strip():
        raise UploadError("The PDF has no extractable text (it may be a scanned image).")
    return text


def classify(uploaded: list) -> dict:
    """uploaded: [{name, text?, b64?}] -> {code: {name: text}, tests: [names], materials: [{name, text}]}"""
    if len(uploaded) > MAX_FILES:
        raise UploadError(f"Upload at most {MAX_FILES} files.")
    code, materials = {}, []
    for f in uploaded:
        name = safe_name(f["name"])
        ext = PurePosixPath(name).suffix.lower()
        if ext in CODE_EXT:
            text = f.get("text") or ""
            if len(text.encode()) > MAX_CODE_BYTES:
                raise UploadError(f"{name} is too large.")
            code[name] = text if text.endswith("\n") else text + "\n"
        elif ext in TEXT_MATERIAL_EXT:
            materials.append({"name": name, "text": (f.get("text") or "")[:MAX_MATERIAL_CHARS]})
        elif ext in PDF_EXT:
            if not f.get("b64"):
                raise UploadError(f"{name}: missing PDF data.")
            materials.append({"name": name, "text": pdf_text(f["b64"])[:MAX_MATERIAL_CHARS]})
        else:
            raise UploadError(f"{name}: unsupported file type. Use .py for code and .txt/.md/.pdf for materials.")
    if not code:
        raise UploadError("Upload at least one Python (.py) file.")
    for name, text in code.items():
        try:
            ast.parse(text)
        except SyntaxError as e:
            # Still allowed (fixing it may be the task), but note it.
            pass
    tests = [n for n in code if is_test_file(n)]
    return {"code": code, "tests": tests, "materials": materials}


def module_of(name: str) -> str:
    return PurePosixPath(name).stem


def functions(code: dict) -> list:
    """Top-level functions in non-test files: [{module, function, signature, file, line}]."""
    out = []
    for name, text in code.items():
        if is_test_file(name):
            continue
        try:
            tree = ast.parse(text)
        except SyntaxError:
            continue
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and not node.name.startswith("_"):
                out.append({"module": module_of(name), "function": node.name, "file": name, "line": node.lineno,
                            "signature": f"{node.name}({ast.unparse(node.args)})"})
    return out


def test_checks(code: dict, tests: list) -> list:
    """One check per test_* function in uploaded test files."""
    checks = []
    for name in tests:
        try:
            tree = ast.parse(code[name])
        except SyntaxError:
            continue
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name.startswith("test"):
                doc = ast.get_docstring(node)
                pretty = node.name.removeprefix("test_").replace("_", " ").strip().capitalize() or node.name
                checks.append({"id": f"t{len(checks) + 1}", "kind": "test", "module": module_of(name),
                               "function": node.name, "args": [], "name": doc.splitlines()[0] if doc else pretty,
                               "author": f"Your test file ({name})", "investigate": f"{name}:{node.lineno}"})
    return checks


def choose_entry(code: dict) -> str:
    """Pick the file to run as 'the program'."""
    names = [n for n in code if not is_test_file(n)]
    for preferred in ("main.py", "app.py", "run.py"):
        if preferred in names:
            return preferred
    for n in names:
        if "__main__" in code[n]:
            return n
    return names[0] if names else next(iter(code))
