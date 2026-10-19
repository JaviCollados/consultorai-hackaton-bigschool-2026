import test from 'node:test';
import assert from 'node:assert/strict';
import * as budget from '../src/budget.js';
import * as model from '../src/model.js';
const calculateProposalPricing = (...args) => budget.calculateProposalPricing(...args);

const company = {
  workingDaysPerWeek: 5, hourlyCost: 20,
  processes: [
    {id: 'a', volume: 60, period: 'mes', minutes: 60, scenario: {adoptionPct: 50, timeReductionPct: 50, reviewMinutes: 0}},
    {id: 'b', volume: 60, period: 'mes', minutes: 60, scenario: {adoptionPct: 50, timeReductionPct: 50, reviewMinutes: 0}},
  ],
  salesOpportunity: {processId: 'a', demand: 10, capacity: 10, unitPrice: 100, period: 'mes', grossMarginPct: 40},
};

test('cobra una sola vez el 30 % de doce meses de capacidad liberada por procesos seleccionados', () => {
  const proposal = {lines: [{processId: 'a', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0}],
    pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false, trainingGeneralHours: 0,
      trainingIndividualHoursPerPerson: 0, trainingParticipants: 0, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const result = calculateProposalPricing(company, proposal);
  assert.equal(result.freedHoursMonthly, 15);
  assert.equal(result.timeValueMonthly, 300);
  assert.equal(result.corePrice, 1080);
  assert.equal(result.setup, 1080);
  assert.equal(result.monthlyMaintenance, 27);
  assert.ok(Math.abs(result.productivityPct - 100 / 3) < 0.000001);
});

test('desglosa cada proceso y recalcula al excluirlo sin borrarlo', () => {
  const proposal = {lines: [
    {processId: 'a', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0},
    {processId: 'b', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0},
  ], pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false,
    trainingGeneralHours: 0, trainingIndividualHoursPerPerson: 0,
    trainingParticipants: 0, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const both = calculateProposalPricing(company, proposal);
  assert.equal(both.processPrices.a + both.processPrices.b, both.corePrice);
  assert.equal(both.processPrices.a, 1080);
  proposal.lines[1].included = false;
  const onlyA = calculateProposalPricing(company, proposal);
  assert.equal(onlyA.corePrice, 1080);
  assert.equal(onlyA.selectedProcessCount, 1);
  assert.equal(onlyA.monthlyMaintenance, 27);
  assert.equal(proposal.lines.length, 2);
});

test('el importe visible de una intervención coincide con lo descontado y ajusta el mantenimiento', () => {
  const fractionalCompany = {...company, hourlyCost: 19.07, processes: [
    {id: 'a', volume: 43.333, period: 'mes', minutes: 60,
      scenario: {adoptionPct: 100, timeReductionPct: 100, reviewMinutes: 0}},
    {id: 'b', volume: 2.0833, period: 'mes', minutes: 60,
      scenario: {adoptionPct: 100, timeReductionPct: 100, reviewMinutes: 0}},
  ]};
  const proposal = {lines: [
    {processId: 'a', hours: 12, hourlyRate: 75, externalCost: 0},
    {processId: 'b', hours: 8, hourlyRate: 75, externalCost: 0},
  ], pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false,
    trainingGeneralHours: 3, trainingIndividualHoursPerPerson: 2,
    trainingParticipants: 8, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const withBoth = calculateProposalPricing(fractionalCompany, proposal);
  proposal.lines[1].included = false;
  const withoutB = calculateProposalPricing(fractionalCompany, proposal);
  assert.equal(Math.round((withBoth.setup - withoutB.setup) * 100) / 100, withBoth.processPrices.b);
  assert.equal(withoutB.monthlyMaintenance,
    Math.round(withoutB.corePrice * 0.3 / 12 * 100) / 100);
  assert.equal(withoutB.trainingPrice, withBoth.trainingPrice);
});

test('añade formación y servicio de valor, sin cobrar las horas internas del proceso', () => {
  const proposal = {lines: [
    {processId: 'a', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0},
    {valueServiceId: 'v', hours: 4, hourlyRate: 50, externalCost: 20, monthlySupport: 0},
  ], pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false,
    trainingGeneralHours: 3, trainingIndividualHoursPerPerson: 2,
    trainingParticipants: 8, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const result = calculateProposalPricing(company, proposal);
  assert.equal(result.trainingPrice, 760);
  assert.equal(result.valueServicesPrice, 220);
  assert.equal(result.setup, 2060);
  assert.equal(result.monthlyMaintenance, 27);
});

test('las ventas solo entran por margen adicional confirmado y sin solapamiento', () => {
  const base = {lines: [{processId: 'a', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0}],
    pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: true, salesNonOverlapConfirmed: true,
      trainingGeneralHours: 0, trainingIndividualHoursPerPerson: 0, trainingParticipants: 0,
      trainingRatePerPersonHour: 40, maintenancePct: 30}};
  assert.equal(calculateProposalPricing(company, base).salesMarginMonthly, 400);
  assert.equal(calculateProposalPricing(company, {...base, pricing: {...base.pricing, salesNonOverlapConfirmed: false}}).salesMarginMonthly, 0);
  assert.equal(calculateProposalPricing({...company, salesOpportunity: {...company.salesOpportunity, grossMarginPct: null}}, base).salesMarginMonthly, 0);
});

test('la migración añade la nueva fórmula sin perder partidas ni notas guardadas', () => {
  const caseData = model.blankCase();
  caseData.sampleKey = 'gestoria';
  caseData.staffCount = 8;
  delete caseData.proposal.pricing;
  caseData.proposal.notes = 'Alcance acordado';
  caseData.proposal.lines = [{id: 'old-line', processId: 'a', hours: 19, hourlyRate: 75, externalCost: 0, monthlySupport: 0}];
  const state = {cases: [caseData]};
  assert.equal(model.migrateProposalPricing(state), true);
  assert.equal(caseData.proposal.pricing.trainingGeneralHours, 3);
  assert.equal(caseData.proposal.pricing.trainingIndividualHoursPerPerson, 2);
  assert.equal(caseData.proposal.pricing.trainingParticipants, 8);
  assert.equal(caseData.proposal.pricing.trainingRatePerPersonHour, 40);
  assert.equal(caseData.proposal.pricing.maintenancePct, 30);
  assert.equal(caseData.proposal.notes, 'Alcance acordado');
  assert.equal(caseData.proposal.lines[0].id, 'old-line');
  assert.equal(model.migrateProposalPricing(state), false);
});

test('el precio se puede reconstruir con las horas mostradas y los importes redondeados a céntimos', () => {
  const companyWithDecimals = {...company, hourlyCost: 19.07, processes: [
    {id: 'a', volume: 81.2167, period: 'mes', minutes: 60,
      scenario: {adoptionPct: 100, timeReductionPct: 100, reviewMinutes: 0}},
  ]};
  const proposal = {lines: [{processId: 'a', hours: 10, hourlyRate: 75, externalCost: 0, monthlySupport: 0}],
    pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false,
      trainingGeneralHours: 0, trainingIndividualHoursPerPerson: 0,
      trainingParticipants: 0, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const result = calculateProposalPricing(companyWithDecimals, proposal);
  assert.equal(result.freedHoursMonthly, 81.2);
  assert.equal(result.timeValueMonthly, 1548.48);
  assert.equal(result.corePrice, 5574.53);
  assert.equal(result.monthlyMaintenance, 139.36);
});

test('el control interno calcula la factura única por hora propia sin usar un coste propio', () => {
  const proposal = {lines: [
    {processId: 'a', hours: 10, hourlyRate: 75, externalCost: 30, monthlySupport: 0},
    {valueServiceId: 'v', hours: 4, hourlyRate: 50, externalCost: 20, monthlySupport: 0},
  ], pricing: {capturePct: 30, benefitMonths: 12, includeSalesMargin: false,
    trainingGeneralHours: 3, trainingIndividualHoursPerPerson: 2,
    trainingParticipants: 8, trainingRatePerPersonHour: 40, maintenancePct: 30}};
  const quote = calculateProposalPricing(company, proposal);
  const economics = budget.calculateProposalInternalEconomics(company, proposal, quote);
  assert.equal(economics.deliveryHours, 33);
  assert.equal(economics.revenuePerHour, Math.round(quote.setup / 33 * 100) / 100);
  assert.equal('deliveryCost' in economics, false);
  assert.equal('grossMargin' in economics, false);
  assert.equal('marginPerHour' in economics, false);
});
