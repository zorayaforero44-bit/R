import test from 'node:test';
import assert from 'node:assert';
import { rankAlternatives, generateMockAlternatives } from '../src/services/ranking.js';

test('Motor de Ranking: finish_fast prioriza menor plazo', () => {
  const snapshot = { totalBalance: 18000000, totalMonthlyPayment: 1100000, estimatedTermMonths: 24, totalCount: 3 };
  const mockAlts = generateMockAlternatives(snapshot);
  
  const result = rankAlternatives(mockAlts, 'finish_fast', snapshot);
  
  assert.strictEqual(result.ranked.length, 3);
  assert.strictEqual(result.isExplore, false);
  
  // El primero debe tener el menor plazo
  const first = result.ranked[0];
  const second = result.ranked[1];
  const third = result.ranked[2];
  
  assert.ok(first.plazoMeses <= second.plazoMeses, 'El 1ro debe tener menor o igual plazo que el 2do');
  assert.ok(second.plazoMeses <= third.plazoMeses, 'El 2do debe tener menor o igual plazo que el 3ro');
  assert.strictEqual(first.isTopMatch, true);
  assert.ok(first.rankReason.includes('menor plazo'), 'Debe explicar la razón de menor plazo');
});

test('Motor de Ranking: lower_payment prioriza menor cuota mensual', () => {
  const snapshot = { totalBalance: 18000000, totalMonthlyPayment: 1100000, estimatedTermMonths: 24, totalCount: 3 };
  const mockAlts = generateMockAlternatives(snapshot);
  
  const result = rankAlternatives(mockAlts, 'lower_payment', snapshot);
  
  const first = result.ranked[0];
  const second = result.ranked[1];
  
  assert.ok(first.cuotaMensual <= second.cuotaMensual, 'El 1ro debe tener menor cuota que el 2do');
  assert.strictEqual(first.isTopMatch, true);
  assert.ok(first.rankReason.includes('menor cuota estimada'), 'Debe explicar la menor cuota');
  assert.ok(first.whatYouMustConsider.includes('plazo mayor'), 'Debe advertir sobre mayor plazo');
});

test('Motor de Ranking: similar_term prioriza cercanía al plazo actual estimado', () => {
  const snapshot = { totalBalance: 18000000, totalMonthlyPayment: 1100000, estimatedTermMonths: 24, totalCount: 3 };
  const mockAlts = generateMockAlternatives(snapshot);
  
  const result = rankAlternatives(mockAlts, 'similar_term', snapshot);
  
  const first = result.ranked[0];
  const diffFirst = Math.abs(first.plazoMeses - 24);
  const diffSecond = Math.abs(result.ranked[1].plazoMeses - 24);
  
  assert.ok(diffFirst <= diffSecond, 'El primer lugar debe estar más cerca del plazo estimado actual');
  assert.strictEqual(first.isTopMatch, true);
});

test('Motor de Ranking: explore no marca ninguna alternativa como recomendación única', () => {
  const snapshot = { totalBalance: 18000000, totalMonthlyPayment: 1100000, estimatedTermMonths: 24, totalCount: 3 };
  const mockAlts = generateMockAlternatives(snapshot);
  
  const result = rankAlternatives(mockAlts, 'explore', snapshot);
  
  assert.strictEqual(result.isExplore, true);
  // Ninguna debe ser isTopMatch
  result.ranked.forEach(alt => {
    assert.strictEqual(alt.isTopMatch, false, 'En modo explore ninguna debe ser marcada como mejor coincidencia única');
  });
});

test('Motor de Ranking: excluye alternativas rechazadas previamente', () => {
  const snapshot = { totalBalance: 18000000, totalMonthlyPayment: 1100000, estimatedTermMonths: 24, totalCount: 3 };
  const mockAlts = generateMockAlternatives(snapshot);
  const rejectedId = mockAlts[0].id;
  
  const result = rankAlternatives(mockAlts, 'lower_payment', snapshot, [rejectedId]);
  
  assert.ok(!result.ranked.some(a => a.id === rejectedId), 'La alternativa rechazada no debe estar en ranked activos');
  assert.strictEqual(result.excluded.length, 1);
  assert.strictEqual(result.excluded[0].id, rejectedId);
});
