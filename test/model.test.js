import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyFactor, monthlyHours, monthlyRevenue, validateCase,
  createInitialState, replaceGestoria, persistState, loadState, coalesceDocumentRange, migrateGestoriaRevenueQuotas, migrateGestoriaDocumentScenario, migrateGestoriaFiscalModelsScenario, migrateGestoriaPayrollCounts, migrateGestoriaPayrollScenario,
} from '../src/model.js';
import {calculateProcessScenario} from '../src/kpis.js';

test('las unidades de trabajo separan documentos y nóminas de remesas y clientes', () => {
  const cases = createInitialState().cases;
  const gestoria = cases.find(item => item.sector === 'Gestoría');
  assert.equal(gestoria.processes.length, 4);
  assert.equal(gestoria.processes.find(item => item.name.includes('documentos')).volume, 450);
  assert.equal(gestoria.processes.find(item => item.name.includes('documentos')).unit, 'remesas de clientes');
  assert.equal(gestoria.processes.find(item => item.name.includes('nóminas')).volume, 200);
  assert.equal(gestoria.processes.find(item => item.name.includes('nóminas')).unit, 'clientes destinatarios');
  assert.equal(gestoria.metrics.find(item => item.label === 'Nóminas emitidas').value, 240);
  const documents = gestoria.metrics.filter(item => item.label === 'Documentos por cliente');
  assert.equal(documents.length, 1);
  assert.equal(documents[0].minValue, 30);
  assert.equal(documents[0].maxValue, 50);
  assert.ok(Math.abs(monthlyHours(gestoria) - 332.5) < 0.001);
  assert.equal(monthlyRevenue(gestoria), 106000);
  assert.deepEqual(gestoria.revenueStreams.map(item => item.quantity), [240, 200]);
  assert.deepEqual(gestoria.revenueStreams.map(item => item.includedServices), ['450 gestiones fiscales al mes', '400 gestiones laborales al mes']);
  assert.equal(gestoria.hourlyCost, 19.07);
});

test('las cuotas antiguas pasan de gestiones a clientes facturados sin perder el volumen de trabajo', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  gestoria.revenueStreams[0] = {...gestoria.revenueStreams[0], label: 'Servicio fiscal', quantity: 450, billingUnit: undefined, includedServices: undefined, note: 'Nota propia'};
  gestoria.revenueStreams[1] = {...gestoria.revenueStreams[1], label: 'Servicio laboral', quantity: 400, billingUnit: undefined, includedServices: undefined};
  assert.equal(migrateGestoriaRevenueQuotas(state), true);
  assert.deepEqual(gestoria.revenueStreams.map(item => item.quantity), [240, 200]);
  assert.deepEqual(gestoria.revenueStreams.map(item => item.billingUnit), ['clientes con cuota', 'clientes con cuota']);
  assert.equal(gestoria.revenueStreams[0].includedServices, '450 gestiones fiscales al mes');
  assert.match(gestoria.revenueStreams[0].note, /Nota propia/);
  assert.equal(migrateGestoriaRevenueQuotas(state), false);
});

test('la nueva hipótesis documental actualiza solo el escenario anterior y respeta cambios posteriores', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  const documents = gestoria.processes.find(item => item.name === 'Recepción y archivo de documentos');
  documents.scenario = {adoptionPct: 50, timeReductionPct: 25, reviewMinutes: 1};
  assert.equal(migrateGestoriaDocumentScenario(state), true);
  assert.deepEqual(documents.scenario, {adoptionPct: 80, timeReductionPct: 80, reviewMinutes: 1});
  documents.scenario.adoptionPct = 50;
  assert.equal(migrateGestoriaDocumentScenario(state), false);
  assert.equal(documents.scenario.adoptionPct, 50);
});

test('modelos fiscales: 15 minutos actuales y 5 de validación por modelo asistido', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  const models = gestoria.processes.find(item => item.name === 'Preparación de modelos fiscales');
  models.minutes = 20;
  models.scenario = {adoptionPct: 30, timeReductionPct: 15, reviewMinutes: 2};
  assert.equal(migrateGestoriaFiscalModelsScenario(state), true);
  assert.equal(models.minutes, 15);
  assert.deepEqual(models.scenario, {adoptionPct: 100, timeReductionPct: 100, reviewMinutes: 5});
  const result = calculateProcessScenario(models, 5, models.scenario);
  assert.equal(result.currentHours, 37.5);
  assert.equal(result.scenarioHours, 12.5);
  assert.equal(result.freedHours, 25);
  models.scenario.adoptionPct = 80;
  assert.equal(migrateGestoriaFiscalModelsScenario(state), false);
  assert.equal(models.scenario.adoptionPct, 80);
});

test('la ficha laboral antigua conserva 200 clientes y 240 nóminas sin alterar otras cifras', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  const payroll = gestoria.processes.find(item => item.name === 'Envío de nóminas');
  const metric = gestoria.metrics.find(item => item.label === 'Nóminas emitidas');
  payroll.volume = 240;
  payroll.notes = '400 nóminas al mes; el tiempo estimado es de 4–5 minutos por cliente destinatario, no por nómina. La preparación ya está automatizada en parte.';
  metric.value = 400;
  metric.note = 'Volumen ficticio independiente del número de clientes laborales; revisar la relación antes de una propuesta real.';
  assert.equal(migrateGestoriaPayrollCounts(state), true);
  assert.equal(payroll.volume, 200);
  assert.equal(metric.value, 240);
  assert.match(payroll.notes, /200 clientes laborales reciben 240 nóminas/);
  assert.match(metric.note, /200 clientes laborales reciben 240 nóminas/);
  assert.equal(migrateGestoriaPayrollCounts(state), false);
  payroll.volume = 210;
  assert.equal(migrateGestoriaPayrollCounts(state), false);
  assert.equal(payroll.volume, 210);
});

