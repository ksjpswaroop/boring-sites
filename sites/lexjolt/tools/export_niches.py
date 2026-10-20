#!/usr/bin/env python3
"""Export the measured niche scan into the site's data file.

Two sources, and the site needs both:
  ~/projects/1019-faceless-network/data/niche-scan.json   the measurements (per niche, per dimension)
  ~/projects/1019-faceless-network/data/niches.yaml       the editorial half (queries, supply, policy)

The scoring rules travel with the data, because the site's interactive scorer must apply the same
weights, scales, caps and bands as the scan -- if they diverged, a visitor scoring their own niche
would be graded by a different method than the one the report used.

    python3 tools/export_niches.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser("~/projects/1019-faceless-network/data")
OUT = os.path.join(HERE, "src", "data", "niches.json")

sys.path.insert(0, os.path.expanduser("~/projects/1019-faceless-network"))
import yaml  # noqa: E402

# The authored half of each analysis: a judgement, never a number. Every figure on the page is
# injected from the scan by read_text(), so an author cannot silently disagree with the measurement
# -- which is exactly the failure mode of a hand-written report that gets edited after the data moved.
CALLS = {
    "contractor": ("The best door in the set. Trades content is made by tradespeople with cameras, "
                   "not by studios -- but the wall is ours, not the market's: no estimating dataset "
                   "on the shelf yet, so weekly output starts with building one."),
    "cre-math": ("The only niche where the supply already exists. Every reel transcribes from a "
                 "calculator we ship, and the door is as open as the trades. Policy is the one tax "
                 "on it, and a cited number is how you pay it."),
    "msp-it": ("Real demand and a genuinely open door, but a hard ceiling: the top three channels "
               "take most of the views. A good second channel, a hard first one."),
    "multifamily": ("The obvious niche, which is the problem. Content here competes with brands that "
                    "post daily and have done for years, and the incumbent wall is the deepest measured."),
    "fractional-cfo": ("Enterable in principle, small in practice. The attention share is fine; the "
                       "market underneath it is thin."),
    "job-search": ("Huge audience, closed door. The term belongs to career brands with teams, and "
                   "small channels are not where the views are."),
    "medical-billing": ("A specialist niche with real numbers and moderate openness, held back by "
                        "policy: billing advice is regulated, and a wrong post is a liability rather "
                        "than a bad video."),
    "stick-figure": ("The trap in its purest form: the biggest view count in the set is the "
                     "incumbent's, not the niche's, and almost none of the attention reaches a small "
                     "channel."),
    "personal-finance": ("Big audience, no door, and the highest policy exposure measured. The worst "
                         "combination available."),
    "ai-tools": ("The most closed niche in the scan. Every result is a funded channel with a content "
                 "team, and the attention share says so."),
}


ACTIONS = {
    "contractor": "Post one estimating rule per week, filmed as a screen recording of the sheet. Kill line: five posts, none past 1,000 views.",
    "cre-math": "One calculator per reel, narrated over the actual number. This is the channel the existing engine already feeds.",
    "msp-it": "Angle on pricing and margin, not tooling — tooling is where the incumbents are strongest.",
    "multifamily": "Only worth entering with a data angle the incumbents do not have (per-metro numbers, not opinions).",
    "fractional-cfo": "Test with three posts on one narrow question (pricing a retainer) before committing.",
    "job-search": "Skip as a first channel; the attention is not available at small scale.",
    "medical-billing": "Only with a compliance reviewer. Otherwise the policy cap is doing you a favour.",
    "stick-figure": "Skip. Competing here means competing with a 13M-subscriber catalog.",
    "personal-finance": "Skip as a first channel: closed attention plus maximum policy risk.",
    "ai-tools": "Skip. 3% attention share is the clearest closed-door signal in the scan.",
}


def read_text(r):
    """The measured half of the analysis, with every number injected from the scan."""
    m = r["metrics"]
    pct = lambda v: "%.0f%%" % (100 * v)
    views = "{:,}".format(int(m["median_views"]))
    vids = "{:,}".format(int(m["median_videos"]))
    supply = r["caps"].get("repeatability")
    cap_note = ("capped at %s by policy" % supply) if supply is not None else "uncapped"
    return (
        "%s, score %.2f of 10. The median video in the top %d results has %s views; %s of those views "
        "go to channels under %s subscribers, and %s of the channels are that small. The top three "
        "channels take %s of the views, and the median incumbent has published %s videos. Content "
        "supply scores %s/10 (%s); policy risk is %s."
        % (r["band"].replace("worth testing", "Worth testing").capitalize(), r["score"], m["n_on_topic"],
           views, pct(m["small_channel_views_share"]), "{:,}".format(150_000),
           pct(m["small_channel_share"]), pct(m["top3_view_share"]), vids,
           ("%.0f" % r["dims"]["repeatability"]), cap_note, r["policy_risk"])
    )


def main():
    scan = json.load(open(os.path.join(SRC, "niche-scan.json")))
    rules = yaml.safe_load(open(os.path.join(SRC, "niche-rules.yaml")))
    meta = {n["id"]: n for n in yaml.safe_load(open(os.path.join(SRC, "niches.yaml")))["niches"]}

    out, missing = [], []
    for r in scan["results"]:
        nid = r["id"]
        if nid not in CALLS:
            missing.append(nid)
            continue
        m = meta.get(nid, {})
        out.append({
            "id": nid,
            "slug": nid,
            "label": r["label"],
            "score": r["score"],
            "band": r["band"],
            "dims": r["dims"],
            "metrics": r["metrics"],
            "caps": r["caps"],
            "policy_risk": r["policy_risk"],
            "policy_note": r["policy_note"],
            "policy_source": r["policy_source"],
            "supply": r["supply"],
            "queries": r["queries"],
            "match": m.get("match", []),
            "verdict": read_text(r),
            "call": CALLS[nid],
            "action": ACTIONS.get(nid, ""),
        })
    if missing:
        print("REFUSING to export: no verdict for %s" % ", ".join(missing))
        return 1

    out.sort(key=lambda x: -x["score"])
    payload = {
        "rules": {
            "weights": rules["weights"],
            "scales": rules["scales"],
            "bands": rules["bands"],
            "policy_caps": rules["policy_caps"],
            "small_channel_subs": rules["small_channel_subs"],
            "min_on_topic_share": rules["min_on_topic_share"],
            "version": rules["version"],
        },
        "source": "niche_scan.py v%s, 20 results per query phrase, channel data cached" % rules["version"],
        "niches": out,
    }
    json.dump(payload, open(OUT, "w"), indent=1)
    print("wrote %d niches -> %s" % (len(out), OUT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
