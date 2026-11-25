// RelieFin MVP Web Application
// Arquitectura modular, mobile-first y desacoplada

import { RateProvider } from './services/rates.js';
import { calculatePrecision } from './services/precision.js';
import { 
  calculateSnapshot, 
  calculateTradeOff, 
  calculateConsolidationScenarioSummary,
  simulateAdditionalPayment, 
  generatePaymentCalendar, 
  generatePrioritizationScenarios, 
  formatCOP, 
  formatPercent,
  formatProductTypeName,
  pluralizeDebts,
  pluralizeObligations,
  calculateCreditBreakdown,
  calculateAmortizationMonthlyPayment,
  convertEAToMV,
  convertMVToEA
} from './services/calculations.js';
import { 
  GOALS, 
  rankAlternatives, 
  generateMockAlternatives, 
  generateRealPortfolioComparisons,
  evaluatePortfolioFullCoverage 
} from './services/ranking.js';
import { AnalyticsProvider } from './services/analytics.js';
import { StorageService, INITIAL_DEMO_DEBTS, AUDITED_5_DEBTS_SCENARIO } from './services/storage.js';

function isFiniteNumber(val) {
  return val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val));
}

function parseOptionalNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function formatOfferCOP(val) {
  return isFiniteNumber(val) ? formatCOP(Number(val)) : '<span class="text-amber-800 font-bold">Dato pendiente</span>';
}

function formatOfferRate(val) {
  return isFiniteNumber(val) ? formatPercent(Number(val)) : '<span class="text-amber-800 font-bold">Dato pendiente</span>';
}

function formatOfferTerm(val) {
  return isFiniteNumber(val) && Number(val) > 0 ? `${Math.round(Number(val))} meses` : '<span class="text-amber-800 font-bold">Dato pendiente</span>';
}

function formatTimelineSegmentsText(segments = []) {
  if (!segments || segments.length === 0) return '';
  return segments.map(seg => {
    const label = seg.fromMonth === seg.toMonth ? `Mes ${seg.fromMonth}` : `Mes ${seg.fromMonth} al ${seg.toMonth}`;
    return `${label}: <strong>${formatCOP(seg.monthlyPayment)}/mes</strong>`;
  }).join(' · ');
}

// Estado global reactivo de la aplicación
class AppState {
  constructor() {
    const saved = StorageService.loadState();
    this.debts = saved.debts || [...INITIAL_DEMO_DEBTS];
    this.userGoal = saved.userGoal || 'lower_payment';
    this.dataOrigin = saved.dataOrigin || 'demo';
    this.selectedAlternativeId = saved.selectedAlternativeId || null;
    this.applications = saved.applications || [];
    this.acceptedRestructuring = saved.acceptedRestructuring || null;
    this.currentScreen = saved.currentScreen || 'home';
    this.activeCheckIn = saved.activeCheckIn || null;
    this.temporaryOffer = saved.temporaryOffer || null; // Persistido entre recargas
    this.activeApplicationIdForOutcome = saved.activeApplicationIdForOutcome || null;
    this.activeAlternativeForDetail = null;
    this.isEditingDebtId = null;
  }

  save() {
    StorageService.saveState({
      debts: this.debts,
      userGoal: this.userGoal,
      dataOrigin: this.dataOrigin,
      selectedAlternativeId: this.selectedAlternativeId,
      applications: this.applications,
      acceptedRestructuring: this.acceptedRestructuring,
      currentScreen: this.currentScreen,
      activeCheckIn: this.activeCheckIn,
      temporaryOffer: this.temporaryOffer,
      activeApplicationIdForOutcome: this.activeApplicationIdForOutcome
    });
  }

  getSnapshot() {
    return calculateSnapshot(this.debts);
  }

  getPrecision() {
    return calculatePrecision(this.debts);
  }

  getAlternatives() {
    // Excluir alternativas de solicitudes rechazadas previamente por el usuario
    const rejectedAlternativeIds = this.applications
      .filter(a => a.status === 'no_aprobada')
      .map(a => a.alternativeId);

    const comparisons = generateRealPortfolioComparisons(this.debts, this.userGoal, rejectedAlternativeIds);
    return {
      ranked: comparisons,
      isExplore: this.userGoal === 'explore',
      excluded: []
    };
  }

  setScreen(screenName) {
    this.currentScreen = screenName;
    this.save();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderApp();
  }

  resetAll() {
    const reset = StorageService.resetAllData();
    this.debts = reset.debts;
    this.userGoal = reset.userGoal;
    this.dataOrigin = 'participant';
    this.selectedAlternativeId = reset.selectedAlternativeId;
    this.applications = reset.applications;
    this.acceptedRestructuring = reset.acceptedRestructuring;
    this.currentScreen = 'home';
    this.activeCheckIn = null;
    this.temporaryOffer = null;
    this.activeApplicationIdForOutcome = null;
    this.save();
    renderApp();
  }

  loadDemoDebts() {
    this.debts = JSON.parse(JSON.stringify(INITIAL_DEMO_DEBTS));
    this.dataOrigin = 'demo';
    this.temporaryOffer = null;
    this.activeApplicationIdForOutcome = null;
    this.save();
    renderApp();
  }

  loadAuditedScenario() {
    this.debts = JSON.parse(JSON.stringify(AUDITED_5_DEBTS_SCENARIO));
    this.dataOrigin = 'demo';
    this.acceptedRestructuring = null;
    this.temporaryOffer = null;
    this.activeApplicationIdForOutcome = null;
    this.save();
    showToast('Escenario auditado cargado: 5 deudas por $46.200.000 con pago mensual de $3.650.000', 'success');
    renderApp();
  }
}

const state = new AppState();
window.loadAuditedScenario = () => state.loadAuditedScenario();

// Íconos SVG limpios y consistentes
const Icons = {
  shield: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  info: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  arrowRight: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`,
  arrowLeft: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>`,
  sparkles: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
  plus: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`,
  trash: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
  edit: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
  alert: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  trendUp: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`,
  calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
};

// -------------------------------------------------------------
// COMPONENTES DE VISTA
// -------------------------------------------------------------

function renderNavbar() {
  const activeCount = state.applications.length;
  const hasRestructuring = Boolean(state.acceptedRestructuring);

  return `
    <header class="bg-white border-b border-slate-200 px-3 py-2 sticky top-8 z-40">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center space-x-2 cursor-pointer" onclick="navigate('home')">
          <div class="w-7 h-7 rounded-lg bg-brand-dark flex items-center justify-center text-teal-400 font-bold text-sm shadow-sm">
            R
          </div>
          <div>
            <span class="font-extrabold text-brand-dark text-base tracking-tight leading-none">RelieFin</span>
            <span class="block text-[9px] text-teal-700 font-semibold tracking-wider uppercase">Copiloto</span>
          </div>
        </div>

        <button onclick="navigate('premium')" class="text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition inline-flex items-center space-x-1">
          <span>Premium</span>
          <span class="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-medium">Beta</span>
        </button>
      </div>

      <nav class="flex items-center space-x-1 overflow-x-auto pb-0.5 pt-0.5 text-xs font-semibold scrollbar-none" style="-webkit-overflow-scrolling: touch; scrollbar-width: none;">
        <button onclick="navigate('home')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg ${state.currentScreen === 'home' ? 'bg-slate-100 text-brand-dark font-bold' : 'text-slate-600 hover:text-brand-dark'} transition">
          Inicio
        </button>

        <button onclick="navigate('snapshot')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg ${state.currentScreen === 'snapshot' ? 'bg-slate-100 text-brand-dark font-bold' : 'text-slate-600 hover:text-brand-dark'} transition">
          Radiografía
        </button>

        <button onclick="navigate('personalized_plan')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg inline-flex items-center ${state.currentScreen === 'personalized_plan' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-teal-700 hover:bg-teal-50'} transition">
          <span>Plan</span>
          <span class="ml-1 bg-teal-600 text-[9px] text-white font-bold px-1.5 py-0.5 rounded-full leading-none">Nuevo</span>
        </button>

        <button onclick="navigate('applications')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg inline-flex items-center ${state.currentScreen === 'applications' ? 'bg-slate-100 text-brand-dark font-bold' : 'text-slate-600 hover:text-brand-dark'} transition">
          <span>Solicitudes</span>
          ${activeCount > 0 ? `<span class="bg-brand-dark text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold ml-1 leading-none">${activeCount}</span>` : ''}
        </button>

        ${hasRestructuring ? `
          <button onclick="navigate('evolution')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 transition">
            Evolución
          </button>
        ` : ''}
      </nav>
    </header>
  `;
}

