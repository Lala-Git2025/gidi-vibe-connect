// Anthropic API token-cost calculator.
//
// Prices per 1M tokens (USD), as of 2026-06-08.
// Source: platform.claude.com/docs — update when re-pricing.

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type Pricing = {
  input: number;
  output: number;
  cache_write: number; // 1.25x input
  cache_read: number;  // 0.10x input
};

const PRICING: Record<string, Pricing> = {
  'claude-opus-4-7':   { input: 5.00, output: 25.00, cache_write: 6.25,  cache_read: 0.50 },
  'claude-opus-4-6':   { input: 5.00, output: 25.00, cache_write: 6.25,  cache_read: 0.50 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00, cache_write: 3.75,  cache_read: 0.30 },
  'claude-haiku-4-5':  { input: 1.00, output:  5.00, cache_write: 1.25,  cache_read: 0.10 },
};

export function calcCostUsd(model: string, usage: Usage): number {
  const price = PRICING[model];
  if (!price) return 0; // unknown model — don't crash, just don't bill
  const perMillion = (tokens: number, rate: number) => (tokens * rate) / 1_000_000;
  return (
    perMillion(usage.input_tokens ?? 0, price.input) +
    perMillion(usage.output_tokens ?? 0, price.output) +
    perMillion(usage.cache_creation_input_tokens ?? 0, price.cache_write) +
    perMillion(usage.cache_read_input_tokens ?? 0, price.cache_read)
  );
}
