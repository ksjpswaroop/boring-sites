/**
 * The niche scorer, in TypeScript, sharing one rule file with the Python scan (src/data/niches.json
 * carries `rules` straight out of data/niche-rules.yaml).
 *
 * `scoreNiche` is a port of `score()` in niche_scan.py -- same scales, same caps, same dropped-term
 * arithmetic. tools/verify_site.mjs replays every measured niche through this function and fails the
 * build if a score or a dimension drifts from the scan, so the visitor-facing scorer cannot grade a
 * niche by a different method than the report that recommended it.
 *
 * Three of the six dimensions are NOT a linear scale over a share; they are exactly `10 * share`
 * (breakout, openness, spread). Only demand and incumbent are log-scaled, and incumbent is inverted.
 * Writing them as one generic scaler would have been shorter and wrong.
 */
import data from '../data/niches.json' with { type: 'json' };
// `with { type: 'json' }` is load-bearing: plain JSON imports throw in Node, and the verify gate
// imports this module directly (Node type stripping) to grade the same scorer the page ships.

export interface NicheRules {
  weights: Record<string, number>;
  scales: {
    demand_log10_views: [number, number];
    breakout_log10_ratio: [number, number];
    openness_share: [number, number];
    spread_inverse_top3: [number, number];
    repeatability: [number, number];
    incumbent_log10_videos: [number, number];
  };
  bands: { strong: number; worth: number };
  policy_caps: Record<string, number>;
  small_channel_subs: number;
  min_on_topic_share: number;
  version: string;
}

export interface NicheMetrics {
  median_views: number;
  small_channel_views_share: number;
  small_channel_share: number;
  top3_view_share: number;
  median_videos: number;
  on_topic_share: number;
  views_per_sub: number;
}

export interface Niche {
  id: string;
  slug: string;
  label: string;
  score: number;
  band: string;
  dims: Record<string, number | null>;
  metrics: NicheMetrics & Record<string, number>;
  caps: Record<string, number | string>;
  policy_risk: string;
  policy_note: string;
  policy_source: string;
  supply: string;
  queries: string[];
  match: string[];
  verdict: string;
  call: string;
  action: string;
}

export const rules = data.rules as unknown as NicheRules;
export const niches = data.niches as unknown as Niche[];
export const source = (data as unknown as { source: string }).source;

export const byId = (id: string): Niche | undefined => niches.find((n) => n.id === id);
export const DIMENSIONS = Object.keys(rules.weights);

export const DIMENSION_LABEL: Record<string, string> = {
  demand: 'Demand',
  breakout: 'Small-channel breakout',
  openness: 'Openness',
  spread: 'Audience spread',
  incumbent: 'Weak incumbents',
  repeatability: 'Repeatability',
};

