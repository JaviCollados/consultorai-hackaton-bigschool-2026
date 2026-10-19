import {
  PERIODS, blankCase, blankMetric, blankProcess, blankRevenue, blankValueService, blankValueAction, valueServiceHours, migrateValueServices, defaultProposalPricing, migrateProposalPricing, createInitialState,
  loadState, monthlyHours, persistState, replaceGestoria, validateCase, coalesceDocumentRange, migrateGestoriaRevenueQuotas, migrateGestoriaDocumentScenario, migrateGestoriaFiscalModelsScenario, migrateGestoriaPayrollCounts, migrateGestoriaPayrollScenario,
} from './model.js';
import {calculateProcessScenario, summarizeWorkScenarios, calculateSalesScenario, calculateValueScenario} from './kpis.js';
import {ASSESSMENT_OPTIONS, CATEGORY_LABELS, exampleAssessment, recommend} from './rubric.js';
import {calculateBudget, calculateProposalPricing, calculateProposalInternalEconomics, suggestBudgetLine, suggestBudgetLines, suggestValueServiceBudgetLine} from './budget.js';
import {DEMO_BACKUP_KEY, mergeReviewedDemoState} from './demo-seed.js';

const root = document.querySelector('#app');
const clone = value => structuredClone(value);
const money = value => new Intl.NumberFormat('es-ES', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(value);
const moneyCents = value => new Intl.NumberFormat('es-ES', {style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
const number = value => new Intl.NumberFormat('es-ES', {maximumFractionDigits: 1}).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const periodOptions = selected => Object.entries(PERIODS).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');

let savedState;
let state;
let dirty = false;
let errorMessage = '';
let clientMode = false;
let currentPhase = 'datos';

const scenarioExamples = {
  gestoria: [[50, 50, 1], [80, 80, 1], [100, 100, 5], [50, 50, 1]],
  panaderia: [[50, 25, .5], [30, 15, 2]],
  floristeria: [[25, 15, 1], [50, 20, 3]],
};
const otherExamples = {
  gestoria: {valueOpportunity: {name: 'Resumen de visita con acuerdos e hitos', processId: '', eligibleUnits: 20, period: 'mes', baselineCoveragePct: 10, targetCoveragePct: 80, evidence: 'Hipótesis: revisar resúmenes entregados y valoración del cliente.', valuePerImprovedUnit: null, valueSource: ''}},
  panaderia: {salesOpportunity: {name: 'Pedidos anticipados', processId: '', unit: 'pedidos', demand: 100, capacity: 60, unitPrice: 8, period: 'mes', grossMarginPct: null, overlapNote: 'Ejemplo ficticio; validar demanda y capacidad.'}},
  floristeria: {salesOpportunity: {name: 'Eventos adicionales', processId: '', unit: 'eventos', demand: 4, capacity: 2, unitPrice: 180, period: 'mes', grossMarginPct: null, overlapNote: 'Ejemplo ficticio; validar demanda y capacidad.'}},
};
function addExampleEvaluations(data) {
  let changed = false;
  for (const item of data.cases) {
    if (!item.sampleKey || item.evaluationExamplesAdded) continue;
    item.processes.forEach((process, index) => {
      if (!process.assessment && exampleAssessment(item.sampleKey, index)) {
        process.assessment = exampleAssessment(item.sampleKey, index);
        const values = scenarioExamples[item.sampleKey]?.[index];
        if (values) process.scenario = {adoptionPct: values[0], timeReductionPct: values[1], reviewMinutes: values[2]};
        if (item.sampleKey === 'gestoria' && index === 2 && !process.consultantDecision) {
          process.consultantDecision = 'agente';
          process.decisionReason = 'El software fiscal ya genera el modelo. Un agente con supervisión comprueba el resultado y prepara incidencias; un profesional valida y presenta cada modelo. La reducción de tiempo es una hipótesis pendiente de medir.';
        }
        if (item.sampleKey === 'gestoria' && index === 3 && !process.consultantDecision) {
          process.consultantDecision = 'automatizacion';
          process.decisionReason = 'Las reglas de envío y las incidencias de bonus, horas extra o productividad pueden configurarse por cliente según sus indicaciones. Se comprueba cada resultado antes de enviarlo; el riesgo de datos laborales exige control humano. Hipótesis pendiente de medir.';
        }
      }
    });
    const defaults = clone(otherExamples[item.sampleKey] ?? {});
    if (defaults.salesOpportunity && !item.salesOpportunity) {
      defaults.salesOpportunity.processId = item.sampleKey === 'floristeria' ? item.processes[1]?.id ?? '' : item.processes[0]?.id ?? '';
      item.salesOpportunity = defaults.salesOpportunity;
    }
    if (defaults.valueOpportunity && !item.valueOpportunity) item.valueOpportunity = defaults.valueOpportunity;
    item.evaluationExamplesAdded = true;
    changed = true;
  }
  return changed;
}

function addExampleProposals(data) {
  let changed = false;
  for (const item of data.cases) {
    if (!item.sampleKey || item.proposal) continue;
    item.proposal = {
      title: `Propuesta de implantación para ${item.name}`,
      summary: `Intervenciones iniciales para mejorar los procesos descritos de ${item.name}. Alcance y resultados sujetos a validación.`,
      notes: 'Presupuesto de demostración con importes editables. Confirmar alcance, pruebas, costes externos e impuestos antes de presentar una oferta real.',
      consultantCostPerHour: null,
      pricing: defaultProposalPricing(item),
      lines: suggestBudgetLines(item, recommend),
    };
    changed = true;
  }
  return changed;
}

try {
  const existingState = loadState(localStorage);
  savedState = mergeReviewedDemoState(existingState);
  const reviewedSeedApplied = savedState !== existingState;
  if (reviewedSeedApplied && existingState && !localStorage.getItem(DEMO_BACKUP_KEY)) {
    localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(existingState));
  }
  const documentRangeMerged = coalesceDocumentRange(savedState);
  const revenueQuotasMigrated = migrateGestoriaRevenueQuotas(savedState);
  const documentScenarioMigrated = migrateGestoriaDocumentScenario(savedState);
  const fiscalModelsScenarioMigrated = migrateGestoriaFiscalModelsScenario(savedState);
  const payrollCountsMigrated = migrateGestoriaPayrollCounts(savedState);
  const payrollScenarioMigrated = migrateGestoriaPayrollScenario(savedState);
  const evaluationsAdded = addExampleEvaluations(savedState);
  const valueServicesMigrated = migrateValueServices(savedState);
  const proposalsAdded = addExampleProposals(savedState);
  const proposalPricingMigrated = migrateProposalPricing(savedState);
  if (reviewedSeedApplied || documentRangeMerged || revenueQuotasMigrated || documentScenarioMigrated || fiscalModelsScenarioMigrated || payrollCountsMigrated || payrollScenarioMigrated || evaluationsAdded || valueServicesMigrated || proposalsAdded || proposalPricingMigrated || !existingState) persistState(localStorage, savedState);
  state = clone(savedState);
} catch (error) {
  errorMessage = `No se pudieron leer los casos guardados: ${error.message} Los datos del navegador no se han borrado.`;
  savedState = createInitialState();
  state = clone(savedState);
}

const activeCase = () => state.cases.find(item => item.id === state.activeId) ?? state.cases[0] ?? null;

function field(label, value, scope, key, options = {}) {
  const {type = 'text', id = '', min, step, placeholder = '', hint = '', rows = 0, readOnly = false} = options;
  const attrs = `data-scope="${scope}" data-field="${key}" ${id ? `data-id="${id}"` : ''}`;
  const control = rows
    ? `<textarea ${attrs} rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
    : `<input ${attrs} type="${type}" value="${escapeHtml(value ?? '')}" ${min !== undefined ? `min="${min}"` : ''} ${step !== undefined ? `step="${step}"` : ''} ${readOnly ? 'readonly' : ''} placeholder="${escapeHtml(placeholder)}">`;
  return `<label class="field"><span>${escapeHtml(label)}</span>${control}${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</label>`;
}

function periodField(scope, id, value) {
  return `<label class="field"><span>Periodo</span><select data-scope="${scope}" data-id="${id}" data-field="period">${periodOptions(value)}</select></label>`;
}

function selectField(label, value, scope, key, options, id = '', hint = '') {
  return `<label class="field"><span>${escapeHtml(label)}</span><select data-scope="${scope}" data-field="${key}" ${id ? `data-id="${id}"` : ''}>${Object.entries(options).map(([option, text]) => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</label>`;
}

function processResultText(process, workingDaysPerWeek) {
  const result = calculateProcessScenario(process, workingDaysPerWeek, process.scenario);
  return result ? `Actual: ${number(result.currentHours)} h/mes · Escenario: ${number(result.scenarioHours)} h/mes · ${result.freedHours >= 0 ? `${number(result.freedHours)} h liberadas` : `${number(-result.freedHours)} h adicionales`}`
    : 'Completa adopción, reducción y revisión para estimar.';
}

function assessmentCard(process, index, company) {
  const assessment = process.assessment ?? {};
  const advice = recommend(assessment);
  const scenario = process.scenario ?? {};
  const chosen = process.consultantDecision ?? '';
  return `<details class="entry assessment-card" data-process-id="${process.id}" aria-label="Evaluación de ${escapeHtml(process.name)}">
    <summary class="compact-summary"><span><strong>${escapeHtml(process.name || `Proceso ${index + 1}`)}</strong><small>${chosen ? 'Tu decisión' : 'Orientación'}: ${escapeHtml(CATEGORY_LABELS[chosen || advice?.category] || 'Pendiente de evaluar')} · ${processResultText(process, company.workingDaysPerWeek)}</small></span><span class="summary-cue">Ver evaluación</span></summary><div class="entry-details">
    <div class="grid three">
      ${selectField('Repetición', assessment.repetition, 'assessment', 'repetition', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.repetition}, process.id)}
      ${selectField('Reglas y excepciones', assessment.rules, 'assessment', 'rules', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.rules}, process.id)}
      ${selectField('Decisiones con contexto', assessment.context, 'assessment', 'context', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.context}, process.id)}
      ${selectField('Automatización actual', assessment.existingAutomation, 'assessment', 'existingAutomation', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.existingAutomation}, process.id)}
      ${selectField('Riesgo o sensibilidad', assessment.risk, 'assessment', 'risk', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.risk}, process.id)}
      ${selectField('Instrucciones reutilizables', assessment.reusable, 'assessment', 'reusable', {'': 'Sin valorar', ...ASSESSMENT_OPTIONS.reusable}, process.id)}
    </div>
    <div class="recommendation"><strong>Orientación basada en criterios: ${advice ? CATEGORY_LABELS[advice.category] : 'faltan criterios'}</strong><p>${advice ? escapeHtml(advice.reasons.join('; ')) : 'Completa los seis criterios para obtener una orientación.'}</p>${advice ? `<small>${advice.skill ? 'Podría convenir una skill. ' : ''}${advice.reviewHuman ? 'Revisión humana necesaria.' : 'Revisar antes de implantar.'}</small>` : ''}</div>
    <div class="grid two">${selectField('Tu decisión como consultor', chosen, 'processes', 'consultantDecision', {'': 'Sin decisión propia; usar orientación', ...CATEGORY_LABELS}, process.id, 'Puedes aceptar o cambiar la orientación. Si lo dejas vacío, la propuesta usa la orientación provisional.')}${field('Por qué tomas esa decisión (opcional)', process.decisionReason ?? '', 'processes', 'decisionReason', {id: process.id, placeholder: 'Tu criterio, datos observados o matices del cliente', hint: 'Deja constancia de por qué aceptas o cambias la orientación.'})}</div>
    <h3>Escenario de tiempo</h3><div class="grid three">${field('Casos que usarán la solución (%)', scenario.adoptionPct, 'scenario', 'adoptionPct', {id: process.id, type: 'number', min: 0, step: 'any', hint: '50 % significa la mitad de las unidades de este proceso; no la mitad de la plantilla.'})}${field('Tiempo reducido en esos casos (%)', scenario.timeReductionPct, 'scenario', 'timeReductionPct', {id: process.id, type: 'number', min: 0, step: 'any', hint: 'Se aplica solo a los casos que usan la solución, antes de revisar el resultado.'})}${field('Revisión humana por caso (min)', scenario.reviewMinutes, 'scenario', 'reviewMinutes', {id: process.id, type: 'number', min: 0, step: 'any', hint: 'Minutos adicionales para comprobar cada resultado generado. Se restan del tiempo liberado.'})}</div>
    <p class="result-line">${processResultText(process, company.workingDaysPerWeek)}</p>
  </div></details>`;
}

function opportunityCard(company, kind) {
  const sales = kind === 'salesOpportunity';
  const record = company[kind] ?? {};
  const result = sales ? calculateSalesScenario(record, company.workingDaysPerWeek) : calculateValueScenario(record, company.workingDaysPerWeek);
  const processChoices = {'': 'Sin vincular todavía', ...Object.fromEntries(company.processes.map(p => [p.id, p.name || 'Proceso sin nombre']))};
  return `<div class="entry"><div class="grid two">${field(sales ? 'Oportunidad de venta' : 'Entregable o servicio mejorado', record.name, kind, 'name', {placeholder: sales ? 'Ej. pedidos anticipados' : 'Ej. resumen de visita'})}${selectField('Proceso vinculado', record.processId, kind, 'processId', processChoices)}</div>
    ${sales ? `<div class="grid four">${field('Demanda adicional', record.demand, kind, 'demand', {type: 'number', min: 0, step: 'any'})}${field('Capacidad adicional', record.capacity, kind, 'capacity', {type: 'number', min: 0, step: 'any'})}${field('Precio por unidad (€)', record.unitPrice, kind, 'unitPrice', {type: 'number', min: 0, step: 'any'})}${periodField(kind, '', record.period ?? 'mes')}</div><div class="grid two">${field('Unidad vendida', record.unit, kind, 'unit', {placeholder: 'pedidos, servicios...'})}${field('Margen estimado (%)', record.grossMarginPct, kind, 'grossMarginPct', {type: 'number', min: 0, step: 'any'})}</div>${field('Origen del supuesto y posible solapamiento', record.overlapNote, kind, 'overlapNote', {rows: 2})}`
      : `<div class="grid four">${field('Unidades que podrían recibir la mejora', record.eligibleUnits, kind, 'eligibleUnits', {type: 'number', min: 0, step: 'any'})}${periodField(kind, '', record.period ?? 'mes')}${field('Cobertura actual (%)', record.baselineCoveragePct, kind, 'baselineCoveragePct', {type: 'number', min: 0, step: 'any'})}${field('Cobertura prevista (%)', record.targetCoveragePct, kind, 'targetCoveragePct', {type: 'number', min: 0, step: 'any'})}</div>${field('Cómo comprobarías la mejora', record.evidence, kind, 'evidence', {rows: 2})}<div class="grid two">${field('Valor estimado por unidad (€; opcional)', record.valuePerImprovedUnit, kind, 'valuePerImprovedUnit', {type: 'number', min: 0, step: 'any'})}${field('Fuente de esa valoración', record.valueSource, kind, 'valueSource', {placeholder: 'Necesaria si asignas euros'})}</div>`}
    <p class="result-line">${result ? sales ? `${number(result.extraUnitsMonthly)} unidades adicionales/mes · ${money(result.extraRevenueMonthly)} de ventas potenciales/mes${result.extraMarginMonthly === null ? '' : ` · ${money(result.extraMarginMonthly)} de margen potencial`}` : `${number(result.extraEnhancedUnitsMonthly)} entregas mejoradas/mes · cobertura ${number(record.baselineCoveragePct)} % → ${number(record.targetCoveragePct)} %${result.potentialValueMonthly === null || !record.valueSource?.trim() ? '' : ` · ${money(result.potentialValueMonthly)} de valoración estimada/mes`}` : 'No estimable: completa los datos del escenario.'}</p></div>`;
}

function valueServiceCard(service, index) {
  const hours = valueServiceHours(service);
  return `<details class="entry value-service" data-service-id="${service.id}"><summary class="compact-summary"><span><strong>${escapeHtml(service.name || `Servicio ${index + 1}`)}</strong><small>${number(hours)} h propias de implantación · estimación editable</small></span><span class="summary-cue">Editar servicio</span></summary><div class="entry-details">
    <div class="entry-top"><span class="entry-count">Servicio ${index + 1}</span><button class="text-button danger" data-action="value-service-remove" data-id="${service.id}">Quitar servicio</button></div>
    ${field('Nombre del servicio', service.name, 'valueServices', 'name', {id: service.id, placeholder: 'Ej. resumen de visitas y acuerdos'})}
    ${field('Qué mejora aporta al cliente', service.outcome, 'valueServices', 'outcome', {id: service.id, rows: 2, placeholder: 'Qué podrá hacer o recibir que hoy no tiene'})}
    ${field('Cómo comprobarías el resultado', service.evidence, 'valueServices', 'evidence', {id: service.id, rows: 2, placeholder: 'Ej. revisar entregas y satisfacción del cliente'})}
    ${service.legacyNote ? `<p class="summary-note">${escapeHtml(service.legacyNote)}</p>` : ''}
    <div class="entry-top"><strong>Acciones de implantación</strong><button class="secondary" data-action="value-action-add" data-id="${service.id}">+ Añadir acción</button></div>
    <div class="value-actions">${service.actions.map(action => `<div class="value-action-row"><div class="grid two">${field('Qué harás', action.title, 'valueAction', 'title', {id: action.id, placeholder: 'Ej. configurar y probar el flujo'})}${field('Tus horas estimadas', action.hours, 'valueAction', 'hours', {id: action.id, type: 'number', min: 0, step: 'any'})}</div><button class="text-button danger" data-action="value-action-remove" data-id="${action.id}">Quitar acción</button></div>`).join('') || '<p class="empty">Añade las acciones que realizarías para implantar este servicio.</p>'}</div>
    <p class="result-line value-hours">${number(hours)} horas propias estimadas · el precio se fija después en Propuesta y presupuesto</p>
  </div></details>`;
}

function impactMarkup(company) {
  const scenarios = Object.fromEntries(company.processes.filter(p => p.scenario).map(p => [p.id, p.scenario]));
  const impact = summarizeWorkScenarios(company, scenarios);
  return `<div class="summary-grid">
    <div class="summary-item"><span>Cambio de tiempo</span><strong>${impact.processCount ? `${number(Math.abs(impact.freedHours))} h` : '—'}</strong><small>${impact.freedHours < 0 ? 'Adicionales al mes; hipótesis' : 'Liberadas al mes; hipótesis'}</small></div>
    <div class="summary-item"><span>Productividad</span><strong>${impact.processCount && impact.productivityPct !== null ? `${number(impact.productivityPct)} %` : '—'}</strong><small>Misma cesta de trabajo por hora</small></div>
    <div class="summary-item"><span>Cobertura</span><strong>${impact.coveragePct === null ? '—' : `${number(impact.coveragePct)} %`}</strong><small>${impact.processCount} procesos; ${number(impact.currentHours)} h de ${number(impact.totalDescribedHours)} h descritas</small></div>
    <div class="summary-item"><span>Beneficio observado</span><strong>Sin medir</strong><small>Son escenarios editables, no resultados reales</small></div>
  </div><p class="summary-note">Productividad y horas describen el mismo cambio de trabajo. No se suman como dos ahorros. La cobertura se refiere solo a los procesos descritos, no a toda la plantilla.</p>`;
}

function budgetSummaryMarkup(company) {
  const proposal = company.proposal;
  const lines = proposal?.lines ?? [];
  const pricing = proposal?.pricing ?? defaultProposalPricing(company);
  const quote = calculateProposalPricing(company, {...proposal, pricing});
  const participants = pricing.trainingParticipants ?? company.staffCount;
  const economics = calculateProposalInternalEconomics(company, {...proposal, pricing}, quote);
  return `<div class="summary-grid budget-totals">
    <div class="summary-item"><span>Factura única</span><strong>${quote ? moneyCents(quote.setup) : 'Pendiente'}</strong><small>Precio estimado, sin impuestos</small></div>
    <div class="summary-item"><span>Mantenimiento mensual</span><strong>${quote ? moneyCents(quote.monthlyMaintenance) : 'Pendiente'}</strong><small>${number(pricing.maintenancePct)} % anual de la implantación de procesos ÷ 12</small></div>
    <div class="summary-item"><span>Procesos elegidos</span><strong>${quote?.selectedProcessCount ?? 0}</strong><small>Solo estos generan el precio principal</small></div>
    <div class="summary-item"><span>Tiempo posible</span><strong>${quote?.selectedProcessCount ? `${number(quote.freedHoursMonthly)} h/mes` : 'Sin estimar'}</strong><small>Hipótesis, pendiente de medir</small></div>
  </div>${quote ? `<div class="pricing-breakdown"><h3>Cómo se obtiene la factura</h3>
    <p>Capacidad liberada: ${number(Math.max(0, quote.freedHoursMonthly))} h/mes × ${moneyCents(company.hourlyCost)} de coste horario de esta empresa = ${moneyCents(quote.timeValueMonthly)}/mes.</p>
    <p>Productividad: ${quote.productivityPct === null ? 'sin estimar' : `${number(quote.productivityPct)} %`}. Expresa el mismo cambio de tiempo y no se suma otra vez.</p>
    <p>${quote.salesMarginMonthly ? `Margen adicional de ventas incluido: ${moneyCents(quote.salesMarginMonthly)}/mes, confirmado como independiente.` : 'Ventas adicionales: sin importe en la factura mientras falte margen estimado o confirmación de que no se solapa.'}</p>
    <p>Precio principal: (${moneyCents(quote.timeValueMonthly)}${quote.salesMarginMonthly ? ` + ${moneyCents(quote.salesMarginMonthly)}` : ''}) × ${number(pricing.benefitMonths)} meses × ${number(pricing.capturePct)} % = <strong>${moneyCents(quote.corePrice)}</strong>.</p>
    <p>Formación: (${number(pricing.trainingGeneralHours)} h de sesión general + ${number(pricing.trainingIndividualHoursPerPerson)} h individuales × ${number(participants)} personas) × ${moneyCents(pricing.trainingRatePerPersonHour)}/h = <strong>${moneyCents(quote.trainingPrice)}</strong>.</p>
    <p>Servicios de valor añadido: ${moneyCents(quote.valueServicesPrice)}${quote.externalProcessCosts ? ` · costes externos de procesos: ${moneyCents(quote.externalProcessCosts)}` : ''}.</p>
    <p><strong>Factura única: ${moneyCents(quote.setup)}</strong>. Mantenimiento: ${number(pricing.maintenancePct)} % anual de la implantación de procesos (${moneyCents(quote.corePrice)}) ÷ 12 = <strong>${moneyCents(quote.monthlyMaintenance)}/mes</strong>.</p>
  </div>` : '<p class="summary-note">Para calcular la propuesta, indica un coste horario válido de la empresa y revisa los datos de formación.</p>'}
  <div class="internal-economics"><strong>Control interno</strong><span>Horas propias previstas: ${economics ? `${number(economics.deliveryHours)} h` : 'sin estimar'}</span><span>Facturación por hora propia: ${economics?.revenuePerHour === null || !economics ? 'sin estimar' : moneyCents(economics.revenuePerHour)}</span></div>
  <p class="summary-note">Las horas propias incluyen implantación, servicios añadidos y formación. La facturación por hora divide la factura única entre esas horas y no incluye el mantenimiento futuro. El 30 % se aplica al valor hipotético del primer año; productividad y horas representan el mismo efecto.</p>`;
}

function budgetLineSummary(line, company) {
  if (line.included === false) return 'Fuera de la propuesta · se puede volver a incluir';
  if (line.processId) return `${number(line.hours)} h propias previstas · incluidas en el precio principal${line.externalCost ? ` · ${moneyCents(line.externalCost)} de coste externo` : ''}`;
  const total = calculateBudget([line]);
  return total ? `${moneyCents(total.setup)} de servicio añadido` : 'Revisar importes';
}

function budgetLineCard(line, company) {
  const process = company.processes.find(item => item.id === line.processId);
  const valueService = (company.valueServices ?? []).find(item => item.id === line.valueServiceId);
  const sourceName = process?.name || valueService?.name || 'Partida';
  return `<details class="entry budget-line" data-line-id="${line.id}"><summary class="compact-summary"><span><strong>${escapeHtml(line.title || sourceName)}</strong><small>${budgetLineSummary(line, company)}</small></span><span class="summary-cue">Editar partida</span></summary><div class="entry-details"><div class="entry-top"><span class="entry-count">${escapeHtml(sourceName)}</span><button class="text-button danger" data-action="budget-remove" data-id="${line.id}">Quitar partida</button></div>
    <div class="grid two">${field('Intervención', line.title, 'budgetLine', 'title', {id: line.id})}${field('Entregable y alcance', line.detail, 'budgetLine', 'detail', {id: line.id, rows: 2})}</div>
    <div class="grid ${valueService ? 'three' : 'two'}">${field(valueService ? 'Horas de implantación' : 'Horas propias previstas', line.hours, 'budgetLine', 'hours', {id: line.id, type: 'number', min: 0, step: 'any', readOnly: Boolean(valueService), hint: valueService ? 'Se editan en Diagnóstico e impacto.' : 'Sirven para tu control interno; no fijan el precio principal.'})}${valueService ? field('Precio por hora del servicio (€)', line.hourlyRate, 'budgetLine', 'hourlyRate', {id: line.id, type: 'number', min: 0, step: 'any'}) : ''}${field('Costes externos (€)', line.externalCost, 'budgetLine', 'externalCost', {id: line.id, type: 'number', min: 0, step: 'any', hint: valueService ? 'Se añaden al precio del servicio.' : 'Se añaden aparte a la factura única.'})}</div>
    <p class="result-line line-total">${budgetLineSummary(line, company)}</p>
  </div></details>`;
}

function proposalMarkup(company) {
  const proposal = company.proposal ?? {title: `Propuesta para ${company.name}`, summary: '', consultantCostPerHour: null, lines: []};
  const pricing = proposal.pricing ?? defaultProposalPricing(company);
  const selected = new Set(proposal.lines.map(line => line.processId));
  const available = company.processes.filter(process => !selected.has(process.id)).map(process => {
    const category = process.consultantDecision || recommend(process.assessment)?.category;
    return `<div class="budget-choice"><span><strong>${escapeHtml(process.name)}</strong><small>${escapeHtml(CATEGORY_LABELS[category] || 'Completa la evaluación antes de presupuestar')}</small></span><button class="secondary" data-action="budget-add" data-id="${process.id}" ${!category || category === 'ninguna' ? 'disabled' : ''}>Añadir</button></div>`;
  }).join('');
  const selectedServices = new Set(proposal.lines.map(line => line.valueServiceId));
  const availableServices = (company.valueServices ?? []).filter(service => !selectedServices.has(service.id)).map(service => {
    const hours = valueServiceHours(service);
    return `<div class="budget-choice"><span><strong>${escapeHtml(service.name)}</strong><small>${number(hours)} horas propias estimadas en el diagnóstico</small></span><button class="secondary" data-action="budget-add-value" data-id="${service.id}" ${hours > 0 ? '' : 'disabled'}>Añadir</button></div>`;
  }).join('');
  return `<div class="budget-case-heading"><span class="eyebrow">Propuesta ficticia para</span><h3>${escapeHtml(company.name)}</h3><p>${escapeHtml(company.sector)}</p></div>
    <div class="grid two">${field('Título de la propuesta', proposal.title, 'proposal', 'title')}${field('Resumen para el cliente', proposal.summary, 'proposal', 'summary', {rows: 2, placeholder: 'Qué se propone y para qué'})}</div>
    <div class="pricing-controls"><h3>Precio basado en el impacto del cliente</h3><p>Se toma el tiempo que podrían liberar los procesos elegidos y se valora con el coste horario de esta empresa. La productividad muestra el mismo cambio; no se cobra dos veces.</p>
    <div class="grid two">${field('Parte del valor del cliente que cobrarás (%)', pricing.capturePct, 'proposalPricing', 'capturePct', {type: 'number', min: 0, step: 'any', hint: 'Criterio elegido: 30 %.'})}${field('Meses de beneficio valorados', pricing.benefitMonths, 'proposalPricing', 'benefitMonths', {type: 'number', min: 0, step: 1, hint: 'Criterio elegido: 12 meses para una factura única.'})}</div>
    <div class="grid two">${selectField('Añadir margen de ventas estimadas', pricing.includeSalesMargin === true || pricing.includeSalesMargin === 'si' ? 'si' : 'no', 'proposalPricing', 'includeSalesMargin', {no: 'No', si: 'Sí, si existe una estimación de margen'})}${selectField('Confirmo que esas ventas no repiten el valor del tiempo liberado', pricing.salesNonOverlapConfirmed === true || pricing.salesNonOverlapConfirmed === 'si' ? 'si' : 'no', 'proposalPricing', 'salesNonOverlapConfirmed', {no: 'Sin confirmar', si: 'Confirmado'})}</div><p class="summary-note">Las ventas entran solo si hay margen estimado, están ligadas a un proceso elegido y confirmas que no se solapan. La facturación adicional bruta no se usa como beneficio.</p></div>
    <div class="pricing-controls"><h3>Formación del equipo</h3><div class="grid four">${field('Horas de sesión general', pricing.trainingGeneralHours, 'proposalPricing', 'trainingGeneralHours', {type: 'number', min: 0, step: 'any'})}${field('Horas individuales por persona', pricing.trainingIndividualHoursPerPerson, 'proposalPricing', 'trainingIndividualHoursPerPerson', {type: 'number', min: 0, step: 'any'})}${field('Personas', pricing.trainingParticipants ?? company.staffCount, 'proposalPricing', 'trainingParticipants', {type: 'number', min: 0, step: 1})}${field('Tarifa de formación por hora (€)', pricing.trainingRatePerPersonHour, 'proposalPricing', 'trainingRatePerPersonHour', {type: 'number', min: 0, step: 'any'})}</div><p class="summary-note">La sesión general se cobra una vez para el grupo. Las horas individuales se cobran por cada persona. Puedes poner cero cuando una parte no haga falta.</p></div>
    <div class="pricing-controls"><h3>Mantenimiento</h3>${field('Porcentaje anual sobre la implantación de procesos (%)', pricing.maintenancePct, 'proposalPricing', 'maintenancePct', {type: 'number', min: 0, step: 'any', hint: 'La cuota mensual usa solo el precio principal de implantación de procesos, sin formación ni servicios añadidos, y lo divide entre 12.'})}</div>
    <div class="budget-actions"><button class="secondary" data-action="budget-suggest">Sugerir partidas a partir del diagnóstico</button><button class="secondary" data-action="budget-print" ${proposal.lines.length ? '' : 'disabled'}>Imprimir o guardar PDF</button></div>
    <p class="summary-note">Las horas sugeridas de los procesos son una estimación de tu trabajo interno. El precio principal sale de los KPI de los procesos elegidos, no de multiplicar esas horas por una tarifa.</p>
    <div class="entry-list budget-list">${proposal.lines.map(line => budgetLineCard(line, company)).join('') || '<p class="empty">Todavía no hay partidas. Añade una intervención evaluada o usa las sugerencias.</p>'}</div>
    ${available ? `<div class="budget-choices"><h3>Intervenciones disponibles</h3>${available}</div>` : ''}
    ${availableServices ? `<div class="budget-choices"><h3>Servicios de valor añadido disponibles</h3><p class="summary-note">Las horas vienen del diagnóstico. Aquí ajustas tarifa y costes para calcular el precio.</p>${availableServices}</div>` : ''}
    <div id="budget-summary">${budgetSummaryMarkup(company)}</div>
    ${field('Supuestos y límites de la propuesta', proposal.notes, 'proposal', 'notes', {rows: 3, placeholder: 'Qué se validará antes de implantar y qué queda fuera'})}`;
}

function clientReportMarkup(company) {
  const proposal = company.proposal ?? {title: `Propuesta para ${company.name}`, summary: '', notes: '', lines: []};
  const pricing = proposal.pricing ?? defaultProposalPricing(company);
  const quote = calculateProposalPricing(company, {...proposal, pricing});
  const sales = company.salesOpportunity ? calculateSalesScenario(company.salesOpportunity, company.workingDaysPerWeek) : null;
  const selectedValueCount = proposal.lines.filter(line => line.included !== false && line.valueServiceId).length;
  const participants = pricing.trainingParticipants ?? company.staffCount;
  const reportActions = proposal.lines.map(line => {
    const included = line.included !== false;
    const amount = line.processId ? (quote?.processPrices?.[line.processId] ?? 0) + (line.externalCost ?? 0)
      : line.hours * line.hourlyRate + line.externalCost;
    return `<details class="report-action ${included ? '' : 'excluded'}"><summary><span><strong>${escapeHtml(line.title)}</strong><small>${included ? 'Incluido en la propuesta' : 'Fuera de la propuesta'}</small></span><b>${included && quote ? moneyCents(amount) : 'No incluido'}</b></summary><div class="report-action-detail"><p>${escapeHtml(line.detail)}</p><button class="secondary" data-action="budget-toggle" data-id="${escapeHtml(line.id)}">${included ? 'Quitar de la propuesta' : 'Volver a incluir'}</button></div></details>`;
  }).join('');
  return `<section class="client-report" aria-label="Presentación para el cliente">
    <div class="report-hero"><div class="report-brand"><img src="./assets/consultorai-mark-v1.png" alt=""><span>ConsultorAI</span></div><span class="report-label">Propuesta preliminar${company.sample ? ' · caso ficticio' : ''}</span><h2>${escapeHtml(company.name)}</h2><p>${escapeHtml(proposal.summary || `Oportunidades de inteligencia artificial para ${company.sector.toLowerCase()}.`)}</p></div>
    <div class="report-body"><div class="report-lead"><div><span class="report-kicker">Diagnóstico</span><h3>Qué podría mejorar</h3></div><p>Estimaciones para los procesos descritos. Se validarán con datos y pruebas antes de implantar.</p></div>
      <div class="report-metrics">
        <div class="report-metric"><span>Tiempo que podría liberarse</span><strong>${quote?.selectedProcessCount ? `${number(quote.freedHoursMonthly)} h/mes` : 'Por estimar'}</strong><small>Estimación mensual para los procesos propuestos</small></div>
        <div class="report-metric"><span>Productividad posible</span><strong>${quote?.productivityPct === null || !quote ? 'Por estimar' : `${number(quote.productivityPct)} %`}</strong><small>Más capacidad por hora en esos procesos; deriva del mismo tiempo</small></div>
        <div class="report-metric"><span>Ventas posibles</span><strong>${sales ? money(sales.extraRevenueMonthly) : 'Por estimar'}</strong><small>Facturación adicional mensual, sujeta a demanda y capacidad</small></div>
        <div class="report-metric"><span>Servicios de valor</span><strong>${selectedValueCount || 'Por proponer'}</strong><small>Servicios de IA incluidos en la propuesta</small></div>
      </div>
      <div class="report-columns"><div><span class="report-kicker">Intervenciones</span><h3>Plan propuesto</h3><p class="report-action-help">Abre cada intervención para ver su alcance. Puedes quitarla o recuperarla y el presupuesto se actualizará.</p>${reportActions || '<p class="report-empty">Selecciona intervenciones en la vista interna para preparar esta propuesta.</p>'}${quote?.trainingPrice ? `<div class="report-training"><span class="report-training-icon" aria-hidden="true">＋</span><div><strong>Formación del equipo</strong><p>${number(pricing.trainingGeneralHours)} h de sesión común para el grupo y ${number(pricing.trainingIndividualHoursPerPerson)} h individuales para cada una de ${number(participants)} personas. Tarifa: ${moneyCents(pricing.trainingRatePerPersonHour)}/h. Importe: ${moneyCents(quote.trainingPrice)}.</p></div></div>` : ''}</div>
      <div class="report-price"><span class="report-kicker">Presupuesto</span><h3>${escapeHtml(proposal.title || `Propuesta para ${company.name}`)}</h3><strong>${quote ? moneyCents(quote.setup) : 'Pendiente'}</strong><span>Factura única estimada, sin impuestos</span>${quote ? `<p>Implantación de procesos: ${moneyCents(quote.corePrice)}</p><p>Formación: ${moneyCents(quote.trainingPrice)}</p>${quote.valueServicesPrice ? `<p>Servicios añadidos: ${moneyCents(quote.valueServicesPrice)}</p>` : ''}${quote.externalProcessCosts ? `<p>Costes externos: ${moneyCents(quote.externalProcessCosts)}</p>` : ''}<p>Mantenimiento: ${moneyCents(quote.monthlyMaintenance)}/mes</p>` : ''}<small>Alcance y resultados sujetos a validación.</small></div></div>
      ${quote ? `<div class="report-calculation"><span class="report-kicker">Precio explicado</span><h3>Cómo se calcula el precio</h3><div class="report-calc-grid">
        <div class="report-calc-step"><span>01 · Valor mensual estimado</span><strong>${moneyCents(quote.timeValueMonthly)}</strong><small>${number(Math.max(0, quote.freedHoursMonthly))} h que podrían liberarse × ${moneyCents(company.hourlyCost)}/h de la empresa</small></div>
        <div class="report-calc-step"><span>02 · Implantación de procesos</span><strong>${moneyCents(quote.corePrice)}</strong><small>(${moneyCents(quote.timeValueMonthly)}${quote.salesMarginMonthly ? ` + ${moneyCents(quote.salesMarginMonthly)} de margen adicional de ventas` : ''}) × ${number(pricing.benefitMonths)} meses × ${number(pricing.capturePct)} %</small></div>
        <div class="report-calc-step"><span>03 · Formación</span><strong>${moneyCents(quote.trainingPrice)}</strong><small>(${number(pricing.trainingGeneralHours)} h comunes + ${number(pricing.trainingIndividualHoursPerPerson)} h × ${number(participants)} personas) × ${moneyCents(pricing.trainingRatePerPersonHour)}/h</small></div>
        <div class="report-calc-step report-calc-total"><span>04 · Factura única</span><strong>${moneyCents(quote.setup)}</strong><small>Implantación + formación${quote.valueServicesPrice ? ' + servicios añadidos' : ''}${quote.externalProcessCosts ? ' + costes externos' : ''}, sin impuestos</small></div>
      </div><div class="report-maintenance"><strong>Mantenimiento mensual: ${moneyCents(quote.monthlyMaintenance)}</strong><span>${number(pricing.maintenancePct)} % anual de ${moneyCents(quote.corePrice)} de implantación de procesos, dividido entre 12. Formación y servicios añadidos quedan fuera.</span></div><p>La productividad refleja las mismas horas liberadas y no se cobra por segunda vez. Todas las cifras son estimaciones pendientes de validación.</p></div>` : ''}
      ${proposal.notes?.trim() ? `<div class="report-notes"><strong>Supuestos y límites</strong><p>${escapeHtml(proposal.notes)}</p></div>` : ''}
      <p class="report-footer">Los indicadores son escenarios, no resultados medidos ni ahorro de caja garantizado. Precio, formación y mantenimiento son hipótesis editables que se confirmarán con el alcance.</p>
      <button class="primary report-print" data-action="budget-print">Imprimir o guardar PDF</button>
    </div>
  </section>`;
}

function processCard(item, index) {
  return `<details class="entry" aria-label="Proceso ${index + 1}"><summary class="compact-summary"><span><strong>${escapeHtml(item.name || `Nuevo proceso ${index + 1}`)}</strong><small>${number(item.volume)} ${escapeHtml(item.unit || 'unidades')} por ${escapeHtml(PERIODS[item.period] || 'periodo pendiente')} · ${number(item.minutes)} min/unidad</small></span><span class="summary-cue">Editar proceso</span></summary><div class="entry-details">
    <div class="entry-top"><span class="entry-count">Proceso ${index + 1}</span><button class="text-button danger" data-action="remove" data-kind="processes" data-id="${item.id}">Quitar</button></div>
    <div class="grid two">${field('Nombre del proceso', item.name, 'processes', 'name', {id: item.id, placeholder: 'Ej. preparación de encargos'})}${field('Herramientas actuales', item.currentTools, 'processes', 'currentTools', {id: item.id, placeholder: 'Ej. agenda, correo'})}</div>
    ${field('Qué trabajo se hace', item.description, 'processes', 'description', {id: item.id, rows: 2})}
    <div class="grid four">${field('Volumen', item.volume, 'processes', 'volume', {id: item.id, type: 'number', min: 0, step: 'any'})}${field('Unidad de trabajo', item.unit, 'processes', 'unit', {id: item.id, placeholder: 'pedidos, remesas...'})}${periodField('processes', item.id, item.period)}${field('Minutos por unidad', item.minutes, 'processes', 'minutes', {id: item.id, type: 'number', min: 0, step: 'any'})}</div>
    ${field('Notas y origen de la cifra', item.notes, 'processes', 'notes', {id: item.id, rows: 2})}
  </div></details>`;
}

function metricCard(item, index) {
  const amount = item.kind === 'range' ? `${number(item.minValue)}–${number(item.maxValue)}` : number(item.value);
  const amountFields = item.kind === 'range'
    ? `${field('Mínimo estimado', item.minValue, 'metrics', 'minValue', {id: item.id, type: 'number', min: 0, step: 'any'})}${field('Máximo estimado', item.maxValue, 'metrics', 'maxValue', {id: item.id, type: 'number', min: 0, step: 'any'})}`
    : field('Valor', item.value, 'metrics', 'value', {id: item.id, type: 'number', min: 0, step: 'any'});
  return `<details class="entry compact" aria-label="Indicador ${index + 1}"><summary class="compact-summary"><span><strong>${escapeHtml(item.label || `Nuevo indicador ${index + 1}`)}</strong><small>${amount} ${escapeHtml(item.unit || 'unidades')} por ${escapeHtml(PERIODS[item.period] || 'periodo pendiente')}</small></span><span class="summary-cue">Editar indicador</span></summary><div class="entry-details">
    <div class="entry-top"><span class="entry-count">Indicador ${index + 1}</span><button class="text-button danger" data-action="remove" data-kind="metrics" data-id="${item.id}">Quitar</button></div>
    <div class="grid ${item.kind === 'range' ? 'five' : 'four'}">${field('Etiqueta', item.label, 'metrics', 'label', {id: item.id, placeholder: 'Ej. pedidos recibidos'})}${amountFields}${field('Unidad', item.unit, 'metrics', 'unit', {id: item.id, placeholder: 'pedidos'})}${periodField('metrics', item.id, item.period)}</div>
    ${field('Nota o supuesto', item.note, 'metrics', 'note', {id: item.id, placeholder: 'De dónde procede esta cifra'})}
  </div></details>`;
}

function revenueCard(item, index) {
  const detail = `${number(item.quantity)} ${escapeHtml(item.billingUnit || 'unidades facturadas')} × ${money(item.unitPrice)} por ${escapeHtml(PERIODS[item.period] || 'periodo pendiente')}${item.includedServices ? ` · ${escapeHtml(item.includedServices)}` : ''}`;
  return `<details class="entry compact" aria-label="Línea de facturación ${index + 1}"><summary class="compact-summary"><span><strong>${escapeHtml(item.label || `Nueva línea ${index + 1}`)}</strong><small>${detail}</small></span><span class="summary-cue">Editar línea</span></summary><div class="entry-details">
    <div class="entry-top"><span class="entry-count">Línea ${index + 1}</span><button class="text-button danger" data-action="remove" data-kind="revenueStreams" data-id="${item.id}">Quitar</button></div>
    <div class="grid four">${field('Servicio o ingreso', item.label, 'revenueStreams', 'label', {id: item.id})}${field('Cantidad facturada', item.quantity, 'revenueStreams', 'quantity', {id: item.id, type: 'number', min: 0, step: 'any', hint: 'Si cobras una cuota por cliente, cuenta clientes, no cada gestión incluida.'})}${field('Cuota o precio por unidad (€)', item.unitPrice, 'revenueStreams', 'unitPrice', {id: item.id, type: 'number', min: 0, step: 'any'})}${periodField('revenueStreams', item.id, item.period)}</div>
    <div class="grid two">${field('Unidad facturada', item.billingUnit || 'unidades facturadas', 'revenueStreams', 'billingUnit', {id: item.id, placeholder: 'Ej. clientes con cuota'})}${field('Trabajo incluido (opcional)', item.includedServices || '', 'revenueStreams', 'includedServices', {id: item.id, placeholder: 'Ej. 450 gestiones fiscales al mes'})}</div>
    ${field('Margen estimado (%)', item.grossMarginPct, 'revenueStreams', 'grossMarginPct', {id: item.id, type: 'number', min: 0, step: 'any', hint: 'Opcional. Ayudará a valorar las ventas extra en una etapa posterior.'})}
    ${field('Nota o supuesto', item.note, 'revenueStreams', 'note', {id: item.id})}
  </div></details>`;
}

function summaryMarkup(item) {
  const hours = monthlyHours(item);
  const validHours = Number.isFinite(hours);
  return `<div class="summary-grid overview-grid">
    <div class="summary-item"><span>Plantilla</span><strong>${Number.isFinite(item.staffCount) ? number(item.staffCount) : '—'}</strong><small>personas en esta empresa</small></div>
    <div class="summary-item"><span>Tiempo actual descrito</span><strong>${validHours ? `${number(hours)} h` : '—'}</strong><small>promedio mensual de los procesos añadidos</small></div>
    <div class="summary-item"><span>Coste de ese tiempo</span><strong>${validHours && item.hourlyCost !== null && Number.isFinite(item.hourlyCost) ? money(hours * item.hourlyCost) : 'Sin dato'}</strong><small>al mes; coste horario editable</small></div>
  </div><p class="summary-note">El trabajo trimestral se reparte entre tres meses para mostrar una media. Esta carga y su coste son actuales; los posibles cambios se estiman más abajo por separado.</p>`;
}

function renderSidebar() {
  const list = root.querySelector('#company-list');
  if (!list) return;
  list.innerHTML = state.cases.map(item => `<button class="company ${item.id === state.activeId ? 'active' : ''}" data-action="select" data-id="${item.id}" ${item.id === state.activeId ? 'aria-current="true"' : ''}><span class="company-mark">${escapeHtml((item.name || '?').charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(item.name || 'Empresa sin nombre')}</strong><small>${escapeHtml(item.sector || 'Sector pendiente')}</small></span></button>`).join('');
}

function renderStatus() {
  const status = root.querySelector('#save-status');
  if (!status) return;
  status.textContent = dirty ? 'Cambios sin guardar' : 'Todo guardado en este navegador';
  status.className = dirty ? 'save-status dirty' : 'save-status';
  const save = root.querySelector('#save-button');
  if (save) save.disabled = !dirty;
}

function render() {
  const item = activeCase();
  root.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon"><img src="./assets/consultorai-mark-v1.png" alt=""></div><div><strong>ConsultorAI</strong><small>Cuaderno de consultoría</small></div></div>
      <div class="sidebar-heading"><span>Empresas</span><span class="count">${state.cases.length}</span></div>
      <nav id="company-list" aria-label="Empresas"></nav>
      <button class="new-button" data-action="new">+ Nueva empresa</button>
      <div class="sidebar-bottom"><button class="text-button" data-action="restore">Restaurar gestoría de ejemplo</button><p>Los datos se guardan solo en este navegador. Usa casos ficticios para esta demo.</p></div>
    </aside>
    <main class="main ${clientMode ? 'mode-client' : ''}">
      <header class="topbar"><div><span class="eyebrow">ConsultorAI · ${clientMode ? 'presentación' : 'espacio de trabajo'}</span><h1>${item ? escapeHtml(item.name || 'Nueva empresa') : 'Empieza con una empresa'}</h1><p>${clientMode ? 'Vista preparada para explicar la propuesta.' : 'Describe el negocio, revisa oportunidades y prepara una propuesta.'}</p></div><div class="topbar-actions"><div class="mode-switch" role="group" aria-label="Modo de visualización"><button data-action="mode-internal" aria-pressed="${!clientMode}" class="${!clientMode ? 'selected' : ''}">Uso interno</button><button data-action="mode-client" aria-pressed="${clientMode}" class="${clientMode ? 'selected' : ''}">Presentar al cliente</button></div><div class="save-area"><span id="save-status" role="status"></span><button id="save-button" class="primary" data-action="save">Guardar cambios</button></div></div></header>
      <div class="phase-row" role="group" aria-label="Pasos de trabajo"><button class="phase ${currentPhase === 'datos' ? 'current' : ''}" data-action="phase" data-id="datos">01 · Datos y procesos</button><button class="phase ${currentPhase === 'diagnostico' ? 'current' : ''}" data-action="phase" data-id="diagnostico">02 · Diagnóstico e impacto</button><button class="phase ${currentPhase === 'presupuesto' ? 'current' : ''}" data-action="phase" data-id="presupuesto">03 · Propuesta y presupuesto</button></div>
      ${errorMessage ? `<div class="notice error" role="alert">${escapeHtml(errorMessage)}</div>` : ''}
      ${item ? `<div id="client-report">${clientReportMarkup(item)}</div><div class="content" data-current-phase="${currentPhase}">
        <section class="overview" data-phase="datos" aria-labelledby="overview-heading"><div class="section-head"><div><span class="eyebrow">Vista del caso</span><h2 id="overview-heading">Carga actual</h2></div><span class="sample-tag">${item.sample ? 'Ejemplo ficticio' : 'Caso creado aquí'}</span></div><div id="summary">${summaryMarkup(item)}</div></section>
        <section class="panel" data-phase="datos" aria-labelledby="company-heading"><div class="section-head"><div><span class="eyebrow">01 · Perfil</span><h2 id="company-heading">La empresa</h2></div><button class="text-button danger" data-action="delete">Eliminar caso</button></div>
          <div class="grid two">${field('Nombre de la empresa', item.name, 'case', 'name', {placeholder: 'Nombre ficticio'})}${field('Sector', item.sector, 'case', 'sector', {placeholder: 'Cualquier actividad'})}</div>
          ${field('Descripción del negocio', item.description, 'case', 'description', {rows: 2, placeholder: 'Qué vende y cómo trabaja'})}
          <div class="grid three">${field('Personas en plantilla', item.staffCount, 'case', 'staffCount', {type: 'number', min: 0, step: 1})}${field('Días de trabajo por semana', item.workingDaysPerWeek, 'case', 'workingDaysPerWeek', {type: 'number', min: 1, step: 1})}${field('Coste horario interno (€)', item.hourlyCost, 'case', 'hourlyCost', {type: 'number', min: 0, step: 'any', hint: 'Opcional. Nunca se interpreta como ahorro.'})}</div>
          ${field('Cómo se estimó el coste horario', item.hourlyCostNote, 'case', 'hourlyCostNote', {rows: 2})}
        </section>
        <section class="panel" data-phase="datos" aria-labelledby="process-heading"><div class="section-head"><div><span class="eyebrow">02 · Servicios y tareas</span><h2 id="process-heading">Procesos que realiza</h2><p>El volumen y el tiempo deben usar la misma unidad de trabajo.</p></div><button class="secondary" data-action="add" data-kind="processes">+ Añadir proceso</button></div><div class="entry-list">${item.processes.map(processCard).join('') || '<p class="empty">Añade el primer proceso de esta empresa.</p>'}</div></section>
        <section class="panel" data-phase="datos" aria-labelledby="metric-heading"><div class="section-head"><div><span class="eyebrow">Contexto</span><h2 id="metric-heading">Indicadores del negocio</h2><p>Datos de contexto editables. Los cálculos de tiempo usan los procesos de arriba.</p></div><button class="secondary" data-action="add" data-kind="metrics">+ Añadir indicador</button></div><div class="entry-list">${item.metrics.map(metricCard).join('') || '<p class="empty">Sin indicadores todavía.</p>'}</div></section>
        <section class="panel" data-phase="datos" aria-labelledby="revenue-heading"><div class="section-head"><div><span class="eyebrow">Contexto opcional</span><h2 id="revenue-heading">Facturación estimada</h2><p>${item.sampleKey === 'gestoria' ? 'En esta gestoría, la cuota se cobra por cliente y puede incluir varias gestiones. La cantidad facturada cuenta clientes con cuota; el trabajo incluido se anota aparte.' : 'Indica qué unidad paga cada precio. Una unidad facturada puede incluir varias tareas.'} Esta sección da contexto y no interviene en el diagnóstico, el impacto ni el presupuesto.</p></div><button class="secondary" data-action="add" data-kind="revenueStreams">+ Añadir línea</button></div><div class="entry-list">${item.revenueStreams.map(revenueCard).join('') || '<p class="empty">Puedes dejar la facturación sin rellenar.</p>'}</div></section>
        <section class="panel" data-phase="diagnostico" aria-labelledby="evaluation-heading"><div class="section-head"><div><span class="eyebrow">Diagnóstico</span><h2 id="evaluation-heading">Oportunidades de IA</h2><p>La aplicación orienta con criterios visibles. Tú puedes cambiar la conclusión y explicar el motivo. No necesita conexión con un modelo externo.</p></div></div><div class="entry-list">${item.processes.map((process, index) => assessmentCard(process, index, item)).join('') || '<p class="empty">Añade procesos para evaluarlos.</p>'}</div></section>
        <section class="overview" data-phase="diagnostico" aria-labelledby="impact-heading"><div class="section-head"><div><span class="eyebrow">Impacto posible</span><h2 id="impact-heading">Tiempo y productividad</h2></div><span class="sample-tag">Escenarios, no resultados</span></div><div id="impact">${impactMarkup(item)}</div></section>
        <section class="panel" data-phase="diagnostico" aria-labelledby="sales-heading"><div class="section-head"><div><span class="eyebrow">Impacto posible</span><h2 id="sales-heading">Ventas adicionales</h2><p>La estimación usa el menor valor entre demanda y capacidad. No se convierte automáticamente en beneficio.</p></div></div><div id="sales-impact">${opportunityCard(item, 'salesOpportunity')}</div></section>
        <section class="panel" data-phase="diagnostico" aria-labelledby="value-heading"><div class="section-head"><div><span class="eyebrow">Diagnóstico</span><h2 id="value-heading">Servicios de valor añadido</h2><p>Define nuevas capacidades de IA para esta empresa. Desglosa tus acciones y horas de implantación; el precio se fija después en el presupuesto. No cuentes aquí de nuevo el ahorro de tiempo ni las ventas.</p></div><button class="secondary" data-action="value-service-add">+ Añadir servicio</button></div><div id="value-services" class="entry-list">${(item.valueServices ?? []).map(valueServiceCard).join('') || '<p class="empty">Aún no hay servicios de valor añadido para esta empresa.</p>'}</div></section>
        <section class="panel proposal-panel" data-phase="presupuesto" id="proposal-section" aria-labelledby="proposal-heading"><div class="section-head"><div><span class="eyebrow">Propuesta final</span><h2 id="proposal-heading">Intervenciones y presupuesto</h2><p>Elige qué implantar. Las partidas y precios se pueden corregir para cada empresa.</p></div><span class="sample-tag">Borrador editable</span></div>${proposalMarkup(item)}</section>
      </div>` : '<p class="empty">Crea una empresa para comenzar.</p>'}
    </main>
  </div>`;
  renderSidebar();
  renderStatus();
}

function markDirty() {
  dirty = true;
  errorMessage = '';
  renderStatus();
}

function refreshCompactSummary(target, scope, record, company, process) {
  const details = target.closest('details.entry');
  if (!details) return;
  const title = details.querySelector('.compact-summary strong');
  const detail = details.querySelector('.compact-summary small');
  if (scope === 'processes') {
    title.textContent = record.name || 'Nuevo proceso';
    detail.textContent = `${number(record.volume)} ${record.unit || 'unidades'} por ${PERIODS[record.period] || 'periodo pendiente'} · ${number(record.minutes)} min/unidad`;
  } else if (scope === 'metrics') {
    title.textContent = record.label || 'Nuevo indicador';
    const amount = record.kind === 'range' ? `${number(record.minValue)}–${number(record.maxValue)}` : number(record.value);
    detail.textContent = `${amount} ${record.unit || 'unidades'} por ${PERIODS[record.period] || 'periodo pendiente'}`;
  } else if (scope === 'revenueStreams') {
    title.textContent = record.label || 'Nueva línea';
    detail.textContent = `${number(record.quantity)} ${record.billingUnit || 'unidades facturadas'} × ${money(record.unitPrice)} por ${PERIODS[record.period] || 'periodo pendiente'}${record.includedServices ? ` · ${record.includedServices}` : ''}`;
  } else if (scope === 'budgetLine') {
    title.textContent = record.title || 'Partida';
    detail.textContent = budgetLineSummary(record, company);
  } else if (scope === 'assessment' || scope === 'scenario') {
    const advice = recommend(process.assessment);
    detail.textContent = `${CATEGORY_LABELS[process.consultantDecision || advice?.category] || 'Pendiente de evaluar'} · ${processResultText(process, company.workingDaysPerWeek)}`;
  } else if (scope === 'valueServices' || scope === 'valueAction') {
    const service = company.valueServices.find(entry => entry.id === details.dataset.serviceId);
    if (service) {
      title.textContent = service.name || 'Servicio sin nombre';
      detail.textContent = `${number(valueServiceHours(service))} h propias de implantación · estimación editable`;
      details.querySelector('.value-hours').textContent = `${number(valueServiceHours(service))} horas propias estimadas · el precio se fija después en Propuesta y presupuesto`;
    }
  }
}

function discardIfNeeded() {
  if (!dirty) return true;
  if (!window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?')) return false;
  state = clone(savedState);
  dirty = false;
  return true;
}

function save() {
  const item = activeCase();
  const errors = item ? validateCase(item) : ['No hay empresa seleccionada.'];
  if (errors.length) {
    errorMessage = `Revisa estos datos antes de guardar: ${errors.join(' ')}`;
    render();
    root.querySelector('.notice')?.scrollIntoView({behavior: 'smooth', block: 'center'});
    return;
  }
  try {
    persistState(localStorage, state);
    savedState = clone(state);
    dirty = false;
    errorMessage = '';
    render();
  } catch {
    errorMessage = 'No se pudo guardar en este navegador. Comprueba el espacio disponible o prueba otro navegador.';
    render();
  }
}

root.addEventListener('input', event => {
  const target = event.target.closest('[data-scope]');
  if (!target) return;
  const item = activeCase();
  const scope = target.dataset.scope;
  const process = item.processes.find(entry => entry.id === target.dataset.id);
  const valueService = (item.valueServices ?? []).find(entry => entry.id === target.closest('.value-service')?.dataset.serviceId);
  const record = scope === 'case' ? item : scope === 'assessment' ? (process.assessment ??= {})
    : scope === 'scenario' ? (process.scenario ??= {})
    : scope === 'proposal' ? (item.proposal ??= {title: '', summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing(item)})
    : scope === 'proposalPricing' ? (item.proposal ??= {title: '', summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing(item)}).pricing
    : scope === 'budgetLine' ? item.proposal?.lines.find(line => line.id === target.dataset.id)
    : scope === 'valueAction' ? valueService?.actions.find(action => action.id === target.dataset.id)
    : ['salesOpportunity', 'valueOpportunity'].includes(scope) ? (item[scope] ??= {})
    : item[scope]?.find(entry => entry.id === target.dataset.id);
  if (!record) return;
  const fieldName = target.dataset.field;
  const numeric = target.type === 'number';
  record[fieldName] = numeric ? (target.value === '' ? (['hourlyCost', 'consultantCostPerHour', 'grossMarginPct', 'valuePerImprovedUnit', 'adoptionPct', 'timeReductionPct', 'reviewMinutes', 'demand', 'capacity', 'unitPrice', 'eligibleUnits', 'baselineCoveragePct', 'targetCoveragePct', 'trainingParticipants'].includes(fieldName) ? null : NaN) : Number(target.value)) : target.value;
  markDirty();
  refreshCompactSummary(target, scope, record, item, process);
  if (valueService && ['valueServices', 'valueAction'].includes(scope)) {
    const line = item.proposal?.lines.find(entry => entry.valueServiceId === valueService.id);
    if (line) {
      if (scope === 'valueServices' && fieldName === 'name') line.title = valueService.name;
      if (scope === 'valueAction' && fieldName === 'hours') line.hours = valueServiceHours(valueService);
      if (scope === 'valueAction' && fieldName === 'title') line.detail = valueService.actions.map(action => action.title).filter(Boolean).join('; ');
      const lineNode = [...root.querySelectorAll('.budget-line')].find(element => element.dataset.lineId === line.id);
      if (lineNode) lineNode.outerHTML = budgetLineCard(line, item);
      root.querySelector('#budget-summary').innerHTML = budgetSummaryMarkup(item);
    }
  }
  root.querySelector('#summary').innerHTML = summaryMarkup(item);
  if (scope === 'scenario' || scope === 'assessment' || scope === 'processes') {
    root.querySelector('#impact').innerHTML = impactMarkup(item);
    if (process && (scope === 'scenario' || ['volume', 'minutes', 'period'].includes(fieldName))) {
      const card = [...root.querySelectorAll('.assessment-card')].find(element => element.dataset.processId === process.id);
      if (card) card.querySelector('.result-line').textContent = processResultText(process, item.workingDaysPerWeek);
    }
    if (scope === 'assessment') {
      const card = target.closest('.assessment-card');
      const recommendation = recommend(process.assessment);
      card.querySelector('.recommendation').innerHTML = recommendation
        ? `<strong>Orientación basada en criterios: ${CATEGORY_LABELS[recommendation.category]}</strong><p>${escapeHtml(recommendation.reasons.join('; '))}</p><small>${recommendation.skill ? 'Podría convenir una skill. ' : ''}${recommendation.reviewHuman ? 'Revisión humana necesaria.' : 'Revisar antes de implantar.'}</small>`
        : '<strong>Orientación basada en criterios: faltan criterios</strong><p>Completa los seis criterios para obtener una orientación.</p>';
    }
  }
  if (scope === 'case' && fieldName === 'workingDaysPerWeek') {
    root.querySelector('#impact').innerHTML = impactMarkup(item);
    for (const card of root.querySelectorAll('.assessment-card')) {
      const entry = item.processes.find(process => process.id === card.dataset.processId);
      if (entry) card.querySelector('.result-line').textContent = processResultText(entry, item.workingDaysPerWeek);
    }
  }
  if (['salesOpportunity', 'valueOpportunity'].includes(scope)) {
    const result = scope === 'salesOpportunity' ? calculateSalesScenario(record, item.workingDaysPerWeek) : calculateValueScenario(record, item.workingDaysPerWeek);
    const resultNode = target.closest('.entry').querySelector('.result-line');
    resultNode.textContent = result ? scope === 'salesOpportunity'
      ? `${number(result.extraUnitsMonthly)} unidades adicionales/mes · ${money(result.extraRevenueMonthly)} de ventas potenciales/mes${result.extraMarginMonthly === null ? '' : ` · ${money(result.extraMarginMonthly)} de margen potencial`}`
      : `${number(result.extraEnhancedUnitsMonthly)} entregas mejoradas/mes · cobertura ${number(record.baselineCoveragePct)} % → ${number(record.targetCoveragePct)} %${result.potentialValueMonthly === null || !record.valueSource?.trim() ? '' : ` · ${money(result.potentialValueMonthly)} de valoración estimada/mes`}`
      : 'No estimable: completa los datos del escenario.';
  }
  if (scope === 'budgetLine') {
    const lineNode = target.closest('.budget-line');
    lineNode.querySelector('.line-total').textContent = budgetLineSummary(record, item);
    root.querySelector('#budget-summary').innerHTML = budgetSummaryMarkup(item);
  }
  if (['proposal', 'proposalPricing', 'case', 'scenario', 'assessment', 'processes', 'salesOpportunity', 'valueAction'].includes(scope)) {
    root.querySelector('#budget-summary').innerHTML = budgetSummaryMarkup(item);
  }
  root.querySelector('#client-report').innerHTML = clientReportMarkup(item);
  if (scope === 'case' && ['name', 'sector'].includes(fieldName)) {
    root.querySelector('h1').textContent = item.name || 'Nueva empresa';
    renderSidebar();
  }
});

root.addEventListener('change', event => {
  if (event.target.matches('select[data-scope]')) event.target.dispatchEvent(new Event('input', {bubbles: true}));
});

root.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const {action, id, kind} = button.dataset;
  if (action === 'mode-client' || action === 'mode-internal') {
    clientMode = action === 'mode-client';
    render(); window.scrollTo({top: 0}); return;
  }
  if (action === 'phase' && ['datos', 'diagnostico', 'presupuesto'].includes(id)) {
    currentPhase = id;
    render(); window.scrollTo({top: 0}); return;
  }
  if (action === 'save') return save();
  if (action === 'budget-print') {clientMode = true; render(); window.print(); return;}
  if (action === 'budget-suggest') {
    const item = activeCase();
    const proposal = item.proposal ??= {title: `Propuesta para ${item.name}`, summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing(item)};
    const selected = new Set(proposal.lines.map(line => line.processId));
    proposal.lines.push(...suggestBudgetLines(item, recommend).filter(line => !selected.has(line.processId)));
    if (!proposal.summary) proposal.summary = `Implantar las intervenciones seleccionadas en ${item.name}, con pruebas y revisión antes de su uso.`;
    if (!proposal.notes) proposal.notes = 'Importes y dedicación de ejemplo, sujetos a validar el alcance, los datos y los costes de servicios externos. Impuestos no incluidos.';
    markDirty(); render(); root.querySelector('#proposal-section')?.scrollIntoView({block: 'start'}); return;
  }
  if (action === 'budget-add') {
    const item = activeCase();
    const process = item.processes.find(entry => entry.id === id);
    const category = process?.consultantDecision || recommend(process?.assessment)?.category;
    const line = process && suggestBudgetLine(item, process, category);
    if (!line) return;
    const proposal = item.proposal ??= {title: `Propuesta para ${item.name}`, summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing(item)};
    if (!proposal.lines.some(entry => entry.processId === id)) proposal.lines.push(line);
    markDirty(); render(); root.querySelector('#proposal-section')?.scrollIntoView({block: 'start'}); return;
  }
  if (action === 'budget-add-value') {
    const item = activeCase();
    const service = (item.valueServices ?? []).find(entry => entry.id === id);
    const line = service && suggestValueServiceBudgetLine(service);
    if (!line) return;
    const proposal = item.proposal ??= {title: `Propuesta para ${item.name}`, summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing(item)};
    if (!proposal.lines.some(entry => entry.valueServiceId === id)) proposal.lines.push(line);
    markDirty(); render(); root.querySelector('#proposal-section')?.scrollIntoView({block: 'start'}); return;
  }
  if (action === 'budget-remove') {
    const proposal = activeCase().proposal;
    if (!proposal) return;
    proposal.lines = proposal.lines.filter(line => line.id !== id);
    markDirty(); render(); root.querySelector('#proposal-section')?.scrollIntoView({block: 'start'}); return;
  }
  if (action === 'budget-toggle') {
    const line = activeCase()?.proposal?.lines.find(entry => entry.id === id);
    if (!line) return;
    const scrollY = window.scrollY;
    line.included = line.included === false;
    markDirty(); render(); window.scrollTo({top: scrollY}); return;
  }
  if (action === 'select') {
    if (id === state.activeId || !discardIfNeeded()) return;
    state.activeId = id;
    savedState.activeId = id;
    try {persistState(localStorage, savedState);} catch { /* El cambio de ficha sigue funcionando en esta sesión. */ }
    render();
    return;
  }
  if (action === 'new') {
    if (!discardIfNeeded()) return;
    const item = blankCase();
    state.cases.push(item);
    state.activeId = item.id;
    markDirty();
    render();
    return;
  }
  if (action === 'value-service-add') {
    const item = activeCase();
    const service = blankValueService();
    item.valueServices ??= [];
    item.valueServices.push(service);
    markDirty(); render();
    const details = [...root.querySelectorAll('.value-service')].find(entry => entry.dataset.serviceId === service.id);
    if (details) {details.open = true; details.scrollIntoView({block: 'center'});}
    return;
  }
  if (action === 'value-service-remove') {
    const item = activeCase();
    item.valueServices = (item.valueServices ?? []).filter(service => service.id !== id);
    if (item.proposal) item.proposal.lines = item.proposal.lines.filter(line => line.valueServiceId !== id);
    markDirty(); render(); return;
  }
  if (action === 'value-action-add') {
    const service = (activeCase().valueServices ?? []).find(entry => entry.id === id);
    if (!service) return;
    service.actions.push(blankValueAction());
    markDirty(); render();
    const details = [...root.querySelectorAll('.value-service')].find(entry => entry.dataset.serviceId === id);
    if (details) {details.open = true; details.scrollIntoView({block: 'center'});}
    return;
  }
  if (action === 'value-action-remove') {
    const item = activeCase();
    const service = (item.valueServices ?? []).find(entry => entry.actions.some(entryAction => entryAction.id === id));
    if (!service) return;
    service.actions = service.actions.filter(entry => entry.id !== id);
    const line = item.proposal?.lines.find(entry => entry.valueServiceId === service.id);
    if (line) {line.hours = valueServiceHours(service); line.detail = service.actions.map(entry => entry.title).join('; ');}
    markDirty(); render();
    const details = [...root.querySelectorAll('.value-service')].find(entry => entry.dataset.serviceId === service.id);
    if (details) details.open = true;
    return;
  }
  if (action === 'add') {
    const factories = {processes: blankProcess, metrics: blankMetric, revenueStreams: blankRevenue};
    if (!factories[kind]) return;
    activeCase()[kind].push(factories[kind]());
    markDirty();
    render();
    const targetSection = {processes: 'process-heading', metrics: 'metric-heading', revenueStreams: 'revenue-heading'}[kind];
    const details = root.querySelector(`#${targetSection}`)?.closest('section')?.querySelector('.entry-list details:last-child');
    if (details) {details.open = true; details.scrollIntoView({block: 'center'});}
    return;
  }
  if (action === 'remove') {
    const item = activeCase();
    item[kind] = item[kind].filter(entry => entry.id !== id);
    if (kind === 'processes' && item.proposal) item.proposal.lines = item.proposal.lines.filter(line => line.processId !== id);
    markDirty();
    render();
    return;
  }
  if (action === 'delete') {
    const item = activeCase();
    if (!window.confirm(`¿Eliminar el caso «${item.name || 'sin nombre'}»? Esta acción no se puede deshacer.`)) return;
    state.cases = state.cases.filter(entry => entry.id !== item.id);
    state.activeId = state.cases[0]?.id ?? null;
    try {persistState(localStorage, state); savedState = clone(state); dirty = false; render();}
    catch {errorMessage = 'No se pudo guardar la eliminación.'; render();}
    return;
  }
  if (action === 'restore') {
    const message = dirty
      ? '¿Restaurar la gestoría ficticia? Se descartarán los cambios sin guardar y se sustituirá solo la gestoría guardada. Los demás casos seguirán igual.'
      : '¿Restaurar solo la gestoría ficticia? Se sustituirán sus cambios guardados. Los demás casos seguirán igual.';
    if (!window.confirm(message)) return;
    if (dirty) {state = clone(savedState); dirty = false;}
    state = replaceGestoria(state);
    addExampleEvaluations(state);
    migrateValueServices(state);
    addExampleProposals(state);
    try {persistState(localStorage, state); savedState = clone(state); dirty = false; render();}
    catch {errorMessage = 'No se pudo guardar la restauración.'; render();}
  }
});

window.addEventListener('beforeunload', event => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

render();
