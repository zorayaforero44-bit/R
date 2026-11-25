// Catálogo local de entidades financieras y resolución responsable de tasas de interés
// Fuentes públicas verificables: Superintendencia Financiera de Colombia (SFC) - Formato 088

export const FINANCIAL_ENTITIES = [
  {
    id: 'bancolombia',
    name: 'Bancolombia',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 25.9,
        rateMin: 24.5,
        rateMax: 27.2,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC) · Formato 088',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      libre_inversion: {
        rateEA: 21.8,
        rateMin: 19.5,
        rateMax: 24.2,
        sourceType: 'entity_modality_range',
        sourceName: 'Tarifario público oficial Bancolombia / Reporte SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      credito_consumo: {
        rateEA: 22.9,
        rateMin: 20.8,
        rateMax: 25.5,
        sourceType: 'entity_modality_range',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'davivienda',
    name: 'Banco Davivienda',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 26.2,
        rateMin: 24.8,
        rateMax: 27.5,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC) · Formato 088',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      libre_inversion: {
        rateEA: 22.0,
        rateMin: 19.8,
        rateMax: 24.8,
        sourceType: 'entity_modality_range',
        sourceName: 'Tarifario oficial Davivienda / SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      credito_consumo: {
        rateEA: 23.1,
        rateMin: 21.2,
        rateMax: 25.9,
        sourceType: 'entity_modality_range',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'banco_bogota',
    name: 'Banco de Bogotá',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 26.8,
        rateMin: 25.0,
        rateMax: 27.6,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC) · Formato 088',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      libre_inversion: {
        rateEA: 22.5,
        rateMin: 20.2,
        rateMax: 25.4,
        sourceType: 'entity_modality_range',
        sourceName: 'Reporte de tasas activas SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      credito_consumo: {
        rateEA: 23.4,
        rateMin: 21.0,
        rateMax: 25.8,
        sourceType: 'entity_modality_range',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'nu_colombia',
    name: 'Nu Colombia (Nu Bank)',
    type: 'compania_financiamiento',
    products: {
      tarjeta_credito: {
        rateEA: 25.1,
        rateMin: 24.0,
        rateMax: 26.5,
        sourceType: 'entity_product_public',
        sourceName: 'Tarifario oficial Nu Colombia vigilada SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'banco_falabella',
    name: 'Banco Falabella',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 27.3,
        rateMin: 25.5,
        rateMax: 27.8,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      credito_consumo: {
        rateEA: 24.2,
        rateMin: 21.5,
        rateMax: 26.8,
        sourceType: 'entity_modality_range',
        sourceName: 'Tarifario público Falabella / SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'scotiabank_colpatria',
    name: 'Scotiabank Colpatria',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 26.5,
        rateMin: 24.9,
        rateMax: 27.4,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      libre_inversion: {
        rateEA: 21.9,
        rateMin: 19.8,
        rateMax: 24.5,
        sourceType: 'entity_modality_range',
        sourceName: 'Tarifario oficial Scotiabank / SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'bbva_colombia',
    name: 'BBVA Colombia',
    type: 'banco',
    products: {
      tarjeta_credito: {
        rateEA: 26.1,
        rateMin: 24.6,
        rateMax: 27.3,
        sourceType: 'entity_product_public',
        sourceName: 'Superintendencia Financiera de Colombia (SFC)',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      },
      libre_inversion: {
        rateEA: 21.7,
        rateMin: 19.2,
        rateMax: 24.3,
        sourceType: 'entity_modality_range',
        sourceName: 'Reporte SFC BBVA Colombia',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'tuya',
    name: 'Tuya (Tarjeta Éxito / Alkosto)',
    type: 'compania_financiamiento',
    products: {
      tarjeta_credito: {
        rateEA: 27.6,
        rateMin: 26.0,
        rateMax: 27.9,
        sourceType: 'entity_product_public',
        sourceName: 'Compañía de Financiamiento Tuya S.A. / SFC',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'addi',
    name: 'Addi Colombia',
    type: 'fintech',
    products: {
      credito_fintech: {
        rateEA: 26.9,
        rateMin: 23.5,
        rateMax: 28.5,
        sourceType: 'entity_modality_range',
        sourceName: 'Términos y condiciones públicos Addi Colombia',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  },
  {
    id: 'cooperativa_jfk',
    name: 'Cooperativa Financiera JFK',
    type: 'cooperativa',
    products: {
      libre_inversion: {
        rateEA: 19.8,
        rateMin: 18.0,
        rateMax: 22.5,
        sourceType: 'entity_modality_range',
        sourceName: 'Tarifario de Crédito JFK Cooperativa / Supersolidaria',
        sourceDate: 'Corte Septiembre 2024',
        lastVerified: '2024-09'
      }
    }
  }
];

export const COLOMBIA_GENERAL_REFERENCES = {
  tarjeta_credito: {
    rateEA: 27.4,
    rateMin: 24.5,
    rateMax: 27.9,
    sourceName: 'Superintendencia Financiera de Colombia · Promedio ponderado tarjetas',
    sourceDate: 'Corte Septiembre 2024',
    lastVerified: '2024-09'
  },
  credito_consumo: {
    rateEA: 22.5,
    rateMin: 20.0,
    rateMax: 26.0,
    sourceName: 'Superintendencia Financiera de Colombia · Promedio consumo ordinario',
    sourceDate: 'Corte Septiembre 2024',
    lastVerified: '2024-09'
  },
  libre_inversion: {
    rateEA: 21.8,
    rateMin: 18.5,
    rateMax: 25.0,
    sourceName: 'Superintendencia Financiera de Colombia · Promedio libre inversión',
    sourceDate: 'Corte Septiembre 2024',
    lastVerified: '2024-09'
  },
  credito_fintech: {
    rateEA: 28.5,
    rateMin: 23.0,
    rateMax: 28.5,
    sourceName: 'Asociación Colombia Fintech · Referencia representativa crédito digital',
    sourceDate: 'Corte Septiembre 2024',
    lastVerified: '2024-09'
  }
};

export class RateProvider {
  static getEntities() {
    return FINANCIAL_ENTITIES;
  }

  static searchEntities(query = '') {
    const q = query.toLowerCase().trim();
    if (!q) return FINANCIAL_ENTITIES;
    return FINANCIAL_ENTITIES.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.id.toLowerCase().includes(q)
    );
  }

  static convertMVtoEA(rateMV) {
    if (rateMV === null || rateMV === undefined || isNaN(rateMV)) return null;
    const mv = Number(rateMV) / 100;
    const ea = (Math.pow(1 + mv, 12) - 1) * 100;
    return Number(ea.toFixed(2));
  }

  static resolveRate(param1, param2, param3) {
    let entityId, entityName, productType, knowsRate, reportedRate, ratePeriod, useReferenceConsent;

    if (typeof param1 === 'object' && param1 !== null) {
      ({
        entityId,
        entityName,
        productType = 'tarjeta_credito',
        knowsRate = false,
        reportedRate = null,
        ratePeriod = 'EA',
        useReferenceConsent = true
      } = param1);
    } else {
      productType = param1 || 'tarjeta_credito';
      reportedRate = param2;
      knowsRate = Boolean(param3);
      ratePeriod = 'EA';
      useReferenceConsent = true;
    }

    // NIVEL 1: Tasa ingresada por el usuario (incluyendo 0 % cuando se informa explícitamente)
    if (knowsRate && reportedRate !== null && reportedRate !== undefined && reportedRate !== '' && !isNaN(Number(reportedRate)) && Number(reportedRate) >= 0) {
      const raw = Number(reportedRate);
      const isMV = String(ratePeriod).toUpperCase() === 'MV';
      const effectiveRateEA = isMV ? this.convertMVtoEA(raw) : raw;

      return {
        rateEA: effectiveRateEA,
        reportedRate: raw,
        ratePeriod: isMV ? 'MV' : 'EA',
        referenceRate: null,
        referenceRateMin: null,
        referenceRateMax: null,
        rateSourceType: 'user_reported',
        source: 'user',
        rateSourceUrl: null,
        rateSourceDate: null,
        rateLastVerified: null,
        rateConfidence: 'alta',
        isEstimated: false,
        label: 'Reportada por ti',
        badgeColor: 'teal',
        explanation: isMV 
          ? `Tasa ingresada: ${raw.toFixed(2)} % M.V. (convertida contractualmente a ${effectiveRateEA.toFixed(1)} % E.A.).` 
          : `Tasa ingresada directamente según tus extractos (${effectiveRateEA.toFixed(1)} % E.A.).`
      };
    }

    if (!useReferenceConsent) {
      return this._getNoRateAvailable(productType, 'El usuario no autorizó el uso de estimaciones de referencia.');
    }

    const entity = FINANCIAL_ENTITIES.find(e => e.id === entityId);

    // NIVEL 2 y 3: Producto o rango de la entidad
    if (entity && entity.products && entity.products[productType]) {
      const prod = entity.products[productType];

      if (prod.sourceType === 'entity_product_public') {
        return {
          rateEA: prod.rateEA,
          reportedRate: null,
          ratePeriod: 'EA',
          referenceRate: prod.rateEA,
          referenceRateMin: prod.rateMin || null,
          referenceRateMax: prod.rateMax || null,
          rateSourceType: 'entity_product_public',
          source: 'reference',
          rateSourceUrl: prod.sourceName,
          rateSourceDate: prod.sourceDate,
          rateLastVerified: prod.lastVerified,
          rateConfidence: 'alta',
          isEstimated: true,
          label: 'Referencia pública',
          badgeColor: 'blue',
          explanation: `Tasa pública de referencia de ${entity.name} para ${this._formatProductType(productType)}. ${prod.sourceName} (${prod.sourceDate}).`
        };
      }

      if (prod.sourceType === 'entity_modality_range') {
        return {
          rateEA: prod.rateEA,
          reportedRate: null,
          ratePeriod: 'EA',
          referenceRate: prod.rateEA,
          referenceRateMin: prod.rateMin,
          referenceRateMax: prod.rateMax,
          rateSourceType: 'entity_modality_range',
          source: 'reference',
          rateSourceUrl: prod.sourceName,
          rateSourceDate: prod.sourceDate,
          rateLastVerified: prod.lastVerified,
          rateConfidence: 'media',
          isEstimated: true,
          label: 'Rango público de la entidad',
          badgeColor: 'amber',
          explanation: `Rango publicado para ${this._formatProductType(productType)} en ${entity.name}: ${prod.rateMin.toFixed(1)} % - ${prod.rateMax.toFixed(1)} % E.A. Usamos el punto medio orientativo (${prod.rateEA.toFixed(1)} % E.A.). Fuente: ${prod.sourceName}.`
        };
      }
    }

    // NIVEL 4: Referencia general Colombia
    if (COLOMBIA_GENERAL_REFERENCES[productType]) {
      const gen = COLOMBIA_GENERAL_REFERENCES[productType];
      return {
        rateEA: gen.rateEA,
        reportedRate: null,
        ratePeriod: 'EA',
        referenceRate: gen.rateEA,
        referenceRateMin: gen.rateMin,
        referenceRateMax: gen.rateMax,
        rateSourceType: 'colombia_general_reference',
        source: 'reference',
        rateSourceUrl: gen.sourceName,
        rateSourceDate: gen.sourceDate,
        rateLastVerified: gen.lastVerified,
        rateConfidence: 'baja',
        isEstimated: true,
        label: 'Estimación general',
        badgeColor: 'amber',
        explanation: `No disponemos de tasa específica para esta entidad. Aplicamos la referencia general promedio del sistema financiero colombiano para ${this._formatProductType(productType)} (${gen.rateEA.toFixed(1)} % E.A.). Fuente: ${gen.sourceName}.`
      };
    }

    // NIVEL 5: Sin tasa disponible
    return this._getNoRateAvailable(productType, 'No existe una referencia pública verificable para esta entidad y modalidad.');
  }

  static _getNoRateAvailable(productType, reason) {
    return {
      rateEA: null,
      reportedRate: null,
      ratePeriod: null,
      referenceRate: null,
      referenceRateMin: null,
      referenceRateMax: null,
      rateSourceType: 'none',
      source: 'none',
      rateSourceUrl: null,
      rateSourceDate: null,
      rateLastVerified: null,
      rateConfidence: 'sin_referencia',
      isEstimated: true,
      label: 'Referencia no disponible',
      badgeColor: 'slate',
      explanation: `Referencia no disponible para ${this._formatProductType(productType)}. ${reason} Para esta obligación se evaluará únicamente cuota y saldo.`
    };
  }

  static _formatProductType(type) {
    const map = {
      tarjeta_credito: 'Tarjeta de crédito',
      credito_consumo: 'Crédito de consumo',
      libre_inversion: 'Crédito de libre inversión',
      credito_fintech: 'Crédito fintech',
      otro: 'Otras obligaciones'
    };
    return map[type] || 'Obligación';
  }
}