test('envío de nóminas: automatización con reglas y revisión por cliente destinatario', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  const payroll = gestoria.processes.find(item => item.name === 'Envío de nóminas');
  payroll.assessment = {repetition: 'alta', rules: 'claras', context: 'no', existingAutomation: 'si', risk: 'alto', reusable: 'no'};
  payroll.scenario = {adoptionPct: 30, timeReductionPct: 10, reviewMinutes: 1};
  assert.equal(migrateGestoriaPayrollScenario(state), true);
  assert.deepEqual(payroll.scenario, {adoptionPct: 50, timeReductionPct: 50, reviewMinutes: 1});
  assert.equal(payroll.assessment.reusable, 'si');
  assert.equal(payroll.consultantDecision, 'automatizacion');
  const result = calculateProcessScenario(payroll, 5, payroll.scenario);
  assert.equal(result.currentHours, 15);
  assert.ok(Math.abs(result.scenarioHours - 12.9166666667) < 0.001);
  assert.ok(Math.abs(result.freedHours - 2.0833333333) < 0.001);
  payroll.scenario.adoptionPct = 70;
  assert.equal(migrateGestoriaPayrollScenario(state), false);
  assert.equal(payroll.scenario.adoptionPct, 70);
});

test('dos indicadores antiguos de documentos se reúnen en un rango editable sin tocar otros datos', () => {
  const state = createInitialState();
  const gestoria = state.cases[0];
  const documents = gestoria.metrics.find(item => item.label === 'Documentos por cliente');
  gestoria.metrics = gestoria.metrics.filter(item => item !== documents);
  gestoria.metrics.push({...documents, kind: undefined, label: 'Documentos por cliente, mínimo', value: 32});
  gestoria.metrics.push({...documents, id: 'old-max', kind: undefined, label: 'Documentos por cliente, máximo', value: 48});
  const beforeOther = structuredClone(gestoria.metrics[0]);
  assert.equal(coalesceDocumentRange(state), true);
  assert.equal(gestoria.metrics.length, 4);
  assert.deepEqual(gestoria.metrics[0], beforeOther);
  const merged = gestoria.metrics.find(item => item.label === 'Documentos por cliente');
  assert.equal(merged.minValue, 32);
  assert.equal(merged.maxValue, 48);
  assert.equal(coalesceDocumentRange(state), false);
  merged.maxValue = 31;
  assert.ok(validateCase(gestoria).some(error => error.includes('máximo')));
});

test('periodos trimestrales y semanales se convierten sin mezclar unidades', () => {
  assert.equal(monthlyFactor('trimestre'), 1 / 3);
  assert.equal(monthlyFactor('semana'), 52 / 12);
  assert.equal(monthlyFactor('dia_laborable', 5), 5 * 52 / 12);
});

test('cada caso conserva sus datos y restaurar gestoría respeta los demás', () => {
  const state = createInitialState();
  assert.equal(state.cases.length, 3);
  const bakery = state.cases.find(item => item.sector === 'Panadería');
  const florist = state.cases.find(item => item.sector === 'Floristería');
  const modified = structuredClone(state);
  modified.cases.find(item => item.sector === 'Gestoría').processes[0].volume = 999;
  modified.cases.find(item => item.sector === 'Panadería').processes[0].volume = 77;
  const restored = replaceGestoria(modified);
  assert.equal(restored.cases.find(item => item.sector === 'Gestoría').processes[0].volume, 600);
  assert.equal(restored.cases.find(item => item.sector === 'Panadería').processes[0].volume, 77);
  assert.deepEqual(restored.cases.find(item => item.sector === 'Floristería'), florist);
  assert.notEqual(bakery.id, florist.id);
});

test('guardado y carga conservan cambios de varias empresas', () => {
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
  const state = createInitialState();
  state.cases.find(item => item.sector === 'Panadería').name = 'Panadería de prueba';
  persistState(storage, state);
  const loaded = loadState(storage);
  assert.equal(loaded.cases.find(item => item.sector === 'Panadería').name, 'Panadería de prueba');
  assert.equal(loaded.cases.find(item => item.sector === 'Gestoría').name, 'Gestoría Aurora');
});

test('rechaza importes negativos, unidades y nombres vacíos', () => {
  const caseData = createInitialState().cases[0];
  caseData.processes[0].minutes = -1;
  caseData.processes[1].unit = ' ';
  caseData.name = '';
  const errors = validateCase(caseData);
  assert.ok(errors.some(error => error.includes('nombre')));
  assert.ok(errors.some(error => error.includes('minutos')));
  assert.ok(errors.some(error => error.includes('unidad')));
});

test('margen opcional queda acotado y los ejemplos comerciales no heredan facturación fiscal', () => {
  const state = createInitialState();
  const gestoria = state.cases.find(item => item.sampleKey === 'gestoria');
  const bakery = state.cases.find(item => item.sampleKey === 'panaderia');
  const florist = state.cases.find(item => item.sampleKey === 'floristeria');
  assert.equal(bakery.revenueStreams.length, 0);
  assert.equal(florist.revenueStreams.length, 0);
  assert.equal(monthlyRevenue(bakery), 0);
  gestoria.revenueStreams[0].grossMarginPct = 101;
  assert.ok(validateCase(gestoria).some(error => error.includes('margen')));
});
