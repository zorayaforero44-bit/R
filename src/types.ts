// Tipos de dominio de RelieFin (TypeScript)

export type DebtType = 
  | 'tarjeta_credito' 
  | 'credito_consumo' 
  | 'libre_inversion' 
  | 'credito_fintech' 
  | 'otro';

export type RatePeriod = 'EA' | 'MV';

export type RateSourceType = 
  | 'user_reported' 
  | 'entity_product_public' 
  | 'entity_modality_range' 
  | 'colombia_general_reference' 
  | 'none';

export type RateConfidence = 'alta' | 'media' | 'baja' | 'sin_referencia';

export interface Debt {
  id: string;
  entityId: string;
  entityName: string;
  productType: DebtType;
  type?: DebtType;           // Alias retrocompatible
  entity?: string;            // Alias retrocompatible
  balance: number;
  monthlyPayment: number;
  rateEA: number | null;
  reportedRate: number | null;
  ratePeriod: RatePeriod | null;
  referenceRate: number | null;
  referenceRateMin: number | null;
  referenceRateMax: number | null;
  rateSourceType: RateSourceType;
  rateSourceUrl: string | null;
  rateSourceDate: string | null;
  rateLastVerified: string | null;
  rateConfidence: RateConfidence;
  isEstimated: boolean;
  knowsRate: boolean;
  termMonths?: number | null;
  paymentDay?: number;
}

export type PrecisionLevel = 'alta' | 'media' | 'estimacion_inicial';

export interface PrecisionResult {
  level: PrecisionLevel;
  label: string;
  percentage: number;
  color: string;
  knownRates: number;
  total: number;
  userReportedCount: number;
  entityPublicCount: number;
  generalEstimateCount: number;
  noReferenceCount: number;
  explanation: string;
  recommendation: string;
}

export interface FinancialSnapshot {
  totalBalance: number;
  totalMonthlyPayment: number;
  weightedRateEA: number | null;
  estimatedTermMonths: number | null;
  estimatedRemainingCost: number | null;
  hasUncertainty: boolean;
  hasMissingRates: boolean;
  totalCount: number;
  knownRatesCount: number;
  estimatedRatesCount: number;
  noRateCount: number;
  distribution: Array<{
    id: string;
    type: string;
    entity: string;
    balance: number;
    monthlyPayment: number;
    percentage: number;
    rateEA: number | null;
    rateSourceType: RateSourceType;
    rateConfidence: RateConfidence;
    isEstimated: boolean;
    isUserProvided: boolean;
  }>;
}

export type UserGoal = 'finish_fast' | 'lower_payment' | 'similar_term' | 'explore';

export interface FinancialAlternative {
  id: string;
  entity: string;
  productType: string;
  scenarioType: string;
  tagline: string;
  rateEA: number;
  cuotaMensual: number;
  plazoMeses: number;
  costoTotalEstimado: number;
  montoConsolidar: number;
  obligacionesCubiertasCount: number;
  natureLabel: string;
  simulatedRequirements: string[];
  isTopMatch?: boolean;
  rankPosition?: number;
  rankReason?: string;
  whatYouGain?: string;
  whatYouMustConsider?: string;
  isDemo?: boolean;
  originType?: 'demo' | 'real_manual' | 'no_verificado';
}

export type ApplicationStatus = 
  | 'iniciada' 
  | 'en_estudio' 
  | 'aprobada' 
  | 'aprobada_condiciones_diferentes' 
  | 'no_aprobada' 
  | 'desistio' 
  | 'pendiente';

export type UserReportedOutcome = 
  | 'approved'
  | 'approved_modified'
  | 'rejected'
  | 'in_review'
  | 'withdrawn';

export interface Application {
  id: string;
  fecha: string;
  entidad: string;
  producto: string;
  montoSolicitado: number;
  cuotaEstimada: number;
  plazoEstimado: number;
  tasaIndicativaEA: number;
  costoTotalEstimado: number;
  objetivoOriginal: UserGoal;
  alternativeId: string;
  status: ApplicationStatus;
  resultadoReportado?: UserReportedOutcome;
  fechaResultado?: string;
  motivoRechazoReportado?: {
    informoMotivo: boolean;
    categoria?: string;
  };
  isDemo?: boolean;
  originType?: 'demo' | 'real_manual' | 'no_verificado';
}

export interface DebtRestructuring {
  id: string;
  applicationId: string;
  fechaAceptacion: string;
  saldoInicialConsolidado: number;
  saldoActual: number;
  cuotaActual: number;
  tasaEA: number;
  plazoOriginalMeses: number;
  mesesRestantes: number;
  pagosRealizados: number;
  obligacionesPreviasCount: number;
  pagoMensualPrevio: number;
  isDemo?: boolean;
  originType?: 'demo' | 'real_manual' | 'no_verificado';
}
