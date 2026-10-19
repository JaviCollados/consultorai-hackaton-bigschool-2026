import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/model.js';
import {exampleAssessment, recommend} from '../src/rubric.js';
import {calculateBudget, calculateInternalEconomics, suggestBudgetLines} from '../src/budget.js';

test('el presupuesto suma partidas editables y separa implantación de mantenimiento', () => {
  const result = calculateBudget([{hours: 12, hourlyRate: 75, externalCost: 100, monthlySupport: 40}, {hours: 5, hourlyRate: 60, externalCost: 0, monthlySupport: 0}]);
  assert.deepEqual(result, {setup: 1300, monthly: 40, lineCount: 2});
  assert.equal(calculateBudget([{hours: -1, hourlyRate: 75, externalCost: 0, monthlySupport: 0}]), null);
});

test('las sugerencias de presupuesto dependen de procesos y evaluación de cada empresa', () => {
  const cases = createInitialState().cases;
  const totals = cases.map(item => {
    item.processes.forEach((process, index) => { process.assessment = exampleAssessment(item.sampleKey, index); });
    const lines = suggestBudgetLines(item, recommend);
    assert.ok(lines.length > 0);
    assert.ok(lines.every(line => item.processes.some(process => process.id === line.processId)));
    return calculateBudget(lines).setup;
  });
  assert.equal(new Set(totals).size, 3);
});

test('el coste propio del consultor no usa el coste horario del cliente', () => {
  const lines = [{hours: 10, hourlyRate: 75, externalCost: 50, monthlySupport: 0}];
  assert.deepEqual(calculateInternalEconomics(lines, 30), {deliveryCost: 350, grossMargin: 450});
  assert.equal(calculateInternalEconomics(lines, null), null);
});
