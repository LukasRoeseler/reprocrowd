#!/usr/bin/env python3
"""Validate a ReproCrowd certification bundle for completeness and signature.

Usage:
    python validate_bundle.py <bundle-dir> [--schemas-dir schemas]

Checks:
  - Required artefacts present (completeness).
  - certificate.json / flora-entry.json valid against their JSON schemas.
  - environment.json is valid JSON and carries a program inventory.
  - SIGN-OFF.md is actually signed (non-empty Name + Signature) and not a template stub.
  - The certificate is AI-generated and marks outcome_robustness = not checked.

Exits 0 on success (prints PASS), 1 on failure (prints each problem).
"""
import json
import re
import sys

REQUIRED = ["certificate.json", "certificate.md", "SIGN-OFF.md",
            "flora-entry.json", "environment.json"]

VALID_OUTCOMES = ["computationally reproducible", "computational issues",
                  "technical failure", "computation not checked"]

STUB = re.compile(r"^_+\s*$")


def read(path):
    with open(path, "r", encoding="utf-8-sig", errors="replace") as fh:
        return fh.read()


def check_schema(data, schema_path, problems):
    try:
        import jsonschema
    except ImportError:
        problems.append("jsonschema not installed (pip install jsonschema)")
        return
    try:
        with open(schema_path, "r", encoding="utf-8") as fh:
            schema = json.load(fh)
    except Exception as exc:
        problems.append(f"cannot load schema {schema_path}: {exc}")
        return
    try:
        jsonschema.validate(data, schema)
    except jsonschema.ValidationError as exc:
        problems.append(f"{schema_path}: {exc.message}")


def main():
    if len(sys.argv) < 2:
        print("usage: validate_bundle.py <bundle-dir> [--schemas-dir schemas]")
        return 2
    bundle = sys.argv[1]
    schemas = "schemas"
    if "--schemas-dir" in sys.argv:
        schemas = sys.argv[sys.argv.index("--schemas-dir") + 1]

    problems = []

    for name in REQUIRED:
        if not _exists(bundle, name):
            problems.append(f"missing required file: {name}")

    # certificate.json
    cert_path = _join(bundle, "certificate.json")
    if _exists(bundle, "certificate.json"):
        try:
            cert = json.loads(read(cert_path))
            check_schema(cert, _join(schemas, "certificate.schema.json"), problems)
            flora = cert.get("flora", {})
            if flora.get("outcome_robustness") != "not checked":
                problems.append("certificate.json: flora.outcome_robustness must be 'not checked'")
            if flora.get("ai_generated") is not True and cert.get("ai_generated") is not True:
                problems.append("certificate.json: ai_generated must be true")
            vs = cert.get("validation_status")
            if vs not in VALID_OUTCOMES:
                problems.append(f"certificate.json: validation_status invalid: {vs!r}")
        except Exception as exc:
            problems.append(f"certificate.json: not valid JSON: {exc}")

    # flora-entry.json
    flora_path = _join(bundle, "flora-entry.json")
    if _exists(bundle, "flora-entry.json"):
        try:
            entry = json.loads(read(flora_path))
            check_schema(entry, _join(schemas, "flora-entry.schema.json"), problems)
            if entry.get("outcome_robustness") != "not checked":
                problems.append("flora-entry.json: outcome_robustness must be 'not checked'")
        except Exception as exc:
            problems.append(f"flora-entry.json: not valid JSON: {exc}")

    # environment.json
    env_path = _join(bundle, "environment.json")
    if _exists(bundle, "environment.json"):
        try:
            env = json.loads(read(env_path))
            programs = env.get("programs")
            if not programs:
                problems.append("environment.json: 'programs' (program inventory) is empty")
            elif not isinstance(programs, list):
                problems.append("environment.json: 'programs' must be a list")
        except Exception as exc:
            problems.append(f"environment.json: not valid JSON: {exc}")

    # SIGN-OFF.md signature
    signoff_path = _join(bundle, "SIGN-OFF.md")
    if _exists(bundle, "SIGN-OFF.md"):
        text = read(signoff_path)
        if "I have reviewed this certification" not in text:
            problems.append("SIGN-OFF.md: missing the 'I have reviewed this certification' statement")
        name = _field(text, "Name")
        sig = _field(text, "Signature")
        if not name or STUB.match(name):
            problems.append("SIGN-OFF.md: Name not filled in")
        if not sig or STUB.match(sig):
            problems.append("SIGN-OFF.md: Signature not filled in")
        if "outcome_robustness" in text and "not checked" not in text:
            problems.append("SIGN-OFF.md: outcome_robustness must be 'not checked'")

    if problems:
        print("FAIL")
        for p in problems:
            print("  - " + p)
        return 1

    print("PASS: bundle is complete and signed")
    return 0


def _field(text, label):
    m = re.search(r"^[-*]\s*\*\*%s:\*\*\s*(.+)$" % re.escape(label), text, re.M)
    return m.group(1).strip() if m else ""


def _exists(bundle, rel):
    import os
    return os.path.isfile(os.path.join(bundle, rel))


def _join(base, rel):
    import os
    return os.path.join(base, rel)


if __name__ == "__main__":
    sys.exit(main())
