"""Parse the downloaded source statutes into structured rule chunks.

Reads the raw HTML in kb/raw/ and produces kb/rules/rules.json — the
source-of-truth list of rule entries before embedding. Each entry:

    {
      "id": "labor_code_art_296",
      "source": "Labor Code of the Philippines (PD 442, as amended)",
      "citation": "Labor Code, Art. 296 [281]",
      "title": "Probationary employment",
      "text": "...",
      "clause_category": "probation"
    }

The Labor Code was renumbered by DOLE Department Advisory 01-15; LawPhil
carries the original numbering, so RENUMBERED maps original -> current
article numbers for the articles we keep. Citations show both.
"""

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

KB_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = KB_DIR / "raw"
RULES_DIR = KB_DIR / "rules"

# ---------------------------------------------------------------- Labor Code

# Original article number -> clause_category. Only these are kept.
LABOR_CODE_KEEP = {
    # Hours of work, overtime, rest days, premium pay (Book III, Title I)
    **{n: "hours" for n in range(82, 97)},
    # Wages: minimum wage, non-diminution, payment, deductions
    97: "pay", 99: "pay", 100: "pay", 102: "pay", 103: "pay",
    113: "pay", 116: "pay",
    # Dispute resolution: jurisdiction of Labor Arbiters / NLRC
    217: "dispute",
    # Regularization and probation
    280: "probation", 281: "probation",
    # Termination of employment
    279: "termination", 282: "termination", 283: "termination",
    284: "termination", 285: "termination", 286: "termination",
    287: "termination",
}

# Original -> renumbered (DOLE Department Advisory 01-15). Articles 82-116
# were not renumbered.
RENUMBERED = {
    217: 224,
    279: 294, 280: 295, 281: 296, 282: 297, 283: 298,
    284: 299, 285: 300, 286: 301, 287: 302,
}

ARTICLE_RE = re.compile(r"^Article (\d+)\.\s*$", re.M)


def html_to_text(name: str) -> str:
    html = (RAW_DIR / f"{name}.html").read_text(encoding="utf-8")
    text = BeautifulSoup(html, "html.parser").get_text("\n")
    # Collapse whitespace artifacts from the HTML markup
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text


def clean_body(body: str) -> str:
    lines = [ln.strip() for ln in body.split("\n") if ln.strip()]
    return "\n".join(lines)


def parse_labor_code() -> list[dict]:
    text = html_to_text("labor_code")
    matches = list(ARTICLE_RE.finditer(text))
    rules = []
    for m, nxt in zip(matches, matches[1:] + [None]):
        num = int(m.group(1))
        if num not in LABOR_CODE_KEEP:
            continue
        end = nxt.start() if nxt else len(text)
        chunk = clean_body(text[m.end():end])
        lines = chunk.split("\n")
        # First line is the article title (ends with a period)
        title = lines[0].rstrip(".")
        body = "\n".join(lines[1:]).strip()
        # Stop at structural headings that belong to the next division
        body = re.split(r"\n(?:BOOK [A-Z]+|Title [IVX]+|Chapter [IVX]+)\n", body)[0].strip()
        renum = RENUMBERED.get(num)
        citation = (
            f"Labor Code, Art. {renum} [{num}]" if renum else f"Labor Code, Art. {num}"
        )
        rules.append({
            "id": f"labor_code_art_{renum or num}",
            "source": "Labor Code of the Philippines (PD 442, as amended)",
            "citation": citation,
            "title": title,
            "text": body,
            "clause_category": LABOR_CODE_KEEP[num],
        })
    return rules


# ------------------------------------------------- Section-numbered statutes

SECTION_RE = re.compile(r"^(?:SEC(?:TION)?\.?|Section) (\d+(?:\.\d+)?)\.\s*", re.M | re.I)


