#!/usr/bin/env python3
"""Build one 30-second vertical video per calculator, straight from the engine's own numbers.

The point is that nothing here is written by hand: the label, the inputs, the result and the units
all come from the Python catalogue and engine, so a video cannot disagree with the calculator it
links to. Change a formula and the video changes on the next run.

    python3 tools/make_calc_videos.py --dry-run          # write manifests, render nothing
    python3 tools/make_calc_videos.py --only cap_rate    # one, for a look
    python3 tools/make_calc_videos.py --workers 3        # all 72

Output:
    videos/manifests/<slug>.yaml            the manifest (the contract the reel engine reads)
    public/videos/<slug>.mp4                1080x1920, H.264/AAC, ~25-30s
    src/data/videos.json                    index the site renders: duration, bytes, transcript

Rendering is delegated to the reel engine in ~/projects/1019-faceless-network: same manifest schema,
macOS `say` + PIL + ffmpeg, zero API cost.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.expanduser("~/projects/realestate365-deal-desk")
REEL = os.path.expanduser("~/projects/1019-faceless-network/src/assemble_reel.py")
sys.path.insert(0, ENGINE)
os.chdir(ENGINE)

from app.api.calculators import catalogue, run  # noqa: E402

STYLE = {"bg": "#F3F6F8", "ink": "#191919", "accent": "#0A66C2", "dim": "#5E5E5E"}
HANDLE = "@lexjolt"
VOICE = "Samantha"
RATE = 185


# ---------- formatting -----------------------------------------------------------
def money(v):
    return ("-" if v < 0 else "") + "${:,.0f}".format(abs(v))


def pct(v):
    return "{:.1f}%".format(100 * v)


def key_kind(key):
    """The unit of one breakdown key. A rate is not dollars, and 190 basis points is not 19,000%."""
    k = key.lower()
    if k.endswith("_bps") or k == "bps":
        return "bps"
    # Match whole underscore-separated tokens, never substrings: "tax_unRECAPTURED_1250" contains
    # "rate" as a substring and would otherwise be read as 3,600,000 percent.
    tokens = set(k.split("_"))
    if "months" in tokens:
        return "months"
    if tokens & {"rate", "pct", "percent", "share", "spread", "yield", "ratio", "treasury", "cap"}:
        return "percent"
    if tokens & {"amount", "price", "value", "income", "rent", "tax", "payment", "cost", "gain",
                 "noi", "basis", "saved", "interest", "depreciation", "equity", "cash", "proceeds",
                 "balance", "due"}:
        return "money"
    return "number"


def primary_key(d, spec):
    """Which value on a breakdown is THE answer.

    Order: a `total_*` key, then a key named by the result label ("Spread"), then the calculator's own
    name, then the first value whose unit matches the result format. Cap-rate-spread is why the label
    check comes before the name check: `cap_rate` is a substring of the calculator's name but `spread`
    is the answer.
    """
    numeric = [k for k, v in d.items() if isinstance(v, (int, float))]
    for k in numeric:
        if k.startswith("total"):
            return k
    lab = spec["result_label"].lower()
    for k in numeric:
        if k in lab:
            return k
    for k in numeric:
        if k in spec["name"]:
            return k
    for k in numeric:
        if key_kind(k) == spec["result_format"]:
            return k
    return numeric[0] if numeric else list(d)[0]


def kind_for(key, value, result_format):
    """A key's unit, with one fallback: a bare ratio on a percent calculator is a rate."""
    k = key_kind(key)
    if k == "number" and result_format == "percent" and isinstance(value, (int, float)) and 0 < abs(value) <= 1:
        return "percent"
    return k


def fmt(value, kind):
    if value is None:
        return "—"
    if isinstance(value, (int, float)):
        if kind == "bps":
            return "{:,.0f} bps".format(value)
        if kind == "months":
            return "{:.0f} months".format(value)
        if kind == "money":
            return money(value)
        if kind == "percent":
            return pct(value)
        if kind == "multiple":
            return "{:.2f}×".format(value)
        if kind == "years":
            return "{:.1f} years".format(value)
        return "{:,.2f}".format(value).rstrip("0").rstrip(".") if abs(value) < 1000 else "{:,.0f}".format(value)
    if isinstance(value, list):
        return ", ".join(fmt(v, kind) for v in value[:4])
    if isinstance(value, dict):
        return " · ".join("%s %s" % (k.replace("_", " "), fmt(v, kind)) for k, v in list(value.items())[:4])
    return str(value)


