import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeReviewedDemoState} from '../src/demo-seed.js';
import {calculateProposalPricing} from '../src/budget.js';
import {validateCase} from '../src/model.js';

test('los tres ejemplos revisados abren con datos y propuestas coherentes', () => {
  const state = mergeReviewedDemoState(null);
  assert.equal(state.cases.length, 3);
  for (const company of state.cases) {
    assert.deepEqual(validateCase(company), []);
    assert.ok(calculateProposalPricing(company, company.proposal)?.setup > 0);
  }
  const bakery = state.cases.find(item => item.sampleKey === 'panaderia');
  assert.equal(bakery.processes.length, 3);
  assert.equal(bakery.proposal.lines.length, 3);
  assert.ok(bakery.proposal.lines.some(line => line.title === 'Gestion de turnos: agente supervisado'));
  assert.ok(bakery.proposal.lines.some(line => line.title === 'Atención de pedidos: agente supervisado'));
});

test('la actualización conserva otros casos y la ficha anterior no se borra de forma implícita', () => {
  const initial = mergeReviewedDemoState(null);
  const extra = {id: 'extra', name: 'Otro negocio'};
  const prior = {...initial, demoSeedRevision: 'anterior', cases: [...initial.cases, extra], activeId: extra.id};
  const merged = mergeReviewedDemoState(prior);
  assert.equal(merged.cases.length, 4);
  assert.equal(merged.activeId, extra.id);
  assert.equal(mergeReviewedDemoState(merged), merged);
});
