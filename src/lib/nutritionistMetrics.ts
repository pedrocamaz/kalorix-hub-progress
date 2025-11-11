// Utilidades para métricas do Hub de Nutricionistas

/**
 * Calcula IMC (kg / m^2). Retorna null se dados inválidos.
 */
export function calcImc(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  const imc = weightKg / (h * h);
  return Number(imc.toFixed(1));
}

/**
 * Classifica IMC segundo faixas padrão.
 */
export function classifyImc(imc: number | null): string {
  if (imc == null) return 'Indisponível';
  if (imc < 18.5) return 'Baixo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade I';
  if (imc < 40) return 'Obesidade II';
  return 'Obesidade III';
}

export interface AdherenceResult {
  percent: number;
  daysWithMeals: number;
  referenceDays: number;
}

/**
 * Calcula adesão com base em datas (YYYY-MM-DD) de refeições nos últimos 7 dias.
 * Ignora duplicadas por dia.
 */
export function calcAdherence(mealDates: string[]): AdherenceResult {
  const unique = Array.from(new Set(mealDates.map(d => d.split('T')[0])));
  const today = new Date();
  const last7 = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    last7.add(d);
  }
  const daysWithMeals = unique.filter(d => last7.has(d)).length;
  const percent = Math.round((daysWithMeals / 7) * 100);
  return { percent, daysWithMeals, referenceDays: 7 };
}

export interface InsightInput {
  proteinLowDays?: number;
  adherencePercent: number;
  avgCaloriesWeek?: number;
}

/**
 * Gera texto curto de insight para badge.
 */
export function buildInsight(data: InsightInput): string {
  const parts: string[] = [];
  // Adesão
  if (data.adherencePercent >= 85) parts.push('Boa adesão');
  else if (data.adherencePercent >= 60) parts.push('Adesão moderada');
  else parts.push('Baixa adesão');
  // Proteína
  if ((data.proteinLowDays ?? 0) >= 3) parts.push('Proteína baixa recorrente');
  // Calorias (heurístico simples)
  if (data.avgCaloriesWeek) {
    if (data.avgCaloriesWeek < 1400) parts.push('Calorias muito baixas');
    else if (data.avgCaloriesWeek > 2800) parts.push('Calorias elevadas');
  }
  return parts.join(' • ') || 'Sem dados';
}

/**
 * Helper opcional para tendência simples de peso (placeholder).
 */
export function buildWeightSeries(currentWeight: number | null): { date: string; weight: number }[] {
  if (!currentWeight) return [];
  return [{ date: new Date().toISOString().split('T')[0], weight: currentWeight }];
}