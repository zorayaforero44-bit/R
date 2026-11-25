// Cálculo y evaluación responsable de precisión de la radiografía financiera

export function calculatePrecision(debts = []) {
  if (!debts || debts.length === 0) {
    return {
      level: 'estimacion_inicial',
      label: 'Estimación inicial',
      percentage: 20,
      color: 'amber',
      knownRates: 0,
      total: 0,
      userReportedCount: 0,
      entityPublicCount: 0,
      generalEstimateCount: 0,
      noReferenceCount: 0,
      explanation: 'No has agregado obligaciones todavía.',
      recommendation: 'Agrega al menos una obligación para comenzar tu radiografía.'
    };
  }

  const total = debts.length;
  let userReportedCount = 0;
  let entityPublicCount = 0;
  let generalEstimateCount = 0;
  let noReferenceCount = 0;

  debts.forEach(d => {
    const isUser = d.rateSourceType === 'user_reported' || (d.knowsRate && d.rateEA !== null && d.rateEA !== undefined && !isNaN(Number(d.rateEA)) && Number(d.rateEA) >= 0 && !d.isEstimated);
    if (isUser) {
      userReportedCount++;
    } else if (d.rateSourceType === 'entity_product_public' || d.rateSourceType === 'entity_modality_range') {
      entityPublicCount++;
    } else if (d.rateSourceType === 'colombia_general_reference' || (!d.knowsRate && d.rateEA > 0)) {
      generalEstimateCount++;
    } else {
      noReferenceCount++;
    }
  });

  const knownRates = userReportedCount;
  const estimated = total - knownRates;

  // CASO 1: Alta precisión (100% de tasas reportadas por el usuario)
  if (userReportedCount === total) {
    return {
      level: 'alta',
      label: 'Alta',
      percentage: 95,
      color: 'teal',
      knownRates,
      total,
      userReportedCount,
      entityPublicCount,
      generalEstimateCount,
      noReferenceCount,
      explanation: `Conocemos tus saldos, pagos mensuales y las tasas de ${total === 1 ? 'tu obligación' : `tus ${total} obligaciones`} (reportadas por ti).`,
      recommendation: 'Tu análisis cuenta con base contractual sólida informada por tus extractos.'
    };
  }

  // CASO 2: Media precisión (al menos una tasa conocida reportada o tasas públicas de la entidad)
  if (userReportedCount > 0 || entityPublicCount > 0) {
    const calculatedPct = Math.min(85, Math.round(((userReportedCount * 1.0 + entityPublicCount * 0.7) / total) * 60 + 25));
    
    return {
      level: 'media',
      label: 'Media',
      percentage: calculatedPct,
      color: 'blue',
      knownRates,
      total,
      userReportedCount,
      entityPublicCount,
      generalEstimateCount,
      noReferenceCount,
      explanation: `Conocemos tus saldos y pagos mensuales, pero estimamos las tasas de ${estimated} de ${total === 1 ? 'tu obligación' : `tus ${total} obligaciones`}.`,
      recommendation: 'Agrega las tasas reales de tus extractos bancarios para maximizar la certeza del análisis.'
    };
  }

  // CASO 3: Estimación inicial (todas son referencias generales o sin referencia)
  return {
    level: 'estimacion_inicial',
    label: 'Estimación inicial',
    percentage: 35,
    color: 'amber',
    knownRates: 0,
    total,
    userReportedCount: 0,
    entityPublicCount: 0,
    generalEstimateCount,
    noReferenceCount,
    explanation: `Conocemos tus saldos y pagos mensuales aproximados, pero utilizamos tasas estimadas de referencia para todas tus obligaciones (${total}).`,
    recommendation: 'Puedes continuar con la simulación orientativa. Ten en cuenta que tus costos contractuales reales pueden diferir.'
  };
}
