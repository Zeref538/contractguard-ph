"""Run the pipeline over the eval contracts and score against ground truth.

Metrics:
  clause detection  — precision/recall of category presence vs ground truth
  verdict accuracy  — verdict match on categories the model detected correctly
  citation accuracy — citation contains the expected substring AND matches a
                      real entry in kb/rules/rules.json

Usage: uv run python eval/run_eval.py [--limit N]
Requires a filled .env (live Azure + MongoDB Atlas calls).
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.pipeline import analyze_contract  # noqa: E402

EVAL_DIR = ROOT / "eval"

# Most severe first — used to collapse several clauses of one category.
SEVERITY = ["Non-compliant", "Missing", "Vague", "Compliant"]


def load_known_tokens() -> set[str]:
    """Article/section numbers that actually exist in the knowledge base."""
    rules = json.loads((ROOT / "kb/rules/rules.json").read_text(encoding="utf-8"))
    return {r["citation"].lower() for r in rules}


def citation_is_real(citation: str, known: set[str]) -> bool:
    c = citation.lower()
    return any(k in c or c in k for k in known)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None,
                        help="only evaluate the first N contracts")
    args = parser.parse_args()

    ground_truth = json.loads(
        (EVAL_DIR / "ground_truth.json").read_text(encoding="utf-8"))
    known = load_known_tokens()

    names = sorted(ground_truth)[: args.limit]
    tp = fp = fn = 0
    verdict_hits = verdict_total = 0
    cite_hits = cite_total = 0
    rows = []

    duplicates = 0

    for name in names:
        pdf = (EVAL_DIR / "contracts" / f"{name}.pdf").read_bytes()
        report = analyze_contract(pdf, name + ".pdf")

        # A contract can yield several clauses of the same category (e.g. two
        # benefits paragraphs). Group them — keying a dict by category would
        # silently discard all but the last.
        by_cat: dict[str, list] = defaultdict(list)
        for c in report.clauses:
            by_cat[c.clause_type.value].append(c)
        duplicates += sum(len(v) - 1 for v in by_cat.values())

        truth = ground_truth[name]

        # Detection: category counted as "detected present" when the model
        # produced a non-Missing row; truth "present" = verdict != Missing.
        for cat, exp in truth.items():
            clauses = by_cat.get(cat, [])
            expected_present = exp["verdict"] != "Missing"
            model_present = any(c.verdict.value != "Missing" for c in clauses)
            if expected_present and model_present:
                tp += 1
            elif not expected_present and model_present:
                fp += 1
            elif expected_present and not model_present:
                fn += 1

            if not clauses:
                continue

            # The category's effective verdict is its most severe finding —
            # that is what a reader acts on.
            worst = min(clauses, key=lambda c: SEVERITY.index(c.verdict.value))
            verdict_total += 1
            ok = worst.verdict.value == exp["verdict"]
            verdict_hits += ok

            # Citation counts if ANY clause of the category cites correctly.
            cite_total += 1
            want = exp["citation_must_contain"].lower()
            cite_ok = any(
                want in c.citation.lower() and citation_is_real(c.citation, known)
                for c in clauses
            )
            cite_hits += cite_ok
            rows.append((name, cat, exp["verdict"],
                         worst.verdict.value, ok, cite_ok))
        print(f"done {name}")

    if duplicates:
        print(f"\nnote: {duplicates} duplicate-category clauses were grouped "
              f"(previously silently dropped)")

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    print("\n=== Results ===")
    print(f"clause detection: precision={precision:.2%} recall={recall:.2%} "
          f"(tp={tp} fp={fp} fn={fn})")
    print(f"verdict accuracy: {verdict_hits}/{verdict_total} "
          f"({verdict_hits / verdict_total:.2%})" if verdict_total else "n/a")
    print(f"citation accuracy: {cite_hits}/{cite_total} "
          f"({cite_hits / cite_total:.2%})" if cite_total else "n/a")

    out = EVAL_DIR / "results.json"
    out.write_text(json.dumps({
        "precision": precision, "recall": recall,
        "verdict_accuracy": verdict_hits / verdict_total if verdict_total else None,
        "citation_accuracy": cite_hits / cite_total if cite_total else None,
        "rows": [{"contract": r[0], "category": r[1], "expected": r[2],
                  "got": r[3], "verdict_ok": r[4], "citation_ok": r[5]}
                 for r in rows],
    }, indent=2), encoding="utf-8")
    print(f"detail written to {out}")


if __name__ == "__main__":
    main()
