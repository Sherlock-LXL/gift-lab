// Port of Gift Chooser's NumPy forward pass. No training data or weights live here.
export const featureOrder = [
  'interest_match', 'need_utility', 'emotional_personalization', 'aesthetic_confidence',
  'selection_safety', 'storage_friendliness', 'value_fit',
  'cat_jewelry_accessories', 'cat_fandom_collectibles', 'cat_books_stationery',
  'cat_electronics_imaging', 'cat_beauty_fragrance', 'cat_bags_clothing', 'cat_daily_life',
] as const;

export interface PredictionModel {
  format: 'gift-lab-mlp-v1';
  feature_order: string[];
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
}

export function validateModel(value: unknown): asserts value is PredictionModel {
  const m = value as PredictionModel | null;
  const vector = (x: unknown, length: number) => Array.isArray(x) && x.length === length &&
    x.every(n => typeof n === 'number' && Number.isFinite(n));
  const matrix = (x: unknown, rows: number, columns: number) => Array.isArray(x) && x.length === rows &&
    x.every(row => vector(row, columns));
  if (!m || m.format !== 'gift-lab-mlp-v1' ||
    JSON.stringify(m.feature_order) !== JSON.stringify(featureOrder) ||
    !matrix(m.W1, 14, 8) || !vector(m.b1, 8) || !matrix(m.W2, 8, 1) || !vector(m.b2, 1)) {
    throw Error('预测模型格式不完整，请联系小游戏作者更新。');
  }
}

export function predictionInput(scores: number[], category: number): number[] {
  if (scores.length !== 7 || scores.some(n => !Number.isFinite(n) || n < 0 || n > 10 || !Number.isInteger(n * 2)) ||
    !Number.isInteger(category) || category < 0 || category > 6) {
    throw Error('请选择礼物类型，并将七项评分设为 0–10 分（每格 0.5 分）。');
  }
  return [...scores.map(n => n / 10), ...Array.from({length: 7}, (_, i) => +(i === category))];
}

export function predict(model: PredictionModel, scores: number[], category: number) {
  const x = predictionInput(scores, category);
  const hidden = model.b1.map((bias, j) =>
    Math.max(0, x.reduce((sum, value, i) => sum + value * model.W1[i][j], 0) + bias));
  const raw = hidden.reduce((sum, value, j) => sum + value * model.W2[j][0], 0) + model.b2[0];
  if (!Number.isFinite(raw)) throw Error('暂时无法计算，请重新解锁模型。');
  // Match app.py: linear output, clip only for display. No sigmoid or input re-scaling.
  return {raw, score: Math.max(0, Math.min(1, raw)) * 10};
}
