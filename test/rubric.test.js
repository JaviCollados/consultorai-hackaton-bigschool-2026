import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleAssessment, recommend} from '../src/rubric.js';

test('reglas claras de bajo riesgo sugieren automatización', () => {
  const advice = recommend(exampleAssessment('panaderia', 0));
  assert.equal(advice.category, 'automatizacion');
  assert.equal(advice.reviewHuman, false);
});

test('decisiones contextuales repetidas sugieren agente supervisado', () => {
  const advice = recommend(exampleAssessment('gestoria', 0));
  assert.equal(advice.category, 'agente');
  assert.equal(advice.skill, true);
  assert.equal(advice.reviewHuman, true);
});

test('alto riesgo lleva a asistencia con revisión humana', () => {
  const advice = recommend(exampleAssessment('gestoria', 2));
  assert.equal(advice.category, 'asistencia');
  assert.equal(advice.reviewHuman, true);
});

test('criterios incompletos no generan recomendación', () => {
  assert.equal(recommend({repetition: 'alta'}), null);
});
