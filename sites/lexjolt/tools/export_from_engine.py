#!/usr/bin/env python3
"""Export the 72-calculator catalogue and a golden-vector set from the Python engine.

This is the contract between the two implementations. The TypeScript port in src/lib/cre/ is
"correct" only in so far as it reproduces these vectors, so the exporter records BOTH the coerced
inputs and the result: a port that agrees on the answer for the wrong reasons (different coercion,
same accident) is caught by the inputs half.

    python3 tools/export_from_engine.py
    node tools/parity.mjs        # the gate

Vectors: defaults, then two deterministic perturbations inside each argument's own min/max, so a
vector can never ask a function for an input the UI would refuse. Calculators with no arguments
(pure assumption tables) get one vector.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.expanduser("~/projects/realestate365-deal-desk")
sys.path.insert(0, ENGINE)
os.chdir(ENGINE)

from app.api.calculators import catalogue, groups, run  # noqa: E402

OUT = os.path.join(HERE, "src", "data")


def scalar(arg, frac):
    """A deterministic value inside the argument's own range, or a nudge off its default."""
    lo, hi = arg.get("min"), arg.get("max")
    if lo is not None and hi is not None and hi > lo:
        v = lo + frac * (hi - lo)
    else:
        v = (arg.get("default") or 0) * (1 + frac) + frac * 10
    if arg["type"] == "int":
        v = max(1, int(round(v)))
    return round(v, 6)


def vector(spec, frac):
    """frac=None means "the UI defaults"; a number means "a point inside the argument's range".

    The default vector matters most: it is what the site shows before anyone types anything, and it
    is the vector a port is most likely to get subtly wrong (a percent stored as 6.5 instead of
    0.065 still "works" on every hand-entered test).
    """
    vals = {}
    for a in spec["args"]:
        t = a["type"]
        if t in ("money", "number", "years", "percent", "int"):
            vals[a["name"]] = a["default"] if frac is None else scalar(a, frac)
        elif t == "numbers":
            base = a.get("default") or []
            n = max(int(a.get("min_length") or 3), 3)
            vals[a["name"]] = base if (frac is None and base) else \
                [round(1000 * (i + 1) * (1 + (frac or 0)), 2) for i in range(n)]
        elif t == "pairs":
            keys = a["keys"]
            vals[a["name"]] = [
                {keys[0]: round(100000 * (i + 1), 2), keys[1]: round(0.03 + 0.01 * i, 4)}
                for i in range(3)
            ]
        elif t == "choice":
            vals[a["name"]] = a["default"]
        else:
            vals[a["name"]] = a.get("default")
    return vals


def main():
    cat = catalogue()
    golden = []
    skipped = []
    for spec in cat:
        fracs = [None] if not spec["args"] else [None, 0.62, 0.31]
        for frac in fracs:
            vals = vector(spec, frac)
            res = run(spec["name"], vals)
            if res.get("error"):
                skipped.append({"name": spec["name"], "frac": frac, "error": res["error"]})
                continue
            golden.append({
                "name": spec["name"],
                "values": vals,
                "inputs": res["inputs"],
                "result": res["result"],
            })

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "calc-catalog.json"), "w") as fh:
        json.dump({"groups": groups(), "calculators": cat}, fh, indent=1)
    with open(os.path.join(OUT, "calc-golden.json"), "w") as fh:
        json.dump({"vectors": golden, "skipped": skipped}, fh, indent=1)

    kinds = {}
    for g in golden:
        k = type(g["result"]).__name__
        kinds[k] = kinds.get(k, 0) + 1
    print("catalog: %d calculators in %d groups -> %s"
          % (len(cat), len(groups()), os.path.join(OUT, "calc-catalog.json")))
    print("golden: %d vectors, %d skipped -> %s"
          % (len(golden), len(skipped), os.path.join(OUT, "calc-golden.json")))
    print("result shapes:", kinds)
    for s in skipped:
        print("  skipped %s (frac %.2f): %s" % (s["name"], s["frac"], s["error"]))


if __name__ == "__main__":
    main()
