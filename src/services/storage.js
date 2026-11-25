// Manejo de persistencia local en navegador para RelieFin

const STATE_KEY = 'reliefin_state_v2';

export const INITIAL_DEMO_DEBTS = [
  {
    id: 'debt_1',
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    entity: 'Bancolombia',
    productType: 'tarjeta_credito',
    type: 'tarjeta_credito',
    balance: 8500000,
    monthlyPayment: 620000,
    rateEA: 25.5,
    reportedRate: 25.5,
    ratePeriod: 'EA',
    referenceRate: null,
    referenceRateMin: null,
    referenceRateMax: null,
    rateSourceType: 'user_reported',
    rateSourceUrl: null,
    rateSourceDate: null,
    rateLastVerified: null,
    rateConfidence: 'alta',
    isEstimated: false,
    knowsRate: true,
    termMonths: 24,
    paymentDay: 5
  },
  {
    id: 'debt_2',
    entityId: 'davivienda',
    entityName: 'Banco Davivienda',
    entity: 'Banco Davivienda',
    productType: 'tarjeta_credito',
    type: 'tarjeta_credito',
    balance: 4200000,
    monthlyPayment: 280000,
    rateEA: 26.2,
    reportedRate: null,
    ratePeriod: 'EA',
    referenceRate: 26.2,
    referenceRateMin: 24.8,
    referenceRateMax: 27.5,
    rateSourceType: 'entity_product_public',
    rateSourceUrl: 'Superintendencia Financiera de Colombia (SFC) · Formato 088',
    rateSourceDate: 'Corte Septiembre 2024',
    rateLastVerified: '2024-09',
    rateConfidence: 'alta',
    isEstimated: true,
    knowsRate: false,
    termMonths: 18,
    paymentDay: 15
  },
  {
    id: 'debt_3',
    entityId: 'banco_bogota',
    entityName: 'Banco de Bogotá',
    entity: 'Banco de Bogotá',
    productType: 'libre_inversion',
    type: 'libre_inversion',
    balance: 6000000,
    monthlyPayment: 250000,
    rateEA: 22.5,
    reportedRate: null,
    ratePeriod: 'EA',
    referenceRate: 22.5,
    referenceRateMin: 20.2,
    referenceRateMax: 25.4,
    rateSourceType: 'entity_modality_range',
    rateSourceUrl: 'Reporte de tasas activas SFC',
    rateSourceDate: 'Corte Septiembre 2024',
    rateLastVerified: '2024-09',
    rateConfidence: 'media',
    isEstimated: true,
    knowsRate: false,
    termMonths: 36,
    paymentDay: 28
  }
];

// Escenario auditado de prueba: 5 deudas por $46.200.000 con pago mensual de $3.650.000
export const AUDITED_5_DEBTS_SCENARIO = [
  {
    id: 'debt_audit_1',
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    entity: 'Bancolombia',
    productType: 'tarjeta_credito',
    type: 'tarjeta_credito',
    balance: 14000000,
    monthlyPayment: 1150000,
    rateEA: 25.5,
    reportedRate: 25.5,
    ratePeriod: 'EA',
    termMonths: 24,
    paymentDay: 5
  },
  {
    id: 'debt_audit_2',
    entityId: 'davivienda',
    entityName: 'Banco Davivienda',
    entity: 'Banco Davivienda',
    productType: 'credito_consumo',
    type: 'credito_consumo',
    balance: 12000000,
    monthlyPayment: 920000,
    rateEA: 22.0,
    reportedRate: 22.0,
    ratePeriod: 'EA',
    termMonths: 36,
    paymentDay: 15
  },
  {
    id: 'debt_audit_3',
    entityId: 'banco_bogota',
    entityName: 'Banco de Bogotá',
    entity: 'Banco de Bogotá',
    productType: 'tarjeta_credito',
    type: 'tarjeta_credito',
    balance: 8500000,
    monthlyPayment: 680000,
    rateEA: 26.0,
    reportedRate: 26.0,
    ratePeriod: 'EA',
    termMonths: 24,
    paymentDay: 28
  },
  {
    id: 'debt_audit_4',
    entityId: 'scotiabank_colpatria',
    entityName: 'Scotiabank Colpatria',
    entity: 'Scotiabank Colpatria',
    productType: 'libre_inversion',
    type: 'libre_inversion',
    balance: 6700000,
    monthlyPayment: 520000,
    rateEA: 20.4,
    reportedRate: 20.4,
    ratePeriod: 'EA',
    termMonths: 27,
    paymentDay: 10
  },
  {
    id: 'debt_audit_5',
    entityId: 'bbva_colombia',
    entityName: 'BBVA Colombia',
    entity: 'BBVA Colombia',
    productType: 'libre_inversion',
    type: 'libre_inversion',
    balance: 5000000,
    monthlyPayment: 380000,
    rateEA: 21.5,
    reportedRate: 21.5,
    ratePeriod: 'EA',
    termMonths: 24,
    paymentDay: 20
  }
];

export class StorageService {
  static loadState() {
    const fallback = {
      debts: [...INITIAL_DEMO_DEBTS],
      userGoal: 'lower_payment',
      dataOrigin: 'demo',
      selectedAlternativeId: null,
      applications: [],
      acceptedRestructuring: null,
      currentScreen: 'home',
      activeCheckIn: null,
      temporaryOffer: null,
      activeApplicationIdForOutcome: null
    };

    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...fallback,
          ...parsed,
          dataOrigin: parsed.dataOrigin || 'demo'
        };
      }
    } catch (e) {
      console.warn('Error leyendo localStorage:', e);
    }

    return fallback;
  }

  static saveState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  static resetAllData() {
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem('reliefin_analytics_events');
      localStorage.removeItem('reliefin_pilot_milestones');
    } catch (e) {
      console.error(e);
    }
    return {
      debts: [],
      userGoal: 'explore',
      dataOrigin: 'participant',
      selectedAlternativeId: null,
      applications: [],
      acceptedRestructuring: null,
      currentScreen: 'home',
      activeCheckIn: null,
      temporaryOffer: null,
      activeApplicationIdForOutcome: null
    };
  }
}
