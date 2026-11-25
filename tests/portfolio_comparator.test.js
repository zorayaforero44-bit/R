import test from 'node:test';
import assert from 'node:assert';
import { 
  REAL_PORTFOLIO_PRODUCTS, 
  evaluatePortfolioEligibility, 
  calculateProductSimulation, 
  generateRealPortfolioComparisons 
} from '../src/services/portfolioProducts.js';

test('Catálogo V3.2: Contiene productos reales de bancos colombianos con URLs oficiales', () => {
  assert.ok(REAL_PORTFOLIO_PRODUCTS.length >= 4, 'Debe haber al menos 4 productos reales de compra de cartera');

  const bancolombia = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bancolombia');
  assert.ok(bancolombia, 'Bancolombia debe estar en el catálogo');
  assert.strictEqual(bancolombia.officialUrl, 'https://www.bancolombia.com/personas/productos/compra-cartera');
  assert.strictEqual(bancolombia.rateType, 'range');
  assert.strictEqual(bancolombia.rateMinMV, 1.30);
  assert.strictEqual(bancolombia.rateMaxMV, 2.12);
  assert.ok(bancolombia.rateDisplayMV.includes('1,30 %') && bancolombia.rateDisplayMV.includes('2,12 %'));

  const bbva = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bbva_colombia');
  assert.ok(bbva, 'BBVA Colombia debe estar en el catálogo');
  assert.strictEqual(bbva.officialUrl, 'https://www.bbva.com.co/personas/productos/prestamos/consumo/compra-de-cartera.html');
  assert.strictEqual(bbva.rateType, 'custom');
  assert.strictEqual(bbva.rateMinMV, null, 'BBVA no debe tener tasa inventada');
  assert.strictEqual(bbva.rateDisplayMV, 'Tasa sujeta a evaluación');

  const davivienda = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'davivienda');
  assert.ok(davivienda, 'Davivienda debe estar en el catálogo');
  assert.strictEqual(davivienda.rateType, 'from');
  assert.strictEqual(davivienda.rateMinMV, 1.29);

  const bogota = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'banco_bogota');
  assert.ok(bogota, 'Banco de Bogotá debe estar en el catálogo');
  assert.strictEqual(bogota.rateType, 'from');
  assert.strictEqual(bogota.rateMinMV, 1.37);
});

test('Elegibilidad: Los bancos no compran su propia cartera (exclusión de deuda propia)', () => {
  const bancolombiaProduct = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bancolombia');

  const debts = [
    { id: 'd1', entity: 'bancolombia', balance: 5500000, monthlyPayment: 320000, type: 'tarjeta_credito' },
    { id: 'd2', entity: 'davivienda', balance: 8000000, monthlyPayment: 450000, type: 'tarjeta_credito' },
    { id: 'd3', entity: 'scotiabank_colpatria', balance: 4000000, monthlyPayment: 210000, type: 'libre_inversion' }
  ];

  const eligibility = evaluatePortfolioEligibility(bancolombiaProduct, debts);

  assert.strictEqual(eligibility.isEligible, true);
  assert.strictEqual(eligibility.eligibleCount, 2);
  assert.strictEqual(eligibility.excludedCount, 1);
  assert.strictEqual(eligibility.eligibleBalance, 12000000, 'Saldo elegible debe excluir los 5.5M de Bancolombia');
  assert.strictEqual(eligibility.excludedBalance, 5500000);
  assert.ok(eligibility.excludedDebts[0].reason.includes('Deuda propia de Bancolombia'));
});

test('Productos sin tasa pública: BBVA no inventa tasas ni cuotas', () => {
  const bbvaProduct = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bbva_colombia');
  const debts = [
    { id: 'd1', entity: 'bancolombia', balance: 10000000, monthlyPayment: 600000, type: 'tarjeta_credito' }
  ];

  const eligibility = evaluatePortfolioEligibility(bbvaProduct, debts);
  const simulation = calculateProductSimulation(bbvaProduct, eligibility, 36);

  assert.strictEqual(simulation.isCalculable, true);
  assert.strictEqual(simulation.hasPublishedRate, false, 'No debe fingir que tiene tasa publicada');
  assert.strictEqual(simulation.cuotaMensual, null, 'Cuota no debe ser inventada');
  assert.strictEqual(simulation.costoTotal, null, 'Costo no debe ser inventado');
  assert.ok(simulation.explanation.includes('exclusivamente por la entidad'));
});

test('Simulación con tasa publicada: Bancolombia genera rango y cuota nivelada correcta', () => {
  const bancolombiaProduct = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bancolombia');
  const debts = [
    { id: 'd1', entity: 'davivienda', balance: 20000000, monthlyPayment: 1100000, type: 'tarjeta_credito' }
  ];

  const eligibility = evaluatePortfolioEligibility(bancolombiaProduct, debts);
  const simulation = calculateProductSimulation(bancolombiaProduct, eligibility, 36);

  assert.strictEqual(simulation.isCalculable, true);
  assert.strictEqual(simulation.hasPublishedRate, true);
  assert.strictEqual(simulation.isRange, true);
  assert.ok(simulation.cuotaMin > 0);
  assert.ok(simulation.cuotaMax > simulation.cuotaMin, 'Cuota máxima debe ser superior a cuota mínima por el rango de tasas');
  assert.strictEqual(simulation.costoTotalMin, simulation.cuotaMin * 36);
  assert.strictEqual(simulation.costoTotalMax, simulation.cuotaMax * 36);
});

test('Comparador principal: No incluye entidades ficticias y genera ranking justificado', () => {
  const debts = [
    { id: 'd1', entity: 'davivienda', balance: 15000000, monthlyPayment: 900000, type: 'tarjeta_credito' },
    { id: 'd2', entity: 'banco_bogota', balance: 8000000, monthlyPayment: 450000, type: 'libre_inversion' }
  ];

  const comparisons = generateRealPortfolioComparisons(debts, 'lower_payment');

  assert.ok(comparisons.length >= 4);

  // Ninguna entidad debe ser ficticia
  const hasFictitious = comparisons.some(c => 
    c.entity.includes('Futuro') || 
    c.entity.includes('Progresar') || 
    c.entity.includes('Aliada')
  );
  assert.strictEqual(hasFictitious, false, 'No deben existir entidades ficticias en el comparador');

  // Todas deben tener origen real_colombia
  comparisons.forEach(c => {
    assert.strictEqual(c.originType, 'real_colombia');
    assert.strictEqual(c.isDemo, false);
    assert.ok(c.officialUrl.startsWith('https://'));
  });
});