def spoken(value, kind):
    """What the narrator says. Percent as 'percent', never the word 'ratio'."""
    if value is None:
        return "no answer with these inputs"
    if isinstance(value, (int, float)):
        if kind == "bps":
            return "{:,.0f} basis points".format(value)
        if kind == "months":
            return "{:.0f} months".format(value)
        if kind == "percent":
            return "{:.1f} percent".format(100 * value)
        if kind == "multiple":
            return "{:.2f} times".format(value)
        if kind == "years":
            return "{:.1f} years".format(value)
        if kind == "money":
            return money(value)
        return "{:,.2f}".format(value)
    if isinstance(value, dict):
        k = list(value)[0]
        return "%s, %s" % (k.replace("_", " "), spoken(value[k], kind))
    return str(value)


def arg_text(spec, values, limit=3):
    """Three of the inputs, the ones a viewer needs to follow the arithmetic."""
    parts = []
    for a in spec["args"]:
        if len(parts) >= limit:
            break
        v = values.get(a["name"])
        if isinstance(v, list) and v and not isinstance(v[0], dict):
            text = ", ".join(str(round(x, 2)) for x in v[:3])
        elif isinstance(v, list):
            text = "%d entries" % len(v)
        elif isinstance(v, (int, float)):
            text = fmt(v, a["type"])
        else:
            continue
        parts.append("%s %s" % (a["label"], text))
    return " · ".join(parts)


def slug_of(name):
    return "calc-" + name.replace("_", "-")


# ---------- manifest -------------------------------------------------------------
SPEECH_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "..", "videos", ".speech-cache.json")


def speech_seconds(text, cache):
    """How long this voice takes to say this line. Cached by content, so a re-run is free."""
    key = hashlib.sha1(("%s|%d|%s" % (VOICE, RATE, text)).encode()).hexdigest()[:16]
    if key in cache:
        return cache[key]
    fd, path = tempfile.mkstemp(suffix=".aiff")
    os.close(fd)
    try:
        subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "-o", path, text], check=True,
                       capture_output=True)
        dur = probe(path) or 0.0
    finally:
        if os.path.exists(path):
            os.unlink(path)
    cache[key] = dur
    return dur


def fit_to_target(scenes, target=29.4):
    """Trim the script until the measured spoken time fits, in order of least loss.

    The frame already carries the formula, the inputs and the URL, so losing those narrations costs
    the viewer nothing. Losing the answer would cost everything: a shorter video that omits its own
    number is not a shorter video, it is a broken one -- so the answer is trimmed last and only of
    its secondary breakdown.
    """
    cache = {}
    if os.path.exists(SPEECH_CACHE_PATH):
        try:
            cache = json.load(open(SPEECH_CACHE_PATH))
        except Exception:
            cache = {}
    tails = 0.35 * len(scenes)
    total = sum(speech_seconds(sc["narration"], cache) for sc in scenes) + tails
    for idx, text in LADDER(scenes):
        if total <= target:
            break
        old = scenes[idx]["narration"]
        if old == text or not text:
            continue
        scenes[idx]["narration"] = text
        total += speech_seconds(text, cache) - speech_seconds(old, cache)
    try:
        json.dump(cache, open(SPEECH_CACHE_PATH, "w"), indent=0, sort_keys=True)
    except Exception:
        pass
    return total


def LADDER(scenes):
    """Candidate replacements, cheapest loss first. Called with the scenes already built."""
    yield 1, "The formula, on screen."
    yield 2, "The inputs, on screen."
    yield 4, "Free, no signup, at lexjolt dot com."
    hook = scenes[0]["narration"]
    yield 0, hook.split(". ")[0] + ". " + hook.split(". ")[1] + "." if hook.count(". ") >= 1 else hook
    ans = scenes[3]["narration"]
    yield 3, ans.split(". Then ")[0] + "."


