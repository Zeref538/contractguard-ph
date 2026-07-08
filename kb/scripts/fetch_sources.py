"""Download official source texts for the ContractGuard PH knowledge base.

Saves raw HTML into kb/raw/. LawPhil hosts the full consolidated texts of
Philippine statutes; we pull the Labor Code (PD 442) and PD 851 (13th-month
pay), plus the statutes backing mandatory benefits and IP ownership.
"""

from pathlib import Path

import requests

RAW_DIR = Path(__file__).resolve().parents[1] / "raw"

SOURCES = {
    # Labor Code of the Philippines (PD 442, consolidated original numbering)
    "labor_code": "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html",
    # 13th-Month Pay Decree
    "pd_851": "https://lawphil.net/statutes/presdecs/pd1975/pd_851_1975.html",
    # Social Security Act of 2018 (SSS coverage)
    "ra_11199": "https://lawphil.net/statutes/repacts/ra2019/ra_11199_2019.html",
    # Universal Health Care Act (PhilHealth coverage)
    "ra_11223": "https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html",
    # HDMF Law of 2009 (Pag-IBIG coverage)
    "ra_9679": "https://lawphil.net/statutes/repacts/ra2009/ra_9679_2009.html",
    # Intellectual Property Code (work-for-hire / commissioned works)
    "ra_8293": "https://lawphil.net/statutes/repacts/ra1997/ra_8293_1997.html",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (ContractGuard PH knowledge-base builder)"}


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        dest = RAW_DIR / f"{name}.html"
        if dest.exists():
            print(f"skip {name} (already downloaded)")
            continue
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        dest.write_text(resp.text, encoding="utf-8")
        print(f"saved {name}: {len(resp.text):,} chars from {url}")


if __name__ == "__main__":
    main()
