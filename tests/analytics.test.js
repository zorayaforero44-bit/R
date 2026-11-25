import test from 'node:test';
import assert from 'node:assert';
import { AnalyticsProvider } from '../src/services/analytics.js';

// Polyfill localStorage para entorno Node si no está presente
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

test('AnalyticsProvider: registra eventos del core, post-solicitud y monetización', () => {
  AnalyticsProvider.clearEvents();

  // Eventos de monetización (PASO 7)
  AnalyticsProvider.track('premium_viewed');
  AnalyticsProvider.track('personalized_plan_viewed');
  AnalyticsProvider.track('personalized_plan_interest', { product: 'plan_personalizado', model: 'pago_unico' });
  AnalyticsProvider.track('premium_tracking_interest', { product: 'seguimiento_premium', model: 'mensual' });
  AnalyticsProvider.track('premium_payment_model_selected', { model: 'pago_unico' });
  AnalyticsProvider.track('premium_price_interest_submitted', { suggestedPrice: 49000 });

  // Eventos de post-solicitud
  AnalyticsProvider.track('started_application', { entity: 'Banco Progresar', amount: 15000000 });
  AnalyticsProvider.track('application_approved', { applicationId: 'app_1' });
  AnalyticsProvider.track('financial_checkin_completed', { response: 'pagando_normal' });

  const events = AnalyticsProvider.getEvents();
  assert.strictEqual(events.length, 9);

  const metrics = AnalyticsProvider.getMetricsSummary();
  assert.strictEqual(metrics.premiumViewed, 1);
  assert.strictEqual(metrics.personalizedPlanInterest, 1);
  assert.strictEqual(metrics.premiumTrackingInterest, 1);
  assert.strictEqual(metrics.applicationsStarted, 1);
});
