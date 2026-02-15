import { IncomeTier, HEARItem, ProjectCosts } from "@/types";

// HEAR item caps (fixed by Georgia program)
export const HEAR_CAPS: Record<string, number> = {
  "Heat Pump (HVAC)": 8000,
  "Heat Pump Water Heater": 1750,
  "Electric Stove/Cooktop/Range/Oven": 840,
  "Heat Pump Clothes Dryer": 840,
  "Electrical Panel Upgrade": 4000,
  "Electric Wiring": 2500,
  "Insulation/Air Sealing/Ventilation": 1600,
};

export const HEAR_ITEMS = Object.keys(HEAR_CAPS);

/**
 * Calculate HER rebate based on energy savings, income, and project cost
 */
export function calculateHER(
  savingsPercent: number,
  incomeTier: IncomeTier,
  projectCost: number
): { amount: number; tier: string } {
  if (savingsPercent < 20) {
    return { amount: 0, tier: "ineligible" };
  }

  let coverage = 0;
  let cap = 0;
  let tier = "";

  if (incomeTier === "below_80") {
    coverage = 0.98;
    if (savingsPercent >= 35) {
      cap = 16000;
      tier = "$16k";
    } else {
      cap = 10000;
      tier = "$10k";
    }
  } else {
    coverage = 0.5;
    if (savingsPercent >= 35) {
      cap = 4000;
      tier = "$4k";
    } else {
      cap = 2000;
      tier = "$2k";
    }
  }

  const calculated = projectCost * coverage;
  const amount = Math.min(calculated, cap);

  return { amount: Math.round(amount), tier };
}

/**
 * Calculate HEAR rebate for individual items
 */
export function calculateHEAR(
  items: { name: string; cost: number }[],
  incomeTier: IncomeTier
): { items: HEARItem[]; total: number } {
  const coverage = incomeTier === "below_80" ? 1.0 : 0.5;

  const hearItems: HEARItem[] = items.map((item) => {
    const maxRebate = HEAR_CAPS[item.name] || 0;
    const rebateAmount = Math.min(item.cost * coverage, maxRebate);

    return {
      id: crypto.randomUUID(),
      name: item.name,
      cost: item.cost,
      maxRebate,
      rebateAmount: Math.round(rebateAmount),
    };
  });

  const total = hearItems.reduce((sum, item) => sum + item.rebateAmount, 0);
  const cappedTotal = Math.min(total, 14000);

  return { items: hearItems, total: cappedTotal };
}

/**
 * Calculate total project cost
 */
export function calculateProjectCost(costs: Partial<ProjectCosts>): number {
  return (
    (costs.materials || 0) +
    (costs.labor || 0) +
    (costs.assessmentFee || 0) +
    (costs.overhead || 0) +
    (costs.other || 0)
  );
}

/**
 * Calculate energy savings percent
 */
export function calculateSavings(baselineKWh: number, projectedKWh: number): number {
  if (baselineKWh === 0) return 0;
  return Math.round(((baselineKWh - projectedKWh) / baselineKWh) * 100);
}

/**
 * Calculate profit margin
 */
export function calculateProfit(rebateAmount: number, projectCost: number) {
  const profit = rebateAmount - projectCost;
  const margin = rebateAmount > 0 ? (profit / rebateAmount) * 100 : 0;

  return {
    netProfit: Math.round(profit),
    profitMargin: Math.round(margin * 10) / 10,
  };
}
