import { Decimal } from "./decimal";

export const SUPPORTED_UNITS = {
  WEIGHT: ["g", "kg"],
  VOLUME: ["mL", "L"],
  COUNT: ["item"],
} as const;

export type UnitType = "g" | "kg" | "mL" | "L" | "item";

export function getDimensionType(unit: string): "WEIGHT" | "VOLUME" | "COUNT" {
  if (SUPPORTED_UNITS.WEIGHT.includes(unit as any)) return "WEIGHT";
  if (SUPPORTED_UNITS.VOLUME.includes(unit as any)) return "VOLUME";
  if (SUPPORTED_UNITS.COUNT.includes(unit as any)) return "COUNT";
  throw new Error(`Unsupported unit: ${unit}`);
}

// Convert a user-entered quantity to the internal base unit (g, mL, item)
export function convertToBase(quantity: Decimal | string | number, unit: string): Decimal {
  const q = new Decimal(quantity);
  switch (unit) {
    case "g":
    case "mL":
    case "item":
      return q;
    case "kg":
      return q.mul(1000); // 1 kg = 1000 g
    case "L":
      return q.mul(1000); // 1 L = 1000 mL
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

// Convert an internal base unit quantity to a user-friendly unit (g, kg, mL, L, item)
export function convertFromBase(quantityInBase: Decimal | string | number, unit: string): Decimal {
  const q = new Decimal(quantityInBase);
  switch (unit) {
    case "g":
    case "mL":
    case "item":
      return q;
    case "kg":
      return q.div(1000); // 1 kg = 1000 g
    case "L":
      return q.div(1000); // 1 L = 1000 mL
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

interface ConvertParams {
  quantity: Decimal | string | number;
  fromUnit: string;
  toUnit: string;
  density?: Decimal | string | number | null;
}

// Full cross-dimensional or same-dimension unit conversion utility
export function convertUnits({ quantity, fromUnit, toUnit, density }: ConvertParams): Decimal {
  const fromDim = getDimensionType(fromUnit);
  const toDim = getDimensionType(toUnit);

  const q = new Decimal(quantity);

  // 1. Same dimension conversion
  if (fromDim === toDim) {
    const baseQuantity = convertToBase(q, fromUnit);
    return convertFromBase(baseQuantity, toUnit);
  }

  // 2. Count conversions are isolated
  if (fromDim === "COUNT" || toDim === "COUNT") {
    throw new Error("Count units cannot be converted to weight or volume dimensions.");
  }

  // 3. Weight <-> Volume conversions require density
  if (density === undefined || density === null) {
    throw new Error(`Conversion from ${fromUnit} (${fromDim}) to ${toUnit} (${toDim}) requires density.`);
  }

  const d = new Decimal(density);
  if (d.lessThanOrEqualTo(0) || d.greaterThan(100)) {
    throw new Error(`Invalid density value: ${d.toString()}. Density must be between 0 and 100 g/mL.`);
  }

  if (fromDim === "WEIGHT" && toDim === "VOLUME") {
    // Weight (g) -> Volume (mL)
    // volume (mL) = mass (g) / density (g/mL)
    const massG = convertToBase(q, fromUnit);
    const volumeMl = massG.div(d);
    return convertFromBase(volumeMl, toUnit);
  } else if (fromDim === "VOLUME" && toDim === "WEIGHT") {
    // Volume (mL) -> Weight (g)
    // mass (g) = density (g/mL) * volume (mL)
    const volumeMl = convertToBase(q, fromUnit);
    const massG = volumeMl.mul(d);
    return convertFromBase(massG, toUnit);
  }

  throw new Error(`Unhandled conversion from ${fromUnit} to ${toUnit}`);
}

// Generate human readable step-by-step breakdown of conversion
export function getConversionBreakdown({ quantity, fromUnit, toUnit, density }: ConvertParams): {
  formula: string;
  steps: string[];
  result: Decimal;
} {
  const result = convertUnits({ quantity, fromUnit, toUnit, density });
  const fromDim = getDimensionType(fromUnit);
  const toDim = getDimensionType(toUnit);
  const q = new Decimal(quantity);
  const steps: string[] = [];
  let formula = "";

  if (fromDim === toDim) {
    formula = `Same dimension conversion (${fromDim})`;
    if (fromUnit !== toUnit) {
      const base = convertToBase(q, fromUnit);
      const baseUnit = fromDim === "WEIGHT" ? "g" : "mL";
      steps.push(`Convert input ${q.toString()} ${fromUnit} to base unit: ${base.toString()} ${baseUnit}`);
      steps.push(`Convert base unit to target unit: ${result.toString()} ${toUnit}`);
    } else {
      steps.push("No conversion required; units match.");
    }
  } else {
    const d = new Decimal(density!);
    formula = fromDim === "WEIGHT" 
      ? "Volume (mL) = Mass (g) / Density (g/mL)" 
      : "Mass (g) = Density (g/mL) * Volume (mL)";

    const baseIn = convertToBase(q, fromUnit);
    const baseInUnit = fromDim === "WEIGHT" ? "g" : "mL";
    const baseOutUnit = toDim === "WEIGHT" ? "g" : "mL";

    steps.push(`Convert input ${q.toString()} ${fromUnit} to base unit: ${baseIn.toString()} ${baseInUnit}`);
    
    if (fromDim === "WEIGHT") {
      const baseOut = baseIn.div(d);
      steps.push(`Apply density formula: ${baseIn.toString()} g / ${d.toString()} g/mL = ${baseOut.toString()} mL`);
      steps.push(`Convert base unit mL to target unit: ${result.toString()} ${toUnit}`);
    } else {
      const baseOut = baseIn.mul(d);
      steps.push(`Apply density formula: ${d.toString()} g/mL * ${baseIn.toString()} mL = ${baseOut.toString()} g`);
      steps.push(`Convert base unit g to target unit: ${result.toString()} ${toUnit}`);
    }
  }

  return { formula, steps, result };
}
