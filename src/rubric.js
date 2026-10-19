export const ASSESSMENT_OPTIONS = {
  repetition: {alta: 'Alta', media: 'Media', baja: 'Baja'},
  rules: {claras: 'Pasos claros', parciales: 'Algunas excepciones', variables: 'Cada caso cambia'},
  context: {si: 'Sí', no: 'No'},
  existingAutomation: {si: 'Sí', no: 'No'},
  risk: {bajo: 'Bajo', medio: 'Medio', alto: 'Alto'},
  reusable: {si: 'Sí', no: 'No'},
};

const examples = {
  gestoria: [
    {repetition: 'alta', rules: 'parciales', context: 'si', existingAutomation: 'no', risk: 'medio', reusable: 'si'},
    {repetition: 'alta', rules: 'claras', context: 'no', existingAutomation: 'no', risk: 'medio', reusable: 'no'},
    {repetition: 'alta', rules: 'parciales', context: 'si', existingAutomation: 'si', risk: 'alto', reusable: 'si'},
    {repetition: 'alta', rules: 'claras', context: 'no', existingAutomation: 'si', risk: 'alto', reusable: 'si'},
  ],
  panaderia: [
    {repetition: 'alta', rules: 'claras', context: 'no', existingAutomation: 'no', risk: 'bajo', reusable: 'no'},
    {repetition: 'alta', rules: 'parciales', context: 'si', existingAutomation: 'si', risk: 'medio', reusable: 'si'},
  ],
  floristeria: [
    {repetition: 'alta', rules: 'parciales', context: 'si', existingAutomation: 'no', risk: 'bajo', reusable: 'si'},
    {repetition: 'media', rules: 'variables', context: 'si', existingAutomation: 'no', risk: 'medio', reusable: 'si'},
  ],
};

export function exampleAssessment(sampleKey, index) { return examples[sampleKey]?.[index] ?? null; }

export function recommend(assessment) {
  if (!assessment || Object.keys(ASSESSMENT_OPTIONS).some(key => !ASSESSMENT_OPTIONS[key][assessment[key]])) return null;
  const reasons = [];
  const reviewHuman = assessment.risk !== 'bajo' || assessment.context === 'si';
  let category;
  if (assessment.risk === 'alto') {
    category = 'asistencia'; reasons.push('el riesgo exige control profesional');
  } else if (assessment.existingAutomation === 'si' && assessment.repetition === 'baja') {
    category = 'ninguna'; reasons.push('ya hay automatización y poco volumen repetido');
  } else if (assessment.rules === 'claras' && assessment.context === 'no') {
    category = 'automatizacion'; reasons.push('hay pasos definidos y poca decisión contextual');
  } else if (assessment.repetition !== 'baja' && assessment.context === 'si') {
    category = 'agente'; reasons.push('hay repetición y decisiones que dependen del contexto');
  } else {
    category = 'asistencia'; reasons.push('la tarea tiene excepciones o escaso volumen');
  }
  if (assessment.existingAutomation === 'si') reasons.push('se debe revisar qué resuelve ya el software actual');
  return {category, reasons, reviewHuman, skill: assessment.reusable === 'si'};
}

export const CATEGORY_LABELS = {
  automatizacion: 'Automatización con reglas', agente: 'Agente con supervisión',
  asistencia: 'Asistencia al profesional', ninguna: 'Sin intervención por ahora',
};
