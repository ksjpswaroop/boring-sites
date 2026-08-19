/**
 * URL state for calculators.
 * Inputs are encoded in the query string so a result can be shared by URL.
 * The form restores its state from the URL on page load.
 */

export type CalcInputs = Record<string, string | number>;

export function encodeState(inputs: CalcInputs): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(inputs)) {
    if (value === '' || value === null || value === undefined) continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

export function decodeState(search: string): CalcInputs {
  const params = new URLSearchParams(search);
  const result: CalcInputs = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export function shareUrl(slug: string, inputs: CalcInputs): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin + `/calc/${slug}`;
  return base + encodeState(inputs);
}