export const DIMENSION_WHY: Record<string, string> = {
  demand: 'Does the topic get watched at all? Median views, log-scaled: 10K scores 0, 10M scores 10. A niche nobody watches cannot be won.',
  breakout: 'Share of the views in the results that went to channels under 150K subscribers. This is the door — a small channel actually got reach.',
  openness: 'Share of the ranking channels that are small. A topic whose results are all big channels is closed, whatever the view count says.',
  spread: 'One minus the top-three channels’ share of views. Concentration is a moat you do not own.',
  incumbent: 'Depth of the incumbent wall, in videos published. Inverted: 2,000 videos scores 0, ten scores 10.',
  repeatability: 'Can WE make this every week? Our supply, not the market’s — and policy risk caps it.',
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Round half-to-even, the way Python's round() does, so dimension displays match the scan. */
export function pyRound(v: number, digits = 1): number {
  const f = 10 ** digits;
  const x = v * f;
  const floor = Math.floor(x);
  const frac = x - floor;
  const even = floor % 2 === 0;
  const out = Math.abs(frac - 0.5) < 1e-12 ? (even ? floor : floor + 1) : Math.round(x);
  return out / f;
}

/** 0 at `lo`, 10 at `hi`, clamped. */
function scale(v: number, [lo, hi]: [number, number]): number {
  return clamp((v - lo) / (hi - lo)) * 10;
}

/** Lower is better; unmeasured returns null, never 0 and never 10. */
function scaleInverted(v: number, [lo, hi]: [number, number]): number {
  return (1 - clamp((v - lo) / (hi - lo))) * 10;
}

export interface ScoreInput {
  median_views?: number | null;
  small_channel_views_share?: number | null;
  small_channel_share?: number | null;
  top3_view_share?: number | null;
  median_videos?: number | null;
  repeatability?: number | null;
  on_topic_share?: number | null;
  policy_risk: string;
}

export interface ScoreResult {
  score: number;
  band: string;
  dims: Record<string, number | null>;
  caps: Record<string, number | string>;
}

/**
 * Score one niche.
 *
 * An unmeasured dimension drops its term and keeps its weight in the denominator (total weight is
 * always 1.0), so incompleteness costs score instead of paying for it. That matters most for the
 * inverted `incumbent` dimension: a default of "no wall" would hand an unmeasured niche the best
 * possible value on data we never collected.
 */
export function scoreNiche(input: ScoreInput): ScoreResult {
  const sc = rules.scales;
  const dims: Record<string, number | null> = {};
  const caps: Record<string, number | string> = {};

  dims.demand =
    input.median_views === null || input.median_views === undefined || !input.median_views
      ? null
      : scale(Math.log10(input.median_views), sc.demand_log10_views);

  dims.breakout =
    input.small_channel_views_share === null || input.small_channel_views_share === undefined
      ? null
      : 10 * input.small_channel_views_share;

  dims.openness =
    input.small_channel_share === null || input.small_channel_share === undefined
      ? null
      : 10 * input.small_channel_share;

  dims.spread =
    input.top3_view_share === null || input.top3_view_share === undefined
      ? null
      : 10 * (1 - input.top3_view_share);

  dims.incumbent =
    input.median_videos === null || input.median_videos === undefined || !input.median_videos
      ? null
      : scaleInverted(Math.log10(input.median_videos), sc.incumbent_log10_videos);

  if (input.repeatability !== null && input.repeatability !== undefined) {
    const cap = rules.policy_caps[input.policy_risk] ?? 10;
    dims.repeatability = Math.min(input.repeatability, cap);
    if (input.repeatability > cap) {
      caps.repeatability = `policy_risk=${input.policy_risk} caps ${input.repeatability} -> ${cap}`;
    }
  } else {
    dims.repeatability = null;
  }

  if (
    input.on_topic_share !== null &&
    input.on_topic_share !== undefined &&
    input.on_topic_share < rules.min_on_topic_share
  ) {
    caps.on_topic = `on-topic share ${input.on_topic_share.toFixed(2)} < ${rules.min_on_topic_share} -> query mismatch, demand not trusted`;
  }

  let composite = 0;
  for (const [k, w] of Object.entries(rules.weights)) {
    const d = dims[k];
    if (d === null || d === undefined) continue;
    composite += w * d;
  }

  // Python rounds half-to-even, JS rounds half-up: at exactly 3.25 those disagree (3.2 vs 3.3), and
  // the disagreement shows up in the parity replay. Round the way the scan did.
  const rounded = (v: number) => pyRound(v, 1);
  return {
    score: Math.round(composite * 100) / 100,
    band: composite >= rules.bands.strong ? 'strong' : composite >= rules.bands.worth ? 'worth testing' : 'thin',
    dims: Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v === null ? null : rounded(v)])),
    caps,
  };
}

export function scoreOf(n: Niche): ScoreResult {
  return scoreNiche({
    median_views: n.metrics.median_views,
    small_channel_views_share: n.metrics.small_channel_views_share,
    small_channel_share: n.metrics.small_channel_share,
    top3_view_share: n.metrics.top3_view_share,
    median_videos: n.metrics.median_videos,
    repeatability: n.dims.repeatability,
    on_topic_share: n.metrics.on_topic_share,
    policy_risk: n.policy_risk,
  });
}

export function bandClass(band: string): string {
  if (band === 'strong') return 'good';
  if (band === 'worth testing') return '';
  return 'bad';
}

export function bandLabel(band: string): string {
  return band === 'strong' ? 'Strong' : band === 'worth testing' ? 'Worth testing' : 'Thin';
}
