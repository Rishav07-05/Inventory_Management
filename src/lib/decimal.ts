import Decimal from "decimal.js";

// Set precision and rounding strategy for chemical and financial operations
Decimal.set({
  precision: 38,
  rounding: Decimal.ROUND_HALF_UP,
});

export { Decimal };
