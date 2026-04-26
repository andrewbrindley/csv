"""
Benchmark + accuracy harness for cleaning_engine.

Generates 10,000 synthetic messy records with known-good ground truth,
runs the deterministic engine over them, and reports throughput + accuracy.
No network, no LLM. Run with: py bench_engine.py
"""
from __future__ import annotations

import random
import time
from cleaning_engine import repair_value


# ---- Generators -------------------------------------------------------------

FIRST_NAMES = ["John", "Mary", "Liam", "Emma", "Olivia", "Noah", "Sophia",
               "William", "Amelia", "Mateo", "Aarav", "Yuki", "Hiroshi",
               "Priya", "Carlos", "Anastasia", "Aisha", "Kwame", "Chen"]
LAST_NAMES = ["Smith", "Johnson", "Garcia", "Patel", "Müller", "Wang",
              "Nguyen", "O'Brien", "van der Berg", "Rossi", "Kim",
              "Andersson", "Yamamoto", "Cohen", "Mendez", "Singh"]
DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
           "icloud.com", "proton.me", "company.io"]


def _maybe_corrupt_string(s: str, rng: random.Random) -> str:
    """Apply random benign corruption."""
    r = rng.random()
    if r < 0.10:
        return s.upper()
    if r < 0.20:
        return s.lower()
    if r < 0.30:
        return f"  {s}  "
    if r < 0.35:
        return s.replace(" ", "  ")
    return s


def gen_email(rng: random.Random) -> tuple[str, str]:
    fn = rng.choice(FIRST_NAMES).lower()
    ln = rng.choice(LAST_NAMES).lower().replace(" ", "").replace("'", "")
    dom = rng.choice(DOMAINS)
    truth = f"{fn}.{ln}@{dom}"
    raw = truth
    r = rng.random()
    if r < 0.1:  # uppercase
        raw = raw.upper()
    elif r < 0.2:  # spaces around @
        raw = raw.replace("@", " @ ")
    elif r < 0.3:  # [at]/[dot] obfuscation
        raw = raw.replace("@", "[at]").replace(".", "[dot]", 1)
    elif r < 0.4 and dom == "gmail.com":  # typo
        raw = raw.replace("gmail.com", "gmial.con")
    elif r < 0.5:  # mailto: prefix
        raw = "mailto:" + raw
    elif r < 0.55:  # angle brackets
        raw = f"<{raw}>"
    elif r < 0.6:  # leading/trailing whitespace
        raw = f"  {raw}\t"
    return raw, truth


def gen_phone(rng: random.Random) -> tuple[str, str, str]:
    region = rng.choice(["US", "GB", "AU"])
    if region == "US":
        n = "".join(str(rng.randint(0, 9)) for _ in range(10))
        # ensure not starting with 0/1 (NANP rule)
        n = "4" + n[1:]
        truth = f"+1{n}"
        formats = [
            f"({n[:3]}) {n[3:6]}-{n[6:]}",
            f"{n[:3]}.{n[3:6]}.{n[6:]}",
            f"+1 {n[:3]} {n[3:6]} {n[6:]}",
            f"1-{n[:3]}-{n[3:6]}-{n[6:]}",
            n,
        ]
    elif region == "GB":
        n = "7" + "".join(str(rng.randint(0, 9)) for _ in range(9))
        truth = f"+44{n}"
        formats = [
            f"0{n[:4]} {n[4:]}",
            f"+44 {n[:4]} {n[4:]}",
            f"0{n}",
            f"+44{n}",
        ]
    else:  # AU
        n = "4" + "".join(str(rng.randint(0, 9)) for _ in range(8))
        truth = f"+61{n}"
        formats = [f"0{n[:3]} {n[3:6]} {n[6:]}", f"+61 {n[:3]} {n[3:6]} {n[6:]}", f"0{n}"]
    raw = rng.choice(formats)
    return raw, truth, region


def gen_name(rng: random.Random) -> tuple[str, str]:
    fn = rng.choice(FIRST_NAMES)
    truth = fn
    r = rng.random()
    if r < 0.2:
        return fn.upper(), truth
    if r < 0.4:
        return fn.lower(), truth
    if r < 0.5:
        return f"  {fn} ", truth
    if r < 0.6:
        return f"Mr {fn}", truth  # title strip
    if r < 0.65:
        return f"{fn}123", truth  # digit strip
    return fn, truth


def gen_date(rng: random.Random) -> tuple[str, str]:
    y = rng.randint(1980, 2024)
    m = rng.randint(1, 12)
    d = rng.randint(1, 28)
    truth = f"{d:02d}-{m:02d}-{y}"
    fmt = rng.choice([
        f"{d:02d}/{m:02d}/{y}",
        f"{d}-{m}-{y}",
        f"{y}-{m:02d}-{d:02d}",
        f"{d:02d}.{m:02d}.{y}",
    ])
    return fmt, truth


def gen_boolean(rng: random.Random) -> tuple[str, str]:
    if rng.random() < 0.5:
        return rng.choice(["yes", "Y", "TRUE", "1", "on", "checked"]), "true"
    return rng.choice(["no", "N", "FALSE", "0", "off", "unchecked"]), "false"


