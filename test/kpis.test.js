import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState, monthlyHours} from '../src/model.js';
import {calculateProcessScenario, summarizeWorkScenarios, calculateSalesScenario, calculateValueScenario} from '../src/kpis.js';

test('adopción parcial y revisión humana determinan el tiempo neto', () => {
  const gestoria = createInitialState().cases[0];
  const consultations = gestoria.processes[0];
  const result = calculateProcessScenario(consultations, gestoria.workingDaysPerWeek, {
    adoptionPct: 50, timeReductionPct: 50, reviewMinutes: 1,
  });
  assert.equal(result.currentHours, 260);
  assert.ok(Math.abs(result.scenarioHours - 216.6666666667) < 0.001);
  assert.ok(Math.abs(result.freedHours - 43.3333333333) < 0.001);
  assert.ok(Math.abs(result.productivityPct - 20) < 0.001);
});

test('la recepción documental al 80 por ciento en ambos supuestos libera 10,8 horas mensuales', () => {
  const gestoria = createInitialState().cases[0];
  const documents = gestoria.processes.find(item => item.name === 'Recepción y archivo de documentos');
  const result = calculateProcessScenario(documents, gestoria.workingDaysPerWeek, {
    adoptionPct: 80, timeReductionPct: 80, reviewMinutes: 1,
  });
  assert.equal(result.currentHours, 20);
  assert.equal(result.scenarioHours, 9.2);
  assert.equal(result.freedHours, 10.8);
});

test('revisión mayor que reducción muestra aumento de trabajo', () => {
  const gestoria = createInitialState().cases[0];
  const result = calculateProcessScenario(gestoria.processes[3], 5, {
    adoptionPct: 100, timeReductionPct: 10, reviewMinutes: 1,
  });
  assert.ok(result.freedHours < 0);
  assert.ok(result.productivityPct < 0);
});

test('productividad resumida se limita a los procesos evaluados', () => {
  const gestoria = createInitialState().cases[0];
  const scenarios = new Map([[gestoria.processes[0].id, {adoptionPct: 50, timeReductionPct: 50, reviewMinutes: 1}]]);
  const summary = summarizeWorkScenarios(gestoria, scenarios);
  assert.equal(summary.processCount, 1);
  assert.equal(summary.currentHours, 260);
  assert.ok(summary.coveragePct < 100);
  assert.ok(Math.abs(summary.totalDescribedHours - monthlyHours(gestoria)) < 0.001);
  assert.ok(Math.abs(summary.freedHours - (summary.currentHours - summary.scenarioHours)) < 0.001);
});

test('ventas adicionales quedan limitadas por demanda y capacidad', () => {
  const scenario = calculateSalesScenario({demand: 30, capacity: 20, unitPrice: 10, period: 'mes', grossMarginPct: 35});
  assert.equal(scenario.extraUnitsMonthly, 20);
  assert.equal(scenario.extraRevenueMonthly, 200);
  assert.equal(scenario.extraMarginMonthly, 70);
});

test('ventas sin precio, demanda o capacidad siguen sin estimarse', () => {
  const scenario = calculateSalesScenario({demand: 30, capacity: null, unitPrice: 10, period: 'mes', grossMarginPct: null});
  assert.equal(scenario, null);
});

test('valor de servicio muestra cobertura sin convertirla en ingreso', () => {
  const result = calculateValueScenario({eligibleUnits: 30, period: 'mes', baselineCoveragePct: 20, targetCoveragePct: 80});
  assert.equal(result.coverageDeltaPoints, 60);
  assert.equal(result.extraEnhancedUnitsMonthly, 18);
  assert.equal(result.potentialValueMonthly, null);
  const valued = calculateValueScenario({eligibleUnits: 30, period: 'mes', baselineCoveragePct: 20, targetCoveragePct: 80, valuePerImprovedUnit: 5});
  assert.equal(valued.potentialValueMonthly, 90);
});