def manifest(spec, values, result):
    label, group, desc = spec["label"], spec["group"], spec["description"]
    rf = spec["result_format"]
    if isinstance(result, dict):
        pk = primary_key(result, spec)
        rest = [(k, v) for k, v in result.items() if k != pk and isinstance(v, (int, float))][:2]
        shown = fmt(result[pk], kind_for(pk, result[pk], rf))
        said = spoken(result[pk], kind_for(pk, result[pk], rf))
        breakdown = " · ".join("%s %s" % (k.replace("_", " "), fmt(v, kind_for(k, v, rf)))
                               for k, v in [(pk, result[pk])] + rest)
        caption = "%s · %s" % (breakdown, "(%d values)" % len(result))
        said = said + ("" if not rest else ". Then %s." % ", ".join(
            "%s %s" % (k.replace("_", " "), spoken(v, kind_for(k, v, rf))) for k, v in rest))
    else:
        shown, said, caption = fmt(result, rf), spoken(result, rf), "%s: %s" % (
            spec["result_label"], fmt(result, rf))
        breakdown = shown
    inputs = arg_text(spec, values)
    first = (desc.split(". ")[0]).strip().rstrip(".")
    # The clause after the colon is the formula in words ("NOI divided by price"); it is the most
    # useful thing on screen, so it gets its own scene instead of a decorative "run the arithmetic".
    formula = (first.split(":", 1)[1].strip() if ":" in first else first).rstrip(".")
    url = "lexjolt.com/calculators/%s" % spec["name"].replace("_", "-")
    scenes = [
        {"headline": label,
         "sub": group,
         "caption": "%s — %s" % (label, group),
         "narration": "%s. %s. Here it is with real numbers, in under thirty seconds."
                      % (label, first)},
        {"headline": "The formula" if ":" in first else "What it answers",
         "sub": formula[:70],
         "caption": formula[:120],
         "narration": ("The formula: %s." % formula) if ":" in first else "%s." % formula},
        {"headline": "The numbers",
         "sub": inputs.split(" · ")[0] if inputs else label,
         "caption": inputs or label,
         "narration": "Now the numbers. %s." % (
             ", ".join(inputs.split(" · ")) if inputs else "the inputs on the screen")},
        {"headline": shown if len(shown) <= 18 else spec["result_label"],
         "sub": spec["result_label"] if len(shown) <= 18 else breakdown[:70],
         "caption": caption,
         "narration": "%s: %s" % (spec["result_label"], said)},
        {"headline": "Run it on your deal",
         "sub": url,
         "caption": "Free, no signup: %s" % url,
         "narration": "Free, no signup, at %s. Seventy-two calculators, one method."
                      % url.replace(".com/", " dot com slash ").replace("/", " slash ")},
    ]

    # The hook says "in under thirty seconds", so thirty seconds is a claim that has to be measured.
    # Word counts are not a proxy: `say -r 185` is an Apple heuristic and lands nearer 128 wpm on copy
    # with numbers in it, which is how an earlier "30-second" batch shipped 48-second videos. So the
    # script is timed with the same voice that will read it, and trimmed until it fits.
    spoken_total = fit_to_target(scenes)
    return {
        "spoken_seconds": round(spoken_total, 2),
        "slug": slug_of(spec["name"]),
        "handle": HANDLE,
        "voice": VOICE,
        "rate": RATE,
        "size": [1080, 1920],
        "fps": 30,
        "style": STYLE,
        "scenes": scenes,
    }


def write_yaml(path, man):
    def q(s):
        return '"%s"' % str(s).replace('"', "'")

    lines = ["# generated by tools/make_calc_videos.py -- do not edit by hand",
             "slug: %s" % man["slug"],
             "spoken_seconds: %.2f" % man["spoken_seconds"],
             "handle: %s" % q(man["handle"]),
             "voice: %s" % man["voice"],
             "rate: %d" % man["rate"],
             "size: [%d, %d]" % tuple(man["size"]),
             "fps: %d" % man["fps"],
             'style: {bg: "%s", ink: "%s", accent: "%s", dim: "%s"}'
             % (man["style"]["bg"], man["style"]["ink"], man["style"]["accent"], man["style"]["dim"]),
             "", "scenes:"]
    for s in man["scenes"]:
        lines.append("  - headline: %s" % q(s["headline"]))
        if s.get("sub"):
            lines.append("    sub: %s" % q(s["sub"]))
        lines.append("    caption: %s" % q(s["caption"]))
        lines.append("    narration: %s" % q(s["narration"]))
        lines.append("")
    open(path, "w").write("\n".join(lines))


# ---------- main -----------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="re-render even if the mp4 exists")
    a = ap.parse_args()

    mdir = os.path.join(HERE, "videos", "manifests")
    vdir = os.path.join(HERE, "public", "videos")
    os.makedirs(mdir, exist_ok=True)
    os.makedirs(vdir, exist_ok=True)

    # One writer at a time. Two renders running at once interleave their writes into videos.json and
    # leave a directory where the index claims 26s while half the files are 48s -- which is precisely
    # the kind of quiet disagreement this project exists to rule out.
    lock = os.path.join(HERE, "videos", ".render.lock")
    if not acquire_lock(lock):
        print("another render is already writing into %s; refusing to race it" % vdir)
        print("if that is stale, delete %s" % lock)
        return 2
    try:
        return run_all(a, mdir, vdir)
    finally:
        release_lock(lock)


def acquire_lock(path):
    """Take an exclusive lock, honouring a stale one (dead pid, or older than the longest render)."""
    if os.path.exists(path):
        try:
            pid = int(open(path).read().split()[0])
            age = time.time() - os.path.getmtime(path)
        except Exception:
            pid, age = 0, 1e9
        alive = False
        if pid:
            try:
                os.kill(pid, 0)
                alive = True
            except OSError:
                alive = False
        if alive and age < 3600:
            return False
        try:
            os.unlink(path)
        except OSError:
            return False
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    os.write(fd, ("%d %s\n" % (os.getpid(), time.strftime("%Y-%m-%dT%H:%M:%S"))).encode())
    os.close(fd)
    return True