def gen_currency(rng: random.Random) -> tuple[str, str]:
    n = round(rng.uniform(1, 9999.99), 2)
    sym = rng.choice(["£", "$", "€"])
    code = {"£": "GBP", "$": "USD", "€": "EUR"}[sym]
    truth = f"{code} {n:.2f}"
    fmt = rng.choice([
        f"{sym}{n:,.2f}",
        f"{sym}{n:.2f}",
        f"{n:,.2f} {code}",
    ])
    return fmt, truth


def gen_postal_uk(rng: random.Random) -> tuple[str, str]:
    a = "".join(rng.choice("ABCDEFGHIJKLMNOPRSTUWYZ") for _ in range(rng.choice([1, 2])))
    n1 = rng.randint(1, 9)
    n2 = rng.randint(0, 9)
    suffix = "".join(rng.choice("ABDEFGHJLNPQRSTUWXYZ") for _ in range(2))
    truth = f"{a}{n1} {n2}{suffix}"
    raw = rng.choice([truth.lower(), truth.replace(" ", ""), truth])
    return raw, truth


def gen_enum(rng: random.Random) -> tuple[str, list, str]:
    options = [["Active", "Inactive", "Suspended", "Pending"],
               ["High", "Medium", "Low", "Critical"],
               ["Male", "Female", "Non-binary"]]
    allowed = rng.choice(options)
    truth = rng.choice(allowed)
    r = rng.random()
    if r < 0.3:
        return truth.upper(), allowed, truth
    if r < 0.5:
        return truth.lower(), allowed, truth
    if r < 0.7:
        return truth[:3].lower(), allowed, truth  # prefix abbreviation
    if r < 0.85 and " " in truth:
        return "".join(w[0] for w in truth.split()).lower(), allowed, truth  # acronym
    return truth, allowed, truth


# ---- Runner -----------------------------------------------------------------

def run_bench(n: int = 10_000, seed: int = 42):
    rng = random.Random(seed)
    cases = []  # (field, raw, expected, expected_status)
    for _ in range(n):
        kind = rng.choice(["email", "phone", "name", "date", "boolean", "currency", "postal", "enum", "integer"])
        if kind == "email":
            raw, truth = gen_email(rng)
            cases.append(({"pattern": "email"}, raw, truth, "ok"))
        elif kind == "phone":
            raw, truth, region = gen_phone(rng)
            cases.append(({"pattern": "phone", "region": region}, raw, truth, "ok"))
        elif kind == "name":
            raw, truth = gen_name(rng)
            cases.append(({"pattern": "name"}, raw, truth, "ok"))
        elif kind == "date":
            raw, truth = gen_date(rng)
            cases.append(({"pattern": "date"}, raw, truth, "ok"))
        elif kind == "boolean":
            raw, truth = gen_boolean(rng)
            cases.append(({"pattern": "boolean"}, raw, truth, "ok"))
        elif kind == "currency":
            raw, truth = gen_currency(rng)
            cases.append(({"pattern": "currency"}, raw, truth, "ok"))
        elif kind == "postal":
            raw, truth = gen_postal_uk(rng)
            cases.append(({"pattern": "postal", "region": "GB"}, raw, truth, "ok"))
        elif kind == "enum":
            raw, allowed, truth = gen_enum(rng)
            cases.append(({"pattern": "enum", "allowed": allowed}, raw, truth, None))
        else:
            n_ = rng.randint(0, 999_999)
            raw = f"{n_:,}" if rng.random() < 0.5 else str(n_)
            cases.append(({"pattern": "integer"}, raw, str(n_), "ok"))

    # Run
    by_kind = {}
    t0 = time.perf_counter()
    correct = 0
    status_correct = 0
    for field, raw, expected, expected_status in cases:
        r = repair_value(field, raw)
        kind = field["pattern"]
        bk = by_kind.setdefault(kind, {"n": 0, "value_match": 0, "status_ok_or_warn": 0})
        bk["n"] += 1
        if r.value == expected:
            correct += 1
            bk["value_match"] += 1
        if r.status in ("ok", "warn"):
            status_correct += 1
            bk["status_ok_or_warn"] += 1
    elapsed = time.perf_counter() - t0

    print(f"\n=== ingestr deterministic engine — {n:,} synthetic messy records ===")
    print(f"Total wallclock      : {elapsed*1000:>8.1f} ms")
    print(f"Throughput           : {n/elapsed:>10,.0f} records/sec")
    print(f"Per-record           : {elapsed/n*1e6:>10,.1f} µs")
    print(f"Exact value match    : {correct/n*100:>10,.2f}%  ({correct}/{n})")
    print(f"Status ok-or-warn    : {status_correct/n*100:>10,.2f}%  ({status_correct}/{n})")
    print()
    print(f"{'Pattern':<12}{'N':>8}{'Value match':>16}{'Accepted':>16}")
    for k, v in sorted(by_kind.items()):
        vm = v["value_match"] / v["n"] * 100
        ac = v["status_ok_or_warn"] / v["n"] * 100
        print(f"{k:<12}{v['n']:>8}{vm:>15.2f}%{ac:>15.2f}%")
    print()


if __name__ == "__main__":
    run_bench(10_000)