function renderDisclaimerBanner() {
  return `
    <div class="bg-slate-50 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 text-center leading-relaxed">
      <span class="font-semibold text-slate-600">Simulación demostrativa:</span> RelieFin no presta dinero directamente ni garantiza aprobaciones. Toda clasificación se basa en la prioridad seleccionada por el usuario.
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLAS
// -------------------------------------------------------------

function renderHomeScreen() {
  const snapshot = state.getSnapshot();
  const lastApp = state.applications[0];

  // Banners adaptativos de estado del usuario
  let adaptiveBanner = '';
  if (lastApp) {
    if (lastApp.status === 'en_estudio' || lastApp.status === 'iniciada') {
      adaptiveBanner = `
        <div class="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div class="text-teal-600 mt-0.5">${Icons.info}</div>
          <div class="flex-1">
            <p class="font-bold text-xs text-teal-900 uppercase tracking-wide">Solicitud en curso con ${lastApp.entidad}</p>
            <p class="text-xs text-teal-800 mt-0.5">¿Ya recibiste respuesta de la entidad financiera?</p>
            <button onclick="openOutcomeReport('${lastApp.id}')" class="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg transition">
              Actualizar resultado
            </button>
          </div>
        </div>
      `;
    } else if (lastApp.status === 'no_aprobada') {
      adaptiveBanner = `
        <div class="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div class="text-slate-600 mt-0.5">${Icons.info}</div>
          <div class="flex-1">
            <p class="font-bold text-xs text-slate-800">Podemos revisar otras alternativas</p>
            <p class="text-xs text-slate-600 mt-0.5">Tu solicitud con ${lastApp.entidad} no fue aprobada. Hay otras opciones que coinciden con tu objetivo.</p>
            <button onclick="navigate('rejection_guidance')" class="mt-2 text-xs bg-brand-dark hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition">
              Explorar opciones restantes
            </button>
          </div>
        </div>
      `;
    } else if (lastApp.status === 'aprobada' && !state.acceptedRestructuring) {
      adaptiveBanner = `
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div class="text-emerald-600 mt-0.5">${Icons.check}</div>
          <div class="flex-1">
            <p class="font-bold text-xs text-emerald-900">¡Solicitud aprobada por ${lastApp.entidad}!</p>
            <p class="text-xs text-emerald-800 mt-0.5">Revisemos las condiciones definitivas antes de que decidas aceptar.</p>
            <button onclick="openFinalOfferInput('${lastApp.id}')" class="mt-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg transition">
              Comparar oferta final
            </button>
          </div>
        </div>
      `;
    }
  }

  if (state.acceptedRestructuring) {
    adaptiveBanner = `
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
        <div class="text-teal-600 mt-0.5">${Icons.shield}</div>
        <div class="flex-1">
          <p class="font-bold text-xs text-teal-900">Consolidación en progreso</p>
          <p class="text-xs text-teal-800 mt-0.5">Llevas ${state.acceptedRestructuring.pagosRealizados} pagos realizados de ${state.acceptedRestructuring.plazoOriginalMeses}.</p>
          <button onclick="navigate('evolution')" class="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg transition">
            Ver mi evolución financiera
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="p-5">
      ${adaptiveBanner}

      <!-- Hero Principal -->
      <div class="text-center py-6">
        <div class="inline-flex items-center space-x-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
          <span>Tu copiloto para reorganizar tus deudas</span>
        </div>
        
        <h1 class="text-3xl font-extrabold text-brand-dark tracking-tight leading-tight">
          Muchas deudas.<br/>
          <span class="text-teal-700">Un camino más claro.</span>
        </h1>
        
        <p class="text-sm text-slate-600 mt-3 max-w-sm mx-auto leading-relaxed">
          Organiza tus deudas, define qué quieres lograr y compara alternativas financieras según tus prioridades.
        </p>

        <!-- CTA Principal del Diagnóstico Gratuito -->
        <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button onclick="startAnalysis()" class="w-full sm:w-auto bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2">
            <span>Analizar mis deudas</span>
            <span>${Icons.arrowRight}</span>
          </button>
          
          <button onclick="navigate('how_it_works')" class="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-5 rounded-xl border border-slate-300 transition">
            ¿Cómo funciona?
          </button>
        </div>

        <p class="text-[11px] text-slate-500 mt-3">
          Comparar alternativas no significa adquirir un nuevo crédito. Tú decides si quieres continuar.
        </p>
      </div>

    </div>
  `;
}

function renderHowItWorksScreen() {
  return `
    <div class="p-5">
      <button onclick="navigate('home')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a inicio</span>
      </button>

      <div class="text-center mb-6">
        <h2 class="text-2xl font-extrabold text-brand-dark">¿Cómo funciona RelieFin?</h2>
        <p class="text-xs text-slate-600 mt-1">Un recorrido transparente de cuatro pasos diseñado para darte claridad.</p>
      </div>

      <div class="space-y-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div class="w-8 h-8 rounded-full bg-brand-dark text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">1</div>
          <div>
            <h3 class="font-bold text-sm text-slate-900">1. Organiza</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              Agrega tus tarjetas y otras obligaciones. No necesitas conocer la tasa exacta para comenzar; nosotros te ayudamos con referencias del mercado colombiano.
            </p>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div class="w-8 h-8 rounded-full bg-brand-dark text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">2</div>
          <div>
            <h3 class="font-bold text-sm text-slate-900">2. Define</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              Cuéntanos qué quieres lograr: ¿pagar menos al mes?, ¿salir de deudas más rápido?, ¿o buscar mejores condiciones sin extender el plazo?
            </p>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div class="w-8 h-8 rounded-full bg-brand-dark text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">3</div>
          <div>
            <h3 class="font-bold text-sm text-slate-900">3. Compara</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              Revisa diferentes alternativas y sus consecuencias. No solo comparamos tasas; analizamos el impacto real en tu cuota, plazo y costo total.
            </p>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div class="w-8 h-8 rounded-full bg-brand-dark text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">4</div>
          <div>
            <h3 class="font-bold text-sm text-slate-900">4. Decide</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              Tú decides si alguna alternativa tiene sentido para ti. Si te interesa, simulamos la solicitud con la entidad y te acompañamos a evaluar su respuesta.
            </p>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 leading-relaxed text-center">
        <p class="font-bold">Principio central de RelieFin:</p>
        <p class="mt-1">RelieFin no presta dinero directamente. Te ayuda a entender, comparar y reorganizar las deudas que ya tienes.</p>
      </div>

      <div class="mt-6">
        <button onclick="navigate('debt_intake')" class="w-full bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition shadow">
          Comenzar mi análisis
        </button>
      </div>
    </div>
  `;
}

function renderDebtIntakeScreen() {
  const debts = state.debts;

  return `
    <div class="p-5">
      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">Construyamos tu radiografía financiera</h2>
        <p class="text-xs text-slate-600 mt-1">
          Agrega las obligaciones que quieres analizar. No necesitas conocer todos los datos para comenzar.
        </p>
      </div>

      <!-- Botones de carga rápida para demostración y auditoría -->
      <div class="mb-5 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-slate-600 font-medium">¿Quieres probar rápido?</span>
          <button onclick="loadDemoDebtsAction()" class="bg-white hover:bg-slate-50 text-brand-dark font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition">
            Cargar 3 deudas de ejemplo
          </button>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-slate-200">
          <span class="text-slate-600 font-medium text-[11px]">Caso auditoría (5 deudas · $46.200.000):</span>
          <button onclick="loadAuditedScenarioAction()" class="bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition text-[11px]">
            Cargar caso auditoría
          </button>
        </div>
      </div>

      <!-- Lista de obligaciones agregadas -->
      <div class="space-y-3 mb-6">
        <h3 class="font-bold text-xs uppercase tracking-wider text-slate-500">Tus obligaciones (${debts.length})</h3>
        
        ${debts.length === 0 ? `
          <div class="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
            <p class="text-xs">No has agregado ninguna deuda todavía.</p>
            <p class="text-[11px] text-slate-400 mt-1">Usa el formulario a continuación para registrar la primera.</p>
          </div>
        ` : debts.map((d, index) => {
          const typeName = formatProductTypeName(d.productType || d.type);

          return `
            <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-sm text-brand-dark">${d.entity}</span>
                  <span class="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">${typeName}</span>
                </div>
                <div class="text-xs text-slate-600 mt-1 space-x-3">
                  <span>Saldo: <strong class="text-slate-900 whitespace-nowrap">${formatCOP(d.balance)}</strong></span>
                  <span>Cuota: <strong class="text-slate-900 whitespace-nowrap">${formatCOP(d.monthlyPayment)}</strong></span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">
                  ${d.knowsRate && isFiniteNumber(d.rateEA) && Number(d.rateEA) >= 0 ? 
                    `<span class="text-teal-700 font-semibold">✓ Tasa: ${formatPercent(d.rateEA)} (proporcionada)</span>` : 
                    `<span class="text-amber-700">Tasa est.: ${isFiniteNumber(d.rateEA) ? formatPercent(d.rateEA) : 'Referencia pendiente'}</span>`
                  }
                  ${d.termMonths ? ` · ${d.termMonths} meses` : ''}
                </div>
              </div>
              <div class="flex items-center space-x-1">
                <button onclick="removeDebt('${d.id}')" class="text-slate-400 hover:text-rose-600 p-1.5 transition" title="Eliminar">
                  ${Icons.trash}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Formulario para agregar una obligación -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
        <h4 class="font-bold text-sm text-brand-dark mb-3 flex items-center space-x-1.5">
          <span>${Icons.plus}</span>
          <span>Agregar una obligación</span>
        </h4>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Tipo de deuda</label>
            <select id="form-debt-type" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="tarjeta_credito">Tarjeta de crédito</option>
              <option value="credito_consumo">Crédito de consumo</option>
              <option value="libre_inversion">Crédito de libre inversión</option>
              <option value="credito_fintech">Crédito fintech</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Entidad financiera</label>
            <select id="form-debt-entity" onchange="updateEntityReferenceHint()" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="bancolombia|Bancolombia">Bancolombia</option>
              <option value="davivienda|Banco Davivienda">Banco Davivienda</option>
              <option value="banco_bogota|Banco de Bogotá">Banco de Bogotá</option>
              <option value="bbva|BBVA Colombia">BBVA Colombia</option>
              <option value="banco_occidente|Banco de Occidente">Banco de Occidente</option>
              <option value="colpatria|Scotiabank Colpatria">Scotiabank Colpatria</option>
              <option value="tuya|Tuya (Tarjeta Éxito / Alkosto)">Tuya (Éxito / Alkosto)</option>
              <option value="addi|Addi Colombia">Addi Colombia</option>
              <option value="cooperativa_jfk|Cooperativa Financiera JFK">Cooperativa JFK</option>
              <option value="otra|Otra entidad">Otra entidad / Cooperativa</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Saldo pendiente (COP) *</label>
              <input type="number" id="form-debt-balance" oninput="formatLiveCopHint('form-debt-balance', 'balance-hint')" placeholder="Ej: 5000000" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <span id="balance-hint" class="text-[10px] text-teal-700 font-medium block mt-0.5 min-h-[14px]"></span>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Pago mensual aprox. (COP) *</label>
              <input type="number" id="form-debt-payment" oninput="formatLiveCopHint('form-debt-payment', 'payment-hint')" placeholder="Ej: 350000" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <span id="payment-hint" class="text-[10px] text-teal-700 font-medium block mt-0.5 min-h-[14px]"></span>
            </div>
          </div>

          <!-- Tasa con selector EA vs MV y opción 'No conozco mi tasa' -->
          <div class="bg-white p-3 rounded-xl border border-slate-200">
            <div class="flex items-center justify-between mb-1.5">
              <label class="font-semibold text-slate-700">Tasa de interés</label>
              <label class="flex items-center space-x-1 text-slate-600 cursor-pointer">
                <input type="checkbox" id="form-debt-unknown-rate" class="rounded text-teal-600 focus:ring-teal-500" onchange="toggleRateInput()">
                <span>No conozco mi tasa</span>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <select id="form-debt-rate-period" onchange="updateRateConversionHint()" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="EA">% E.A. (Efectiva Anual)</option>
                  <option value="MV">% M.V. (Mes Vencido)</option>
                </select>
              </div>
              <div>
                <input type="number" step="0.01" id="form-debt-rate" oninput="updateRateConversionHint()" placeholder="Ej: 25.5" class="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
              </div>
            </div>

            <p id="rate-conversion-hint" class="text-[11px] text-teal-700 font-semibold mt-1.5 hidden"></p>
            <p id="unknown-rate-hint" class="text-[11px] text-slate-500 mt-1.5 hidden">
              💡 Aplicaremos la tasa pública de referencia de la entidad seleccionada (SFC Formato 088) para este análisis inicial.
            </p>
          </div>

          <!-- Plazo y día de pago -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Plazo restante (meses, opcional)</label>
              <input type="number" id="form-debt-term" placeholder="Ej: 24 (o vacío)" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Día de pago del mes (1-31)</label>
              <input type="number" id="form-debt-day" placeholder="Ej: 15" min="1" max="31" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
          </div>

          <button onclick="saveNewDebt()" class="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer">
            + Agregar esta obligación
          </button>
        </div>
      </div>

      <!-- CTA para avanzar -->
      <button onclick="goToSnapshot()" class="w-full ${debts.length > 0 ? 'bg-brand-dark hover:bg-slate-800 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} font-bold py-3.5 px-6 rounded-xl transition">
        Ver mi situación (${pluralizeObligations(debts.length)})
      </button>
    </div>
  `;
}

function renderSnapshotScreen() {
  const snapshot = state.getSnapshot();
  const precision = state.getPrecision();

  if (snapshot.totalCount === 0) {
    return `
      <div class="p-6 text-center">
        <p class="text-sm text-slate-500">No tienes obligaciones registradas todavía.</p>
        <button onclick="navigate('debt_intake')" class="mt-4 bg-brand-dark text-white font-bold py-2.5 px-5 rounded-xl text-xs">
          Agregar mis deudas
        </button>
      </div>
    `;
  }

  AnalyticsProvider.trackFirstSummaryViewed({
    isDemo: state.dataOrigin === 'demo',
    screen: 'snapshot',
    debtsCount: snapshot.totalCount
  });

  const timelineText = formatTimelineSegmentsText(snapshot.timelineSegments);

  return `
    <div class="p-5">
      <div class="mb-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-extrabold text-brand-dark">Esta es tu situación actual</h2>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${state.dataOrigin === 'demo' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-teal-50 text-teal-800 border border-teal-200'}">
            ${state.dataOrigin === 'demo' ? 'Ejemplo demostrativo' : 'Tus datos'}
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5">Proyección mes a mes por obligación desde la misma fecha de corte.</p>
      </div>

      <!-- Indicador de Precisión -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wide">Precisión del análisis:</span>
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
              precision.level === 'alta' ? 'bg-emerald-100 text-emerald-800' :
              precision.level === 'media' ? 'bg-blue-100 text-blue-800' :
              'bg-amber-100 text-amber-900'
            }">${precision.label}</span>
          </div>
          <button onclick="navigate('debt_intake')" class="text-xs text-teal-700 hover:underline font-bold">
            Mejorar precisión
          </button>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
          <div class="h-2 rounded-full ${
            precision.level === 'alta' ? 'bg-emerald-500' :
            precision.level === 'media' ? 'bg-blue-500' :
            'bg-amber-500'
          }" style="width: ${precision.percentage}%"></div>
        </div>

        <p class="text-xs text-slate-600 leading-relaxed">${precision.explanation}</p>
      </div>

      <!-- Cards Principales -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Deuda total</span>
          <div class="text-xl font-extrabold text-brand-dark mt-1 whitespace-nowrap">${formatCOP(snapshot.totalBalance)}</div>
          <span class="text-[10px] text-slate-400">Capital pendiente (${pluralizeObligations(snapshot.totalCount)})</span>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cuota conjunta inicial</span>
          <div class="text-xl font-extrabold text-brand-dark mt-1 whitespace-nowrap">${formatCOP(snapshot.initialJointPayment ?? snapshot.totalMonthlyPayment)}</div>
          <span class="text-[10px] text-slate-400">Mes 1 · suma de cuotas activas</span>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Último mes con pagos</span>
          <div class="text-xl font-extrabold text-brand-dark mt-1 whitespace-nowrap">
            ${snapshot.lastPaymentMonth ? `Mes ${snapshot.lastPaymentMonth}` : 'Por definir'}
          </div>
          <span class="text-[10px] text-slate-400">Cuando termina la última deuda</span>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tasa ponderada</span>
          <div class="text-xl font-extrabold text-teal-700 mt-1 whitespace-nowrap">${formatPercent(snapshot.weightedRateEA)}</div>
          <span class="text-[10px] text-slate-400">${snapshot.knownRatesCount} conocida · ${snapshot.estimatedRatesCount} estimada</span>
        </div>
      </div>

      <!-- Proyección mes a mes por obligación -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500">
            ${snapshot.hasUncertainty ? 'Proyección orientativa (mes a mes)' : 'Proyección mes a mes por obligación'}
          </h4>
          <span class="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold border border-teal-100">
            Misma fecha de corte
          </span>
        </div>

        ${timelineText ? `
          <div class="p-3 bg-teal-50/70 rounded-xl border border-teal-200 text-xs">
            <span class="text-[10px] font-bold uppercase text-teal-800 block mb-1">Cronograma de pagos mensuales conjuntos</span>
            <p class="text-slate-800 leading-relaxed">${timelineText}</p>
          </div>
        ` : ''}
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span class="text-[10px] text-slate-400 block font-medium">1. Capital pendiente</span>
            <span class="font-extrabold text-sm text-slate-900 whitespace-nowrap">${formatCOP(snapshot.totalBalance)}</span>
          </div>

          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span class="text-[10px] text-slate-400 block font-medium">2. Intereses calculados</span>
            <span class="font-extrabold text-sm text-teal-800 whitespace-nowrap">
              ${snapshot.isCostCalculable ? formatCOP(snapshot.estimatedTotalInterest) : '<span class="text-[11px] text-amber-700 font-medium italic">No disponible</span>'}
            </span>
          </div>
        </div>

        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
          <div class="flex justify-between items-center mb-1">
            <span class="font-semibold text-slate-600">3. Total futuro proyectado:</span>
            <span class="font-extrabold text-brand-dark text-sm whitespace-nowrap">
              ${snapshot.isCostCalculable ? formatCOP(snapshot.estimatedRemainingCost) : '<span class="text-[11px] text-amber-700 font-medium italic">No es posible calcularlo con los datos disponibles</span>'}
            </span>
          </div>
          ${!snapshot.isCostCalculable ? `
            <p class="text-[11px] text-amber-800 mt-1">
              ⚠️ ${snapshot.costUncalculableReason || 'No es posible calcularlo con los datos disponibles (faltan tasas verificables o plazo exacto).'}
            </p>
          ` : `
            <p class="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Suma de los pagos mensuales individuales de ${pluralizeObligations(state.debts.length)} proyectadas por separado desde el mes 1 hasta el mes ${snapshot.lastPaymentMonth}${snapshot.totalCharges > 0 ? ` (incluye ${formatCOP(snapshot.totalCharges)} en cargos contados una sola vez)` : ''}.
            </p>
          `}
        </div>

        ${snapshot.estimationNotes && snapshot.estimationNotes.length > 0 ? `
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 space-y-1">
            <p class="font-bold text-amber-900">ℹ️ Cifras estimadas y su motivo:</p>
            <ul class="list-disc list-inside space-y-0.5 text-amber-900">
              ${snapshot.estimationNotes.map(n => `<li><strong>${n.entity}:</strong> ${n.reason}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Coherencia de cuota reportada vs cuota financiera pura -->
        ${snapshot.pureAmortizationPayment && Math.abs(snapshot.totalMonthlyPayment - snapshot.pureAmortizationPayment) > (snapshot.pureAmortizationPayment * 0.03) ? `
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
            <p class="font-bold flex items-center space-x-1">
              <span>ℹ️</span>
              <span>Diferencia entre cuota pagada y cuota pura nivelada</span>
            </p>
            <p class="mt-1 text-[11px]">
              Declaras pagar <strong>${formatCOP(snapshot.totalMonthlyPayment)}</strong> al mes, mientras que la cuota matemática nivelada pura calculada es de <strong>${formatCOP(snapshot.pureAmortizationPayment)}</strong> (diferencia: ${formatCOP(Math.abs(snapshot.totalMonthlyPayment - snapshot.pureAmortizationPayment))}).
            </p>
            <p class="mt-1 text-[10px] text-blue-800 leading-normal">
              Posibles causas: seguros obligatorios (vida deudor, desempleo), cargos de manejo de tarjeta, amortización acelerada o pagos mínimos. Conservamos tus datos originales tal como los ingresaste.
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Gráfico de distribución de deuda -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm">
        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Distribución de tu deuda</h4>
        
        <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex mb-3">
          ${snapshot.distribution.map((d, i) => {
            const colors = ['bg-teal-600', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
            const color = colors[i % colors.length];
            return `<div class="${color} h-full" style="width: ${d.percentage}%" title="${d.entity}: ${d.percentage}%"></div>`;
          }).join('')}
        </div>

        <div class="space-y-2">
          ${snapshot.distribution.map((d, i) => {
            const colors = ['bg-teal-600', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
            const dot = colors[i % colors.length];
            return `
              <div class="py-1.5 border-b border-slate-100 last:border-0 text-xs">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="w-2.5 h-2.5 rounded-full ${dot}"></span>
                    <span class="font-semibold text-slate-800">${d.entity} · <span class="text-[11px] font-normal text-slate-500">${d.type}</span></span>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(d.balance)}</span>
                    <span class="text-slate-400 text-[10px] ml-1">(${d.percentage}%)</span>
                  </div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-500 mt-0.5 pl-4">
                  <span>Cuota: ${formatCOP(d.monthlyPayment)} · ${d.termMonths ? `${d.termMonths} m` : 'Plazo pendiente'} · ${isFiniteNumber(d.rateEA) ? formatPercent(d.rateEA) : 'Sin tasa'}</span>
                  ${d.isEstimated && d.rateSourceUrl ? `<span class="text-amber-700 truncate max-w-[170px]" title="${d.rateSourceUrl} (${d.rateSourceDate || ''})">${d.rateSourceDate || 'Ref. SFC'}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- PASO 4: LINK A PLAN PERSONALIZADO -->
      <div class="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-4 mb-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-1.5 text-teal-800 font-bold text-xs">
              <span>🎯</span>
              <span>¿Prefieres organizar tus pagos actuales sin consolidar?</span>
            </div>
            <p class="text-xs text-slate-600 mt-1">
              Conoce nuestro plan orientativo con estrategias Bola de Nieve, Avalancha y calendario de vencimientos.
            </p>
          </div>
        </div>
        <button onclick="navigate('personalized_plan')" class="mt-3 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition shadow-sm">
          Ver mi plan de organización financiera
        </button>
      </div>

      <!-- CTA Principal -->
      <button onclick="navigate('goals')" class="w-full bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2">
        <span>Definir mi objetivo</span>
        <span>${Icons.arrowRight}</span>
      </button>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLA: MI PLAN DE ORGANIZACIÓN FINANCIERA (PASO 4)
// -------------------------------------------------------------

function renderPersonalizedPlanScreen() {
  AnalyticsProvider.track('personalized_plan_viewed');
  const snapshot = state.getSnapshot();
  const scenarios = generatePrioritizationScenarios(state.debts, 150000);
  const calendar = generatePaymentCalendar(state.debts);
  const extraSim = simulateAdditionalPayment(snapshot.totalBalance, snapshot.totalMonthlyPayment, snapshot.weightedRateEA, 200000);

  return `
    <div class="p-5">
      <button onclick="navigate('snapshot')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-3">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a la radiografía</span>
      </button>

      <div class="mb-5">
        <div class="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">
          <span>Funcionalidad experimental (Sin costo en el MVP)</span>
        </div>
        <h2 class="text-2xl font-extrabold text-brand-dark">Mi plan de organización financiera</h2>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Estrategias orientativas para acelerar el pago de tus deudas actuales sin solicitar nuevos créditos.
        </p>
      </div>

      <!-- Resumen de Obligaciones -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-5">
        <h3 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Resumen de partida</h3>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-400 block">Deuda total</span>
            <span class="font-extrabold text-xs text-slate-900">${formatCOP(snapshot.totalBalance)}</span>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-400 block">Cuota mensual</span>
            <span class="font-extrabold text-xs text-slate-900">${formatCOP(snapshot.totalMonthlyPayment)}</span>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-400 block">Plazo aprox.</span>
            <span class="font-extrabold text-xs text-teal-700">${snapshot.estimatedTermMonths} meses</span>
          </div>
        </div>
      </div>

      <!-- Escenarios Orientativos de Priorización -->
      <div class="mb-5">
        <h3 class="font-bold text-sm text-brand-dark mb-1">Escenarios orientativos de priorización</h3>
        <p class="text-xs text-slate-500 mb-3">¿Cómo ordenar tus pagos para liquidar tus deudas más rápido?</p>

        <div class="space-y-3">
          ${scenarios.map(sc => `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-bold text-xs text-slate-900">${sc.name}</h4>
                  <span class="text-[10px] text-teal-700 font-semibold">${sc.tagline}</span>
                </div>
              </div>
              <p class="text-xs text-slate-600 mt-2 leading-relaxed">${sc.description}</p>
              
              <div class="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span class="text-[11px] font-bold text-slate-700 block mb-1">Primer foco de pago:</span>
                <span class="text-xs font-extrabold text-brand-dark bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">${sc.firstFocus}</span>
                <div class="text-[11px] text-slate-500 mt-2">
                  <span class="font-medium text-slate-600">Orden propuesto:</span> ${sc.order.join(' → ')}
                </div>
              </div>

              <div class="mt-2.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span class="font-bold">Trade-off:</span> ${sc.tradeOff}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Calendario de Obligaciones -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-5">
        <div class="flex items-center space-x-1.5 font-bold text-sm text-brand-dark mb-1">
          <span>${Icons.calendar}</span>
          <span>Calendario mensual de pagos</span>
        </div>
        <p class="text-xs text-slate-500 mb-3">Programa tus días de corte y pago para no incurrir en moras ni cobros de cobranza.</p>

        <div class="space-y-2">
          ${calendar.map(item => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-xs">
                  ${item.paymentDay}
                </span>
                <div>
                  <span class="font-bold text-slate-800">${item.entity}</span>
                  <span class="text-[10px] text-slate-400 block">${item.formattedDay}</span>
                </div>
              </div>
              <span class="font-bold text-slate-900">${formatCOP(item.monthlyPayment)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Simulación de pagos adicionales -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-5">
        <h3 class="font-bold text-sm text-brand-dark mb-1">¿Qué pasaría si pagas un poco más al mes?</h3>
        <p class="text-xs text-slate-500 mb-3">Simula el efecto de abonar $ 200.000 adicionales a tu cuota actual.</p>

        <div class="grid grid-cols-2 gap-2 text-center bg-teal-50 p-3 rounded-xl border border-teal-200">
          <div>
            <span class="text-[10px] text-teal-800 uppercase font-semibold">Tiempo ahorrado</span>
            <div class="text-lg font-extrabold text-teal-900 mt-0.5">~${extraSim.monthsSaved} meses</div>
          </div>
          <div>
            <span class="text-[10px] text-teal-800 uppercase font-semibold">Ahorro en intereses</span>
            <div class="text-lg font-extrabold text-teal-900 mt-0.5">${formatCOP(extraSim.interestSaved)}</div>
          </div>
        </div>
        <p class="text-[10px] text-slate-400 text-center mt-2">Cálculo matemático demostrativo basado en tasa ponderada y cuotas niveladas.</p>
      </div>

      <!-- Explicación de Supuestos y Limitaciones -->
      <div class="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-[11px] text-slate-600 leading-relaxed mb-6">
        <span class="font-bold text-slate-800">Transparencia y limitaciones del plan:</span>
        Este plan es orientativo. No garantiza reducción contractual de deuda ni ahorro automático. Cuando faltan tasas exactas de tus extractos, utilizamos tasas estimadas de referencia colombianas. No cobramos por este plan en el MVP.
      </div>

      <!-- Interés en herramientas comerciales -->
      <div class="bg-brand-dark text-white p-4 rounded-2xl shadow-md text-center mb-6">
        <h4 class="font-bold text-xs uppercase tracking-wider text-teal-300">¿Te gustaría recibir alertas y seguimiento de este plan?</h4>
        <p class="text-xs text-slate-300 mt-1 mb-3">Estamos evaluando incluirlo en RelieFin Premium.</p>
        <button id="interest-plan-btn" onclick="submitPersonalizedPlanInterest()" class="w-full bg-teal-500 hover:bg-teal-400 text-brand-dark font-extrabold text-xs py-2.5 rounded-xl transition">
          Me interesa el plan personalizado
        </button>
      </div>

      <!-- Navegación -->
      <div class="flex space-x-2">
        <button onclick="navigate('snapshot')" class="w-1/2 bg-white border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl text-xs">
          Volver a radiografía
        </button>
        <button onclick="navigate('goals')" class="w-1/2 bg-brand-dark text-white font-bold py-3 rounded-xl text-xs">
          Comparar alternativas
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLA: OBJETIVO
// -------------------------------------------------------------

function renderGoalSelectionScreen() {
  return `
    <div class="p-5">
      <button onclick="navigate('snapshot')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a radiografía</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">¿Qué quieres lograr con tus deudas?</h2>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          No existe una única alternativa ideal para todos. Dinos qué quieres priorizar y ordenaremos las opciones en función de tu respuesta.
        </p>
      </div>

      <div class="space-y-3 mb-6">
        ${Object.values(GOALS).map(g => {
          const isSelected = state.userGoal === g.id;
          return `
            <div onclick="selectGoal('${g.id}')" class="cursor-pointer p-4 rounded-2xl border-2 transition-all ${
              isSelected ? 'border-teal-600 bg-teal-50/50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
            }">
              <div class="flex items-center justify-between">
                <span class="font-bold text-sm text-brand-dark">${g.title}</span>
                <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                }">
                  ${isSelected ? Icons.check : ''}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${g.description}</p>
              <div class="text-[10px] text-teal-800 font-semibold mt-2">
                Prioridad: ${g.priorityMetric}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button onclick="navigate('processing')" class="w-full bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2">
        <span>Buscar alternativas</span>
        <span>${Icons.arrowRight}</span>
      </button>
    </div>
  `;
}

function renderProcessingScreen() {
  setTimeout(() => {
    navigate('alternatives');
  }, 1600);

  return `
    <div class="p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
      <div class="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl mb-4 animate-bounce">
        ⚡
      </div>
      
      <h2 class="text-xl font-extrabold text-brand-dark">Estamos comparando escenarios</h2>
      <p class="text-xs text-slate-500 mt-1 max-w-xs">
        No buscamos simplemente la tasa más baja. Queremos mostrarte cómo cambia cada alternativa según lo que quieres lograr.
      </p>

      <div class="mt-6 space-y-2 text-xs text-left max-w-xs w-full bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div class="flex items-center space-x-2 text-teal-700">
          <span>✓</span>
          <span>Analizando tus obligaciones</span>
        </div>
        <div class="flex items-center space-x-2 text-teal-700">
          <span>✓</span>
          <span>Considerando tu prioridad: <strong>${GOALS[state.userGoal]?.shortTitle}</strong></span>
        </div>
        <div class="flex items-center space-x-2 text-teal-700">
          <span>✓</span>
          <span>Comparando alternativas de mercado</span>
        </div>
        <div class="flex items-center space-x-2 text-teal-700">
          <span>✓</span>
          <span>Evaluando cuota, plazo y costo estimado</span>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLA: ALTERNATIVAS PERSONALIZADAS
// -------------------------------------------------------------

function renderAlternativesScreen() {
  AnalyticsProvider.track('viewed_alternatives', { goal: state.userGoal });
  const { ranked } = state.getAlternatives();
  const currentGoalObj = GOALS[state.userGoal];
  const snapshot = state.getSnapshot();
  const fullCoverage = evaluatePortfolioFullCoverage(state.debts);

  return `
    <div class="p-5">
      <div class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-slate-500">Tu prioridad:</span>
          <button onclick="navigate('goals')" class="text-xs text-teal-700 font-bold hover:underline">
            Cambiar prioridad
          </button>
        </div>
        <div class="inline-block bg-teal-50 border border-teal-200 text-teal-900 font-extrabold text-sm px-3 py-1 rounded-xl">
          ${currentGoalObj?.title || 'Personalizado'}
        </div>
      </div>

      <!-- Banner de Evaluación de Consolidación 100% de Cartera (REQUERIMIENTO 1) -->
      <div class="mb-4 rounded-2xl border p-4 shadow-sm ${fullCoverage.canAnyProductConsolidate100 ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50/70 border-amber-300 text-amber-950'}">
        <div class="flex items-start space-x-2.5">
          <span class="text-lg leading-none">${fullCoverage.canAnyProductConsolidate100 ? '🎯' : '🔍'}</span>
          <div class="text-xs leading-relaxed flex-1">
            <h4 class="font-extrabold text-sm ${fullCoverage.canAnyProductConsolidate100 ? 'text-emerald-900' : 'text-amber-900'}">
              ${fullCoverage.canAnyProductConsolidate100 ? 'Consolidación total (100 %) viable' : 'Evaluación de Consolidación del 100 % de Cartera'}
            </h4>
            <p class="mt-1 text-[11px] ${fullCoverage.canAnyProductConsolidate100 ? 'text-emerald-800' : 'text-amber-900'}">
              ${fullCoverage.explanation}
            </p>
            ${!fullCoverage.canAnyProductConsolidate100 ? `
              <div class="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px]">
                <span class="font-bold text-amber-950">Máxima cobertura identificada:</span>
                <span class="font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  ${fullCoverage.maxCoveragePercentage} % de tu deuda
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="space-y-4 mb-6">
        ${ranked.map((comp) => {
          const { product, eligibility, simulation } = comp;
          const isEligible = eligibility.isEligible;
          const hasRate = simulation.hasPublishedRate;

          return `
            <div class="bg-white rounded-2xl border ${comp.isTopMatch ? 'border-teal-600 ring-2 ring-teal-600/10' : 'border-slate-200'} p-4 shadow-sm relative transition hover:shadow-md">
              
              <!-- Badges de cabecera -->
              <div class="flex items-center justify-between gap-1 mb-2 flex-wrap">
                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  ${comp.isTopMatch ? `
                    <span class="inline-flex items-center bg-teal-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      ★ Opción sugerida
                    </span>
                  ` : ''}
                  <span class="inline-flex items-center bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Banco real supervisado SFC
                  </span>
                  ${product.isHistoricalTariff ? `
                    <span class="inline-flex items-center bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      ⚠️ Tasa histórica 2024 · Pendiente act. 2026
                    </span>
                  ` : product.verificationStatus === 'verificado_sin_tasa_publica' ? `
                    <span class="inline-flex items-center bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
                      ℹ️ Tasa no pública (evaluación individual)
                    </span>
                  ` : ''}
                  ${eligibility.canConsolidate100Percent ? `
                    <span class="inline-flex items-center bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      100% consolidable
                    </span>
                  ` : `
                    <span class="inline-flex items-center bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ${eligibility.consolidationPercentage}% consolidable
                    </span>
                  `}
                </div>
                ${product.isHistoricalTariff ? `
                  <span class="text-[9px] text-amber-800 font-semibold">Tarifario histórico 2024</span>
                ` : `
                  <span class="text-[9px] text-slate-400 font-medium">${product.effectiveDate}</span>
                `}
              </div>

              <!-- Nombre y Producto -->
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-extrabold text-base text-brand-dark">${product.entityName}</h3>
                  <p class="text-xs text-slate-600 font-medium">${product.commercialName || 'Producto por confirmar'}</p>
                </div>
              </div>

              <!-- Tasa Comercial Oficial -->
              <div class="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block">Tasa de interés comercial</span>
                <div class="text-sm font-extrabold text-teal-800 mt-0.5">
                  ${product.rateDisplayMV}
                </div>
                <div class="text-[11px] text-slate-500 font-medium">
                  Equivalente: <strong>${product.rateDisplayEA}</strong>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Fuente oficial: ${product.officialSource}</p>
                ${product.isHistoricalTariff ? `
                  <div class="text-[10px] text-amber-950 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 leading-relaxed">
                    <p class="font-bold flex items-center space-x-1 text-amber-900">
                      <span>📅</span>
                      <span>Referencia histórica 2024 (No certificada como vigente para 2026)</span>
                    </p>
                    <p class="mt-0.5 text-slate-600">
                      Esta tarifa proviene de publicaciones oficiales de 2024 y está <strong>pendiente de actualización para el período 2026</strong>. La tasa real que te otorgue el banco puede variar según tu evaluación de riesgo individual.
                    </p>
                  </div>
                ` : !product.rateMinEA ? `
                  <div class="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2 leading-relaxed">
                    ℹ️ Entidad real con producto de compra de cartera verificado. ${product.entityName} no publica tasa fija general en web; la tasa y cuota finales se asignan de forma individual según perfil de riesgo.
                  </div>
                ` : ''}
              </div>

              <!-- REQUERIMIENTO 2: DESGLOSE COMPLETO POR BANCO -->
              <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div class="flex justify-between items-center text-slate-600">
                  <span>Deuda total original:</span>
                  <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(eligibility.totalOriginalDebt)} (${pluralizeObligations(eligibility.totalDebtsCount)})</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>Obligaciones potencialmente elegibles:</span>
                  <span class="font-bold text-teal-800 whitespace-nowrap">${eligibility.eligibleCount} de ${pluralizeObligations(eligibility.totalDebtsCount)}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>Monto orientativo a solicitar:</span>
                  <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(eligibility.eligibleBalance)}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>% de cartera potencialmente consolidable:</span>
                  <span class="font-extrabold ${eligibility.canConsolidate100Percent ? 'text-emerald-700' : 'text-amber-800'}">
                    ${eligibility.consolidationPercentage} %
                  </span>
                </div>

                ${eligibility.excludedDebts.length > 0 ? `
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2 text-[11px] text-amber-950">
                    <p class="font-bold flex items-center justify-between">
                      <span>⚠️ Obligaciones excluidas (${pluralizeObligations(eligibility.excludedCount)} por <span class="whitespace-nowrap">${formatCOP(eligibility.excludedBalance)}</span>):</span>
                    </p>
                    <ul class="mt-1 space-y-1 text-slate-700">
                      ${eligibility.excludedDebts.map(ex => `
                        <li>• <strong>${ex.debt.entity || ex.debt.entityName || 'Deuda'} (${formatProductTypeName(ex.debt.productType || ex.debt.type)}):</strong> <span class="whitespace-nowrap">${formatCOP(ex.debt.balance)}</span> (cuota actual <span class="whitespace-nowrap">${formatCOP(ex.debt.monthlyPayment)}</span>) — <span class="text-amber-800">${ex.reason}</span></li>
                      `).join('')}
                    </ul>
                  </div>
                ` : `
                  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-[10px] text-emerald-800 font-semibold mt-1">
                    ✓ Cobertura total: No hay deudas excluidas por entidad ni por modalidad.
                  </div>
                `}

                ${!isEligible ? `
                  <div class="bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2 text-[11px] text-rose-800">
                    <strong>Condición no cumplida:</strong> ${eligibility.ineligibilityReason}
                  </div>
                ` : ''}
              </div>

              <!-- REQUERIMIENTOS 2, 3 Y 4: CIFRAS Y FÓRMULAS FINANCIERAS OBLIGATORIAS -->
              ${isEligible ? `
                <div class="mt-3 p-3 bg-teal-50/40 rounded-xl border border-teal-100 text-xs space-y-2">
                  <div class="grid grid-cols-2 gap-2 text-center">
                    <div class="bg-white p-2 rounded-lg border border-teal-100 shadow-2xs">
                      <span class="text-[10px] text-slate-500 block font-semibold">Cuota nuevo crédito</span>
                      <span class="font-extrabold text-xs text-brand-dark whitespace-nowrap">
                        ${hasRate ? (simulation.isRange ? `Desde ${formatCOP(simulation.cuotaMin)}` : formatCOP(simulation.cuotaMensual)) : '<span class="text-[10px] text-amber-800 font-bold">Sujeta a estudio</span>'}
                      </span>
                      <span class="text-[9px] text-slate-400 block mt-0.5">Plazo: ${simulation.termMonths} meses</span>
                    </div>

                    <div class="bg-white p-2 rounded-lg border border-teal-100 shadow-2xs">
                      <span class="text-[10px] text-slate-500 block font-semibold">Cuotas que permanecerían</span>
                      <span class="font-extrabold text-xs ${eligibility.excludedMonthlyPayment > 0 ? 'text-amber-800' : 'text-slate-700'} whitespace-nowrap">
                        ${formatCOP(eligibility.excludedMonthlyPayment)}
                      </span>
                      <span class="text-[9px] text-slate-400 block mt-0.5">${eligibility.excludedCount === 1 ? '1 deuda remanente' : `${eligibility.excludedCount} deudas remanentes`}</span>
                    </div>
                  </div>

                  <!-- FÓRMULA OBLIGATORIA: PAGO MENSUAL TOTAL POSTERIOR (PUNTO 3) -->
                  <div class="bg-brand-dark text-white p-2.5 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <span class="text-[10px] text-teal-300 font-bold uppercase tracking-wider block">PAGO MENSUAL TOTAL POSTERIOR</span>
                      <span class="text-[9px] text-slate-300">Cuota nuevo crédito + cuotas obligaciones activas</span>
                    </div>
                    <div class="text-right">
                      <span class="text-sm font-extrabold text-teal-200 whitespace-nowrap">
                        ${hasRate ? (simulation.isRange ? `Desde ${formatCOP(simulation.pagoMensualTotalPosteriorMin)}` : formatCOP(simulation.pagoMensualTotalPosterior)) : '<span class="text-xs text-amber-300">Por definir</span>'}
                      </span>
                    </div>
                  </div>

                  <!-- FÓRMULA OBLIGATORIA: REDUCCIÓN DEL PAGO MENSUAL (PUNTO 6) -->
                  ${hasRate && simulation.ahorroMensualReal !== null ? `
                    <div class="p-2 rounded-lg ${simulation.ahorroMensualReal > 0 ? 'bg-emerald-100/80 border border-emerald-300 text-emerald-950' : 'bg-slate-100 text-slate-800'} text-[11px]">
                      <div class="flex justify-between items-center font-bold">
                        <span>Reducción del pago mensual:</span>
                        <span class="text-xs ${simulation.ahorroMensualReal > 0 ? 'text-emerald-800' : 'text-slate-700'} font-extrabold whitespace-nowrap">
                          ${simulation.ahorroMensualReal > 0 ? `~${formatCOP(simulation.ahorroMensualReal)} / mes` : `${formatCOP(simulation.ahorroMensualReal)} / mes`}
                        </span>
                      </div>
                      <p class="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                        Flujo de caja liberado: Pago actual total (${formatCOP(eligibility.totalOriginalMonthlyPayment)}) − Pago posterior total (${formatCOP(simulation.pagoMensualTotalPosterior)}). El ahorro en costo de intereses depende del plazo total acordado.
                      </p>
                    </div>
                  ` : ''}

                  <!-- REQUERIMIENTO 8: NINGUNA AFIRMACIÓN FALSA DE OBLIGACIONES -->
                  <div class="text-[11px] text-slate-600 font-medium pt-0.5">
                    📌 <strong>Obligaciones activas resultantes:</strong> Pasarías de <strong>${pluralizeObligations(eligibility.totalDebtsCount)}</strong> a <strong>${pluralizeObligations(simulation.activeObligationsAfterOperation)}</strong> (1 nueva compra de cartera${eligibility.excludedCount > 0 ? ` + ${pluralizeObligations(eligibility.excludedCount)} previas que continúan` : ' con consolidación total'}).
                  </div>

                  ${simulation.scenarioLastPaymentMonth ? `
                    <div class="flex justify-between items-center text-[11px] pt-1 border-t border-teal-100">
                      <span class="text-slate-600">Último mes con pagos / Total futuro del escenario:</span>
                      <span class="font-bold text-slate-900 whitespace-nowrap">Mes ${simulation.scenarioLastPaymentMonth} · ${simulation.scenarioTotalFuturePayment !== null ? formatCOP(simulation.scenarioTotalFuturePayment) : 'Por definir'}</span>
                    </div>
                  ` : ''}

                  ${!hasRate ? `
                    <p class="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-normal">
                      ℹ️ ${product.entityName} no publica tasa única fija general en web. Las cuotas y costos se definen tras radicar la solicitud y evaluar tu capacidad de endeudamiento.
                    </p>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Explicación de coincidencia con tu objetivo -->
              ${comp.isTopMatch && comp.topMatchReason ? `
                <div class="mt-3 bg-teal-50/60 p-2.5 rounded-xl border border-teal-100 text-xs">
                  <p class="text-teal-900 font-semibold">¿Por qué es la opción sugerida?</p>
                  <p class="text-slate-600 text-[11px] mt-0.5">${comp.topMatchReason}</p>
                </div>
              ` : ''}

              <!-- Botones de Acción -->
              <div class="mt-4 grid grid-cols-3 gap-2">
                <a href="${product.officialUrl}" target="_blank" rel="noopener noreferrer" class="bg-white border border-slate-300 hover:border-brand-dark text-slate-800 hover:text-brand-dark font-bold text-[11px] py-2.5 px-2 rounded-xl transition flex items-center justify-center space-x-1 shadow-sm text-center">
                  <span>Banco ↗</span>
                </a>

                <button onclick="openBeforeAfter('${product.id}')" ${!isEligible ? 'disabled' : ''} class="bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-900 font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center ${!isEligible ? 'opacity-50 cursor-not-allowed' : ''}">
                  Qué cambiaría
                </button>

                <button onclick="startApplicationSimulation('${product.id}')" ${!isEligible ? 'disabled' : ''} class="w-full ${isEligible ? 'bg-brand-dark hover:bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} font-bold text-[11px] py-2.5 px-2 rounded-xl transition flex items-center justify-center text-center shadow">
                  <span>Registrar</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- CTA secundario para comparar tabla completa -->
      <button onclick="navigate('comparison')" class="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-xs transition mb-3">
        Ver tabla comparativa detallada
      </button>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLAS: COMPARADOR Y ANTES VS DESPUÉS
// -------------------------------------------------------------

function renderComparisonScreen() {
  AnalyticsProvider.track('compared_alternatives', { isDemo: state.dataOrigin === 'demo' });
  AnalyticsProvider.trackFirstComparisonCompleted({
    isDemo: state.dataOrigin === 'demo',
    screen: 'comparison'
  });
  const snapshot = state.getSnapshot();
  const { ranked } = state.getAlternatives();

  return `
    <div class="p-5">
      <button onclick="navigate('alternatives')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a alternativas</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">Compara antes de decidir</h2>
        <p class="text-xs text-slate-600 mt-0.5">Revisa lado a lado cuánto pagas al mes, cuándo terminas de pagar y cuánto pagarías en total.</p>
      </div>

      <div class="overflow-x-auto -mx-5 px-5 mb-6">
        <table class="w-full text-xs text-left border-collapse min-w-[620px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="p-2.5 font-bold text-slate-500">Concepto</th>
              <th class="p-2.5 font-bold text-slate-800 bg-slate-100">Hoy (Actual)</th>
              ${ranked.map(a => `<th class="p-2.5 font-bold text-teal-900">${a.entity}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Producto</td>
              <td class="p-2.5 font-bold text-slate-900 bg-slate-50">Deudas actuales</td>
              ${ranked.map(a => `<td class="p-2.5 text-slate-800 text-[11px] font-medium">${a.commercialName}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Tasa y fuente / fecha</td>
              <td class="p-2.5 text-slate-700 bg-slate-50 text-[11px]">
                <strong>${formatPercent(snapshot.weightedRateEA)}</strong>
                <span class="block text-[10px] text-slate-500">${snapshot.estimatedRatesCount > 0 ? 'Incluye ref. SFC 2024' : 'Reportadas'}</span>
              </td>
              ${ranked.map(a => `
                <td class="p-2.5 text-slate-700 text-[11px]">
                  <strong class="text-teal-800 block">${a.product.rateDisplayEA}</strong>
                  <span class="text-[10px] text-slate-500 block">${a.officialSource}</span>
                  <span class="text-[10px] ${a.isHistoricalTariff ? 'text-amber-700 font-semibold' : 'text-slate-400'} block">${a.effectiveDate}</span>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Capital a consolidar</td>
              <td class="p-2.5 text-slate-700 bg-slate-50 whitespace-nowrap">${formatCOP(snapshot.totalBalance)}</td>
              ${ranked.map(a => `<td class="p-2.5 text-slate-900 font-bold whitespace-nowrap">${formatCOP(a.eligibility.eligibleBalance)} <span class="text-[10px] font-normal text-slate-500">(${a.eligibility.consolidationPercentage}%)</span></td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Cuota nuevo crédito + que continúan</td>
              <td class="p-2.5 text-slate-500 bg-slate-50">-</td>
              ${ranked.map(a => `<td class="p-2.5 text-[11px]">
                <span class="font-bold text-brand-dark block whitespace-nowrap">${a.simulation.hasPublishedRate ? (a.simulation.isRange ? `Desde ${formatCOP(a.simulation.cuotaMin)}` : formatCOP(a.simulation.cuotaMensual)) : '<span class="text-amber-700">Por definir</span>'}</span>
                <span class="text-[10px] ${a.eligibility.excludedMonthlyPayment > 0 ? 'text-amber-800 font-semibold' : 'text-slate-500'} whitespace-nowrap">+ ${formatCOP(a.eligibility.excludedMonthlyPayment)} que siguen</span>
              </td>`).join('')}
            </tr>
            <tr class="bg-teal-50/40">
              <td class="p-2.5 font-extrabold text-brand-dark">Pago mensual conjunto</td>
              <td class="p-2.5 font-bold text-slate-900 bg-slate-100 whitespace-nowrap">${formatCOP(snapshot.initialJointPayment ?? snapshot.totalMonthlyPayment)}</td>
              ${ranked.map(a => `<td class="p-2.5 font-extrabold text-teal-900 whitespace-nowrap">${a.simulation.hasPublishedRate ? (a.simulation.isRange ? `Desde ${formatCOP(a.simulation.pagoMensualTotalPosteriorMin)}` : formatCOP(a.simulation.pagoMensualTotalPosterior)) : '<span class="text-[10px] text-amber-800">Por definir</span>'}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Último mes con pagos</td>
              <td class="p-2.5 font-bold text-slate-800 bg-slate-50">${snapshot.lastPaymentMonth ? `Mes ${snapshot.lastPaymentMonth}` : 'Por definir'}</td>
              ${ranked.map(a => `<td class="p-2.5 font-bold text-slate-900">${a.scenarioLastPaymentMonth ? `Mes ${a.scenarioLastPaymentMonth}` : `${a.simulation.termMonths} meses`}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Total futuro a pagar (cargos 1 vez)</td>
              <td class="p-2.5 font-bold text-slate-900 bg-slate-50 whitespace-nowrap">${snapshot.isCostCalculable ? formatCOP(snapshot.estimatedRemainingCost) : '<span class="text-[10px] text-amber-700">No calculable</span>'}</td>
              ${ranked.map(a => `<td class="p-2.5 font-extrabold text-slate-900 whitespace-nowrap">${a.scenarioTotalFuturePayment !== null && a.scenarioTotalFuturePayment !== undefined ? formatCOP(a.scenarioTotalFuturePayment) : '<span class="text-[10px] text-amber-700">Por definir</span>'}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Diferencias frente a hoy (en pesos)</td>
              <td class="p-2.5 text-slate-400 bg-slate-50">-</td>
              ${ranked.map(a => {
                const monthlyDiff = (a.simulation.hasPublishedRate && isFiniteNumber(a.pagoMensualTotalPosterior) && isFiniteNumber(snapshot.initialJointPayment))
                  ? (a.pagoMensualTotalPosterior - snapshot.initialJointPayment)
                  : null;
                const totalDiff = (snapshot.isCostCalculable && isFiniteNumber(a.scenarioTotalFuturePayment) && isFiniteNumber(snapshot.estimatedRemainingCost))
                  ? (a.scenarioTotalFuturePayment - snapshot.estimatedRemainingCost)
                  : null;
                return `
                  <td class="p-2.5 text-[11px] space-y-0.5">
                    <div class="whitespace-nowrap ${monthlyDiff !== null && monthlyDiff < 0 ? 'text-emerald-700 font-bold' : 'text-slate-700'}">
                      Cuota: ${monthlyDiff !== null ? `${monthlyDiff > 0 ? '+' : '-'}${formatCOP(Math.abs(monthlyDiff))}/mes` : 'N/D'}
                    </div>
                    <div class="whitespace-nowrap ${totalDiff !== null && totalDiff > 0 ? 'text-amber-800 font-bold' : (totalDiff !== null && totalDiff < 0 ? 'text-emerald-700 font-bold' : 'text-slate-600')}">
                      Total: ${totalDiff !== null ? `${totalDiff > 0 ? '+' : '-'}${formatCOP(Math.abs(totalDiff))}` : 'N/D'}
                    </div>
                  </td>
                `;
              }).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Obligaciones activas resultantes</td>
              <td class="p-2.5 text-slate-800 bg-slate-50">${pluralizeDebts(snapshot.totalCount)}</td>
              ${ranked.map(a => `<td class="p-2.5 font-bold text-slate-900">${pluralizeObligations(a.simulation.activeObligationsAfterOperation)} (${a.eligibility.eligibleCount} cubiertas, ${pluralizeDebts(a.eligibility.excludedCount)} remanentes)</td>`).join('')}
            </tr>
            <tr>
              <td class="p-2.5 font-semibold text-slate-600">Detalle / Qué cambiaría</td>
              <td class="p-2.5 text-slate-400 bg-slate-50">-</td>
              ${ranked.map(a => `<td class="p-2.5"><button onclick="openBeforeAfter('${a.id}')" class="text-teal-700 hover:underline font-bold text-[11px]">Ver lado a lado</button></td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-slate-500 leading-relaxed mb-6">
        Nota: Cada cargo aplicable se suma una sola vez y en consolidaciones parciales el total futuro incluye las obligaciones que permanecen activas. La tasa definitiva y costos adicionales dependen de la evaluación individual de cada banco.
      </p>

      <button onclick="navigate('alternatives')" class="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl shadow">
        Volver a alternativas
      </button>
    </div>
  `;
}

function renderBeforeAfterScreen() {
  AnalyticsProvider.track('viewed_before_after', { isDemo: state.dataOrigin === 'demo' });
  const snapshot = state.getSnapshot();
  const { ranked } = state.getAlternatives();
  const alt = ranked.find(a => a.id === state.selectedAlternativeId) || ranked[0];
  AnalyticsProvider.trackFirstComparisonCompleted({
    isDemo: state.dataOrigin === 'demo',
    screen: 'before_after',
    alternativeId: alt?.id || null
  });
  const tradeOff = calculateTradeOff(snapshot, alt);
  const currentMonthly = snapshot.initialJointPayment ?? snapshot.totalMonthlyPayment;
  const altMonthly = alt.pagoMensualTotalPosterior ?? alt.cuotaMensual ?? null;
  const currentLastMonth = snapshot.lastPaymentMonth ?? snapshot.estimatedTermMonths;
  const altLastMonth = alt.scenarioLastPaymentMonth ?? alt.plazoMeses ?? null;
  const currentTotal = snapshot.isCostCalculable ? snapshot.estimatedRemainingCost : null;
  const altTotal = isFiniteNumber(alt.scenarioTotalFuturePayment) ? Number(alt.scenarioTotalFuturePayment) : null;

  return `
    <div class="p-5">
      <button onclick="navigate('alternatives')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a alternativas</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">Entiende qué cambiaría</h2>
        <p class="text-xs text-slate-600 mt-0.5">Comparación lado a lado entre continuar con tus deudas actuales o aceptar esta compra de cartera.</p>
      </div>

      <!-- Comparación HOY vs ALTERNATIVA -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">HOY (Deudas actuales)</span>
          <div>
            <span class="text-[10px] text-slate-500 block">Pago mensual inicial</span>
            <div class="text-base font-extrabold text-slate-900 whitespace-nowrap">${formatCOP(currentMonthly)}</div>
          </div>
          <div class="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-200">
            <p><strong>Último mes:</strong> ${currentLastMonth ? `Mes ${currentLastMonth}` : 'Por definir'}</p>
            <p><strong>Total futuro:</strong> <span class="whitespace-nowrap">${currentTotal !== null ? formatCOP(currentTotal) : 'No calculable'}</span></p>
            <p><strong>Activas:</strong> ${pluralizeObligations(snapshot.totalCount)}</p>
          </div>
        </div>

        <div class="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 space-y-2">
          <span class="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">${alt.entity}</span>
          <div>
            <span class="text-[10px] text-teal-700 block">Pago mensual posterior</span>
            <div class="text-base font-extrabold text-teal-950 whitespace-nowrap">${altMonthly !== null ? formatCOP(altMonthly) : '<span class="text-xs text-amber-800">Por definir</span>'}</div>
            ${alt.eligibility?.excludedCount > 0 && altMonthly !== null ? `
              <span class="text-[9px] text-teal-800 block">(${formatCOP(alt.cuotaMensual)} nuevo + ${formatCOP(alt.remainingActiveMonthlyPayment)} que siguen)</span>
            ` : ''}
          </div>
          <div class="text-xs text-teal-950 space-y-1 pt-1 border-t border-teal-200">
            <p><strong>Último mes:</strong> ${altLastMonth ? `Mes ${altLastMonth}` : 'Por definir'}</p>
            <p><strong>Total futuro:</strong> <span class="whitespace-nowrap">${altTotal !== null ? formatCOP(altTotal) : 'Por definir'}</span></p>
            <p><strong>Activas:</strong> ${pluralizeObligations(alt.activeObligationsAfterOperation || 1)}</p>
          </div>
        </div>
      </div>

      ${(tradeOff.hasCuotaComparison || tradeOff.hasCostComparison) ? `
        <div class="bg-white border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs shadow-sm space-y-2">
          <span class="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">Diferencia en pesos frente a tu situación actual</span>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span class="text-[10px] text-slate-500 block">Cambio en pago mensual</span>
              <span class="font-extrabold text-sm whitespace-nowrap ${tradeOff.cuotaDiff !== null && tradeOff.cuotaDiff < 0 ? 'text-emerald-700' : (tradeOff.cuotaDiff > 0 ? 'text-amber-800' : 'text-slate-800')}">
                ${tradeOff.hasCuotaComparison ? `${tradeOff.cuotaDiff > 0 ? '+' : (tradeOff.cuotaDiff < 0 ? '-' : '')}${formatCOP(Math.abs(tradeOff.cuotaDiff))}/mes` : 'Dato pendiente'}
              </span>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span class="text-[10px] text-slate-500 block">Cambio en total futuro</span>
              <span class="font-extrabold text-sm whitespace-nowrap ${tradeOff.costoDiff !== null && tradeOff.costoDiff > 0 ? 'text-amber-800' : (tradeOff.costoDiff < 0 ? 'text-emerald-700' : 'text-slate-800')}">
                ${tradeOff.hasCostComparison ? `${tradeOff.costoDiff > 0 ? '+' : (tradeOff.costoDiff < 0 ? '-' : '')}${formatCOP(Math.abs(tradeOff.costoDiff))}` : 'No calculable'}
              </span>
            </div>
          </div>
          ${tradeOff.monthlyPaymentDropsAndTotalIncreases ? `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950 leading-relaxed">
              ⚖️ <strong>Baja la cuota mensual pero sube el total a pagar:</strong> Ahorras <strong>${formatCOP(Math.abs(tradeOff.cuotaDiff))}/mes</strong> en flujo de caja, pero terminarías pagando <strong>${formatCOP(tradeOff.costoDiff)}</strong> adicionales en total futuro.
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Fuente y fecha de referencia de tasa -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-[11px] text-slate-600 space-y-1">
        <div class="flex justify-between">
          <span class="font-semibold text-slate-700">Tasa de referencia:</span>
          <span class="font-bold text-teal-800">${alt.rateDisplayEA || alt.product?.rateDisplayEA || 'Sujeta a evaluación'}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-semibold text-slate-700">Fuente:</span>
          <span>${alt.officialSource || alt.product?.officialSource || 'Entidad financiera'}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-semibold text-slate-700">Fecha de referencia:</span>
          <span class="${alt.isHistoricalTariff ? 'text-amber-800 font-semibold' : ''}">${alt.effectiveDate || alt.product?.effectiveDate || 'Pendiente'}</span>
        </div>
      </div>

      <!-- Resumen narrativo -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm space-y-3">
        <div>
          <h4 class="font-bold text-xs text-emerald-800 flex items-center space-x-1">
            <span>✓</span>
            <span>Lo que ganas</span>
          </h4>
          <ul class="text-xs text-slate-600 mt-1 space-y-1 list-disc list-inside">
            ${tradeOff.whatYouGain.map(g => `<li>${g}</li>`).join('')}
          </ul>
        </div>

        ${tradeOff.whatYouSacrifice.length > 0 ? `
          <div>
            <h4 class="font-bold text-xs text-amber-800 flex items-center space-x-1">
              <span>⚠️</span>
              <span>Lo que debes considerar</span>
            </h4>
            <ul class="text-xs text-slate-600 mt-1 space-y-1 list-disc list-inside">
              ${tradeOff.whatYouSacrifice.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div>
          <h4 class="font-bold text-xs text-slate-700 flex items-center space-x-1">
            <span>🔍</span>
            <span>Lo que debes revisar</span>
          </h4>
          <ul class="text-xs text-slate-500 mt-1 space-y-1 list-disc list-inside">
            ${tradeOff.whatYouShouldReview.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <a href="${alt.officialUrl}" target="_blank" rel="noopener noreferrer" class="bg-white border-2 border-slate-300 hover:border-brand-dark text-slate-800 font-bold py-3.5 rounded-xl shadow-sm transition text-xs flex items-center justify-center text-center">
          Consultar banco ↗
        </a>
        <button onclick="startApplicationSimulation('${alt.id}')" class="bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow transition text-xs">
          Iniciar solicitud
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLAS: CONEXIÓN, SOLICITUD Y CONFIRMACIÓN
// -------------------------------------------------------------

function renderConnectionScreen() {
  const { ranked } = state.getAlternatives();
  const alt = ranked.find(a => a.id === state.selectedAlternativeId) || ranked[0] || {};
  const entityName = alt.entity || alt.entityName || alt.product?.entityName || 'Entidad financiera';
  const rawProduct = alt.commercialName || alt.productType || alt.product?.commercialName;
  const productName = (!rawProduct || rawProduct === 'undefined' || String(rawProduct).trim() === '') ? 'Producto por confirmar' : rawProduct;

  return `
    <div class="p-5">
      <button onclick="navigate('alternatives')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a alternativas</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">¿Quieres continuar con tu análisis?</h2>
        <p class="text-xs text-slate-600 mt-0.5">RelieFin te ayuda a organizar y hacer seguimiento manual a tu proceso con la entidad seleccionada.</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm">
        <span class="text-[10px] font-bold text-teal-700 uppercase">Resumen de la alternativa</span>
        <h3 class="font-extrabold text-lg text-brand-dark mt-1">${entityName}</h3>
        <p class="text-xs text-slate-600 font-medium">${productName}</p>

        <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span class="text-slate-400 block text-[10px]">Monto estimado a consolidar</span>
            <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(alt.montoConsolidar || alt.simulation?.capital || 0)}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Cuota mensual estimada</span>
            <span class="font-bold text-slate-900 whitespace-nowrap">${alt.cuotaMensual !== null && alt.cuotaMensual !== undefined ? formatCOP(alt.cuotaMensual) : '<span class="text-amber-800">Sujeta a estudio</span>'}</span>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-slate-100 text-center">
          <a href="${alt.officialUrl || '#'}" target="_blank" rel="noopener noreferrer" class="text-xs text-teal-700 hover:underline font-bold inline-flex items-center space-x-1">
            <span>Visitar portal oficial de ${entityName}</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- Clarificación obligatoria: Distinción entre simulación demostrativa y evento bancario real (PUNTO 7) -->
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 leading-relaxed mb-5">
        <p class="font-bold text-amber-900 flex items-center space-x-1.5">
          <span>ℹ️</span>
          <span>Aviso de simulación demostrativa y registro manual</span>
        </p>
        <p class="mt-1 text-slate-700">
          Esta es una simulación demostrativa para tu bitácora personal. <strong>No se enviará ninguna solicitud real al banco</strong> ni tus datos serán transmitidos a instituciones financieras. Para formalizar el crédito, debes acudir directamente a los canales oficiales de la entidad.
        </p>
      </div>

      <!-- Checkbox obligatorio -->
      <label class="flex items-start space-x-2.5 mb-6 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" id="consent-checkbox" class="mt-0.5 rounded text-teal-600 focus:ring-teal-500" onchange="toggleConsent()">
        <span>Entiendo que esta simulación no representa una aprobación de crédito ni trámite automático ante la entidad.</span>
      </label>

      <button id="submit-application-btn" onclick="confirmApplicationSubmission('${alt.id || state.selectedAlternativeId}')" disabled class="w-full bg-slate-300 text-slate-500 font-bold py-3.5 rounded-xl cursor-not-allowed transition">
        Registrar simulación de solicitud
      </button>
    </div>
  `;
}

function renderConfirmationScreen() {
  const lastApp = state.applications[0];
  const safeProd = (!lastApp?.producto || lastApp?.producto === 'undefined') ? 'Producto por confirmar' : lastApp.producto;

  return `
    <div class="p-6 text-center">
      <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto mb-4">
        ✓
      </div>

      <h2 class="text-2xl font-extrabold text-brand-dark">Simulación registrada en bitácora</h2>
      <p class="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
        Registramos el evento demostrativo para <strong>${lastApp?.entidad || 'la entidad seleccionada'}</strong> (${safeProd}).
      </p>

      <!-- Timeline de 5 fases -->
      <div class="mt-6 text-left max-w-xs mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
        <div class="flex items-center space-x-3 text-emerald-700 font-bold">
          <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
          <span>Simulación registrada (Hecho)</span>
        </div>
        <div class="flex items-center space-x-3 text-teal-700 font-semibold">
          <span class="w-5 h-5 rounded-full bg-teal-200 text-teal-900 flex items-center justify-center text-[10px]">2</span>
          <span>Trámite con el banco (En estudio manual)</span>
        </div>
        <div class="flex items-center space-x-3 text-slate-400">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
          <span>Oferta comunicada por el banco</span>
        </div>
        <div class="flex items-center space-x-3 text-slate-400">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">4</span>
          <span>Tu decisión</span>
        </div>
        <div class="flex items-center space-x-3 text-slate-400">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">5</span>
          <span>Desembolso y pagos</span>
        </div>
      </div>

      <p class="text-[11px] text-slate-500 mt-4 leading-relaxed max-w-xs mx-auto">
        Recuerda: registrar esta simulación no compromete tus finanzas ni tramita ningún crédito ante la entidad.
      </p>

      <div class="mt-6 space-y-2">
        <button onclick="openOutcomeReport('${lastApp?.id}')" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-xl text-xs transition shadow">
          Registrar respuesta recibida de la entidad (¿Qué pasó?)
        </button>
        <button onclick="navigate('applications')" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition">
          Ver mi historial de solicitudes
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// POST-SOLICITUD: HISTORIAL Y REPORTES DE RESULTADOS (PASO 1 & 8)
// -------------------------------------------------------------

function renderApplicationsScreen() {
  const apps = state.applications;

  return `
    <div class="p-5">
      <div class="mb-5 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-extrabold text-brand-dark">Mis solicitudes</h2>
          <p class="text-xs text-slate-600 mt-0.5">Historial y seguimiento de tus compras de cartera.</p>
        </div>
        <button onclick="navigate('alternatives')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg">
          + Nueva
        </button>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600 leading-relaxed">
        <span class="font-bold text-slate-800">📋 Bitácora de seguimiento manual:</span> RelieFin no transmite información a entidades bancarias ni realiza trámites automáticos. Registra aquí la respuesta y condiciones que la entidad te haya comunicado directamente en tu trámite independiente.
      </div>

      ${apps.length === 0 ? `
        <div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 my-6">
          <p class="text-sm font-semibold">No tienes solicitudes iniciadas.</p>
          <p class="text-xs text-slate-400 mt-1">Completa tu diagnóstico y selecciona una alternativa para simular una solicitud.</p>
          <button onclick="navigate('snapshot')" class="mt-4 bg-brand-dark text-white font-bold text-xs py-2 px-4 rounded-xl">
            Ir a mi radiografía
          </button>
        </div>
      ` : `
        <div class="space-y-4">
          ${apps.map(app => {
            const statusLabels = {
              iniciada: { label: 'Solicitud registrada', color: 'bg-blue-100 text-blue-800' },
              en_estudio: { label: 'En estudio (manual)', color: 'bg-amber-100 text-amber-900' },
              aprobada: { label: 'Aprobada (reportada)', color: 'bg-emerald-100 text-emerald-800' },
              aprobada_condiciones_diferentes: { label: 'Aprobada con cambios', color: 'bg-teal-100 text-teal-800' },
              no_aprobada: { label: 'No aprobada (reportada)', color: 'bg-rose-100 text-rose-800' },
              desistio: { label: 'Usuario desistió', color: 'bg-slate-100 text-slate-700' }
            }[app.status] || { label: app.status, color: 'bg-slate-100 text-slate-600' };

            const displayProduct = (app.producto && app.producto !== 'undefined') ? app.producto : 'Producto por confirmar';

            return `
              <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="font-extrabold text-sm text-brand-dark">${app.entidad}</h3>
                    <p class="text-xs text-slate-500">${displayProduct}</p>
                    <span class="text-[10px] text-slate-400">Fecha: ${new Date(app.fecha).toLocaleDateString('es-CO')}</span>
                  </div>
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusLabels.color}">
                    ${statusLabels.label}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span class="text-[10px] text-slate-400 block">Monto solicitado</span>
                    <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(app.montoSolicitado)}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 block">Cuota estimada</span>
                    <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(app.cuotaEstimada)}</span>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button onclick="openOutcomeReport('${app.id}')" class="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1">
                    <span>¿Qué pasó con tu solicitud?</span>
                    <span>${Icons.arrowRight}</span>
                  </button>
                  ${app.status === 'aprobada' && !state.acceptedRestructuring ? `
                    <button onclick="openFinalOfferInput('${app.id}')" class="text-xs bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg">
                      Revisar oferta
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderOutcomeReportScreen() {
  const appId = state.activeApplicationIdForOutcome;
  const app = state.applications.find(a => a.id === appId) || state.applications[0];

  return `
    <div class="p-5">
      <button onclick="navigate('applications')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a solicitudes</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">¿Qué pasó con tu solicitud?</h2>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Cuéntanos qué te informó <strong>${app?.entidad || 'la entidad financiera'}</strong>. Tu reporte nos permite orientarte sobre el siguiente paso.
        </p>
      </div>

      <div class="space-y-3 mb-6">
        <button onclick="handleOutcomeSelection('${app?.id}', 'approved')" class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition">
          <div class="font-bold text-sm text-slate-900">Fue aprobada</div>
          <p class="text-xs text-slate-500 mt-0.5">La entidad aprobó la compra de cartera y quiero revisar las condiciones finales.</p>
        </button>

        <button onclick="handleOutcomeSelection('${app?.id}', 'approved_modified')" class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/40 transition">
          <div class="font-bold text-sm text-slate-900">Fue aprobada, pero las condiciones cambiaron</div>
          <p class="text-xs text-slate-500 mt-0.5">Cambiaron la tasa, la cuota o el monto respecto a la simulación inicial.</p>
        </button>

        <button onclick="handleOutcomeSelection('${app?.id}', 'rejected')" class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-rose-400 hover:bg-rose-50/40 transition">
          <div class="font-bold text-sm text-slate-900">No fue aprobada</div>
          <p class="text-xs text-slate-500 mt-0.5">La entidad no aceptó la solicitud en esta oportunidad.</p>
        </button>

        <button onclick="handleOutcomeSelection('${app?.id}', 'in_review')" class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 transition">
          <div class="font-bold text-sm text-slate-900">Sigue en estudio</div>
          <p class="text-xs text-slate-500 mt-0.5">Aún no han emitido respuesta o están validando documentos.</p>
        </button>

        <button onclick="handleOutcomeSelection('${app?.id}', 'withdrawn')" class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition">
          <div class="font-bold text-sm text-slate-900">Decidí no continuar</div>
          <p class="text-xs text-slate-500 mt-0.5">Preferí desistir antes de que culminara el estudio.</p>
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// POST-SOLICITUD: FLUJO DE APROBACIÓN Y CONDICIONES FINALES
// -------------------------------------------------------------

function renderFinalOfferInputScreen() {
  const appId = state.activeApplicationIdForOutcome;
  const app = state.applications.find(a => a.id === appId) || state.applications[0];
  const { ranked } = state.getAlternatives();
  const matchedAlt = ranked.find(a => a.id === app?.alternativeId || a.entity === app?.entidad) || null;
  const activeDebts = state.debts.filter(d => !d.isCancelled && d.status !== 'cancelada');

  const savedOffer = (state.temporaryOffer && (!app || state.temporaryOffer.appId === app.id))
    ? state.temporaryOffer
    : (app?.finalOffer || null);

  const initialApprovedAmount = isFiniteNumber(savedOffer?.montoAprobado)
    ? Number(savedOffer.montoAprobado)
    : (isFiniteNumber(app?.montoSolicitado) ? Number(app.montoSolicitado) : (isFiniteNumber(matchedAlt?.montoConsolidar) ? Number(matchedAlt.montoConsolidar) : ''));

  const initialMonthlyPayment = isFiniteNumber(savedOffer?.cuotaMensual)
    ? Number(savedOffer.cuotaMensual)
    : (isFiniteNumber(app?.cuotaEstimada) ? Number(app.cuotaEstimada) : (isFiniteNumber(matchedAlt?.cuotaMensual) ? Number(matchedAlt.cuotaMensual) : ''));

  const initialRate = isFiniteNumber(savedOffer?.tasaEA)
    ? Number(savedOffer.tasaEA)
    : (isFiniteNumber(app?.tasaIndicativaEA) ? Number(app.tasaIndicativaEA) : (isFiniteNumber(matchedAlt?.rateMinEA) ? Number(matchedAlt.rateMinEA) : ''));

  const initialTerm = isFiniteNumber(savedOffer?.plazoMeses)
    ? Number(savedOffer.plazoMeses)
    : (isFiniteNumber(app?.plazoEstimado) ? Number(app.plazoEstimado) : (isFiniteNumber(matchedAlt?.plazoMeses) ? Number(matchedAlt.plazoMeses) : ''));

  const initialCosts = isFiniteNumber(savedOffer?.costosAdicionales) ? Number(savedOffer.costosAdicionales) : '';
  const initialCostsType = savedOffer?.costosTipo || 'unico';

  const cancelledSet = new Set((savedOffer?.cancelledDebts || []).map(c => c.debt?.id || c.id));
  const partialMap = new Map((savedOffer?.partialDebts || []).map(p => [p.debt?.id || p.id, p]));
  const remainingSet = new Set((savedOffer?.remainingDebts || []).map(r => r.debt?.id || r.id));

  return `
    <div class="p-5">
      <button onclick="navigate('applications')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a solicitudes</span>
      </button>

      <div class="mb-5">
        <h2 class="text-2xl font-extrabold text-brand-dark">Revisemos las condiciones aprobadas</h2>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Ingresa las condiciones definitivas aprobadas por <strong>${app?.entidad || 'la entidad'}</strong>. Si algún dato falta o te lo informan después, puedes dejarlo vacío y aparecerá como «Dato pendiente».
        </p>
      </div>

      <div class="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Monto aprobado (COP)</label>
          <input type="number" id="final-amount" value="${initialApprovedAmount}" placeholder="Dato pendiente (ej: 15000000)" oninput="updateOfferAllocationSummary()" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold text-sm">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Tasa E.A. (%) <span class="text-[10px] font-normal text-slate-500">(acepta 0 %)</span></label>
            <input type="number" step="0.1" min="0" id="final-rate" value="${initialRate}" placeholder="Dato pendiente" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Cuota nuevo crédito (COP)</label>
            <input type="number" min="0" id="final-payment" value="${initialMonthlyPayment}" placeholder="Dato pendiente" oninput="updateOfferAllocationSummary()" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Plazo (meses)</label>
            <input type="number" min="1" id="final-term" value="${initialTerm}" placeholder="Dato pendiente" oninput="updateOfferAllocationSummary()" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Costos / seguros (opcional)</label>
            <input type="number" min="0" id="final-costs" value="${initialCosts}" placeholder="Ej: 15000" oninput="updateOfferAllocationSummary()" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800">
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Cómo se cobra ese costo adicional (se cuenta una sola vez)</label>
          <select id="final-costs-type" onchange="updateOfferAllocationSummary()" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium">
            <option value="unico" ${initialCostsType === 'unico' ? 'selected' : ''}>Cargo único total (estudio/desembolso, sumado una vez)</option>
            <option value="mensual" ${initialCostsType === 'mensual' ? 'selected' : ''}>Seguro o cargo mensual adicional durante el plazo</option>
          </select>
        </div>

        <div>
          <label class="flex items-center space-x-2 text-slate-700 mt-2 cursor-pointer font-medium">
            <input type="checkbox" id="final-unknown-checkbox" ${savedOffer?.isApproximate ? 'checked' : ''} onchange="toggleApproximateFields()" class="rounded text-teal-600">
            <span>No conozco alguno de estos datos con exactitud (Ingresar como aproximado)</span>
          </label>

          <div id="approximate-fields-box" class="${savedOffer?.isApproximate ? '' : 'hidden'} mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1.5">
            <span class="font-bold block text-amber-900">Selecciona cuáles datos son aproximados o estimados:</span>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" id="approx-amount" ${savedOffer?.approximateFields?.includes('amount') ? 'checked' : ''} class="rounded text-amber-600">
                <span>Monto aprobado</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" id="approx-rate" ${savedOffer?.approximateFields?.includes('rate') ? 'checked' : ''} class="rounded text-amber-600">
                <span>Tasa E.A.</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" id="approx-payment" ${savedOffer?.approximateFields?.includes('payment') ? 'checked' : ''} class="rounded text-amber-600">
                <span>Cuota mensual</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" id="approx-term" ${savedOffer?.approximateFields?.includes('term') ? 'checked' : ''} class="rounded text-amber-600">
                <span>Plazo en meses</span>
              </label>
            </div>
            <p class="text-[10px] text-amber-800 italic mt-1">
              La oferta se registrará como preliminar hasta que verifiques tu carta o extracto bancario.
            </p>
          </div>
        </div>
      </div>

      <!-- REQUERIMIENTO 5: DISTRIBUCIÓN DETALLADA DE OBLIGACIONES -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs mb-5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-extrabold text-sm text-brand-dark">Distribución del crédito entre tus deudas</h3>
          <span class="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">Requerido</span>
        </div>
        <p class="text-[11px] text-slate-600 mb-3 leading-relaxed">
          Selecciona para cada deuda si se cancelará al 100 %, si recibirá un abono parcial o si continuará activa con su saldo y cuota habitual:
        </p>

        <div class="space-y-3" id="debt-allocations-container">
          ${activeDebts.map((d, idx) => {
            const hasSavedAlloc = savedOffer && (cancelledSet.has(d.id) || partialMap.has(d.id) || remainingSet.has(d.id));
            const mode = hasSavedAlloc
              ? (cancelledSet.has(d.id) ? 'cancelar_total' : (partialMap.has(d.id) ? 'abono_parcial' : 'permanecer'))
              : (idx === 0 ? 'cancelar_total' : 'permanecer');
            const savedPartialVal = partialMap.get(d.id)?.allocatedAmount ?? Math.min(d.balance, 5000000);
            return `
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/70" id="debt-card-alloc-${d.id}">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-bold text-slate-900">${d.entity || d.entityName}</span>
                    <span class="text-slate-500 text-[10px] block">${formatProductTypeName(d.productType || d.type)} · Tasa: ${isFiniteNumber(d.rateEA) ? formatPercent(d.rateEA) : 'N/D'}</span>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-slate-900 block whitespace-nowrap">${formatCOP(d.balance)}</span>
                    <span class="text-[10px] text-slate-500 whitespace-nowrap">Cuota actual: ${formatCOP(d.monthlyPayment)}</span>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-1.5 text-[11px] font-medium pt-2 border-t border-slate-200">
                  <label class="flex items-center space-x-1 p-1.5 rounded-lg border bg-white cursor-pointer hover:border-teal-500">
                    <input type="radio" name="alloc_radio_${d.id}" value="cancelar_total" ${mode === 'cancelar_total' ? 'checked' : ''} onchange="toggleAllocMode('${d.id}'); updateOfferAllocationSummary();" class="text-teal-600">
                    <span class="text-emerald-800 font-semibold">Cancelar 100%</span>
                  </label>
                  <label class="flex items-center space-x-1 p-1.5 rounded-lg border bg-white cursor-pointer hover:border-amber-500">
                    <input type="radio" name="alloc_radio_${d.id}" value="abono_parcial" ${mode === 'abono_parcial' ? 'checked' : ''} onchange="toggleAllocMode('${d.id}'); updateOfferAllocationSummary();" class="text-amber-600">
                    <span class="text-amber-800 font-semibold">Abono parcial</span>
                  </label>
                  <label class="flex items-center space-x-1 p-1.5 rounded-lg border bg-white cursor-pointer hover:border-slate-400">
                    <input type="radio" name="alloc_radio_${d.id}" value="permanecer" ${mode === 'permanecer' ? 'checked' : ''} onchange="toggleAllocMode('${d.id}'); updateOfferAllocationSummary();" class="text-slate-600">
                    <span class="text-slate-700">Conservar</span>
                  </label>
                </div>

                <!-- Input para abono parcial -->
                <div id="alloc_partial_box_${d.id}" class="${mode === 'abono_parcial' ? '' : 'hidden'} mt-2 pt-2 border-t border-slate-200/80 flex items-center space-x-2 text-[11px]">
                  <span class="text-slate-600 font-medium">Monto a abonar:</span>
                  <input type="number" id="alloc_partial_val_${d.id}" value="${savedPartialVal}" max="${d.balance}" min="0" oninput="updateOfferAllocationSummary()" class="flex-1 bg-white border border-slate-300 rounded p-1 text-slate-800 font-bold">
                  <span class="text-[10px] text-amber-700 font-medium">(Cuota original conservada)</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Resumen interactivo de distribución (PUNTOS 3, 4 y 8) -->
        <div id="offer-summary-preview" class="mt-4 p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-xs">
          <!-- Se actualiza con updateOfferAllocationSummary() -->
        </div>
      </div>

      <button onclick="submitFinalOfferComparison('${app?.id || ''}')" class="w-full bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow transition">
        Comparar con lo que esperábamos
      </button>
    </div>
  `;
}

function renderFinalOfferComparisonScreen() {
  const offer = state.temporaryOffer;
  if (!offer) {
    navigate('applications');
    return '';
  }

  AnalyticsProvider.trackFirstComparisonCompleted({
    isDemo: state.dataOrigin === 'demo',
    screen: 'final_offer_comparison',
    appId: offer.appId || null
  });

  const app = state.applications.find(a => a.id === offer.appId) || state.applications[0];
  const { ranked } = state.getAlternatives();
  const matchedAlt = ranked.find(a => a.id === app?.alternativeId || a.entity === app?.entidad) || null;
  const snapshot = state.getSnapshot();

  // Recuperar únicamente valores guardados de la alternativa seleccionada (sin sustituciones automáticas inventadas)
  const sim = {
    amount: isFiniteNumber(app?.montoSolicitado) ? Number(app.montoSolicitado)
      : (isFiniteNumber(matchedAlt?.montoConsolidar) ? Number(matchedAlt.montoConsolidar) : null),
    rate: isFiniteNumber(app?.tasaIndicativaEA) ? Number(app.tasaIndicativaEA)
      : (isFiniteNumber(matchedAlt?.rateMinEA) ? Number(matchedAlt.rateMinEA) : null),
    payment: isFiniteNumber(app?.cuotaEstimada) ? Number(app.cuotaEstimada)
      : (isFiniteNumber(matchedAlt?.cuotaMensual) ? Number(matchedAlt.cuotaMensual) : null),
    term: isFiniteNumber(app?.plazoEstimado) ? Number(app.plazoEstimado)
      : (isFiniteNumber(matchedAlt?.plazoMeses) ? Number(matchedAlt.plazoMeses) : null),
    cost: isFiniteNumber(app?.costoTotalEstimado) ? Number(app.costoTotalEstimado)
      : (isFiniteNumber(matchedAlt?.simulation?.costoTotal) ? Number(matchedAlt.simulation.costoTotal) : null),
    source: app?.tasaFuente || matchedAlt?.officialSource || 'Información registrada de la entidad',
    effectiveDate: app?.tasaFechaReferencia || matchedAlt?.effectiveDate || 'Sin fecha de referencia'
  };

  const offerAmount = isFiniteNumber(offer.montoAprobado) ? Number(offer.montoAprobado) : null;
  const offerRate = isFiniteNumber(offer.tasaEA) ? Number(offer.tasaEA) : null;
  const offerPayment = isFiniteNumber(offer.cuotaMensual) ? Number(offer.cuotaMensual) : null;
  const offerTerm = isFiniteNumber(offer.plazoMeses) && Number(offer.plazoMeses) > 0 ? Number(offer.plazoMeses) : null;
  const offerCosts = isFiniteNumber(offer.costosAdicionales) ? Number(offer.costosAdicionales) : 0;
  const offerCostsType = offer.costosTipo || 'unico';

  const missingFields = [];
  if (offerAmount === null) missingFields.push({ key: 'amount', label: 'Monto aprobado (COP)', type: 'number', step: '1000' });
  if (offerRate === null) missingFields.push({ key: 'rate', label: 'Tasa E.A. (%)', type: 'number', step: '0.1' });
  if (offerPayment === null) missingFields.push({ key: 'payment', label: 'Cuota nuevo crédito (COP)', type: 'number', step: '1000' });
  if (offerTerm === null) missingFields.push({ key: 'term', label: 'Plazo (meses)', type: 'number', step: '1' });

  // Escenario completo con deudas que continúan, saldos remanentes y cargos contados una sola vez
  const scenarioSummary = calculateConsolidationScenarioSummary({
    newCredit: {
      monthlyPayment: offerPayment,
      termMonths: offerTerm,
      oneTimeCharges: offerCostsType === 'unico' ? offerCosts : 0,
      extraMonthlyCharge: offerCostsType === 'mensual' ? offerCosts : 0
    },
    remainingDebts: offer.remainingDebts || [],
    partialDebts: offer.partialDebts || []
  });

  // Diferencias calculadas únicamente cuando ambos valores comparados existen
  const simPosteriorMonthly = isFiniteNumber(sim.payment) ? (sim.payment + scenarioSummary.remainingActiveMonthlyPayment) : null;
  const offerPosteriorMonthly = scenarioSummary.initialJointMonthlyPayment;
  const currentJointMonthly = snapshot.initialJointPayment ?? snapshot.totalMonthlyPayment;

  const monthlyDiffVsCurrent = (isFiniteNumber(offerPosteriorMonthly) && isFiniteNumber(currentJointMonthly))
    ? (offerPosteriorMonthly - currentJointMonthly)
    : null;

  const totalFutureCurrent = snapshot.isCostCalculable ? snapshot.estimatedRemainingCost : null;
  const totalFutureOffer = scenarioSummary.scenarioTotalFuturePayment;
  const totalFutureDiffVsCurrent = (isFiniteNumber(totalFutureOffer) && isFiniteNumber(totalFutureCurrent))
    ? (totalFutureOffer - totalFutureCurrent)
    : null;

  const monthlyDropsAndTotalIncreases = Boolean(
    monthlyDiffVsCurrent !== null && monthlyDiffVsCurrent < 0 &&
    totalFutureDiffVsCurrent !== null && totalFutureDiffVsCurrent > 0
  );

  // Coherencia matemática únicamente si monto, tasa (>= 0), plazo y cuota están disponibles
  const canCheckMath = offerAmount !== null && offerAmount > 0 && offerRate !== null && offerRate >= 0 && offerTerm !== null && offerTerm > 0;
  const theoreticalCuota = canCheckMath ? calculateAmortizationMonthlyPayment(offerAmount, offerRate, offerTerm) : null;
  const hasBothCuotas = theoreticalCuota !== null && offerPayment !== null;
  const cuotaDiff = hasBothCuotas ? (offerPayment - theoreticalCuota) : null;
  const percentDiff = (hasBothCuotas && theoreticalCuota > 0) ? ((offerPayment - theoreticalCuota) / theoreticalCuota) * 100 : null;
  const hasDiscrepancy = percentDiff !== null && Math.abs(percentDiff) >= 3.0;

  const rateDiff = (offerRate !== null && sim.rate !== null) ? Number((offerRate - sim.rate).toFixed(2)) : null;
  const paymentDiff = (offerPayment !== null && sim.payment !== null) ? (offerPayment - sim.payment) : null;
  const termDiff = (offerTerm !== null && sim.term !== null) ? (offerTerm - sim.term) : null;

  return `
    <div class="p-5">
      <button onclick="navigate('final_offer_input')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Ajustar datos o distribución de oferta</span>
      </button>

      <div class="mb-4">
        <h2 class="text-2xl font-extrabold text-brand-dark">¿La oferta final se parece a lo que esperabas?</h2>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Comparamos tu situación actual, la simulación inicial y las condiciones definitivas de <strong>${app?.entidad || 'la entidad'}</strong>.
        </p>
      </div>

      ${missingFields.length > 0 ? `
        <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4 text-xs text-amber-950 space-y-2.5">
          <div class="flex items-start space-x-2">
            <span class="text-base">📝</span>
            <div>
              <span class="font-extrabold block text-amber-900">Hay datos pendientes en esta oferta</span>
              <p class="text-[11px] mt-0.5 leading-relaxed">
                RelieFin no inventa ni rellena valores faltantes. Puedes completarlos aquí mismo cuando el banco te los confirme:
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            ${missingFields.map(f => `
              <div>
                <label class="block text-[10px] font-bold text-amber-900 mb-0.5">${f.label}</label>
                <input type="${f.type}" step="${f.step}" min="0" id="inline-pending-${f.key}" placeholder="Dato pendiente" class="w-full bg-white border border-amber-300 rounded-lg p-2 text-slate-900 font-semibold text-xs">
              </div>
            `).join('')}
          </div>
          <button onclick="completePendingOfferFields()" class="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-2 rounded-xl transition">
            Guardar datos completados y recalcular
          </button>
        </div>
      ` : ''}

      <!-- REQUERIMIENTO 3: AVISO SI CONTIENE DATOS APROXIMADOS -->
      ${offer.desconoceAlgunDato || offer.isApproximate ? `
        <div class="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 mb-4 text-xs text-amber-950">
          <div class="flex items-start space-x-2">
            <span class="text-base">⚠️</span>
            <div>
              <span class="font-extrabold block text-amber-900">Oferta preliminar con datos aproximados</span>
              <p class="text-[11px] mt-0.5 leading-relaxed">
                Has registrado esta oferta con valores aproximados o pendientes de confirmar (${offer.approximateFieldsLabels?.join(', ') || 'condiciones generales'}). Esta proyección es orientativa y <strong>no se considera plenamente confirmada</strong> hasta contar con la documentación formal de la entidad.
              </p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Comparación HOY vs OFERTA FINAL (cuota mensual, último mes, total futuro) -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm text-xs space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-extrabold text-sm text-brand-dark">Tu situación actual vs. Oferta final</h4>
          <span class="text-[10px] text-slate-500 font-semibold">Cargos contados 1 vez</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-bold uppercase text-slate-500 block">Hoy (Deudas actuales)</span>
            <p class="text-sm font-extrabold text-slate-900 whitespace-nowrap">${formatCOP(currentJointMonthly)}/mes</p>
            <p class="text-[11px] text-slate-600">Último mes: <strong>${snapshot.lastPaymentMonth ? `Mes ${snapshot.lastPaymentMonth}` : 'Por definir'}</strong></p>
            <p class="text-[11px] text-slate-600">Total futuro: <strong class="whitespace-nowrap">${totalFutureCurrent !== null ? formatCOP(totalFutureCurrent) : 'No calculable'}</strong></p>
          </div>

          <div class="bg-teal-50 p-3 rounded-xl border border-teal-200 space-y-1">
            <span class="text-[10px] font-bold uppercase text-teal-800 block">Con oferta (${app?.entidad || 'Entidad'})</span>
            <p class="text-sm font-extrabold text-teal-950 whitespace-nowrap">${offerPosteriorMonthly !== null ? `${formatCOP(offerPosteriorMonthly)}/mes` : '<span class="text-amber-800 text-xs">Dato pendiente</span>'}</p>
            <p class="text-[11px] text-teal-900">Último mes: <strong>${scenarioSummary.scenarioLastPaymentMonth ? `Mes ${scenarioSummary.scenarioLastPaymentMonth}` : 'Dato pendiente'}</strong></p>
            <p class="text-[11px] text-teal-900">Total futuro: <strong class="whitespace-nowrap">${totalFutureOffer !== null ? formatCOP(totalFutureOffer) : '<span class="text-amber-800">Dato pendiente</span>'}</strong></p>
          </div>
        </div>

        ${(monthlyDiffVsCurrent !== null || totalFutureDiffVsCurrent !== null) ? `
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span class="text-[10px] text-slate-500 block">Diferencia pago mensual</span>
              <strong class="whitespace-nowrap ${monthlyDiffVsCurrent !== null && monthlyDiffVsCurrent < 0 ? 'text-emerald-700' : 'text-slate-800'}">
                ${monthlyDiffVsCurrent !== null ? `${monthlyDiffVsCurrent > 0 ? '+' : (monthlyDiffVsCurrent < 0 ? '-' : '')}${formatCOP(Math.abs(monthlyDiffVsCurrent))}/mes` : 'Dato pendiente'}
              </strong>
            </div>
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span class="text-[10px] text-slate-500 block">Diferencia total futuro</span>
              <strong class="whitespace-nowrap ${totalFutureDiffVsCurrent !== null && totalFutureDiffVsCurrent > 0 ? 'text-amber-800' : (totalFutureDiffVsCurrent < 0 ? 'text-emerald-700' : 'text-slate-800')}">
                ${totalFutureDiffVsCurrent !== null ? `${totalFutureDiffVsCurrent > 0 ? '+' : (totalFutureDiffVsCurrent < 0 ? '-' : '')}${formatCOP(Math.abs(totalFutureDiffVsCurrent))}` : 'Dato pendiente'}
              </strong>
            </div>
          </div>
        ` : ''}

        ${monthlyDropsAndTotalIncreases ? `
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950">
            ⚖️ <strong>Compensación en pesos:</strong> Tu cuota mensual bajaría <strong>${formatCOP(Math.abs(monthlyDiffVsCurrent))}/mes</strong>, pero el total futuro aumentaría en <strong>${formatCOP(totalFutureDiffVsCurrent)}</strong> (incluyendo obligaciones que continúan y cargos aplicables).
          </div>
        ` : ''}
      </div>

      <!-- REQUERIMIENTO 2: BLOQUE DE VALIDACIÓN MATEMÁTICA PURA VS DECLARADA -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm text-xs space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-extrabold text-sm text-brand-dark">Coherencia matemática de la cuota</h4>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${!hasBothCuotas ? 'bg-slate-200 text-slate-700' : (hasDiscrepancy ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')}">
            ${!hasBothCuotas ? 'Pendiente de datos' : (hasDiscrepancy ? 'Discrepancia detectada' : 'Coherencia verificada')}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center pt-1">
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="text-[10px] text-slate-400 block font-medium">Cuota informada banco</span>
            <span class="font-extrabold text-xs text-slate-900 whitespace-nowrap">${formatOfferCOP(offerPayment)}</span>
          </div>
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="text-[10px] text-slate-400 block font-medium">Cuota teórica pura</span>
            <span class="font-extrabold text-xs text-teal-800 whitespace-nowrap">${theoreticalCuota !== null ? formatCOP(theoreticalCuota) : 'Dato pendiente'}</span>
          </div>
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="text-[10px] text-slate-400 block font-medium">Diferencia</span>
            <span class="font-extrabold text-xs ${hasDiscrepancy ? 'text-amber-700' : 'text-emerald-700'} whitespace-nowrap">
              ${percentDiff !== null ? `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)} %` : 'Dato pendiente'}
            </span>
          </div>
        </div>

        ${!hasBothCuotas ? `
          <p class="text-[10px] text-slate-500 pt-1">
            No se calcula la diferencia matemática hasta contar con monto, tasa E.A., plazo y cuota informada.
          </p>
        ` : hasDiscrepancy ? `
          <div class="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 leading-relaxed mt-2">
            <p>
              ⚠️ <strong>Advertencia de discrepancia:</strong> La cuota informada (${formatCOP(offerPayment)}) difiere en <strong>${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)} %</strong> (${formatCOP(Math.abs(cuotaDiff))}) de la amortización matemática pura (${formatCOP(theoreticalCuota)}).
            </p>
            <p class="mt-1 text-slate-600">
              ${cuotaDiff > 0 ? 
                'Esta diferencia suele obedecer a seguros obligatorios de vida deudor o cargos administrativos sumados por el banco.' : 
                'La cuota es inferior a la amortización teórica (podría implicar gracia inicial o seguros cobrados por separado).'}
              <strong> RelieFin conserva la cuota informada por tu banco (${formatCOP(offerPayment)})</strong> para evaluar el impacto real en tu flujo de caja sin sobrescribir lo que declaraste.
            </p>
          </div>
        ` : `
          <p class="text-[10px] text-slate-500 pt-1">
            ✓ La cuota declarada concuerda con la amortización financiera teórica para ${formatCOP(offerAmount)} a ${formatPercent(offerRate)} durante ${offerTerm} meses.
          </p>
        `}
      </div>

      <!-- Tabla Comparativa Integral -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-5">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="p-3 font-semibold text-slate-500">Concepto</th>
              <th class="p-3 font-semibold text-slate-600">Simulación inicial</th>
              <th class="p-3 font-bold text-teal-900 bg-teal-50/50">Oferta informada definitiva</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr>
              <td class="p-3 font-medium text-slate-600">Monto compra de cartera</td>
              <td class="p-3 text-slate-800 whitespace-nowrap">${formatOfferCOP(sim.amount)}</td>
              <td class="p-3 font-bold text-slate-900 bg-teal-50/20 whitespace-nowrap">${formatOfferCOP(offerAmount)}</td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Tasa E.A.</td>
              <td class="p-3 text-slate-800 whitespace-nowrap">${formatOfferRate(sim.rate)}</td>
              <td class="p-3 font-bold ${rateDiff !== null && rateDiff > 0 ? 'text-amber-700' : 'text-teal-700'} bg-teal-50/20 whitespace-nowrap">
                ${formatOfferRate(offerRate)}
                ${rateDiff !== null && rateDiff !== 0 ? `<span class="text-[9px] block ${rateDiff > 0 ? 'text-amber-700' : 'text-emerald-700'}">${rateDiff > 0 ? `▲ +${rateDiff} pp vs simulación` : `▼ ${rateDiff} pp vs simulación`}</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Cuota nuevo crédito</td>
              <td class="p-3 text-slate-800 whitespace-nowrap">${formatOfferCOP(sim.payment)}</td>
              <td class="p-3 font-bold text-slate-900 bg-teal-50/20 whitespace-nowrap">
                ${formatOfferCOP(offerPayment)}
                ${paymentDiff !== null && paymentDiff !== 0 ? `<span class="text-[9px] block ${paymentDiff > 0 ? 'text-amber-700' : 'text-emerald-700'}">${paymentDiff > 0 ? `+${formatCOP(paymentDiff)}` : `-${formatCOP(Math.abs(paymentDiff))}`} vs simulación</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Cuotas obligaciones que permanecen</td>
              <td class="p-3 text-slate-600 whitespace-nowrap">${formatCOP(scenarioSummary.remainingActiveMonthlyPayment)}</td>
              <td class="p-3 font-semibold ${scenarioSummary.remainingActiveMonthlyPayment > 0 ? 'text-amber-800' : 'text-slate-600'} bg-teal-50/20 whitespace-nowrap">
                ${formatCOP(scenarioSummary.remainingActiveMonthlyPayment)}
                <span class="text-[9px] block text-slate-400">(${pluralizeDebts(offer.remainingDebts.length)} activas${offer.partialDebts.length > 0 ? ` + ${pluralizeDebts(offer.partialDebts.length)} parciales` : ''})</span>
              </td>
            </tr>
            <tr class="bg-teal-50/60 font-bold">
              <td class="p-3 text-brand-dark">PAGO MENSUAL TOTAL POSTERIOR</td>
              <td class="p-3 text-slate-800 whitespace-nowrap">${simPosteriorMonthly !== null ? formatCOP(simPosteriorMonthly) : 'Dato pendiente'}</td>
              <td class="p-3 text-teal-900 text-sm font-extrabold bg-teal-100/50 whitespace-nowrap">${offerPosteriorMonthly !== null ? formatCOP(offerPosteriorMonthly) : '<span class="text-xs text-amber-800">Dato pendiente</span>'}</td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Reducción del pago mensual vs hoy</td>
              <td class="p-3 text-slate-700">${simPosteriorMonthly !== null ? formatCOP(currentJointMonthly - simPosteriorMonthly) : '-'}</td>
              <td class="p-3 font-extrabold ${monthlyDiffVsCurrent !== null && monthlyDiffVsCurrent < 0 ? 'text-emerald-700' : 'text-slate-700'} bg-teal-50/20 whitespace-nowrap">
                ${monthlyDiffVsCurrent !== null ? `${monthlyDiffVsCurrent <= 0 ? formatCOP(Math.abs(monthlyDiffVsCurrent)) : `-${formatCOP(monthlyDiffVsCurrent)}`} / mes` : '<span class="text-amber-800">Dato pendiente</span>'}
              </td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Plazo / Último mes con pagos</td>
              <td class="p-3 text-slate-800">${formatOfferTerm(sim.term)}</td>
              <td class="p-3 font-bold text-slate-900 bg-teal-50/20">
                ${formatOfferTerm(offerTerm)}
                ${scenarioSummary.scenarioLastPaymentMonth ? `<span class="text-[9px] block text-slate-500">Último mes del escenario: Mes ${scenarioSummary.scenarioLastPaymentMonth}</span>` : ''}
                ${termDiff !== null && termDiff > 0 ? `<span class="text-[9px] block text-amber-700">▲ +${termDiff} meses vs simulación</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Cargos adicionales (contados 1 vez)</td>
              <td class="p-3 text-slate-600">$ 0</td>
              <td class="p-3 font-semibold text-slate-900 bg-teal-50/20 whitespace-nowrap">
                ${formatCOP(scenarioSummary.totalChargesCountedOnce)}
                ${offerCosts > 0 ? `<span class="text-[9px] block text-slate-500">${offerCostsType === 'mensual' ? `${formatCOP(offerCosts)}/mes` : 'Cargo único'}</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Total futuro del escenario</td>
              <td class="p-3 text-slate-800 whitespace-nowrap">${isFiniteNumber(sim.cost) ? formatCOP(sim.cost + (scenarioSummary.remainingDebtsTotalFuturePayment || 0)) : 'Dato pendiente'}</td>
              <td class="p-3 font-extrabold text-brand-dark bg-teal-50/20 whitespace-nowrap">${totalFutureOffer !== null ? formatCOP(totalFutureOffer) : '<span class="text-amber-800">Dato pendiente</span>'}</td>
            </tr>
            <tr>
              <td class="p-3 font-medium text-slate-600">Obligaciones activas tras operación</td>
              <td class="p-3 text-slate-600">1 + remanentes</td>
              <td class="p-3 font-extrabold text-slate-900 bg-teal-50/20">
                ${pluralizeObligations(offer.totalActiveObligationsAfter)} activas
                <span class="text-[9px] block text-slate-500 font-normal">
                  (1 nueva compra + ${pluralizeDebts(offer.remainingDebts.length)} no cubiertas${offer.partialDebts.length > 0 ? ` + ${pluralizeDebts(offer.partialDebts.length)} parciales` : ''})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-[11px] text-slate-600 space-y-0.5">
        <div><strong>Fuente de referencia de la tasa simulada:</strong> ${sim.source}</div>
        <div><strong>Fecha de referencia:</strong> ${sim.effectiveDate}</div>
      </div>

      <!-- Alerta de transparencia financiera sobre consolidación parcial (PUNTO 8) -->
      ${offer.totalActiveObligationsAfter > 1 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 text-xs text-amber-950 leading-relaxed">
          <p class="font-bold flex items-center space-x-1.5 text-amber-900">
            <span>⚠️</span>
            <span>Consolidación Parcial: No pasas a una sola obligación</span>
          </p>
          <p class="mt-1 text-[11px] text-amber-900">
            El crédito aprobado consolida únicamente parte de tus deudas (${pluralizeDebts(offer.cancelledDebts.length)} canceladas). Continuarás con <strong>${pluralizeObligations(offer.totalActiveObligationsAfter)} activas</strong>. Tu compromiso mensual total será de <strong>${offerPosteriorMonthly !== null ? formatCOP(offerPosteriorMonthly) : 'Dato pendiente'}</strong> (${offerPayment !== null ? `cuota nuevo crédito ${formatCOP(offerPayment)} + ` : ''}cuotas de obligaciones que continúan ${formatCOP(scenarioSummary.remainingActiveMonthlyPayment)}).
          </p>
        </div>
      ` : `
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5 text-xs text-emerald-900 leading-relaxed">
          <p class="font-bold flex items-center space-x-1">
            <span>✓</span>
            <span>Consolidación del 100% de tus obligaciones</span>
          </p>
          <p class="mt-1 text-[11px]">Todas tus deudas registradas quedan cubiertas por esta compra de cartera.</p>
        </div>
      `}

      <!-- Pregunta de Decisión Post-Aprobación (PUNTO 6: PENDIENTE DE DESEMBOLSO) -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 class="font-bold text-sm text-brand-dark mb-1">¿Qué decidiste hacer?</h4>
        <p class="text-xs text-slate-500 mb-3">Tú tienes la última palabra sobre aceptar o continuar comparando.</p>

        <div class="space-y-2">
          <button onclick="acceptConsolidationOffer()" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl transition shadow">
            ${offer.isApproximate || missingFields.length > 0 ? '✓ Registrar oferta preliminar (En trámite de desembolso)' : '✓ Acepté la compra de cartera (Registrar en trámite de desembolso)'}
          </button>
          
          <button onclick="recompareAlternativesWithFinalOffer()" class="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition">
            Quiero comparar nuevamente antes de aceptar
          </button>

          <button onclick="declineFinalOffer()" class="w-full text-slate-500 hover:text-slate-800 text-xs py-2">
            Decidí no aceptar esta oferta
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// POST-SOLICITUD: FLUJO DE NO APROBACIÓN (REORIENTACIÓN EMPÁTICA)
// -------------------------------------------------------------

function renderRejectionGuidanceScreen() {
  const appId = state.activeApplicationIdForOutcome;
  const app = state.applications.find(a => a.id === appId) || state.applications[0];
  const { ranked } = state.getAlternatives();
  const nextAlternative = ranked[0]; // Siguiente mejor opción restante

  return `
    <div class="p-5">
      <button onclick="navigate('applications')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-4">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a solicitudes</span>
      </button>

      <!-- Mensaje no culpabilizante -->
      <div class="mb-5">
        <div class="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">
          <span>Reorientación</span>
        </div>
        <h2 class="text-2xl font-extrabold text-brand-dark">Exploremos otras alternativas</h2>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          Una entidad puede no aprobar una solicitud por diferentes criterios internos. Esto no significa automáticamente que otra entidad tome la misma decisión. Podemos revisar las alternativas restantes.
        </p>
      </div>

      <!-- Registro voluntario de motivo reportado por usuario -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm text-xs">
        <span class="font-bold text-slate-800 block mb-1">¿La entidad te informó algún motivo? (Opcional)</span>
        <p class="text-[11px] text-slate-500 mb-2">Ayuda a mantener tu historial organizado. Este dato queda etiquetado como <em>Motivo reportado por el usuario</em>.</p>

        <select id="rejection-reason-select" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium">
          <option value="prefiero_no_indicar">Prefiero no indicarlo / No informaron</option>
          <option value="capacidad_pago">Capacidad de pago</option>
          <option value="nivel_endeudamiento">Nivel de endeudamiento</option>
          <option value="historial_crediticio">Historial crediticio</option>
          <option value="ingresos">Nivel de ingresos</option>
          <option value="antiguedad_laboral">Antigüedad laboral</option>
          <option value="documentacion">Documentación soporte</option>
          <option value="politica_interna">Políticas internas de la entidad</option>
          <option value="otro">Otro motivo</option>
        </select>
      </div>

      <!-- Pausa reflexiva anti-solicitudes indiscriminadas -->
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed mb-5">
        <span class="font-bold block mb-1">Revisemos qué sabemos antes de intentar otra alternativa:</span>
        <p>Tu objetivo sigue siendo <strong>${GOALS[state.userGoal]?.shortTitle}</strong>. No es prudente solicitar masivamente créditos en múltiples bancos sin pausar y revisar las condiciones.</p>
      </div>

      <!-- Recomendación reorientada (Sin promesas falsas) -->
      ${nextAlternative ? `
        <div class="bg-white border-2 border-teal-600 rounded-2xl p-4 shadow-sm mb-6">
          <span class="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Otra alternativa que puedes explorar</span>
          <h3 class="font-extrabold text-base text-brand-dark mt-1">${nextAlternative.entity}</h3>
          <p class="text-xs text-slate-500">${nextAlternative.productType}</p>

          <div class="grid grid-cols-3 gap-2 mt-3 p-2 bg-slate-50 rounded-xl text-center text-xs">
            <div>
              <span class="text-[10px] text-slate-400 block">Cuota mensual</span>
              <span class="font-bold text-slate-900">${formatCOP(nextAlternative.cuotaMensual)}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Plazo</span>
              <span class="font-bold text-slate-900">${nextAlternative.plazoMeses} m</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Tasa E.A.</span>
              <span class="font-bold text-teal-700">${formatPercent(nextAlternative.rateEA)}</span>
            </div>
          </div>

          <p class="text-[11px] text-slate-500 mt-2">
            La aprobación final depende de las políticas vigentes de cada entidad. RelieFin nunca promete aprobación asegurada.
          </p>

          <button onclick="startApplicationSimulation('${nextAlternative.id}')" class="mt-4 w-full bg-brand-dark hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow">
            Analizar e iniciar solicitud con esta opción
          </button>
        </div>
      ` : `
        <p class="text-xs text-slate-500">No hay más alternativas mock configuradas para este escenario.</p>
      `}

      <button onclick="navigate('alternatives')" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition">
        Ver todas las alternativas restantes
      </button>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLA: MI EVOLUCIÓN FINANCIERA (PASO 6 & 8)
// -------------------------------------------------------------

function renderEvolutionScreen() {
  AnalyticsProvider.track('financial_progress_viewed');
  const rest = state.acceptedRestructuring;
  if (!rest) {
    return `
      <div class="p-6 text-center">
        <p class="text-xs text-slate-500">Aún no has reportado haber aceptado una compra de cartera.</p>
        <button onclick="navigate('snapshot')" class="mt-4 bg-brand-dark text-white font-bold text-xs py-2.5 px-4 rounded-xl">
          Ver mi radiografía
        </button>
      </div>
    `;
  }

  const isDisbursed = rest.status === 'desembolsado_activo';
  const cancelledDebts = rest.cancelledDebts || [];
  const partialDebts = rest.partialDebts || [];
  const remainingDebts = rest.remainingDebts || [];

  // Saldos actuales
  const newCreditCurrentBalance = rest.saldoActual !== undefined ? rest.saldoActual : rest.montoAprobado;
  const remainingDebtsBalance = remainingDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const partialDebtsBalance = partialDebts.reduce((sum, d) => sum + (Number(d.remainingBalance !== undefined ? d.remainingBalance : d.balance) || 0), 0);
  
  // REQUERIMIENTO 7: DEUDA TOTAL PENDIENTE
  const totalPendingDebt = newCreditCurrentBalance + remainingDebtsBalance + partialDebtsBalance;

  // REQUERIMIENTO 7 & 8: NÚMERO REAL DE OBLIGACIONES ACTIVAS (¡NO 1 SOLA OBLIGACIÓN FALSA!)
  const realActiveObligations = 1 + remainingDebts.length + partialDebts.length;

  // REQUERIMIENTO 7: PAGO MENSUAL TOTAL ACTUAL
  const currentTotalMonthlyPayment = rest.cuotaActual + (rest.remainingActiveMonthlyPayment || 0);

  // Ahorro mensual real
  const realMonthlySavings = rest.pagoMensualPrevio - currentTotalMonthlyPayment;

  // Progreso de liquidación del nuevo crédito
  const initialCredit = rest.saldoInicialConsolidado || rest.montoAprobado;
  const creditReduction = initialCredit - (rest.saldoActual || initialCredit);
  const progressPct = initialCredit > 0 ? Math.round((creditReduction / initialCredit) * 100) : 0;

  return `
    <div class="p-5">
      <div class="mb-4">
        <div class="inline-flex items-center space-x-1.5 ${isDisbursed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-900'} border text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-1">
          <span>${isDisbursed ? '✓ Desembolso confirmado · Acompañamiento activo' : '⏳ Pendiente de desembolso'}</span>
        </div>
        <h2 class="text-2xl font-extrabold text-brand-dark">Seguimiento a tu Reorganización</h2>
        <p class="text-xs text-slate-600 mt-0.5">Control transparente de obligaciones activas, desembolsos y pagos reales.</p>
      </div>

      <!-- REQUERIMIENTO 6: BANNER Y CONFIRMACIÓN DE DESEMBOLSO -->
      ${!isDisbursed ? `
        <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-5 shadow-sm text-xs text-amber-950">
          <div class="flex items-start space-x-2.5">
            <span class="text-xl">⚠️</span>
            <div class="flex-1">
              <h4 class="font-extrabold text-sm text-amber-900">Aprobación en trámite de desembolso</h4>
              <p class="mt-1 text-[11px] leading-relaxed">
                El crédito por <strong>${formatCOP(rest.montoAprobado)}</strong> con <strong>${rest.entidad}</strong> está aprobado, pero <strong>las obligaciones anteriores NO se consideran canceladas</strong> hasta que el banco desembolse y aplique efectivamente los pagos a cada entidad acreedora.
              </p>
              <p class="mt-1 text-[11px] font-semibold text-amber-900">
                Continúa atendiendo tus cuotas originales con normalidad para evitar reportes negativos en centrales de riesgo.
              </p>
              <button onclick="confirmDisbursementAndApplyPayments()" class="mt-3 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-3 px-3 rounded-xl transition shadow flex items-center justify-center space-x-2">
                <span>✓ Confirmar que el banco desembolsó y aplicó los pagos</span>
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 mb-5 text-xs text-emerald-950 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-lg">✓</span>
            <div>
              <span class="font-bold block">Desembolso aplicado y confirmado</span>
              <span class="text-[10px] text-emerald-800">Las deudas seleccionadas han sido canceladas en tu registro financiero.</span>
            </div>
          </div>
          <span class="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200">Activo</span>
        </div>
      `}

      <!-- REQUERIMIENTO 7: MÉTRICAS CLAVE OBLIGATORIAS -->
      <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
        <!-- Deuda total pendiente -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Deuda total pendiente</span>
          <div class="text-lg font-extrabold text-brand-dark mt-0.5 whitespace-nowrap">${formatCOP(totalPendingDebt)}</div>
          <span class="text-[10px] text-slate-500">Nuevo crédito + saldos remanentes</span>
        </div>

        <!-- Número real de obligaciones activas (REQUERIMIENTO 8: NO 1 OBLIGACIÓN FALSA) -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Obligaciones activas</span>
          <div class="text-lg font-extrabold text-teal-800 mt-0.5">${pluralizeObligations(realActiveObligations)}</div>
          <span class="text-[10px] ${realActiveObligations > 1 ? 'text-amber-700 font-semibold' : 'text-slate-400'}">
            ${realActiveObligations > 1 ? `1 nueva + ${realActiveObligations - 1} que continúan` : '1 crédito unificado'}
          </span>
        </div>

        <!-- Pago mensual total actual -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Pago mensual total</span>
          <div class="text-lg font-extrabold text-brand-dark mt-0.5 whitespace-nowrap">${formatCOP(currentTotalMonthlyPayment)}</div>
          <span class="text-[10px] text-slate-500">Cuota nueva + cuotas deudas activas</span>
        </div>

        <!-- Reducción del pago mensual (REQUERIMIENTO 6) -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Reducción del pago mensual</span>
          <div class="text-lg font-extrabold ${realMonthlySavings > 0 ? 'text-emerald-700' : 'text-slate-700'} mt-0.5 whitespace-nowrap">
            ${realMonthlySavings > 0 ? formatCOP(realMonthlySavings) : '$ 0'}
          </div>
          <span class="text-[10px] text-slate-500">Frente al pago inicial de <span class="whitespace-nowrap">${formatCOP(rest.pagoMensualPrevio)}</span></span>
        </div>
      </div>

      <!-- REQUERIMIENTO 7: NUEVA OBLIGACIÓN DE COMPRA DE CARTERA -->
      <div class="bg-white border border-teal-200 rounded-2xl p-4 mb-4 shadow-sm text-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span class="font-extrabold text-sm text-brand-dark">${rest.entidad}</span>
          </div>
          <span class="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">Nueva compra de cartera</span>
        </div>
        <p class="text-[11px] text-slate-600 mb-2">${(rest.productoNombre && rest.productoNombre !== 'undefined') ? rest.productoNombre : 'Producto por confirmar'}</p>

        <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
          <div>
            <span class="text-[10px] text-slate-400 block">Saldo actual</span>
            <span class="font-extrabold text-xs text-slate-900 whitespace-nowrap">${formatCOP(newCreditCurrentBalance)}</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block">Cuota mensual</span>
            <span class="font-extrabold text-xs text-teal-800 whitespace-nowrap">${formatCOP(rest.cuotaActual)}</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block">Plazo restante</span>
            <span class="font-extrabold text-xs text-slate-900">${rest.mesesRestantes} meses</span>
          </div>
        </div>

        <div class="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
          <span>Tasa pactada: <strong>${isFiniteNumber(rest.tasaEA) ? formatPercent(rest.tasaEA) : 'Dato pendiente'}</strong></span>
          <span>Pagos registrados: <strong>${rest.pagosRealizados} de ${rest.plazoOriginalMeses}</strong></span>
        </div>
      </div>

      <!-- REQUERIMIENTO 7: OBLIGACIONES CANCELADAS -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm text-xs">
        <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
          <span>Obligaciones canceladas por la operación (${pluralizeObligations(cancelledDebts.length)})</span>
          <span class="text-emerald-700 font-bold">${isDisbursed ? '✓ Canceladas' : '⏳ En trámite'}</span>
        </h4>
        ${cancelledDebts.length > 0 ? `
          <div class="space-y-1.5">
            ${cancelledDebts.map(c => `
              <div class="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-900">${c.debt?.entity || c.entity || 'Entidad'}</span>
                  <span class="text-[10px] text-slate-500 block">${formatProductTypeName(c.debt?.productType || c.productType || c.debt?.type || c.type)} · Cancelada al 100%</span>
                </div>
                <div class="text-right">
                  <span class="font-bold text-emerald-800 whitespace-nowrap">${formatCOP(c.allocatedAmount || c.debt?.balance || c.balance)}</span>
                  <span class="text-[9px] text-slate-400 block whitespace-nowrap">Cuota liberada: ${formatCOP(c.debt?.monthlyPayment || c.monthlyPayment)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="text-slate-500 text-[11px]">No se registraron obligaciones canceladas totalmente.</p>
        `}
      </div>

      <!-- REQUERIMIENTO 7: OBLIGACIONES PARCIALMENTE PAGADAS Y ACTIVAS REMANENTES -->
      ${partialDebts.length > 0 || remainingDebts.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm text-xs space-y-3">
          ${partialDebts.length > 0 ? `
            <div>
              <h4 class="font-extrabold text-xs uppercase tracking-wider text-amber-800 mb-2">
                Obligaciones parcialmente pagadas (${pluralizeObligations(partialDebts.length)})
              </h4>
              <div class="space-y-1.5">
                ${partialDebts.map(p => `
                  <div class="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span class="font-bold text-slate-900">${p.debt?.entity || p.entity || 'Entidad'}</span>
                      <span class="text-[10px] text-amber-800 block">Abono: <span class="whitespace-nowrap">${formatCOP(p.allocatedAmount)}</span> · Cuota contractual conservada</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(p.remainingBalance !== undefined ? p.remainingBalance : p.balance)}</span>
                      <span class="text-[9px] text-slate-500 block">Saldo remanente</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              <p class="text-[10px] text-amber-900 mt-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ℹ️ Según la normativa colombiana, los abonos extraordinarios a capital reducen saldo o plazo, pero la cuota declarada se conserva hasta que la entidad emita el extracto ajustado.
              </p>
            </div>
          ` : ''}

          ${remainingDebts.length > 0 ? `
            <div>
              <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Obligaciones que continúan activas sin compra (${pluralizeObligations(remainingDebts.length)})
              </h4>
              <div class="space-y-1.5">
                ${remainingDebts.map(r => `
                  <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span class="font-bold text-slate-900">${r.debt?.entity || r.entity || 'Entidad'}</span>
                      <span class="text-[10px] text-slate-500 block">${formatProductTypeName(r.debt?.productType || r.productType || r.debt?.type || r.type)}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-slate-900 whitespace-nowrap">${formatCOP(r.debt?.balance || r.balance)}</span>
                      <span class="text-[9px] text-slate-500 block whitespace-nowrap">Cuota mensual: ${formatCOP(r.debt?.monthlyPayment || r.monthlyPayment)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Acciones de seguimiento y simulación -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-xs">
        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">Acciones de acompañamiento</h4>
        <div class="space-y-2">
          <button onclick="simulateMonthPayment()" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-center">
            Simular pago de cuota mensual (+1 mes)
          </button>
          <button onclick="navigate('snapshot')" class="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition text-center">
            Ver radiografía consolidada actualizada
          </button>
        </div>
      </div>

      <!-- PASO 6: FUNCIONALIDADES AVANZADAS EN EVALUACIÓN -->
      <div class="bg-gradient-to-br from-slate-900 to-brand-dark text-white rounded-2xl p-4 shadow-md mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] bg-amber-400/20 text-amber-300 font-extrabold px-2 py-0.5 rounded uppercase">En evaluación</span>
          <span class="text-xs text-slate-400">RelieFin Premium</span>
        </div>
        <h4 class="font-bold text-sm text-white">Herramientas avanzadas de seguimiento</h4>
        <p class="text-xs text-slate-300 mt-1 mb-3 leading-relaxed">
          Estamos evaluando funcionalidades como alertas automáticas de corte, reportes históricos y recalibración de opciones.
        </p>

        <div class="space-y-2 text-xs text-slate-300">
          <div class="flex items-center space-x-2 bg-white/5 p-2 rounded-lg">
            <span>🔔</span>
            <span>Alertas de vencimiento de pago</span>
          </div>
          <div class="flex items-center space-x-2 bg-white/5 p-2 rounded-lg">
            <span>📊</span>
            <span>Reportes históricos de amortización</span>
          </div>
          <div class="flex items-center space-x-2 bg-white/5 p-2 rounded-lg">
            <span>📈</span>
            <span>Evolución proyectada del saldo</span>
          </div>
          <div class="flex items-center space-x-2 bg-white/5 p-2 rounded-lg">
            <span>🔄</span>
            <span>Actualización de escenarios si cambian tus ingresos</span>
          </div>
        </div>

        <button onclick="submitTrackingInterest()" class="mt-4 w-full bg-teal-500 hover:bg-teal-400 text-brand-dark font-extrabold text-xs py-2.5 rounded-xl transition shadow">
          Me interesa el seguimiento Premium
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PANTALLA: RELIEFIN PREMIUM (PASO 5)
// -------------------------------------------------------------

function renderPremiumScreen() {
  AnalyticsProvider.track('premium_viewed');

  return `
    <div class="p-5">
      <button onclick="navigate('home')" class="text-xs text-slate-500 hover:text-brand-dark flex items-center space-x-1 mb-3">
        <span>${Icons.arrowLeft}</span>
        <span>Volver a inicio</span>
      </button>

      <div class="mb-5 text-center">
        <div class="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full mb-2">
          <span>En evaluación comercial · Sin cobros reales</span>
        </div>
        <h2 class="text-2xl font-extrabold text-brand-dark">RelieFin Premium</h2>
        <p class="text-xs text-slate-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
          Herramientas avanzadas para personas que desean un acompañamiento más profundo en su camino hacia la tranquilidad financiera.
        </p>
      </div>

      <!-- Grid de los 2 Productos -->
      <div class="space-y-4 mb-6">
        
        <!-- Producto A: Plan Personalizado -->
        <div class="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm relative">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">Producto A</span>
              <h3 class="font-extrabold text-base text-brand-dark mt-1">Plan Personalizado</h3>
            </div>
            <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">En evaluación</span>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed mb-3">
            Análisis avanzado de cada una de tus obligaciones, modelado matemático de escenarios Bola de Nieve vs Avalancha, calendario de pagos y reporte descargable.
          </p>

          <div class="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5 mb-3">
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-teal-600">✓</span>
              <span>Estrategia de priorización adaptada a tu flujo</span>
            </div>
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-teal-600">✓</span>
              <span>Calendario optimizado de fechas de pago</span>
            </div>
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-teal-600">✓</span>
              <span>Simulador de impacto con primas o ingresos extra</span>
            </div>
          </div>

          <div class="flex items-center justify-between py-2 border-t border-slate-100 text-xs mb-3">
            <span class="text-slate-400">Modelo hipotético:</span>
            <span class="font-extrabold text-slate-800">Pago único (Ref. orientativa $ 39.000 COP)</span>
          </div>

          <button id="btn-interest-plan" onclick="submitProductAInterest()" class="w-full bg-brand-dark hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow">
            Me interesa el plan personalizado
          </button>
        </div>

        <!-- Producto B: Seguimiento Premium -->
        <div class="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm relative">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Producto B</span>
              <h3 class="font-extrabold text-base text-brand-dark mt-1">Seguimiento Premium</h3>
            </div>
            <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">En evaluación</span>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed mb-3">
            Acompañamiento continuo con alertas proactivas, reportes mensuales de avance y monitoreo permanente de tasas en Colombia para identificar nuevas opciones de compra de cartera.
          </p>

          <div class="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5 mb-3">
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-blue-600">✓</span>
              <span>Alertas oportunas de fechas límite</span>
            </div>
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-blue-600">✓</span>
              <span>Reportes de reducción de saldo real vs proyectado</span>
            </div>
            <div class="flex items-center space-x-2 text-slate-700">
              <span class="text-blue-600">✓</span>
              <span>Actualización continua si bajan las tasas de mercado</span>
            </div>
          </div>

          <div class="flex items-center justify-between py-2 border-t border-slate-100 text-xs mb-3">
            <span class="text-slate-400">Modelo hipotético:</span>
            <span class="font-extrabold text-slate-800">Suscripción mensual (Ref. $ 14.900 COP/mes)</span>
          </div>

          <button id="btn-interest-tracking" onclick="submitProductBInterest()" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow">
            Me interesa el seguimiento Premium
          </button>
        </div>
      </div>

      <!-- Encuesta de Disposición a Pagar (PASO 7) -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs">
        <h4 class="font-bold text-sm text-brand-dark mb-1">Encuesta de producto</h4>
        <p class="text-slate-500 mb-3">Tu opinión nos ayuda a definir si estos servicios tienen sentido.</p>

        <div class="space-y-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">¿Qué modelo preferirías?</label>
            <select id="survey-model" class="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800">
              <option value="pago_unico">Pago único por el plan personalizado</option>
              <option value="suscripcion_mensual">Suscripción mensual de acompañamiento</option>
              <option value="solo_gratuito">Prefiero únicamente las herramientas gratuitas</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">¿Qué precio mensual considerarías justo por seguimiento?</label>
            <select id="survey-price" class="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800">
              <option value="9900">$ 9.900 COP / mes</option>
              <option value="14900">$ 14.900 COP / mes</option>
              <option value="24900">$ 24.900 COP / mes</option>
              <option value="0">No pagaría por este servicio</option>
            </select>
          </div>

          <button onclick="submitSurveyResponse()" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl transition">
            Enviar mi opinión
          </button>
        </div>
      </div>

      <button onclick="navigate('home')" class="w-full text-slate-600 hover:text-slate-900 font-semibold text-xs py-2 text-center">
        ← Volver a mi diagnóstico gratuito
      </button>
    </div>
  `;
}

// -------------------------------------------------------------
// ENRUTADOR Y CONTROLADOR PRINCIPAL
// -------------------------------------------------------------

function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  let content = '';
  switch (state.currentScreen) {
    case 'home':
      content = renderHomeScreen();
      break;
    case 'how_it_works':
      content = renderHowItWorksScreen();
      break;
    case 'debt_intake':
      content = renderDebtIntakeScreen();
      break;
    case 'snapshot':
      content = renderSnapshotScreen();
      break;
    case 'personalized_plan':
      content = renderPersonalizedPlanScreen();
      break;
    case 'goals':
      content = renderGoalSelectionScreen();
      break;
    case 'processing':
      content = renderProcessingScreen();
      break;
    case 'alternatives':
      content = renderAlternativesScreen();
      break;
    case 'comparison':
      content = renderComparisonScreen();
      break;
    case 'before_after':
      content = renderBeforeAfterScreen();
      break;
    case 'connection':
      content = renderConnectionScreen();
      break;
    case 'confirmation':
      content = renderConfirmationScreen();
      break;
    case 'applications':
      content = renderApplicationsScreen();
      break;
    case 'outcome_report':
      content = renderOutcomeReportScreen();
      break;
    case 'final_offer_input':
      content = renderFinalOfferInputScreen();
      break;
    case 'final_offer_comparison':
      content = renderFinalOfferComparisonScreen();
      break;
    case 'rejection_guidance':
      content = renderRejectionGuidanceScreen();
      break;
    case 'evolution':
      content = renderEvolutionScreen();
      break;
    case 'premium':
      content = renderPremiumScreen();
      break;
    default:
      content = renderHomeScreen();
  }

  root.innerHTML = `
    ${renderNavbar()}
    <main class="min-h-[75vh]">
      ${content}
    </main>
    ${renderDisclaimerBanner()}
  `;
}

// -------------------------------------------------------------
// FUNCIONES DE CONTROL Y ACCIONES DE USUARIO
// -------------------------------------------------------------

window.navigate = function(screen) {
  state.setScreen(screen);
};

window.startAnalysis = function() {
  AnalyticsProvider.track('started_analysis');
  state.setScreen('debt_intake');
};

window.openPremium = function() {
  state.setScreen('premium');
};

window.loadDemoDebtsAction = function() {
  state.loadDemoDebts();
};

window.formatLiveCopHint = function(inputId, hintId) {
  const val = Number(document.getElementById(inputId)?.value);
  const hintEl = document.getElementById(hintId);
  if (hintEl) {
    hintEl.innerText = val > 0 ? formatCOP(val) : '';
  }
};

window.updateRateConversionHint = function() {
  const period = document.getElementById('form-debt-rate-period')?.value || 'EA';
  const val = parseOptionalNumber(document.getElementById('form-debt-rate')?.value);
  const hintEl = document.getElementById('rate-conversion-hint');
  if (!hintEl) return;

  if (val !== null && val >= 0) {
    if (period === 'MV') {
      const ea = val === 0 ? 0 : (Math.pow(1 + (val / 100), 12) - 1) * 100;
      hintEl.innerText = `💡 ${val.toFixed(2)} % M.V. equivale a ${ea.toFixed(1)} % E.A. contractualmente.`;
      hintEl.classList.remove('hidden');
    } else {
      const mv = val === 0 ? 0 : (Math.pow(1 + (val / 100), 1 / 12) - 1) * 100;
      hintEl.innerText = `💡 ${val.toFixed(1)} % E.A. equivale a ${mv.toFixed(2)} % M.V. al mes.`;
      hintEl.classList.remove('hidden');
    }
  } else {
    hintEl.classList.add('hidden');
  }
};

window.updateEntityReferenceHint = function() {
  // Opcional para refrescar hints
};

window.toggleRateInput = function() {
  const unknown = document.getElementById('form-debt-unknown-rate')?.checked;
  const rateInput = document.getElementById('form-debt-rate');
  const periodSelect = document.getElementById('form-debt-rate-period');
  const conversionHint = document.getElementById('rate-conversion-hint');
  const unknownHint = document.getElementById('unknown-rate-hint');
  
  if (rateInput) {
    rateInput.disabled = unknown;
    if (periodSelect) periodSelect.disabled = unknown;
    if (unknown) {
      rateInput.value = '';
      conversionHint?.classList.add('hidden');
      unknownHint?.classList.remove('hidden');
      AnalyticsProvider.track('unknown_rate_selected');
    } else {
      unknownHint?.classList.add('hidden');
    }
  }
};

function showToast(message, type = 'info') {
  const existing = document.getElementById('reliefin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'reliefin-toast';
  const bgColor = type === 'error' ? 'bg-rose-700' : (type === 'success' ? 'bg-emerald-700' : 'bg-slate-800');
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 ${bgColor} text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center space-x-2 transition-all duration-300 max-w-sm text-center`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, 3500);
}

window.saveNewDebt = function() {
  const type = document.getElementById('form-debt-type')?.value || 'tarjeta_credito';
  const entityRaw = document.getElementById('form-debt-entity')?.value || 'otra|Otra entidad';
  const [entityId, entityName] = entityRaw.includes('|') ? entityRaw.split('|') : ['otra', entityRaw];
  const balance = Number(document.getElementById('form-debt-balance')?.value);
  const payment = Number(document.getElementById('form-debt-payment')?.value);
  const unknownRate = document.getElementById('form-debt-unknown-rate')?.checked;
  const userRate = parseOptionalNumber(document.getElementById('form-debt-rate')?.value);
  const ratePeriod = document.getElementById('form-debt-rate-period')?.value || 'EA';
  const term = parseOptionalNumber(document.getElementById('form-debt-term')?.value);
  const day = parseOptionalNumber(document.getElementById('form-debt-day')?.value) || 15;

  if (!balance || balance <= 0) {
    showToast('Por favor ingresa un saldo pendiente válido mayor a 0.', 'error');
    return;
  }
  if (!payment || payment <= 0) {
    showToast('Por favor ingresa un pago mensual aproximado válido mayor a 0.', 'error');
    return;
  }

  const knowsUserRate = !unknownRate && userRate !== null && userRate >= 0;

  const rateMeta = RateProvider.resolveRate({
    entityId,
    entityName,
    productType: type,
    knowsRate: knowsUserRate,
    reportedRate: knowsUserRate ? userRate : null,
    ratePeriod: ratePeriod,
    useReferenceConsent: true
  });

  if (state.debts.length === 0) {
    state.dataOrigin = 'participant';
  }

  const newDebt = {
    id: 'debt_' + Date.now(),
    entityId,
    entityName,
    entity: entityName,
    productType: type,
    type,
    balance,
    monthlyPayment: payment,
    rateEA: rateMeta.rateEA,
    reportedRate: knowsUserRate ? userRate : null,
    ratePeriod: ratePeriod,
    referenceRate: rateMeta.referenceRate,
    referenceRateMin: rateMeta.referenceRateMin,
    referenceRateMax: rateMeta.referenceRateMax,
    rateSourceType: rateMeta.rateSourceType,
    rateSourceUrl: rateMeta.rateSourceUrl,
    rateSourceDate: rateMeta.rateSourceDate,
    rateConfidence: rateMeta.rateConfidence,
    isEstimated: rateMeta.isEstimated,
    knowsRate: knowsUserRate,
    termMonths: term && term > 0 ? Math.round(term) : null,
    paymentDay: day
  };

  state.debts.push(newDebt);
  state.save();
  AnalyticsProvider.track('added_debt', { type, balance, isDemo: state.dataOrigin === 'demo' });
  renderApp();
};

window.removeDebt = function(id) {
  state.debts = state.debts.filter(d => d.id !== id);
  state.save();
  renderApp();
};

window.goToSnapshot = function() {
  if (state.debts.length === 0) return;
  AnalyticsProvider.track('completed_financial_snapshot', { count: state.debts.length, isDemo: state.dataOrigin === 'demo' });
  state.setScreen('snapshot');
};

window.selectGoal = function(goalId) {
  state.userGoal = goalId;
  state.save();
  AnalyticsProvider.track('selected_goal', { goal: goalId, isDemo: state.dataOrigin === 'demo' });
  renderApp();
};

window.openBeforeAfter = function(altId) {
  state.selectedAlternativeId = altId;
  state.save();
  state.setScreen('before_after');
};

window.startApplicationSimulation = function(altId) {
  state.selectedAlternativeId = altId;
  state.save();
  state.setScreen('connection');
};

window.toggleConsent = function() {
  const checked = document.getElementById('consent-checkbox')?.checked;
  const btn = document.getElementById('submit-application-btn');
  if (btn) {
    btn.disabled = !checked;
    if (checked) {
      btn.className = 'w-full bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition';
    } else {
      btn.className = 'w-full bg-slate-300 text-slate-500 font-bold py-3.5 rounded-xl cursor-not-allowed transition';
    }
  }
};

window.confirmApplicationSubmission = function(altId) {
  const { ranked } = state.getAlternatives();
  const alt = ranked.find(a => a.id === altId) || ranked.find(a => a.id === state.selectedAlternativeId) || ranked[0] || {};

  const rawProduct = alt.commercialName || alt.productType || alt.product?.commercialName;
  const safeProductName = (!rawProduct || rawProduct === 'undefined' || String(rawProduct).trim() === '') ? 'Producto por confirmar' : rawProduct;
  const entityName = alt.entity || alt.entityName || alt.product?.entityName || 'Entidad financiera';

  const savedAmount = isFiniteNumber(alt.montoConsolidar) ? Number(alt.montoConsolidar) : (isFiniteNumber(alt.simulation?.capital) ? Number(alt.simulation.capital) : null);
  const savedPayment = isFiniteNumber(alt.cuotaMensual) ? Number(alt.cuotaMensual) : (isFiniteNumber(alt.simulation?.cuotaMensual) ? Number(alt.simulation.cuotaMensual) : null);
  const savedTerm = isFiniteNumber(alt.plazoMeses) ? Number(alt.plazoMeses) : (isFiniteNumber(alt.simulation?.termMonths) ? Number(alt.simulation.termMonths) : null);
  const savedRate = isFiniteNumber(alt.rateMinEA) ? Number(alt.rateMinEA) : (isFiniteNumber(alt.simulation?.rateMinEA) ? Number(alt.simulation.rateMinEA) : (isFiniteNumber(alt.product?.rateMinEA) ? Number(alt.product.rateMinEA) : null));
  const savedCost = isFiniteNumber(alt.simulation?.costoTotal) ? Number(alt.simulation.costoTotal) : (isFiniteNumber(alt.costoTotalEstimado) ? Number(alt.costoTotalEstimado) : null);

  const newApp = {
    id: 'app_' + Date.now(),
    fecha: new Date().toISOString(),
    entidad: entityName,
    producto: safeProductName,
    montoSolicitado: savedAmount,
    cuotaEstimada: savedPayment,
    plazoEstimado: savedTerm,
    tasaIndicativaEA: savedRate,
    costoTotalEstimado: savedCost,
    tasaFuente: alt.officialSource || alt.product?.officialSource || null,
    tasaFechaReferencia: alt.effectiveDate || alt.product?.effectiveDate || null,
    objetivoOriginal: state.userGoal,
    alternativeId: alt.id || altId,
    status: 'en_estudio'
  };

  state.applications.unshift(newApp);
  state.activeApplicationIdForOutcome = newApp.id;
  state.save();
  AnalyticsProvider.track('started_application', { entity: entityName, amount: newApp.montoSolicitado, isDemo: state.dataOrigin === 'demo' });
  state.setScreen('confirmation');
};

window.openOutcomeReport = function(appId) {
  state.activeApplicationIdForOutcome = appId;
  state.setScreen('outcome_report');
};

window.handleOutcomeSelection = function(appId, outcome) {
  const app = state.applications.find(a => a.id === appId) || state.applications[0];
  if (!app) return;

  app.resultadoReportado = outcome;
  app.fechaResultado = new Date().toISOString();

  if (outcome === 'approved') {
    app.status = 'aprobada';
    AnalyticsProvider.track('application_approved', { appId });
    state.save();
    openFinalOfferInput(appId);
  } else if (outcome === 'approved_modified') {
    app.status = 'aprobada_condiciones_diferentes';
    AnalyticsProvider.track('application_approved', { appId, modified: true });
    state.save();
    openFinalOfferInput(appId);
  } else if (outcome === 'rejected') {
    app.status = 'no_aprobada';
    AnalyticsProvider.track('application_rejected', { appId });
    state.save();
    state.setScreen('rejection_guidance');
  } else if (outcome === 'in_review') {
    app.status = 'en_estudio';
    AnalyticsProvider.track('application_pending', { appId });
    state.save();
    state.setScreen('applications');
  } else if (outcome === 'withdrawn') {
    app.status = 'desistio';
    AnalyticsProvider.track('application_status_updated', { appId, status: 'desistio' });
    state.save();
    state.setScreen('applications');
  }
};

window.openFinalOfferInput = function(appId) {
  state.activeApplicationIdForOutcome = appId;
  state.setScreen('final_offer_input');
  setTimeout(() => {
    window.updateOfferAllocationSummary?.();
  }, 30);
};

window.toggleApproximateFields = function() {
  const isChecked = document.getElementById('final-unknown-checkbox')?.checked;
  const box = document.getElementById('approximate-fields-box');
  if (box) {
    if (isChecked) {
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
      ['approx-amount', 'approx-rate', 'approx-payment', 'approx-term'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });
    }
  }
};

window.toggleAllocMode = function(debtId) {
  const selectedMode = document.querySelector(`input[name="alloc_radio_${debtId}"]:checked`)?.value;
  const box = document.getElementById(`alloc_partial_box_${debtId}`);
  if (box) {
    if (selectedMode === 'abono_parcial') {
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
};

window.calculateCurrentAllocation = function() {
  const activeDebts = state.debts.filter(d => !d.isCancelled && d.status !== 'cancelada');
  const amount = parseOptionalNumber(document.getElementById('final-amount')?.value);
  const newCuota = parseOptionalNumber(document.getElementById('final-payment')?.value);
  const newTerm = parseOptionalNumber(document.getElementById('final-term')?.value);
  const costs = parseOptionalNumber(document.getElementById('final-costs')?.value) || 0;
  const costsType = document.getElementById('final-costs-type')?.value || 'unico';

  const cancelledDebts = [];
  const partialDebts = [];
  const remainingDebts = [];

  let totalAllocated = 0;
  let remainingActiveMonthlyPayment = 0;
  let totalOriginalMonthlyPayment = 0;

  activeDebts.forEach(d => {
    const bal = Number(d.balance) || 0;
    const cuota = Number(d.monthlyPayment) || 0;
    totalOriginalMonthlyPayment += cuota;

    const radio = document.querySelector(`input[name="alloc_radio_${d.id}"]:checked`);
    const mode = radio ? radio.value : 'permanecer';

    if (mode === 'cancelar_total') {
      totalAllocated += bal;
      cancelledDebts.push({
        debt: d,
        allocatedAmount: bal,
        status: 'cancelada_total'
      });
    } else if (mode === 'abono_parcial') {
      const partialVal = Number(document.getElementById(`alloc_partial_val_${d.id}`)?.value) || 0;
      const appliedPartial = Math.min(bal, Math.max(0, partialVal));
      totalAllocated += appliedPartial;
      const remainingBalance = Math.max(0, bal - appliedPartial);

      partialDebts.push({
        debt: d,
        allocatedAmount: appliedPartial,
        remainingBalance: remainingBalance,
        status: 'parcialmente_pagada'
      });
      remainingActiveMonthlyPayment += cuota;
    } else {
      remainingDebts.push({
        debt: d,
        allocatedAmount: 0,
        status: 'permanece'
      });
      remainingActiveMonthlyPayment += cuota;
    }
  });

  const scenarioSummary = calculateConsolidationScenarioSummary({
    newCredit: {
      monthlyPayment: newCuota,
      termMonths: newTerm,
      oneTimeCharges: costsType === 'unico' ? costs : 0,
      extraMonthlyCharge: costsType === 'mensual' ? costs : 0
    },
    remainingDebts,
    partialDebts
  });

  const pagoMensualTotalPosterior = scenarioSummary.initialJointMonthlyPayment;
  const ahorroMensualReal = pagoMensualTotalPosterior !== null
    ? (totalOriginalMonthlyPayment - pagoMensualTotalPosterior)
    : null;

  const totalActiveObligationsAfter = 1 + remainingDebts.length + partialDebts.length;

  return {
    amount,
    newCuota,
    newTerm,
    costs,
    costsType,
    activeDebts,
    cancelledDebts,
    partialDebts,
    remainingDebts,
    totalAllocated,
    allocatedDiff: amount !== null ? (amount - totalAllocated) : null,
    totalOriginalMonthlyPayment,
    remainingActiveMonthlyPayment,
    pagoMensualTotalPosterior,
    ahorroMensualReal,
    totalActiveObligationsAfter,
    scenarioSummary
  };
};

window.updateOfferAllocationSummary = function() {
  const container = document.getElementById('offer-summary-preview');
  if (!container) return;

  const data = window.calculateCurrentAllocation();
  const hasAmount = data.amount !== null;
  const isSurplus = hasAmount && data.allocatedDiff > 0;
  const isDeficit = hasAmount && data.allocatedDiff < 0;

  container.innerHTML = `
    <div class="flex items-center justify-between font-bold pb-2 border-b border-teal-200">
      <span>Monto aprobado: <strong class="text-slate-900">${hasAmount ? formatCOP(data.amount) : 'Dato pendiente'}</strong></span>
      <span>Total distribuido: <strong class="text-teal-900">${formatCOP(data.totalAllocated)}</strong></span>
    </div>

    ${!hasAmount ? `
      <div class="bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200 text-[11px]">
        ℹ️ Falta el monto aprobado. Puedes completarlo cuando la entidad lo confirme.
      </div>
    ` : isDeficit ? `
      <div class="bg-rose-50 text-rose-800 p-2 rounded-lg border border-rose-200 text-[11px]">
        ⚠️ El valor distribuido (${formatCOP(data.totalAllocated)}) excede el monto aprobado por ${formatCOP(Math.abs(data.allocatedDiff))}.
      </div>
    ` : isSurplus ? `
      <div class="bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200 text-[11px]">
        ℹ️ Restan ${formatCOP(data.allocatedDiff)} por destinar del monto aprobado.
      </div>
    ` : `
      <div class="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-200 text-[11px] font-semibold text-center">
        ✓ El 100% del crédito aprobado (${formatCOP(data.amount)}) está distribuido exactamente.
      </div>
    `}

    <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
      <div class="bg-white p-2 rounded-lg border border-slate-200">
        <span class="text-[10px] text-slate-500 block">Cuota nuevo crédito:</span>
        <strong class="text-slate-900">${data.newCuota !== null ? formatCOP(data.newCuota) : 'Dato pendiente'}</strong>
      </div>
      <div class="bg-white p-2 rounded-lg border border-slate-200">
        <span class="text-[10px] text-slate-500 block">Cuotas deudas que siguen:</span>
        <strong class="${data.remainingActiveMonthlyPayment > 0 ? 'text-amber-800' : 'text-slate-700'}">${formatCOP(data.remainingActiveMonthlyPayment)}</strong>
        <span class="text-[9px] text-slate-400 block">${data.remainingDebts.length} deudas + ${data.partialDebts.length} parciales</span>
      </div>
    </div>

    <!-- FÓRMULA OBLIGATORIA (PUNTO 3) -->
    <div class="bg-brand-dark text-white p-2.5 rounded-lg flex items-center justify-between shadow-xs">
      <div>
        <span class="text-[10px] text-teal-300 font-bold uppercase tracking-wider block">PAGO MENSUAL TOTAL POSTERIOR</span>
        <span class="text-[9px] text-slate-300">${data.newCuota !== null ? `Cuota nueva (${formatCOP(data.scenarioSummary.newCreditMonthlyPayment)}) + Cuotas activas (${formatCOP(data.remainingActiveMonthlyPayment)})` : 'Cuota pendiente + cuotas activas'}</span>
      </div>
      <div class="text-right">
        <span class="text-sm font-extrabold text-teal-200">${data.pagoMensualTotalPosterior !== null ? formatCOP(data.pagoMensualTotalPosterior) : 'Dato pendiente'}</span>
      </div>
    </div>

    <!-- FÓRMULA OBLIGATORIA (PUNTO 6) -->
    <div class="flex items-center justify-between text-[11px] pt-1">
      <span class="text-slate-600">Reducción del pago mensual:</span>
      <span class="font-extrabold ${data.ahorroMensualReal !== null && data.ahorroMensualReal > 0 ? 'text-emerald-700' : 'text-slate-700'} whitespace-nowrap">
        ${data.ahorroMensualReal === null ? 'Dato pendiente' : (data.ahorroMensualReal > 0 ? `~${formatCOP(data.ahorroMensualReal)} / mes` : `${formatCOP(data.ahorroMensualReal)} / mes`)}
      </span>
    </div>

    ${data.scenarioSummary.scenarioTotalFuturePayment !== null ? `
      <div class="flex items-center justify-between text-[11px]">
        <span class="text-slate-600">Total futuro del escenario (hasta mes ${data.scenarioSummary.scenarioLastPaymentMonth}):</span>
        <strong class="text-slate-900 whitespace-nowrap">${formatCOP(data.scenarioSummary.scenarioTotalFuturePayment)}</strong>
      </div>
    ` : ''}

    <!-- REQUERIMIENTO 8: NINGUNA AFIRMACIÓN FALSA DE OBLIGACIONES -->
    <div class="text-[11px] text-slate-600 pt-1 border-t border-teal-200/60 font-medium">
      📌 <strong>Obligaciones activas resultantes:</strong> Continuarías con <strong>${pluralizeObligations(data.totalActiveObligationsAfter)} activas</strong> (1 nueva compra de cartera + ${pluralizeDebts(data.remainingDebts.length)} no canceladas${data.partialDebts.length > 0 ? ` + ${data.partialDebts.length === 1 ? '1 con abono parcial' : `${data.partialDebts.length} con abono parcial`}` : ''}).
    </div>
  `;
};

window.submitFinalOfferComparison = function(appId) {
  const amount = parseOptionalNumber(document.getElementById('final-amount')?.value);
  const rate = parseOptionalNumber(document.getElementById('final-rate')?.value);
  const payment = parseOptionalNumber(document.getElementById('final-payment')?.value);
  const term = parseOptionalNumber(document.getElementById('final-term')?.value);
  const costs = parseOptionalNumber(document.getElementById('final-costs')?.value) || 0;
  const costsType = document.getElementById('final-costs-type')?.value || 'unico';

  const unknown = document.getElementById('final-unknown-checkbox')?.checked;
  const approxAmount = document.getElementById('approx-amount')?.checked;
  const approxRate = document.getElementById('approx-rate')?.checked;
  const approxPayment = document.getElementById('approx-payment')?.checked;
  const approxTerm = document.getElementById('approx-term')?.checked;

  const approximateFields = [];
  const approximateFieldsLabels = [];
  if (approxAmount) { approximateFields.push('amount'); approximateFieldsLabels.push('Monto aprobado'); }
  if (approxRate) { approximateFields.push('rate'); approximateFieldsLabels.push('Tasa E.A.'); }
  if (approxPayment) { approximateFields.push('payment'); approximateFieldsLabels.push('Cuota mensual'); }
  if (approxTerm) { approximateFields.push('term'); approximateFieldsLabels.push('Plazo'); }

  const hasMissingField = amount === null || rate === null || payment === null || term === null;
  const isApproximate = Boolean(unknown) || approximateFields.length > 0;
  if (isApproximate && approximateFieldsLabels.length === 0) {
    approximateFieldsLabels.push('Condiciones generales aproximadas');
  }

  // Validación de coherencia matemática únicamente cuando hay datos completos (0 % es válido)
  const canCheckMath = amount !== null && amount > 0 && rate !== null && rate >= 0 && term !== null && term > 0;
  const theoreticalCuota = canCheckMath ? calculateAmortizationMonthlyPayment(amount, rate, term) : null;
  const hasBothCuotas = theoreticalCuota !== null && payment !== null;
  const cuotaDiff = hasBothCuotas ? (payment - theoreticalCuota) : null;
  const percentDiff = (hasBothCuotas && theoreticalCuota > 0) ? ((payment - theoreticalCuota) / theoreticalCuota) * 100 : null;
  const hasDiscrepancy = percentDiff !== null && Math.abs(percentDiff) >= 3.0;

  const allocData = window.calculateCurrentAllocation();
  const targetAppId = appId || state.activeApplicationIdForOutcome || state.applications[0]?.id || null;

  const offerRecord = {
    appId: targetAppId,
    montoAprobado: amount,
    tasaEA: rate,
    cuotaMensual: payment,
    plazoMeses: term !== null && term > 0 ? Math.round(term) : null,
    costosAdicionales: costs,
    costosTipo: costsType,
    hasMissingField,
    desconoceAlgunDato: isApproximate,
    isApproximate: isApproximate,
    isFullyConfirmed: !isApproximate && !hasMissingField,
    approximateFields,
    approximateFieldsLabels,
    theoreticalCuota,
    cuotaDiff,
    percentDiff,
    hasDiscrepancy,
    cancelledDebts: allocData.cancelledDebts,
    partialDebts: allocData.partialDebts,
    remainingDebts: allocData.remainingDebts,
    totalAllocated: allocData.totalAllocated,
    totalOriginalMonthlyPayment: allocData.totalOriginalMonthlyPayment,
    remainingActiveMonthlyPayment: allocData.remainingActiveMonthlyPayment,
    pagoMensualTotalPosterior: allocData.pagoMensualTotalPosterior,
    ahorroMensualReal: allocData.ahorroMensualReal,
    totalActiveObligationsAfter: allocData.totalActiveObligationsAfter,
    scenarioTotalFuturePayment: allocData.scenarioSummary.scenarioTotalFuturePayment,
    scenarioLastPaymentMonth: allocData.scenarioSummary.scenarioLastPaymentMonth,
    totalChargesCountedOnce: allocData.scenarioSummary.totalChargesCountedOnce
  };

  state.temporaryOffer = offerRecord;
  state.activeApplicationIdForOutcome = targetAppId;

  const app = state.applications.find(a => a.id === targetAppId);
  if (app) {
    app.finalOffer = offerRecord;
  }
  state.save();

  AnalyticsProvider.track('final_offer_entered', {
    appId: targetAppId,
    amount,
    rate,
    payment,
    isApproximate,
    hasMissingField,
    hasDiscrepancy,
    isDemo: state.dataOrigin === 'demo'
  });
  state.setScreen('final_offer_comparison');
};

window.completePendingOfferFields = function() {
  if (!state.temporaryOffer) return;
  const amountInput = document.getElementById('inline-pending-amount');
  const rateInput = document.getElementById('inline-pending-rate');
  const paymentInput = document.getElementById('inline-pending-payment');
  const termInput = document.getElementById('inline-pending-term');

  if (amountInput) {
    const val = parseOptionalNumber(amountInput.value);
    if (val !== null && val > 0) state.temporaryOffer.montoAprobado = val;
  }
  if (rateInput) {
    const val = parseOptionalNumber(rateInput.value);
    if (val !== null && val >= 0) state.temporaryOffer.tasaEA = val;
  }
  if (paymentInput) {
    const val = parseOptionalNumber(paymentInput.value);
    if (val !== null && val >= 0) state.temporaryOffer.cuotaMensual = val;
  }
  if (termInput) {
    const val = parseOptionalNumber(termInput.value);
    if (val !== null && val > 0) state.temporaryOffer.plazoMeses = Math.round(val);
  }

  const offer = state.temporaryOffer;
  const scenarioSummary = calculateConsolidationScenarioSummary({
    newCredit: {
      monthlyPayment: offer.cuotaMensual,
      termMonths: offer.plazoMeses,
      oneTimeCharges: (offer.costosTipo || 'unico') === 'unico' ? (offer.costosAdicionales || 0) : 0,
      extraMonthlyCharge: offer.costosTipo === 'mensual' ? (offer.costosAdicionales || 0) : 0
    },
    remainingDebts: offer.remainingDebts || [],
    partialDebts: offer.partialDebts || []
  });

  offer.pagoMensualTotalPosterior = scenarioSummary.initialJointMonthlyPayment;
  offer.ahorroMensualReal = offer.pagoMensualTotalPosterior !== null
    ? (offer.totalOriginalMonthlyPayment - offer.pagoMensualTotalPosterior)
    : null;
  offer.scenarioTotalFuturePayment = scenarioSummary.scenarioTotalFuturePayment;
  offer.scenarioLastPaymentMonth = scenarioSummary.scenarioLastPaymentMonth;
  offer.hasMissingField = offer.montoAprobado === null || offer.tasaEA === null || offer.cuotaMensual === null || offer.plazoMeses === null;
  offer.isFullyConfirmed = !offer.isApproximate && !offer.hasMissingField;

  const app = state.applications.find(a => a.id === offer.appId);
  if (app) app.finalOffer = offer;

  state.save();
  showToast('Datos de la oferta actualizados.', 'success');
  renderApp();
};

window.acceptConsolidationOffer = function() {
  const offer = state.temporaryOffer;
  if (!offer || !isFiniteNumber(offer.montoAprobado) || !isFiniteNumber(offer.cuotaMensual) || !isFiniteNumber(offer.plazoMeses)) {
    showToast('Completa monto, cuota y plazo antes de registrar la aceptación.', 'error');
    return;
  }

  const snapshot = state.getSnapshot();
  const app = state.applications.find(a => a.id === offer?.appId) || state.applications[0];
  const { ranked } = state.getAlternatives();
  const matchedAlt = ranked.find(a => a.id === app?.alternativeId || a.entity === app?.entidad);

  const rawProductName = app?.producto || matchedAlt?.commercialName || matchedAlt?.productType || offer?.productName;
  const safeProductName = (!rawProductName || rawProductName === 'undefined' || String(rawProductName).trim() === '') ? 'Producto por confirmar' : rawProductName;

  const approvedAmount = Number(offer.montoAprobado);
  const newCuota = Number(offer.cuotaMensual);
  const newTerm = Math.round(Number(offer.plazoMeses));
  const newRate = isFiniteNumber(offer.tasaEA) ? Number(offer.tasaEA) : null;
  const pagoPosterior = isFiniteNumber(offer.pagoMensualTotalPosterior)
    ? Number(offer.pagoMensualTotalPosterior)
    : (newCuota + (offer.remainingActiveMonthlyPayment || 0));

  // REQUERIMIENTO 6: No registrar como canceladas las obligaciones hasta que el usuario confirme desembolso
  state.acceptedRestructuring = {
    id: 'rest_' + Date.now(),
    applicationId: offer?.appId || 'app_manual',
    entidad: app?.entidad || matchedAlt?.entity || 'Banco Aprobado',
    productoNombre: safeProductName,
    status: offer?.isApproximate || offer?.hasMissingField ? 'pendiente_desembolso_preliminar' : 'pendiente_desembolso',
    isApproximate: Boolean(offer?.isApproximate),
    isFullyConfirmed: !offer?.isApproximate && !offer?.hasMissingField,
    approximateFieldsLabels: offer?.approximateFieldsLabels || [],
    fechaAceptacion: new Date().toISOString(),
    montoAprobado: approvedAmount,
    saldoInicialConsolidado: approvedAmount,
    saldoActual: approvedAmount,
    cuotaActual: newCuota,
    tasaEA: newRate,
    plazoOriginalMeses: newTerm,
    mesesRestantes: newTerm,
    pagosRealizados: 0,
    obligacionesPreviasCount: snapshot.totalCount,
    pagoMensualPrevio: offer?.totalOriginalMonthlyPayment || snapshot.totalMonthlyPayment,
    remainingActiveMonthlyPayment: offer?.remainingActiveMonthlyPayment || 0,
    pagoMensualTotalPosterior: pagoPosterior,
    ahorroMensualReal: isFiniteNumber(offer?.ahorroMensualReal) ? Number(offer.ahorroMensualReal) : (snapshot.totalMonthlyPayment - pagoPosterior),
    cancelledDebts: offer?.cancelledDebts || [],
    partialDebts: offer?.partialDebts || [],
    remainingDebts: offer?.remainingDebts || [],
    totalActiveObligationsAfter: offer?.totalActiveObligationsAfter || 1
  };

  state.save();
  AnalyticsProvider.track('approved_offer_accepted', { isDemo: state.dataOrigin === 'demo' });
  state.setScreen('evolution');
};

window.confirmDisbursementAndApplyPayments = function() {
  if (!state.acceptedRestructuring) return;

  const rest = state.acceptedRestructuring;
  rest.status = 'desembolsado_activo';
  rest.fechaDesembolsoConfirmado = new Date().toISOString();

  // Cancelar las deudas marcadas para cancelación total
  const cancelledIds = new Set((rest.cancelledDebts || []).map(c => c.debt.id));
  const partialMap = new Map((rest.partialDebts || []).map(p => [p.debt.id, p]));

  state.debts = state.debts.map(d => {
    if (cancelledIds.has(d.id)) {
      return {
        ...d,
        isCancelled: true,
        status: 'cancelada_por_compra',
        balance: 0,
        monthlyPayment: 0,
        cancelledAt: new Date().toISOString()
      };
    }
    if (partialMap.has(d.id)) {
      const p = partialMap.get(d.id);
      return {
        ...d,
        status: 'parcialmente_pagada',
        balance: p.remainingBalance,
        allocatedExtraPayment: p.allocatedAmount
      };
    }
    return d;
  });

  // Agregar la nueva obligación de compra de cartera a las obligaciones activas si aún no existe
  const hasConsolidatedDebt = state.debts.some(d => d.id === 'debt_consolidation_active');
  if (!hasConsolidatedDebt) {
    state.debts.push({
      id: 'debt_consolidation_active',
      entity: rest.entidad,
      entityName: rest.entidad,
      type: 'credito_consumo',
      productType: rest.productoNombre,
      balance: isFiniteNumber(rest.montoAprobado) ? Number(rest.montoAprobado) : (isFiniteNumber(rest.saldoActual) ? Number(rest.saldoActual) : 0),
      monthlyPayment: rest.cuotaActual,
      rateEA: rest.tasaEA,
      knowsRate: isFiniteNumber(rest.tasaEA),
      isEstimated: !isFiniteNumber(rest.tasaEA),
      termMonths: rest.plazoOriginalMeses,
      status: 'activa_compra_cartera',
      isNewConsolidation: true
    });
  }

  state.save();
  AnalyticsProvider.track('disbursement_confirmed_by_user', { amount: rest.montoAprobado || rest.saldoActual });
  showToast('¡Desembolso confirmado! Deudas canceladas y seguimiento actualizado.', 'success');
  renderApp();
};

window.loadAuditedScenarioAction = function() {
  state.loadAuditedScenario();
  showToast('Escenario de auditoría cargado: 5 deudas por $46.200.000 (Pago: $3.650.000).', 'success');
};

window.recompareAlternativesWithFinalOffer = function() {
  AnalyticsProvider.track('requested_new_comparison');
  state.setScreen('alternatives');
};

window.declineFinalOffer = function() {
  const offer = state.temporaryOffer;
  if (offer && offer.appId) {
    const app = state.applications.find(a => a.id === offer.appId);
    if (app) app.status = 'desistio';
  }
  state.save();
  AnalyticsProvider.track('approved_offer_declined');
  state.setScreen('applications');
};

window.handleCheckIn = function(type) {
  state.activeCheckIn = type;
  state.save();
  AnalyticsProvider.track('financial_checkin_completed', { response: type });
  showToast('¡Check-in registrado! En RelieFin seguimos monitoreando tu evolución de forma personalizada.', 'success');
};

window.simulateMonthPayment = function() {
  if (!state.acceptedRestructuring) return;
  state.acceptedRestructuring.pagosRealizados += 1;
  state.acceptedRestructuring.mesesRestantes = Math.max(0, state.acceptedRestructuring.mesesRestantes - 1);
  const amort = Math.round(state.acceptedRestructuring.cuotaActual * 0.75);
  state.acceptedRestructuring.saldoActual = Math.max(0, state.acceptedRestructuring.saldoActual - amort);
  state.save();
  AnalyticsProvider.track('extra_payment_reported', { paymentNumber: state.acceptedRestructuring.pagosRealizados });
  renderApp();
};

window.submitPersonalizedPlanInterest = function() {
  AnalyticsProvider.track('personalized_plan_interest', { product: 'plan_personalizado', model: 'pago_unico' });
  const btn = document.getElementById('interest-plan-btn');
  if (btn) {
    btn.innerText = '✓ ¡Gracias por tu interés! Registrado.';
    btn.disabled = true;
    btn.className = 'w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl';
  }
};

window.submitProductAInterest = function() {
  AnalyticsProvider.track('personalized_plan_interest', { product: 'plan_personalizado' });
  const btn = document.getElementById('btn-interest-plan');
  if (btn) {
    btn.innerText = '✓ Interés registrado (Sin costo)';
    btn.className = 'w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl';
  }
};

window.submitProductBInterest = function() {
  AnalyticsProvider.track('premium_tracking_interest', { product: 'seguimiento_premium' });
  const btn = document.getElementById('btn-interest-tracking');
  if (btn) {
    btn.innerText = '✓ Interés registrado (Sin costo)';
    btn.className = 'w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl';
  }
};

window.submitTrackingInterest = function() {
  AnalyticsProvider.track('premium_tracking_interest');
  showToast('¡Gracias! Registramos tu interés en el seguimiento avanzado.', 'success');
};

window.submitSurveyResponse = function() {
  const model = document.getElementById('survey-model')?.value;
  const price = document.getElementById('survey-price')?.value;
  AnalyticsProvider.track('premium_payment_model_selected', { model });
  AnalyticsProvider.track('premium_price_interest_submitted', { price });
  showToast('¡Muchas gracias por tus comentarios! Nos ayudan a construir mejores herramientas.', 'success');
};

// -------------------------------------------------------------
// EVENTOS DE SHELL: MODALES, SWITCHER MÓVIL / ESCRITORIO
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  renderApp();

  // Switcher de vista móvil / expandida
  const toggleViewBtn = document.getElementById('toggle-view-btn');
  const viewModeLabel = document.getElementById('view-mode-label');
  const appWrapper = document.getElementById('app-wrapper');
  let isMobileFrame = true;

  toggleViewBtn?.addEventListener('click', () => {
    isMobileFrame = !isMobileFrame;
    if (isMobileFrame) {
      appWrapper.className = 'mobile-frame transition-all duration-300 pb-16';
      viewModeLabel.innerText = '📱 Vista Móvil (440px)';
    } else {
      appWrapper.className = 'desktop-frame transition-all duration-300 pb-16';
      viewModeLabel.innerText = '💻 Vista Amplia (Desktop)';
    }
  });

  // Modal de Analíticas del MVP
  const viewAnalyticsBtn = document.getElementById('view-analytics-btn');
  const closeAnalyticsBtn = document.getElementById('close-analytics-btn');
  const analyticsModal = document.getElementById('analytics-modal');
  const analyticsContent = document.getElementById('analytics-content');

  viewAnalyticsBtn?.addEventListener('click', () => {
    const summary = AnalyticsProvider.getMetricsSummary();
    const events = AnalyticsProvider.getEvents();

    analyticsContent.innerHTML = `
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-950 mb-3 leading-relaxed">
        <span class="font-bold block">Alcance de la medición:</span>
        <span>${summary.storageScopeLabel}</span>
        <span class="block text-[10px] text-blue-800 mt-0.5 font-mono">Participante anónimo: ${summary.participantId}</span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-center text-xs mb-3">
        <div class="bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
          <span class="text-teal-700 block text-[10px] font-semibold">1ª consulta resumen (Piloto)</span>
          <span class="font-extrabold text-teal-900 text-base">${summary.firstSummaryViewedCount}</span>
          <span class="block text-[9px] text-slate-500">Demo: ${summary.demoFirstSummaryViewedCount}</span>
        </div>
        <div class="bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
          <span class="text-teal-700 block text-[10px] font-semibold">1ª comparación (Piloto)</span>
          <span class="font-extrabold text-teal-900 text-base">${summary.firstComparisonCompletedCount}</span>
          <span class="block text-[9px] text-slate-500">Demo: ${summary.demoFirstComparisonCompletedCount}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-center text-xs">
        <div class="bg-slate-100 p-2.5 rounded-xl">
          <span class="text-slate-500 block text-[10px]">Eventos piloto / demo</span>
          <span class="font-bold text-slate-800 text-base">${summary.pilotEventsCount} <span class="text-xs font-normal text-slate-500">/ ${summary.demoEventsCount}</span></span>
        </div>
        <div class="bg-slate-100 p-2.5 rounded-xl">
          <span class="text-slate-400 block text-[10px]">Solicitudes iniciadas</span>
          <span class="font-bold text-slate-800 text-base">${summary.applicationsStarted}</span>
        </div>
        <div class="bg-teal-50 p-2.5 rounded-xl">
          <span class="text-teal-700 block text-[10px]">Tasa Resultado Conocido</span>
          <span class="font-bold text-teal-900 text-base">${summary.outcomeRate}</span>
        </div>
        <div class="bg-amber-50 p-2.5 rounded-xl">
          <span class="text-amber-800 block text-[10px]">Interés en Premium</span>
          <span class="font-bold text-amber-900 text-base">${summary.personalizedPlanInterest + summary.premiumTrackingInterest}</span>
        </div>
      </div>

      <div>
        <h4 class="font-bold text-xs uppercase text-slate-500 mb-2 mt-3">Desglose de eventos registrados</h4>
        <div class="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          ${events.length === 0 ? '<p class="text-slate-400">Sin eventos aún.</p>' : events.slice().reverse().map(e => `
            <div class="py-0.5 border-b border-slate-100 flex justify-between items-center gap-2">
              <span class="text-teal-700 truncate">${e.name}</span>
              <span class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] px-1.5 py-0.2 rounded ${e.payload?.isDemo ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'}">${e.payload?.isDemo ? 'demo' : 'piloto'}</span>
                <span class="text-slate-400">${new Date(e.timestamp).toLocaleTimeString('es-CO')}</span>
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    analyticsModal?.classList.remove('hidden');
  });

  closeAnalyticsBtn?.addEventListener('click', () => {
    analyticsModal?.classList.add('hidden');
  });

  // Reiniciar datos
  const resetBtn = document.getElementById('reset-data-btn');
  resetBtn?.addEventListener('click', () => {
    if (confirm('¿Deseas borrar los datos de demostración y comenzar desde cero?')) {
      state.resetAll();
    }
  });
});