def parse_sections(name: str, source: str, cite_prefix: str,
                   keep: dict[str, str], text: str | None = None,
                   id_prefix: str | None = None,
                   titles: dict[str, str] | None = None) -> list[dict]:
    """Extract specific numbered sections from a statute's text."""
    if text is None:
        text = html_to_text(name)
    id_prefix = id_prefix or name
    matches = list(SECTION_RE.finditer(text))
    rules = []
    for m, nxt in zip(matches, matches[1:] + [None]):
        sec = m.group(1)
        if sec not in keep:
            continue
        end = nxt.start() if nxt else len(text)
        chunk = clean_body(text[m.end():end])
        lines = chunk.split("\n")
        # Title is the leading phrase up to the first period of line one —
        # but only when a real body remains; untitled sections keep it all.
        first = lines[0]
        if titles and sec in titles:
            title = titles[sec]
            body = chunk
            if body.startswith(title):
                body = body[len(title):].strip()
            rules.append(_entry(id_prefix, name, source, cite_prefix, sec,
                                title, body, keep[sec]))
            continue
        dot = first.find(".")
        rest = first[dot + 1:].strip() if dot > 0 else ""
        if 0 < dot < 120 and (rest or len(lines) > 1):
            title = first[:dot].strip()
            body = (rest + "\n" + "\n".join(lines[1:])).strip()
        else:
            title = f"{cite_prefix}, Section {sec}"
            body = chunk
        rules.append(_entry(id_prefix, name, source, cite_prefix, sec,
                            title, body, keep[sec]))
    return rules


def _entry(id_prefix: str, name: str, source: str, cite_prefix: str,
           sec: str, title: str, body: str, category: str) -> dict:
    return {
        "id": f"{id_prefix}_sec_{sec.replace('.', '_')}",
        "source": source,
        "citation": f"{cite_prefix}, Sec. {sec}",
        "title": title,
        # Guard against runaway chunks at document boundaries
        "text": body[:6000].strip(),
        "clause_category": category,
    }


def main() -> None:
    RULES_DIR.mkdir(parents=True, exist_ok=True)
    rules: list[dict] = []

    rules += parse_labor_code()

    # PD 851 — 13th-month pay. The LawPhil page carries the decree followed
    # by its Implementing Rules; both reuse section numbers, so split them.
    pd851_text = html_to_text("pd_851")
    split_at = pd851_text.upper().find("RULES AND REGULATIONS IMPLEMENTING")
    decree, irr = pd851_text[:split_at], pd851_text[split_at:]
    rules += parse_sections(
        "pd_851", "PD 851 (13th-Month Pay Decree, 1975)", "PD 851",
        {"1": "pay", "2": "pay"}, text=decree,
        titles={"1": "PD 851, Section 1", "2": "PD 851, Section 2"},
    )
    rules += parse_sections(
        "pd_851", "Rules and Regulations Implementing PD 851",
        "IRR of PD 851",
        {"1": "pay", "2": "pay", "3": "pay", "4": "pay"},
        text=irr, id_prefix="pd_851_irr",
        titles={
            "1": "Payment of 13-month Pay",
            "2": "Definition of certain terms",
            "3": "Employers covered",
            "4": "Employees covered",
        },
    )

    # RA 11199 — Social Security Act of 2018: compulsory SSS coverage
    rules += parse_sections(
        "ra_11199",
        "RA 11199 (Social Security Act of 2018)",
        "RA 11199",
        {"9": "benefits", "18": "benefits", "19": "benefits", "22": "benefits"},
    )

    # RA 11223 — Universal Health Care Act: PhilHealth membership/premiums
    rules += parse_sections(
        "ra_11223",
        "RA 11223 (Universal Health Care Act, 2019)",
        "RA 11223",
        {"8": "benefits", "9": "benefits", "10": "benefits"},
    )

    # RA 9679 — Pag-IBIG Fund Law: mandatory HDMF coverage and contributions
    rules += parse_sections(
        "ra_9679",
        "RA 9679 (Home Development Mutual Fund Law of 2009)",
        "RA 9679",
        {"6": "benefits", "7": "benefits", "23": "benefits"},
    )

    # RA 8293 — IP Code: ownership of works/inventions made in employment
    rules += parse_sections(
        "ra_8293",
        "RA 8293 (Intellectual Property Code of the Philippines)",
        "RA 8293",
        {"30": "ip", "178": "ip"},
    )

    out = RULES_DIR / "rules.json"
    out.write_text(json.dumps(rules, indent=2, ensure_ascii=False), encoding="utf-8")

    by_cat: dict[str, int] = {}
    for r in rules:
        by_cat[r["clause_category"]] = by_cat.get(r["clause_category"], 0) + 1
    print(f"wrote {len(rules)} rules to {out}")
    for cat, n in sorted(by_cat.items()):
        print(f"  {cat}: {n}")


if __name__ == "__main__":
    main()
