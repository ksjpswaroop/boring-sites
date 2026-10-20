/**
 * The idea generator. Every idea is derived from a calculator's own arithmetic or a niche's own
 * measurements -- no idea exists here that cannot name its source, its number, and the page that
 * proves it. That is the whole point: an idea list built from adjectives is a list of guesses.
 *
 * Three families:
 *   calc    two ideas per calculator: the worked number, and the mistake in the inputs
 *   niche   three ideas per measured niche: the number nobody checks, the teardown, the gap
 *   cross   one idea per top-niche x top-calculator pair: the same number, in someone's language
 */
// Explicit .ts paths: the ship gate imports this module under plain Node (no bundler).
import { catalog, runCalc, byName } from './cre/index.ts';
import { niches } from './niches.ts';
import { formatValue } from './format.ts';

export interface Idea {
  id: string;
  title: string;
  hook: string;
  format: string;
  family: 'calc' | 'niche' | 'cross';
  calc?: string;
  niche?: string;
  group?: string;
  why: string;
  duration: string;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const FORMAT_NUMBER = '30s vertical · screen + voice';
const FORMAT_MISTAKE = '45s vertical · one input, one consequence';
const FORMAT_TEARDOWN = '90s vertical · board screenshot + voice';
const FORMAT_CROSS = '30s vertical · the same number, said twice';

/** The default answer, formatted, for the ideas that quote it. */
function answerOf(name: string): { display: string; label: string } | null {
  const spec = byName[name];
  if (!spec) return null;
  const r = runCalc(name, {});
  if (r.error) return null;
  return { display: formatValue(r.result, spec.result_format), label: spec.result_label };
}

const calcIdeas: Idea[] = [];
for (const spec of catalog.calculators) {
  const ans = answerOf(spec.name);
  const group = spec.group;
  const firstSentence = spec.description.split('. ')[0].replace(/\.$/, '');

  calcIdeas.push({
    id: slug(`calc-number-${spec.name}`),
    title: `${spec.label}: ${ans ? ans.display : 'the number'} on a real deal`,
    hook: ans
      ? `“${ans.label} is ${ans.display}.” Then show the three inputs that produced it — no commentary until the number is on screen.`
      : `Open on the ${spec.label.toLowerCase()} screen, type the inputs, let the answer land.`,
    format: FORMAT_NUMBER,
    family: 'calc',
    calc: spec.name,
    group,
    why: `${firstSentence}. The calculator is live and the default answer is the same number the video claims.`,
    duration: '30s',
  });

  calcIdeas.push({
    id: slug(`calc-input-${spec.name}`),
    title: `The input that quietly breaks ${spec.label.toLowerCase()}`,
    hook: `“Same deal, two answers. The difference is one field — and it is not the one you think.”`,
    format: FORMAT_MISTAKE,
    family: 'calc',
    calc: spec.name,
    group,
    why: `${spec.label} depends on every argument being in the same units. A percent typed as a whole number moves the answer by two orders of magnitude, and the calculator will happily show it.`,
    duration: '45s',
  });
}

const nicheIdeas: Idea[] = [];
for (const n of niches) {
  const pct = (v: number) => `${(100 * v).toFixed(0)}%`;
  nicheIdeas.push({
    id: slug(`niche-attention-${n.id}`),
    title: `${pct(n.metrics.small_channel_views_share)} of the attention in “${n.label}” goes to small channels`,
    hook: `“Everyone quotes the view count. Nobody quotes who is getting the views.” Put ${pct(
      n.metrics.small_channel_views_share
    )} on screen next to ${Math.round(n.metrics.median_views).toLocaleString('en-US')} median views.`,
    format: FORMAT_TEARDOWN,
    family: 'niche',
    niche: n.slug,
    why: `Measured from the top ${n.metrics.n_on_topic} on-topic results: ${pct(
      n.metrics.small_channel_views_share
    )} of views went to channels under 150,000 subscribers, while the top three channels took ${pct(
      n.metrics.top3_view_share
    )}.`,
    duration: '90s',
  });
  nicheIdeas.push({
    id: slug(`niche-teardown-${n.id}`),
    title: `${n.label} scored ${n.score.toFixed(1)}/10 — here is the arithmetic`,
    hook: `“This niche is a ${n.band} at ${n.score.toFixed(
      2
    )}. Six numbers, ten seconds each, and you can argue with every one.”`,
    format: FORMAT_TEARDOWN,
    family: 'niche',
    niche: n.slug,
    why: `The score is public arithmetic: weighted dimensions with published scales. Showing the method is the content; the conclusion is the hook.`,
    duration: '90s',
  });
  nicheIdeas.push({
    id: slug(`niche-gap-${n.id}`),
    title: `The gap in ${n.label.toLowerCase()}: ${Math.round(
      n.metrics.median_videos
    ).toLocaleString('en-US')} videos deep`,
    hook: `“The median channel here has published ${Math.round(
      n.metrics.median_videos
    ).toLocaleString('en-US')} videos. That is the wall — and walls have doors.”`,
    format: FORMAT_TEARDOWN,
    family: 'niche',
    niche: n.slug,
    why: `Incumbent depth is the most ignored number in niche research and the one that decides whether weekly output can compete. Measured median: ${Math.round(
      n.metrics.median_videos
    ).toLocaleString('en-US')} videos.`,
    duration: '90s',
  });
}

const topNiches = [...niches].sort((a, b) => b.score - a.score).slice(0, 3);
// The five valuation calculators, by catalogue order rather than a hard-coded name list: a renamed
// calculator should silently drop out of the cross set, not silently produce a broken idea.
const mathCalcs = catalog.calculators.filter((c) => c.group === 'Valuation').slice(0, 5);
const crossIdeas: Idea[] = [];
for (const n of topNiches) {
  for (const spec of mathCalcs) {
    const ans = answerOf(spec.name);
    if (!ans) continue;
    crossIdeas.push({
      id: slug(`cross-${n.id}-${spec.name}`),
      title: `${n.label}: what ${spec.label.toLowerCase()} actually says (${ans.display})`,
      hook: `“If you ${spec.label.toLowerCase()} this deal you get ${ans.display}. Here is why that number is not the answer you think.”`,
      format: FORMAT_CROSS,
      family: 'cross',
      calc: spec.name,
      niche: n.slug,
      group: spec.group,
      why: `The niche scored ${n.score.toFixed(
        2
      )} and the calculator already exists, so the video is a screen recording plus a voice — the cheapest possible post.`,
      duration: '30s',
    });
  }
}

export const ideas: Idea[] = [...calcIdeas, ...nicheIdeas, ...crossIdeas];

export const groups = catalog.groups;
export const nicheOptions = niches.map((n) => ({ slug: n.slug, label: n.label }));

export function ideaUrl(i: Idea): string {
  if (i.calc) return `/calculators/${i.calc.replace(/_/g, '-')}`;
  if (i.niche) return `/niches/${i.niche}`;
  return '/ideas';
}
