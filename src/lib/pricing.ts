import { Decimal } from "./decimal";
import { convertUnits, convertToBase, getConversionBreakdown } from "./conversions";

interface CalculatePriceParams {
  quantity: Decimal | string | number;
  enteredUnit: string;
  baseUnit: string;
  pricePerBaseUnit: Decimal | string | number;
  density?: Decimal | string | number | null;
}

export interface PricingBreakdown {
  enteredQuantity: Decimal;
  enteredUnit: string;
  baseQuantity: Decimal;
  baseUnit: string;
  pricePerBaseUnit: Decimal;
  totalPrice: Decimal;
  conversionBreakdown?: {
    formula: string;
    steps: string[];
  };
}

export function calculatePricing({
  quantity,
  enteredUnit,
  baseUnit,
  pricePerBaseUnit,
  density,
}: CalculatePriceParams): PricingBreakdown {
  const enteredQty = new Decimal(quantity);
  const rate = new Decimal(pricePerBaseUnit);

  let baseQty: Decimal;
  let steps: string[] | undefined;
  let formula: string | undefined;

  // If entered unit matches base unit, no conversion needed
  if (enteredUnit === baseUnit) {
    baseQty = enteredQty;
  } else {
    // Convert from entered unit to base unit
    baseQty = convertUnits({ quantity: enteredQty, fromUnit: enteredUnit, toUnit: baseUnit, density });
    
    // Get breakdown details
    const details = getConversionBreakdown({
      quantity: enteredQty,
      fromUnit: enteredUnit,
      toUnit: baseUnit,
      density,
    });
    steps = details.steps;
    formula = details.formula;
  }

  const totalPrice = baseQty.mul(rate);

  return {
    enteredQuantity: enteredQty,
    enteredUnit,
    baseQuantity: baseQty,
    baseUnit,
    pricePerBaseUnit: rate,
    totalPrice,
    conversionBreakdown: steps ? { formula: formula || "", steps } : undefined,
  };
}