def release_lock(path):
    try:
        os.unlink(path)
    except OSError:
        pass


def run_all(a, mdir, vdir):

    specs = catalogue()
    if a.only:
        want = {s.strip() for s in a.only.split(",")}
        specs = [s for s in specs if s["name"] in want or slug_of(s["name"]) in want]

    jobs = []
    for spec in specs:
        defaults = {arg["name"]: arg["default"] for arg in spec["args"]}
        res = run(spec["name"], defaults)
        if res.get("error"):
            print("  ! %-32s defaults failed: %s" % (spec["name"], res["error"]))
            continue
        man = manifest(spec, res["inputs"], res["result"])
        path = os.path.join(mdir, man["slug"] + ".yaml")
        write_yaml(path, man)
        jobs.append((spec, man, path, res))

    print("manifests: %d written to %s" % (len(jobs), mdir))
    if a.dry_run:
        return 0

    def render(job):
        spec, man, path, res = job
        out = os.path.join(vdir, man["slug"] + ".mp4")
        # The manifest hash is the caching key: re-running after a narration edit must re-render that
        # one video, and re-running after nothing changed must not spend ten minutes of `say` + ffmpeg.
        digest = hashlib.sha1(open(path, "rb").read()).hexdigest()
        stamp = os.path.join(mdir, man["slug"] + ".sha1")
        prev = open(stamp).read().strip() if os.path.exists(stamp) else ""
        if os.path.exists(out) and prev == digest and not a.force:
            return {"status": "cached", "spec": spec, "man": man, "out": out, "res": res}
        try:
            p = subprocess.run([sys.executable, REEL, path, out],
                               capture_output=True, text=True, timeout=900)
        except subprocess.TimeoutExpired:
            return {"status": "timeout", "spec": spec, "man": man, "out": out, "res": res,
                    "err": "assemble_reel exceeded 900s"}
        if p.returncode != 0:
            return {"status": "failed", "spec": spec, "man": man, "out": out, "res": res,
                    "err": (p.stderr or p.stdout)[-300:]}
        open(stamp, "w").write(digest)
        return {"status": "ok", "spec": spec, "man": man, "out": out, "res": res}

    rows, failures = [], []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for r in ex.map(render, jobs):
            spec, man, out = r["spec"], r["man"], r["out"]
            if r["status"] in ("failed", "timeout"):
                failures.append((spec["name"], r["status"], r.get("err", "")))
                print("  x %-32s %s" % (spec["name"], r["status"]))
                continue
            dur = probe(out)
            rows.append({
                "slug": man["slug"],
                "calculator": spec["name"],
                "label": spec["label"],
                "group": spec["group"],
                "title": man["scenes"][0]["headline"],
                "result_label": spec["result_label"],
                "result_display": fmt(r["res"]["result"], spec["result_format"]),
                "duration_s": round(dur, 2) if dur else None,
                "bytes": os.path.getsize(out) if os.path.exists(out) else None,
                "file": "/videos/%s.mp4" % man["slug"],
                "poster_scene": man["scenes"][3]["headline"],
                "transcript": " ".join(s["narration"] for s in man["scenes"]),
            })
            print("  %s %-32s %5.1fs %6.0f KB" % ("~" if r["status"] == "cached" else "+",
                                                  spec["name"], dur or 0, (rows[-1]["bytes"] or 0) / 1024))

    # The index is a claim: "this video is 26 seconds". Check the files against it rather than
    # trusting the values recorded a moment earlier -- a mixed directory from a concurrent render, or
    # a half-written mp4, must fail here and not on the site.
    for r in rows:
        if not r["duration_s"]:
            failures.append((r["calculator"], "unprobeable", r["file"]))
        elif r["duration_s"] > 31.0:
            failures.append((r["calculator"], "over 31s", "%.1fs" % r["duration_s"]))
        elif not (r["bytes"] or 0) > 20_000:
            failures.append((r["calculator"], "suspiciously small", "%d bytes" % (r["bytes"] or 0)))

    rows.sort(key=lambda r: catalog_order().index(r["calculator"]))
    index = os.path.join(HERE, "src", "data", "videos.json")
    json.dump({"videos": rows, "failures": [f[0] for f in failures]}, open(index, "w"), indent=1)
    total = sum(r["bytes"] or 0 for r in rows)
    print("\nrendered %d videos, %.1f MB total, index -> %s" % (len(rows), total / 1e6, index))
    if failures:
        print("FAILED %d:" % len(failures))
        for n, s, e in failures:
            print("  %s (%s): %s" % (n, s, e))
        return 1
    return 0


def catalog_order():
    return [s["name"] for s in catalogue()]


def probe(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", path],
                             capture_output=True, text=True, timeout=30).stdout.strip()
        return float(out)
    except Exception:
        return None


if __name__ == "__main__":
    sys.exit(main())
