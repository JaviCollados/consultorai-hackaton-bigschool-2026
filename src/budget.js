import {monthlyFactor, newId, valueServiceHours} from './model.js';
import {calculateProcessScenario, calculateSalesScenario, summarizeWorkScenarios} from './kpis.js';

const validMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateBudget(lines = []) {
  if (!lines.every(line => [line.hours, line.hourlyRate, line.externalCost, line.monthlySupport].every(validMoney))) return null;
  return {
    setup: lines.reduce((sum, line) => sum + line.hours * line.hourlyRate + line.externalCost, 0),
    monthly: lines.reduce((sum, line) => sum + line.monthlySupport, 0),
    lineCount: lines.length,
  };
}

export function calculateInternalEconomics(lines, consultantCostPerHour) {
  const price = calculateBudget(lines);
  if (!price || !validMoney(consultantCostPerHour)) return null;
  const deliveryCost = lines.reduce((sum, line) => sum + line.hours * consultantCostPerHour + line.externalCost, 0);
  return {deliveryCost, grossMargin: price.setup - deliveryCost};
}

export function calculateProposalPricing(company, proposal) {
  const pricing = proposal?.pricing;
  if (!pricing) return null;
  const participants = pricing.trainingParticipants ?? company.staffCount;
  const required = [pricing.capturePct, pricing.benefitMonths, pricing.trainingGeneralHours,
    pricing.trainingIndividualHoursPerPerson, participants,
    pricing.trainingRatePerPersonHour, pricing.maintenancePct];
  if (!required.every(validMoney) || pricing.capturePct > 100 || pricing.maintenancePct > 100 ||
      !Number.isInteger(participants) || !validMoney(company.hourlyCost)) return null;
  const lines = proposal.lines ?? [];
  if (!lines.length) return null;
  const activeLines = lines.filter(line => line.included !== false);
  const selectedIds = new Set(activeLines.map(line => line.processId).filter(Boolean));
  const scenarios = Object.fromEntries((company.processes ?? [])
    .filter(process => selectedIds.has(process.id) && process.scenario)
    .map(process => [process.id, process.scenario]));
  const selectedCompany = {...company, processes: (company.processes ?? []).filter(process => selectedIds.has(process.id))};
  const impact = summarizeWorkScenarios(selectedCompany, scenarios);
  const processValues = selectedCompany.processes.map(process => {
    const scenario = calculateProcessScenario(process, company.workingDaysPerWeek, process.scenario);
    const freedHours = Math.round(((scenario?.freedHours ?? 0) + Number.EPSILON) * 10) / 10;
    return {id: process.id, freedHours, monthlyValue: cents(Math.max(0, freedHours) * company.hourlyCost)};
  });
  const freedHoursMonthly = Math.round((processValues.reduce((sum, entry) => sum + entry.freedHours, 0) + Number.EPSILON) * 10) / 10;
  const timeValueMonthly = cents(processValues.reduce((sum, entry) => sum + entry.monthlyValue, 0));
  const sales = company.salesOpportunity && selectedIds.has(company.salesOpportunity.processId)
    ? calculateSalesScenario(company.salesOpportunity, company.workingDaysPerWeek) : null;
  const salesMarginMonthly = (pricing.includeSalesMargin === true || pricing.includeSalesMargin === 'si') &&
    (pricing.salesNonOverlapConfirmed === true || pricing.salesNonOverlapConfirmed === 'si')
    ? cents(Math.max(0, sales?.extraMarginMonthly ?? 0)) : 0;
  const processPrices = Object.fromEntries(processValues.map(entry => [entry.id,
    cents((entry.monthlyValue + (company.salesOpportunity?.processId === entry.id ? salesMarginMonthly : 0))
      * pricing.benefitMonths * pricing.capturePct / 100)]));
  const corePrice = cents(Object.values(processPrices).reduce((sum, price) => sum + price, 0));
  const trainingPrice = cents((pricing.trainingGeneralHours
    + pricing.trainingIndividualHoursPerPerson * participants) * pricing.trainingRatePerPersonHour);
  const serviceLines = activeLines.filter(line => line.valueServiceId);
  if (!serviceLines.every(line => [line.hours, line.hourlyRate, line.externalCost].every(validMoney))) return null;
  const valueServicesPrice = cents(serviceLines.reduce((sum, line) => sum + line.hours * line.hourlyRate + line.externalCost, 0));
  const externalProcessCosts = activeLines.filter(line => line.processId).reduce((sum, line) => sum + (line.externalCost ?? 0), 0);
  if (!validMoney(externalProcessCosts)) return null;
  const setup = cents(corePrice + trainingPrice + valueServicesPrice + externalProcessCosts);
  return {freedHoursMonthly, productivityPct: impact.productivityPct, timeValueMonthly,
    salesMarginMonthly, corePrice, processPrices, trainingPrice, valueServicesPrice, externalProcessCosts,
    setup, monthlyMaintenance: cents(corePrice * pricing.maintenancePct / 100 / 12),
    selectedProcessCount: selectedIds.size};
}

export function calculateProposalInternalEconomics(company, proposal, quote = calculateProposalPricing(company, proposal)) {
  const pricing = proposal?.pricing;
  if (!pricing || !quote) return null;
  const participants = pricing.trainingParticipants ?? company.staffCount;
  const lines = (proposal.lines ?? []).filter(line => line.included !== false);
  if (!Number.isInteger(participants) || participants < 0 ||
      !lines.every(line => validMoney(line.hours))) return null;
  const deliveryHours = lines.reduce((sum, line) => sum + line.hours, 0)
    + pricing.trainingGeneralHours + pricing.trainingIndividualHoursPerPerson * participants;
  return {deliveryHours, revenuePerHour: deliveryHours > 0 ? cents(quote.setup / deliveryHours) : null};
}

const BASE_HOURS = {automatizacion: 14, agente: 26, asistencia: 8};
const DELIVERABLE = {
  automatizacion: 'Configurar el flujo, probar excepciones y documentar su uso',
  agente: 'Diseñar instrucciones, conectar el flujo de trabajo y validar con supervisión',
  asistencia: 'Preparar una ayuda al profesional y un protocolo de revisión',
};

export function suggestBudgetLine(company, process, category) {
  if (!BASE_HOURS[category]) return null;
  const factor = monthlyFactor(process.period, company.workingDaysPerWeek);
  const monthlyUnits = Number.isFinite(factor) ? Math.max(0, process.volume * factor) : 0;
  const hours = BASE_HOURS[category] + Math.min(12, Math.ceil(Math.log10(monthlyUnits + 1) * 2));
  return {
    id: newId(), processId: process.id, category,
    title: `${process.name}: ${category === 'agente' ? 'agente supervisado' : category === 'automatizacion' ? 'automatización' : 'asistencia'}`,
    detail: DELIVERABLE[category], hours, hourlyRate: 75, externalCost: 0, monthlySupport: 0,
  };
}

export function suggestBudgetLines(company, recommend) {
  return company.processes.flatMap(process => {
    const category = process.consultantDecision || recommend(process.assessment)?.category;
    const line = suggestBudgetLine(company, process, category);
    return line ? [line] : [];
  });
}

export function suggestValueServiceBudgetLine(service) {
  const hours = valueServiceHours(service);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return {
    id: newId(), valueServiceId: service.id, category: 'valor',
    title: service.name,
    detail: (service.actions ?? []).map(action => action.title).filter(Boolean).join('; '),
    hours, hourlyRate: 75, externalCost: 0, monthlySupport: 0,
  };
}
