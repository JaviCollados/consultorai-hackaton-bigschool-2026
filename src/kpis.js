import {monthlyFactor, monthlyHours} from './model.js';

const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const percent = value => valid(value) && value <= 100;

export function calculateProcessScenario(process, workingDaysPerWeek, scenario) {
  if (!scenario || !valid(process.volume) || !valid(process.minutes) || !percent(scenario.adoptionPct) ||
      !percent(scenario.timeReductionPct) || !valid(scenario.reviewMinutes)) return null;
  const factor = monthlyFactor(process.period, workingDaysPerWeek);
  if (!Number.isFinite(factor)) return null;
  const monthlyUnits = process.volume * factor;
  const currentHours = monthlyUnits * process.minutes / 60;
  const adoptedUnits = monthlyUnits * scenario.adoptionPct / 100;
  const scenarioHours = currentHours - adoptedUnits * process.minutes * scenario.timeReductionPct / 100 / 60
    + adoptedUnits * scenario.reviewMinutes / 60;
  return {
    monthlyUnits, currentHours, scenarioHours, freedHours: currentHours - scenarioHours,
    productivityPct: scenarioHours > 0 ? (currentHours / scenarioHours - 1) * 100 : null,
  };
}

export function summarizeWorkScenarios(caseData, scenariosMap) {
  const values = caseData.processes.map(process => calculateProcessScenario(
    process, caseData.workingDaysPerWeek,
    scenariosMap instanceof Map ? scenariosMap.get(process.id) : scenariosMap?.[process.id],
  )).filter(Boolean);
  const currentHours = values.reduce((sum, value) => sum + value.currentHours, 0);
  const scenarioHours = values.reduce((sum, value) => sum + value.scenarioHours, 0);
  const totalDescribedHours = monthlyHours(caseData);
  return {
    processCount: values.length, currentHours, scenarioHours,
    freedHours: currentHours - scenarioHours, totalDescribedHours,
    coveragePct: totalDescribedHours > 0 ? currentHours / totalDescribedHours * 100 : null,
    productivityPct: scenarioHours > 0 ? (currentHours / scenarioHours - 1) * 100 : null,
  };
}

export function calculateSalesScenario({demand, capacity, unitPrice, period, grossMarginPct = null}, workingDaysPerWeek = 5) {
  if (![demand, capacity, unitPrice].every(valid) || (grossMarginPct !== null && !percent(grossMarginPct))) return null;
  const factor = monthlyFactor(period, workingDaysPerWeek);
  if (!Number.isFinite(factor)) return null;
  const extraUnitsMonthly = Math.min(demand, capacity) * factor;
  const extraRevenueMonthly = extraUnitsMonthly * unitPrice;
  return {extraUnitsMonthly, extraRevenueMonthly,
    extraMarginMonthly: grossMarginPct === null ? null : extraRevenueMonthly * grossMarginPct / 100};
}

export function calculateValueScenario({eligibleUnits, period, baselineCoveragePct, targetCoveragePct, valuePerImprovedUnit = null}, workingDaysPerWeek = 5) {
  if (!valid(eligibleUnits) || !percent(baselineCoveragePct) || !percent(targetCoveragePct) ||
      (valuePerImprovedUnit !== null && !valid(valuePerImprovedUnit))) return null;
  const factor = monthlyFactor(period, workingDaysPerWeek);
  if (!Number.isFinite(factor)) return null;
  const coverageDeltaPoints = targetCoveragePct - baselineCoveragePct;
  const extraEnhancedUnitsMonthly = eligibleUnits * factor * coverageDeltaPoints / 100;
  return {coverageDeltaPoints, extraEnhancedUnitsMonthly,
    potentialValueMonthly: valuePerImprovedUnit === null ? null : extraEnhancedUnitsMonthly * valuePerImprovedUnit};
}
