export const STORAGE_KEY = 'consultorai.hackaton.cases.v1';

export const PERIODS = {
  dia_laborable: 'día laborable',
  semana: 'semana',
  mes: 'mes',
  trimestre: 'trimestre',
  año: 'año',
};

export function monthlyFactor(period, workingDaysPerWeek = 5) {
  switch (period) {
    case 'dia_laborable': return workingDaysPerWeek * 52 / 12;
    case 'semana': return 52 / 12;
    case 'mes': return 1;
    case 'trimestre': return 1 / 3;
    case 'año': return 1 / 12;
    default: return NaN;
  }
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `case-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function defaultProposalPricing(company) {
  const complex = company.sampleKey === 'gestoria';
  return {
    capturePct: 30, benefitMonths: 12, includeSalesMargin: false, salesNonOverlapConfirmed: false,
    trainingGeneralHours: complex ? 3 : 1,
    trainingIndividualHoursPerPerson: complex ? 2 : 1,
    trainingParticipants: company.staffCount || null,
    trainingRatePerPersonHour: 40, maintenancePct: 30,
  };
}

export function blankCase() {
  return {
    id: newId(), name: '', sector: '', description: '', staffCount: 0,
    workingDaysPerWeek: 5, hourlyCost: null, hourlyCostNote: '',
    metrics: [], revenueStreams: [], processes: [], valueServices: [], proposal: {title: '', summary: '', notes: '', consultantCostPerHour: null, lines: [], pricing: defaultProposalPricing({staffCount: 0})}, sample: false,
  };
}

export function blankMetric() {
  return {id: newId(), label: '', value: 0, unit: '', period: 'mes', note: ''};
}

export function blankRevenue() {
  return {id: newId(), label: '', quantity: 0, billingUnit: 'unidades facturadas', unitPrice: 0, includedServices: '', grossMarginPct: null, period: 'mes', note: ''};
}

export function blankProcess() {
  return {id: newId(), name: '', description: '', volume: 0, period: 'mes', unit: '', minutes: 0, currentTools: '', notes: ''};
}

export function blankValueAction() {
  return {id: newId(), title: '', hours: 0};
}

export function blankValueService() {
  return {id: newId(), name: '', outcome: '', evidence: '', legacyNote: '', actions: []};
}

export function valueServiceHours(service) {
  return (service.actions ?? []).reduce((total, action) => total + action.hours, 0);
}

const metric = (label, value, unit, period, note = '') => ({...blankMetric(), label, value, unit, period, note});
const rangeMetric = (label, minValue, maxValue, unit, period, note = '') => ({
  ...blankMetric(), kind: 'range', label, value: null, minValue, maxValue, unit, period, note,
});
const revenue = (label, quantity, unitPrice, period, billingUnit, includedServices, note = '') => ({
  ...blankRevenue(), label, quantity, unitPrice, period, billingUnit, includedServices, note,
});
const process = (name, volume, period, unit, minutes, description, currentTools, notes = '') => ({
  ...blankProcess(), name, volume, period, unit, minutes, description, currentTools, notes,
});

export function gestoriaSample(id = newId()) {
  return {
    id, name: 'Gestoría Aurora', sector: 'Gestoría', sample: true, sampleKey: 'gestoria',
    description: 'Caso ficticio con seis personas en fiscal y dos en laboral. Las cifras son estimaciones para la demo.',
    staffCount: 8, workingDaysPerWeek: 5, hourlyCost: 19.07,
    hourlyCostNote: 'Estimación para esta gestoría ficticia: 8 personas × 2.200 € netos medios al mes. Se añade un único 30 % para aproximar el coste total de empresa: 2.860 € por persona y mes, 22.880 € para el equipo. Se estiman 150 horas efectivas al mes por persona (aprox. 225 jornadas de 8 horas al año, descontando vacaciones y festivos): 1.200 horas del equipo al mes. 22.880 € ÷ 1.200 h = 19,07 €/h. Supuestos de demo, editables; no son datos de nóminas reales.',
    metrics: [
      metric('Clientes fiscales', 240, 'clientes', 'mes', 'Tamaño supuesto de la cartera para la demo.'),
      metric('Clientes laborales', 200, 'clientes', 'mes', 'Supuesto ficticio para la demo.'),
      metric('Nóminas emitidas', 240, 'nóminas', 'mes', '200 clientes laborales y 240 nóminas al mes en total; algunos clientes tienen más de un empleado. El proceso de envío cuenta clientes destinatarios, no nóminas.'),
      rangeMetric('Documentos por cliente', 30, 50, 'documentos por cliente', 'mes', 'Estimación de documentos recibidos o gestionados por cliente y mes, no solo facturas. La recepción principal se agrupa por trimestre.'),
    ],
    revenueStreams: [
      revenue('Cuota fiscal mensual', 240, 275, 'mes', 'clientes con cuota', '450 gestiones fiscales al mes', 'Cuota ficticia por cliente y mes que incluye varias gestiones. Solo contexto; no interviene en los cálculos de impacto.'),
      revenue('Cuota laboral mensual', 200, 200, 'mes', 'clientes con cuota', '400 gestiones laborales al mes', 'Cuota ficticia por cliente y mes que incluye varias gestiones. Solo contexto; no interviene en los cálculos de impacto.'),
    ],
    processes: [
      process('Consultas de clientes', 600, 'semana', 'consultas', 6, 'Respuestas a consultas por correo o WhatsApp.', 'Correo y WhatsApp', 'Volumen ajustado durante la revisión del caso ficticio.'),
      process('Recepción y archivo de documentos', 450, 'trimestre', 'remesas de clientes', 8, 'Recibir y guardar cada remesa enviada por un cliente.', 'Correo y carpetas', '450 remesas por trimestre en el caso revisado. Cada cliente genera 30–50 documentos al mes; ocho minutos por remesa completa, no por documento.'),
      process('Preparación de modelos fiscales', 450, 'trimestre', 'modelos', 15, 'Preparación y revisión de modelos fiscales.', 'Software fiscal existente', '450 modelos por trimestre en el caso revisado. Algunos modelos anuales quedan sin cuantificar. El software fiscal ya genera el modelo; se plantea que un agente lo compruebe y prepare incidencias para que un profesional dedique cinco minutos a validarlo antes de presentarlo. Escenario sin medir.'),
      process('Envío de nóminas', 200, 'mes', 'clientes destinatarios', 4.5, 'Envío mensual de las nóminas a cada cliente laboral.', 'Software laboral existente', '200 clientes laborales reciben en conjunto 240 nóminas al mes. El envío se mide por cliente destinatario: 200 envíos × 4,5 minutos por cliente = 15 horas mensuales. Un cliente puede recibir varias nóminas en un mismo envío. La preparación ya está automatizada en parte.'),
    ],
  };
}

export function panaderiaSample(id = newId()) {
  return {
    id, name: 'Panadería La Espiga', sector: 'Panadería', sample: true, sampleKey: 'panaderia',
    description: 'Ejemplo sintético para comprobar que los procesos y las unidades cambian de sector. Revisar todas las cifras antes de una consultoría real.',
    staffCount: 4, workingDaysPerWeek: 6, hourlyCost: 13.87,
    hourlyCostNote: 'Supuesto ficticio de Panadería La Espiga: 4 personas con 1.600 € netos medios por persona y mes. Se aplica un único 30 % para aproximar el coste total de empresa: 2.080 € por persona y 8.320 € para el equipo al mes. Se estiman 150 horas efectivas mensuales por persona; la apertura seis días se cubre con turnos y no implica seis jornadas semanales por empleado. 8.320 € ÷ (4 × 150 h) = 13,87 €/h. Estimación editable de demo, no dato laboral real.',
    metrics: [
      metric('Pedidos recibidos', 25, 'pedidos', 'dia_laborable', 'Supuesto de demostración.'),
      metric('Productos habituales', 18, 'referencias', 'mes', 'Supuesto de demostración.'),
    ],
    revenueStreams: [],
    processes: [
      process('Atención de pedidos', 25, 'dia_laborable', 'pedidos', 3, 'Registrar pedidos por teléfono o mostrador y confirmar recogida.', 'Teléfono y cuaderno', 'Volumen y tiempo supuestos para la demo.'),
      process('Planificación de producción', 1, 'dia_laborable', 'planes diarios', 25, 'Organizar cantidades para la jornada siguiente.', 'Hoja de cálculo', 'Tiempo supuesto para la demo.'),
    ],
  };
}

export function floristeriaSample(id = newId()) {
  return {
    id, name: 'Floristería Azahar', sector: 'Floristería', sample: true, sampleKey: 'floristeria',
    description: 'Ejemplo sintético de negocio con encargos y eventos. Volúmenes editables; no representan un negocio real.',
    staffCount: 3, workingDaysPerWeek: 6, hourlyCost: 13,
    hourlyCostNote: 'Supuesto ficticio de Floristería Azahar: 3 personas con 1.500 € netos medios por persona y mes. Se aplica un único 30 % para aproximar el coste total de empresa: 1.950 € por persona y 5.850 € para el equipo al mes. Se estiman 150 horas efectivas mensuales por persona; la apertura seis días se cubre con turnos. 5.850 € ÷ (3 × 150 h) = 13,00 €/h. Estimación editable de demo, no dato laboral real.',
    metrics: [
      metric('Encargos', 12, 'encargos', 'dia_laborable', 'Supuesto de demostración.'),
      metric('Eventos', 4, 'eventos', 'mes', 'Supuesto de demostración.'),
    ],
    revenueStreams: [],
    processes: [
      process('Preparación de encargos', 12, 'dia_laborable', 'encargos', 10, 'Registrar preferencias y preparar cada pedido floral.', 'Teléfono y agenda', 'Tiempo supuesto: incluye coordinación, no solo trabajo manual.'),
      process('Atención de eventos', 4, 'mes', 'eventos', 35, 'Recoger requisitos, fechas y cambios de cada evento.', 'Correo y agenda', 'Solo tiempo administrativo supuesto; no incluye montaje.'),
    ],
  };
}

export function createInitialState() {
  const cases = [gestoriaSample(), panaderiaSample(), floristeriaSample()];
  return {version: 1, activeId: cases[0].id, cases};
}

export function migrateProposalPricing(state) {
  let changed = false;
  for (const company of state.cases) {
    if (!company.proposal || company.proposal.pricing) continue;
    company.proposal.pricing = defaultProposalPricing(company);
    changed = true;
  }
  return changed;
}

export function migrateValueServices(state) {
  let changed = false;
  for (const company of state.cases) {
    if (Array.isArray(company.valueServices)) continue;
    const previous = company.valueOpportunity;
    if (!previous?.name?.trim()) {
      company.valueServices = [];
    } else {
      const estimate = [previous.eligibleUnits, previous.period, previous.baselineCoveragePct, previous.targetCoveragePct].every(value => value !== null && value !== undefined);
      company.valueServices = [{
        ...blankValueService(), name: previous.name,
        outcome: 'Mejorar la información que recibe el cliente y el seguimiento de los acuerdos.',
        evidence: previous.evidence ?? '',
        legacyNote: estimate ? `Estimación anterior: ${previous.eligibleUnits} unidades por ${PERIODS[previous.period] ?? previous.period}; cobertura ${previous.baselineCoveragePct} % → ${previous.targetCoveragePct} %. Se conserva como contexto, sin usarla para presupuestar.` : '',
        actions: company.sampleKey === 'gestoria' && previous.name === 'Resumen de visita con acuerdos e hitos' ? [
          {...blankValueAction(), title: 'Definir plantilla de acuerdos, hitos y responsables', hours: 4},
          {...blankValueAction(), title: 'Configurar el flujo de generación y revisión', hours: 8},
          {...blankValueAction(), title: 'Probar el servicio y explicar su uso al equipo', hours: 4},
        ] : [],
      }];
    }
    changed = true;
  }
  return changed;
}

export function monthlyHours(caseData) {
  return caseData.processes.reduce((sum, item) => sum + item.volume * item.minutes * monthlyFactor(item.period, caseData.workingDaysPerWeek) / 60, 0);
}

export function monthlyRevenue(caseData) {
  return caseData.revenueStreams.reduce((sum, item) => sum + item.quantity * item.unitPrice * monthlyFactor(item.period, caseData.workingDaysPerWeek), 0);
}

export function coalesceDocumentRange(state) {
  let changed = false;
  for (const company of state.cases) {
    const minIndex = company.metrics.findIndex(item => item.label === 'Documentos por cliente, mínimo');
    const maxIndex = company.metrics.findIndex(item => item.label === 'Documentos por cliente, máximo');
    if (minIndex < 0 || maxIndex < 0) continue;
    const minimum = company.metrics[minIndex];
    const maximum = company.metrics[maxIndex];
    company.metrics[minIndex] = {
      ...minimum, kind: 'range', label: 'Documentos por cliente', value: null,
      minValue: minimum.value, maxValue: maximum.value,
      note: 'Estimación de documentos recibidos o gestionados por cliente y mes, no solo facturas. La recepción principal se agrupa por trimestre.',
    };
    company.metrics.splice(maxIndex, 1);
    changed = true;
  }
  return changed;
}

export function migrateGestoriaRevenueQuotas(state) {
  let changed = false;
  for (const company of state.cases) {
    if (company.sampleKey !== 'gestoria') continue;
    for (const spec of [
      {oldLabel: 'Servicio fiscal', oldQuantity: 450, price: 275, metricLabel: 'Clientes fiscales', newLabel: 'Cuota fiscal mensual', work: 'gestiones fiscales'},
      {oldLabel: 'Servicio laboral', oldQuantity: 400, price: 200, metricLabel: 'Clientes laborales', newLabel: 'Cuota laboral mensual', work: 'gestiones laborales'},
    ]) {
      const line = company.revenueStreams.find(item => item.label === spec.oldLabel && item.quantity === spec.oldQuantity && item.unitPrice === spec.price && item.period === 'mes');
      const clients = company.metrics.find(item => item.label === spec.metricLabel && item.period === 'mes')?.value;
      if (!line || !Number.isFinite(clients)) continue;
      line.label = spec.newLabel;
      line.quantity = clients;
      line.billingUnit = 'clientes con cuota';
      line.includedServices = `${spec.oldQuantity} ${spec.work} al mes`;
      line.note = `${line.note ? `${line.note} ` : ''}Cuota mensual por cliente; las gestiones incluidas no se facturan de nuevo en esta línea.`;
      changed = true;
    }
  }
  return changed;
}

export function migrateGestoriaDocumentScenario(state) {
  let changed = false;
  for (const company of state.cases) {
    if (company.sampleKey !== 'gestoria') continue;
    const process = company.processes.find(item => item.name === 'Recepción y archivo de documentos');
    if (!process || process.documentScenarioRevision === 2) continue;
    const scenario = process.scenario;
    if (scenario && [50, 60].includes(scenario.adoptionPct) && scenario.timeReductionPct === 25 && scenario.reviewMinutes === 1) {
      process.scenario = {...scenario, adoptionPct: 80, timeReductionPct: 80};
    }
    process.documentScenarioRevision = 2;
    changed = true;
  }
  return changed;
}

export function migrateGestoriaFiscalModelsScenario(state) {
  let changed = false;
  for (const company of state.cases) {
    if (company.sampleKey !== 'gestoria') continue;
    const process = company.processes.find(item => item.name === 'Preparación de modelos fiscales');
    if (!process || process.fiscalModelsScenarioRevision === 2) continue;
    if (process.minutes === 20) {
      process.minutes = 15;
      changed = true;
    }
    const oldNotes = '450 modelos por trimestre en el caso revisado. Algunos modelos anuales quedan sin cuantificar. Ya existe automatización.';
    if (process.notes === oldNotes) {
      process.notes = '450 modelos por trimestre. Algunos modelos anuales quedan sin cuantificar. El software fiscal ya genera el modelo; el agente comprueba el resultado y prepara incidencias para una validación profesional de cinco minutos por modelo. Hipótesis sin medir.';
      changed = true;
    }
    const scenario = process.scenario;
    if (scenario?.adoptionPct === 30 && scenario.timeReductionPct === 15 && scenario.reviewMinutes === 2) {
      process.scenario = {...scenario, adoptionPct: 100, timeReductionPct: 100, reviewMinutes: 5};
      changed = true;
    }
    if (!process.consultantDecision) {
      process.consultantDecision = 'agente';
      changed = true;
    }
    if (!process.decisionReason?.trim() && process.consultantDecision === 'agente') {
      process.decisionReason = 'El software fiscal ya genera el modelo. Un agente con supervisión comprueba el resultado y prepara incidencias; un profesional valida y presenta cada modelo. La reducción de tiempo es una hipótesis pendiente de medir.';
      changed = true;
    }
    process.fiscalModelsScenarioRevision = 2;
    changed = true;
  }
  return changed;
}

export function migrateGestoriaPayrollCounts(state) {
  let changed = false;
  for (const company of state.cases) {
    if (company.sampleKey !== 'gestoria' || company.payrollCountsRevision === 2) continue;
    const payroll = company.processes.find(item => item.name === 'Envío de nóminas' && item.unit === 'clientes destinatarios');
    const metric = company.metrics.find(item => item.label === 'Nóminas emitidas' && item.unit === 'nóminas');
    if (payroll?.volume === 240 && metric?.value === 400) {
      payroll.volume = 200;
      metric.value = 240;
      if (payroll.notes === '400 nóminas al mes; el tiempo estimado es de 4–5 minutos por cliente destinatario, no por nómina. La preparación ya está automatizada en parte.') {
        payroll.notes = '200 clientes laborales reciben 240 nóminas al mes en conjunto. El tiempo de envío es de 4,5 minutos por cliente destinatario; un cliente puede recibir varias nóminas. La preparación ya está automatizada en parte.';
      }
      if (metric.note === 'Volumen ficticio independiente del número de clientes laborales; revisar la relación antes de una propuesta real.') {
        metric.note = '200 clientes laborales reciben 240 nóminas al mes; algunos clientes tienen más de un empleado.';
      }
      changed = true;
    }
    company.payrollCountsRevision = 2;
    changed = true;
  }
  return changed;
}

export function migrateGestoriaPayrollScenario(state) {
  let changed = false;
  for (const company of state.cases) {
    if (company.sampleKey !== 'gestoria') continue;
    const process = company.processes.find(item => item.name === 'Envío de nóminas');
    if (!process || process.payrollScenarioRevision === 2) continue;
    const scenario = process.scenario;
    if (scenario?.adoptionPct === 30 && scenario.timeReductionPct === 10 && scenario.reviewMinutes === 1) {
      process.scenario = {...scenario, adoptionPct: 50, timeReductionPct: 50};
      changed = true;
    }
    if (process.assessment?.reusable === 'no') {
      process.assessment.reusable = 'si';
      changed = true;
    }
    if (!process.consultantDecision) {
      process.consultantDecision = 'automatizacion';
      changed = true;
    }
    if (!process.decisionReason?.trim() && process.consultantDecision === 'automatizacion') {
      process.decisionReason = 'Las reglas de envío y las incidencias de bonus, horas extra o productividad pueden configurarse por cliente según sus indicaciones. Se comprueba cada resultado antes de enviarlo; el riesgo de datos laborales exige control humano. Hipótesis pendiente de medir.';
      changed = true;
    }
    process.payrollScenarioRevision = 2;
    changed = true;
  }
  return changed;
}

export function validateCase(caseData) {
  const errors = [];
  if (!caseData.name.trim()) errors.push('El nombre de la empresa es obligatorio.');
  if (!caseData.sector.trim()) errors.push('El sector es obligatorio.');
  if (!Number.isInteger(caseData.staffCount) || caseData.staffCount < 0) errors.push('La plantilla debe ser un número entero no negativo.');
  if (!Number.isInteger(caseData.workingDaysPerWeek) || caseData.workingDaysPerWeek < 1 || caseData.workingDaysPerWeek > 7) errors.push('Los días de trabajo deben estar entre 1 y 7.');
  if (caseData.hourlyCost !== null && (!Number.isFinite(caseData.hourlyCost) || caseData.hourlyCost < 0)) errors.push('El coste horario debe ser no negativo.');
  for (const item of caseData.metrics) {
    if (!item.label.trim()) errors.push('Falta la etiqueta de un indicador.');
    if (!item.unit.trim()) errors.push('Falta la unidad de un indicador.');
    if (item.kind === 'range') {
      if (![item.minValue, item.maxValue].every(value => Number.isFinite(value) && value >= 0) || item.maxValue < item.minValue) {
        errors.push('El máximo de un indicador debe ser igual o mayor que el mínimo y ambos deben ser no negativos.');
      }
    } else if (!Number.isFinite(item.value) || item.value < 0) errors.push('El valor de un indicador debe ser no negativo.');
    if (!PERIODS[item.period]) errors.push('El periodo de un indicador no es válido.');
  }
  for (const item of caseData.revenueStreams) {
    if (!item.label.trim()) errors.push('Falta el nombre de una línea de facturación.');
    if (![item.quantity, item.unitPrice].every(value => Number.isFinite(value) && value >= 0)) errors.push('La facturación necesita cantidades e importes no negativos.');
    if (item.grossMarginPct !== null && item.grossMarginPct !== undefined && (!Number.isFinite(item.grossMarginPct) || item.grossMarginPct < 0 || item.grossMarginPct > 100)) errors.push('El margen estimado debe estar entre 0 % y 100 %.');
    if (!PERIODS[item.period]) errors.push('El periodo de facturación no es válido.');
  }
  for (const item of caseData.processes) {
    if (!item.name.trim()) errors.push('Falta el nombre de un proceso.');
    if (!item.unit.trim()) errors.push('Falta la unidad de trabajo de un proceso.');
    if (!Number.isFinite(item.volume) || item.volume < 0) errors.push('El volumen de un proceso debe ser no negativo.');
    if (!Number.isFinite(item.minutes) || item.minutes < 0) errors.push('Los minutos por unidad deben ser no negativos.');
    if (!PERIODS[item.period]) errors.push('El periodo de un proceso no es válido.');
  }
  for (const service of caseData.valueServices ?? []) {
    if (!service.name?.trim()) errors.push('Falta el nombre de un servicio de valor añadido.');
    if (!service.outcome?.trim()) errors.push('Falta explicar la mejora de un servicio de valor añadido.');
    for (const action of service.actions ?? []) {
      if (!action.title?.trim()) errors.push('Falta describir una acción de implantación.');
      if (!Number.isFinite(action.hours) || action.hours < 0) errors.push('Las horas de implantación deben ser no negativas.');
    }
  }
  for (const line of caseData.proposal?.lines ?? []) {
    if (!line.title?.trim()) errors.push('Falta el nombre de una intervención del presupuesto.');
    if (line.valueServiceId ? !(caseData.valueServices ?? []).some(service => service.id === line.valueServiceId) : !caseData.processes.some(process => process.id === line.processId)) errors.push('Una partida del presupuesto ya no tiene proceso o servicio de valor añadido asociado.');
    if (![line.hours, line.hourlyRate, line.externalCost, line.monthlySupport].every(value => Number.isFinite(value) && value >= 0)) errors.push('Los importes y horas del presupuesto deben ser no negativos.');
  }
  const ownCost = caseData.proposal?.consultantCostPerHour;
  if (ownCost !== undefined && ownCost !== null && (!Number.isFinite(ownCost) || ownCost < 0)) errors.push('Tu coste propio por hora debe ser no negativo.');
  const pricing = caseData.proposal?.pricing;
  if (pricing) {
    const values = [pricing.capturePct, pricing.benefitMonths, pricing.trainingGeneralHours,
      pricing.trainingIndividualHoursPerPerson, pricing.trainingRatePerPersonHour, pricing.maintenancePct];
    if (!values.every(value => Number.isFinite(value) && value >= 0) || pricing.capturePct > 100 || pricing.maintenancePct > 100 ||
        (pricing.trainingParticipants !== null && (!Number.isInteger(pricing.trainingParticipants) || pricing.trainingParticipants < 0))) {
      errors.push('Revisa los porcentajes, horas, participantes y tarifa de la propuesta.');
    }
  }
  return errors;
}

export function replaceGestoria(state) {
  const next = structuredClone(state);
  const index = next.cases.findIndex(item => item.sampleKey === 'gestoria');
  if (index < 0) {
    next.cases.unshift(gestoriaSample());
  } else {
    next.cases[index] = gestoriaSample(next.cases[index].id);
  }
  next.activeId = next.cases.find(item => item.sampleKey === 'gestoria').id;
  return next;
}

export function persistState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.cases) || !data.cases.every(item => item && typeof item.id === 'string')) {
    throw new Error('Los datos guardados no tienen un formato compatible.');
  }
  return data;
}
