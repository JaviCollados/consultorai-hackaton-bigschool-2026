import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.js';
import * as budget from '../src/budget.js';
const {blankCase, validateCase} = model;

test('conserva una mejora anterior como servicio editable con sus datos previos', () => {
  const company = blankCase();
  delete company.valueServices;
  company.valueOpportunity = {name: 'Resumen de visita', eligibleUnits: 20, period: 'mes', baselineCoveragePct: 10, targetCoveragePct: 80, evidence: 'Contar entregas', valuePerImprovedUnit: null, valueSource: ''};
  const state = {cases: [company]};
  assert.equal(typeof model.migrateValueServices, 'function');
  assert.equal(model.migrateValueServices(state), true);
  assert.equal(company.valueServices[0].name, 'Resumen de visita');
  assert.match(company.valueServices[0].legacyNote, /20 unidades.*10 %.*80 %/);
  assert.equal(company.valueServices[0].evidence, 'Contar entregas');
  assert.equal(model.migrateValueServices(state), false);
});

test('las horas de las acciones se trasladan al presupuesto sin precio fijado en el diagnóstico', () => {
  const company = blankCase();
  company.name = 'Empresa de prueba';
  company.sector = 'Servicios';
  const service = {id: 'service-1', name: 'Resumen de visitas', outcome: 'Acuerdos y tareas claros', evidence: 'Revisar entregas', actions: [
    {id: 'a1', title: 'Plantilla', hours: 4}, {id: 'a2', title: 'Configurar flujo', hours: 8}, {id: 'a3', title: 'Pruebas', hours: 4},
  ]};
  company.valueServices.push(service);
  assert.equal(typeof model.valueServiceHours, 'function');
  assert.equal(model.valueServiceHours(service), 16);
  assert.equal(typeof budget.suggestValueServiceBudgetLine, 'function');
  const line = budget.suggestValueServiceBudgetLine(service);
  assert.equal(line.valueServiceId, 'service-1');
  assert.equal(line.hours, 16);
  assert.equal(line.hourlyRate, 75);
  assert.match(line.detail, /Plantilla.*Configurar flujo.*Pruebas/);
  company.proposal.lines.push(line);
  assert.deepEqual(validateCase(company), []);
  company.valueServices = [];
  assert.match(validateCase(company).join(' '), /servicio de valor añadido/);
});
