// AnalyticsProvider y LocalAnalyticsProvider para RelieFin
// Registra eventos localmente en el navegador (localStorage) sin requerir servicios externos en el MVP

const STORAGE_KEY = 'reliefin_analytics_events';
const PARTICIPANT_KEY = 'reliefin_pilot_participant_id';
const MILESTONES_KEY = 'reliefin_pilot_milestones';

function createEmptyMilestones() {
  return {
    pilot: {
      first_summary_viewed: null,
      first_comparison_completed: null
    },
    demo: {
      first_summary_viewed: null,
      first_comparison_completed: null
    }
  };
}

export class AnalyticsProvider {
  static getParticipantId() {
    try {
      let id = localStorage.getItem(PARTICIPANT_KEY);
      if (!id) {
        id = 'piloto_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem(PARTICIPANT_KEY, id);
      }
      return id;
    } catch {
      return 'piloto_local';
    }
  }

  static getMilestones() {
    try {
      const raw = localStorage.getItem(MILESTONES_KEY);
      if (!raw) return createEmptyMilestones();
      const parsed = JSON.parse(raw);
      return {
        pilot: { ...createEmptyMilestones().pilot, ...(parsed?.pilot || {}) },
        demo: { ...createEmptyMilestones().demo, ...(parsed?.demo || {}) }
      };
    } catch {
      return createEmptyMilestones();
    }
  }

  static saveMilestones(milestones) {
    try {
      localStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
    } catch (err) {
      console.warn('Error guardando hitos de piloto:', err);
    }
  }

  /**
   * Registra un evento con payload y marca de tiempo.
   * Los hitos 'first_summary_viewed' y 'first_comparison_completed' se deduplican
   * por participante anónimo y separan los registros de demostración.
   * @param {string} eventName 
   * @param {Record<string, any>} payload 
   */
  static track(eventName, payload = {}) {
    const participantId = payload.participantId || this.getParticipantId();
    const isDemo = Boolean(payload.isDemo);

    if (eventName === 'first_summary_viewed' || eventName === 'first_comparison_completed') {
      const bucket = isDemo ? 'demo' : 'pilot';
      const milestones = this.getMilestones();
      if (milestones[bucket]?.[eventName]) {
        return {
          duplicate: true,
          name: eventName,
          participantId,
          isDemo,
          recordedAt: milestones[bucket][eventName]
        };
      }
      const now = new Date().toISOString();
      milestones[bucket][eventName] = {
        timestamp: now,
        participantId,
        screen: payload.screen || null
      };
      this.saveMilestones(milestones);
    }

    const event = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      name: eventName,
      timestamp: new Date().toISOString(),
      payload: {
        ...payload,
        participantId,
        isDemo
      }
    };

    try {
      const existing = this.getEvents();
      existing.push(event);
      // Limitar a los últimos 200 eventos en localStorage
      const trimmed = existing.slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      console.log(`[RelieFin Analytics] ${eventName}`, event.payload);
    } catch (err) {
      console.warn('Error guardando evento analytics:', err);
    }

    return event;
  }

  static trackFirstSummaryViewed(payload = {}) {
    return this.track('first_summary_viewed', {
      ...payload,
      isMilestone: true
    });
  }

  static trackFirstComparisonCompleted(payload = {}) {
    return this.track('first_comparison_completed', {
      ...payload,
      isMilestone: true
    });
  }

  static getEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static clearEvents() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MILESTONES_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  static getMetricsSummary() {
    const events = this.getEvents();
    const participantId = this.getParticipantId();
    const milestones = this.getMilestones();
    const countByName = {};
    const pilotCountByName = {};
    const demoCountByName = {};

    events.forEach(e => {
      countByName[e.name] = (countByName[e.name] || 0) + 1;
      if (e.payload?.isDemo) {
        demoCountByName[e.name] = (demoCountByName[e.name] || 0) + 1;
      } else {
        pilotCountByName[e.name] = (pilotCountByName[e.name] || 0) + 1;
      }
    });

    const pilotEvents = events.filter(e => !e.payload?.isDemo);
    const demoEvents = events.filter(e => Boolean(e.payload?.isDemo));

    const firstSummaryViewedCount = milestones.pilot.first_summary_viewed ? 1 : 0;
    const firstComparisonCompletedCount = milestones.pilot.first_comparison_completed ? 1 : 0;
    const demoFirstSummaryViewedCount = milestones.demo.first_summary_viewed ? 1 : 0;
    const demoFirstComparisonCompletedCount = milestones.demo.first_comparison_completed ? 1 : 0;

    const applicationsStarted = countByName['started_application'] || 0;
    const applicationsOutcomeKnown = (countByName['application_approved'] || 0) + (countByName['application_rejected'] || 0) + (countByName['application_status_updated'] || 0);
    const outcomeRate = applicationsStarted > 0 ? Math.round((applicationsOutcomeKnown / applicationsStarted) * 100) : 0;
    
    return {
      participantId,
      totalEvents: events.length,
      pilotEventsCount: pilotEvents.length,
      demoEventsCount: demoEvents.length,
      countByName,
      pilotCountByName,
      demoCountByName,
      milestones,
      firstSummaryViewedCount,
      firstComparisonCompletedCount,
      demoFirstSummaryViewedCount,
      demoFirstComparisonCompletedCount,
      applicationsStarted,
      applicationsOutcomeKnown,
      outcomeRate: `${outcomeRate}%`,
      premiumViewed: countByName['premium_viewed'] || 0,
      personalizedPlanInterest: countByName['personalized_plan_interest'] || 0,
      premiumTrackingInterest: countByName['premium_tracking_interest'] || 0,
      storageScope: 'browser_local',
      storageScopeLabel: 'Los eventos e hitos del piloto se guardan únicamente en este navegador (localStorage).'
    };
  }
}
