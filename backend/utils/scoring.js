export function calculateApplicationScore(data) {
  let score = 50;

  const requestedAmount = Number(data.requestedAmount || 0);
  const annualRevenue = Number(data.annualRevenue || 0);
  const taxDebt = Number(data.taxDebt || 0);
  const creditDebt = Number(data.creditDebt || 0);
  const priorViolationsCount3y = Number(data.priorViolationsCount3y || 0);
  const priorRefundsCount3y = Number(data.priorRefundsCount3y || 0);
  const pastApplicationsCount = Number(data.pastApplicationsCount || 0);
  const approvedSubsidiesCount = Number(data.approvedSubsidiesCount || 0);
  const landAreaHa = Number(data.landAreaHa || 0);
  const employeesCount = Number(data.employeesCount || 0);

  const riskFlags = [];
  const positiveFactors = [];

  // 1. Долговая нагрузка
  const totalDebt = taxDebt + creditDebt;
  const debtToRevenuePct =
    annualRevenue > 0 ? (totalDebt / annualRevenue) * 100 : 100;

  if (debtToRevenuePct > 60) {
    score -= 25;
    riskFlags.push("Очень высокая долговая нагрузка");
  } else if (debtToRevenuePct > 30) {
    score -= 12;
    riskFlags.push("Повышенная долговая нагрузка");
  } else {
    score += 8;
    positiveFactors.push("Умеренная долговая нагрузка");
  }

  // 2. История нарушений
  if (priorViolationsCount3y >= 3) {
    score -= 25;
    riskFlags.push("Много нарушений за 3 года");
  } else if (priorViolationsCount3y >= 1) {
    score -= 10;
    riskFlags.push("Есть нарушения за 3 года");
  } else {
    score += 10;
    positiveFactors.push("Нет нарушений за 3 года");
  }

  // 3. История возвратов
  if (priorRefundsCount3y >= 2) {
    score -= 20;
    riskFlags.push("Были возвраты субсидий");
  } else if (priorRefundsCount3y === 1) {
    score -= 10;
    riskFlags.push("Есть 1 возврат субсидии");
  }

  // 4. Опыт участия
  if (pastApplicationsCount >= 3 && approvedSubsidiesCount >= 2) {
    score += 15;
    positiveFactors.push("Хорошая история участия в программах");
  } else if (pastApplicationsCount === 0) {
    score -= 5;
    riskFlags.push("Нет истории участия");
  }

  // 5. Аномально крупный запрос
  if (annualRevenue > 0 && requestedAmount / annualRevenue > 0.8) {
    score -= 20;
    riskFlags.push("Запрашиваемая сумма слишком велика относительно выручки");
  }

  // 6. Простая sanity-проверка масштаба бизнеса
  if (landAreaHa > 0 && requestedAmount / landAreaHa > 200000) {
    score -= 10;
    riskFlags.push("Высокая сумма на гектар — нужна ручная проверка");
  }

  if (employeesCount > 0 && requestedAmount / employeesCount > 5000000) {
    score -= 8;
    riskFlags.push("Высокая сумма на сотрудника — нужна ручная проверка");
  }

  // 7. Бонус за устойчивый профиль
  if (annualRevenue > 0 && totalDebt === 0) {
    score += 10;
    positiveFactors.push("Нет задолженности");
  }

  // Ограничим диапазон
  score = Math.max(0, Math.min(100, score));

  let priority = "LOW";
  let recommendation = "Стандартная очередь";

  if (score >= 75) {
    priority = "HIGH";
    recommendation = "Высокий приоритет — рекомендовано к ускоренному рассмотрению";
  } else if (score >= 50) {
    priority = "MEDIUM";
    recommendation = "Средний приоритет — требуется дополнительная проверка";
  } else {
    priority = "LOW";
    recommendation = "Низкий приоритет — углублённая проверка или стандартная очередь";
  }

  const explanationParts = [
    positiveFactors.length ? `Плюсы: ${positiveFactors.join(", ")}` : null,
    riskFlags.length ? `Риски: ${riskFlags.join(", ")}` : null,
  ].filter(Boolean);

  return {
    score,
    priority,
    recommendation,
    riskFlags,
    explanation: explanationParts.join(". "),
  };
}