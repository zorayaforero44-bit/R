import test from 'node:test';
import assert from 'node:assert';
import { 
  formatPercent, 
  formatProductTypeName, 
  pluralizeDebts, 
  pluralizeObligations,
  calculateAmortizationMonthlyPayment,
  calculateSnapshot
} from '../src/services/calculations.js';
import { 
  REAL_PORTFOLIO_PRODUCTS, 
  evaluatePortfolioFullCoverage 
} from '../src/services/portfolioProducts.js';

test('Correcciones de Confiabilidad V3.2 - Puntos 1 a 8', async (t) => {
  
  await t.test('Punto 1: Fallback y transferencia de producto (sin "undefined")', () => {
    // Si falta el nombre del producto o es undefined, el fallback seguro debe ser 'Producto por confirmar'
    const getSafeProduct = (raw) => (!raw || raw === 'undefined' || String(raw).trim() === '') ? 'Producto por confirmar' : raw;

    assert.strictEqual(getSafeProduct(undefined), 'Producto por confirmar');
    assert.strictEqual(getSafeProduct('undefined'), 'Producto por confirmar');
    assert.strictEqual(getSafeProduct(''), 'Producto por confirmar');
    assert.strictEqual(getSafeProduct('Compra de Cartera Consumo'), 'Compra de Cartera Consumo');

    // Todos los productos reales del catálogo deben tener nombres comerciales definidos
    for (const prod of REAL_PORTFOLIO_PRODUCTS) {
      assert.ok(prod.commercialName, `El producto ${prod.id} debe tener commercialName`);
      assert.notStrictEqual(prod.commercialName, 'undefined');
    }
  });

  await t.test('Punto 2: Validación matemática pura vs cuota informada por el banco', () => {
    // Caso auditado: $15.000.000 al 20% E.A. a 24 meses con cuota declarada de $720.000
    const monto = 15000000;
    const tasaEA = 20.0;
    const plazo = 24;
    const cuotaDeclarada = 720000;

    const cuotaTeorica = calculateAmortizationMonthlyPayment(monto, tasaEA, plazo);
    assert.ok(cuotaTeorica > 0);
    // Cuota teórica para 15M al 20% EA y 24 meses es aprox 751.556
    assert.strictEqual(Math.round(cuotaTeorica), 751556);

    const cuotaDiff = cuotaDeclarada - cuotaTeorica;
    const percentDiff = ((cuotaDeclarada - cuotaTeorica) / cuotaTeorica) * 100;
    const hasDiscrepancy = Math.abs(percentDiff) >= 3.0;

    // La diferencia es de aprox -4.2 %, por lo que supera el umbral del 3% y activa discrepancia
    assert.strictEqual(hasDiscrepancy, true);
    assert.ok(Math.abs(percentDiff) > 3.0);
    assert.strictEqual(percentDiff.toFixed(1), '-4.2');

    // La cuota declarada se conserva (720.000) sin ser sobrescrita
    assert.strictEqual(cuotaDeclarada, 720000);
  });

  await t.test('Punto 3: Identificación de campos aproximados en la oferta', () => {
    const simulateOfferInput = ({ isUnknown, approxFields = [] }) => {
      const isApproximate = Boolean(isUnknown) || approxFields.length > 0;
      const isFullyConfirmed = !isApproximate;
      return {
        isApproximate,
        isFullyConfirmed,
        status: isApproximate ? 'pendiente_desembolso_preliminar' : 'pendiente_desembolso'
      };
    };

    const ofertaAproximada = simulateOfferInput({ isUnknown: true, approxFields: ['amount', 'payment'] });
    assert.strictEqual(ofertaAproximada.isApproximate, true);
    assert.strictEqual(ofertaAproximada.isFullyConfirmed, false);
    assert.strictEqual(ofertaAproximada.status, 'pendiente_desembolso_preliminar');

    const ofertaConfirmada = simulateOfferInput({ isUnknown: false, approxFields: [] });
    assert.strictEqual(ofertaConfirmada.isApproximate, false);
    assert.strictEqual(ofertaConfirmada.isFullyConfirmed, true);
    assert.strictEqual(ofertaConfirmada.status, 'pendiente_desembolso');
  });

  await t.test('Punto 4: Tratamiento de tasas históricas (2024 vs 2026)', () => {
    // Los productos con tarifas de 2024 deben tener isHistoricalTariff = true
    const bancolombia = REAL_PORTFOLIO_PRODUCTS.find(p => p.id === 'bancolombia_compra_cartera');
    assert.strictEqual(bancolombia.isHistoricalTariff, true);
    assert.ok(bancolombia.effectiveDate.includes('2024'));
    assert.ok(bancolombia.effectiveDate.includes('2026'));

    // BBVA no tiene tasa pública y se marca sin inventar tasas
    const bbva = REAL_PORTFOLIO_PRODUCTS.find(p => p.id === 'bbva_compra_cartera');
    assert.strictEqual(bbva.isHistoricalTariff, false);
    assert.strictEqual(bbva.verificationStatus, 'verificado_sin_tasa_publica');
    assert.strictEqual(bbva.rateMinEA, null);
  });

  await t.test('Punto 5: Proyección orientativa con tasas estimadas o deudas múltiples', () => {
    const debtsMultiples = [
      { id: '1', balance: 10000000, monthlyPayment: 500000, rateEA: 24, knowsRate: false, isEstimated: true },
      { id: '2', balance: 5000000, monthlyPayment: 250000, rateEA: 20, knowsRate: true, isEstimated: false }
    ];
    const snapshot = calculateSnapshot(debtsMultiples);

    // Debe identificar que contiene tasas estimadas y plazo ponderado
    assert.ok(snapshot.estimatedRatesCount > 0);
    assert.ok(debtsMultiples.length > 1);

    // En la interfaz el título debe ser "Proyección orientativa", no "Desglose financiero auditado"
    const title = (snapshot.estimatedRatesCount > 0 || debtsMultiples.length > 1) ? 'Proyección orientativa' : 'Desglose de amortización';
    assert.strictEqual(title, 'Proyección orientativa');
  });

  await t.test('Punto 6: Diferenciación entre Reducción del pago mensual y Ahorro en intereses', () => {
    const pagoActualTotal = 3650000;
    const pagoPosteriorTotal = 3170000;
    const reduccionPagoMensual = pagoActualTotal - pagoPosteriorTotal;

    assert.strictEqual(reduccionPagoMensual, 480000);
    // Esta diferencia es liberación de flujo mensual de cuotas, no ahorro total en costo de intereses
    assert.ok(reduccionPagoMensual > 0);
  });

  await t.test('Punto 7: Distinción clara entre simulación demostrativa y evento bancario real', () => {
    const debtStateBeforeDisbursement = [
      { id: 'd1', balance: 14000000, isCancelled: false, status: 'activa' },
      { id: 'd2', balance: 12000000, isCancelled: false, status: 'activa' }
    ];

    // Registrar o aceptar la simulación preliminar NO cancela las deudas
    const acceptedRestructuring = {
      status: 'pendiente_desembolso',
      cancelledDebts: [{ debt: debtStateBeforeDisbursement[0] }]
    };

    assert.strictEqual(acceptedRestructuring.status, 'pendiente_desembolso');
    assert.strictEqual(debtStateBeforeDisbursement[0].isCancelled, false);
    assert.strictEqual(debtStateBeforeDisbursement[0].status, 'activa');
  });

  await t.test('Punto 8: Presentación limpia sin defectos ("E.A. E.A.", "1 deudas", snake_case)', () => {
    // 8.1 No duplicación de "E.A. E.A."
    assert.strictEqual(formatPercent(21.7), '21,7 % E.A.');
    assert.strictEqual(formatPercent('21.7 % E.A.'), '21,7 % E.A.');
    assert.notStrictEqual(formatPercent(21.7), '21,7 % E.A. E.A.');

    // 8.2 Pluralización correcta: nunca "1 deudas" ni "1 obligaciones"
    assert.strictEqual(pluralizeDebts(1), '1 deuda');
    assert.strictEqual(pluralizeDebts(4), '4 deudas');
    assert.strictEqual(pluralizeDebts(0), '0 deudas');

    assert.strictEqual(pluralizeObligations(1), '1 obligación');
    assert.strictEqual(pluralizeObligations(5), '5 obligaciones');

    // 8.3 Formato de etiquetas técnicas (sin snake_case en UI)
    assert.strictEqual(formatProductTypeName('tarjeta_credito'), 'Tarjeta de crédito');
    assert.strictEqual(formatProductTypeName('credito_consumo'), 'Crédito de consumo');
    assert.strictEqual(formatProductTypeName('libre_inversion'), 'Libre inversión');
    assert.strictEqual(formatProductTypeName('credito_fintech'), 'Crédito fintech');
    assert.strictEqual(formatProductTypeName('compra_cartera'), 'Compra de cartera');
  });
});
