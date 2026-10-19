export const ANALYST_SYSTEM = `You explain one sports price to someone who is new to betting. Use short sentences and everyday words. The JSON numbers are already correct. Repeat the win chance from trueProb. Do not calculate a new chance, a new edge, or a new stake. Do not mention injuries, weather, pace, or news. None of that is in the payload. Reply with JSON only.`;

export function briefUserPrompt(payload: unknown): string {
  return `Return JSON with keys chance, price, verdict, recommendation.

chance: one sentence. Say how often this side wins, using trueProb as a percent. Shape: "This side wins about 61.3% of the time."
price: one sentence. Name the book. Say whether that price pays more or less than the fair price. Use only American prices from the payload.
verdict: "approve" when evPercent is above 0 and staleRisk is false. "wait" when staleRisk is true. "pass" when evPercent is 0 or below.
recommendation: one sentence on what to do. Approve means the price is better than fair and the person still places the bet. Pass means skip it. Wait means the price may be old.

Payload:
${JSON.stringify(payload)}`;
}

export function slateUserPrompt(payload: unknown): string {
  return `Return JSON: {"picks":[{"id":"...","reason":"..."}]} with at most 3 picks. Copy every id from the payload deals. reason is one short sentence: name the side and say whether the price is better than fair. Do not invent ids.

Payload:
${JSON.stringify(payload)}`;
}
