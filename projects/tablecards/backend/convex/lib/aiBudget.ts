// Fixed FLUX.2 [klein] 4B, four 1344 × 768 outputs and one bounded reference.
// Rounded up from $0.007124/batch; recheck pricing if model/geometry changes.
export const AI_BATCH_BUDGET_MICRO_USD = 7_200;
// Bound the indexed admission read; larger budgets need a different counter.
const MAX_DAILY_BATCH_STARTS = 1_000;

export function dailyAiBatchLimit(
  budgetUsd = process.env.TABLECARDS_AI_DAILY_BUDGET_USD,
): number {
  const value = budgetUsd?.trim();
  // No implicit production spend: missing/invalid configuration disables starts.
  if (!value || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u.test(value)) return 0;
  const budgetMicroUsd = Math.round(Number(value) * 1_000_000);
  if (
    !Number.isSafeInteger(budgetMicroUsd) ||
    budgetMicroUsd > MAX_DAILY_BATCH_STARTS * AI_BATCH_BUDGET_MICRO_USD
  )
    return 0;
  return Math.floor(budgetMicroUsd / AI_BATCH_BUDGET_MICRO_USD);
}
