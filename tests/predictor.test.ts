import { describe, expect, it } from 'vitest';
import { featureOrder, predict, predictionInput, validateModel, type PredictionModel } from '../src/predictor/model';
import { feedback, scoreBand } from '../src/predictor/rubric';
import { decryptModel, IncorrectPasscode, type EncryptedModel } from '../src/predictor/vault';

const synthetic: PredictionModel = {
  format: 'gift-lab-mlp-v1',
  feature_order: [...featureOrder],
  W1: Array.from({length: 14}, (_, i) => Array.from({length: 8}, (_, j) => (i + j + 1) / 100)),
  b1: Array.from({length: 8}, (_, j) => j / 100),
  W2: Array.from({length: 8}, (_, j) => [(j + 1) / 10]),
  b2: [.05],
};

describe('browser prediction model', () => {
  it('decrypts an authenticated model only with its six-digit test passcode', async () => {
    const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value));
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode('123456'), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      {name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000},
      material, {name: 'AES-GCM', length: 256}, false, ['encrypt'],
    );
    const ciphertext = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('gift-lab-vault-v1')},
      key, new TextEncoder().encode(JSON.stringify(synthetic)),
    );
    const blob: EncryptedModel = {
      format: 'gift-lab-vault-v1', kdf: 'PBKDF2-SHA256', iterations: 600000,
      salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)),
    };
    expect(await decryptModel('123456', blob)).toEqual(synthetic);
    await expect(decryptModel('654321', blob)).rejects.toBeInstanceOf(IncorrectPasscode);
    await expect(decryptModel('12345', blob)).rejects.toBeInstanceOf(IncorrectPasscode);
  });

  it('builds the exact seven normalized values plus seven one-hot values', () => {
    expect(predictionInput([0, .5, 2.5, 5, 7.5, 9.5, 10], 3)).toEqual([
      0, .05, .25, .5, .75, .95, 1, 0, 0, 0, 1, 0, 0, 0,
    ]);
    expect(() => predictionInput([1, 2], 0)).toThrow();
    expect(() => predictionInput([0, 0, 0, 0, 0, 0, 1.2], 0)).toThrow();
    expect(() => predictionInput([0, 0, 0, 0, 0, 0, 0], 7)).toThrow();
  });

  it('matches a manual Linear-ReLU-Linear forward pass and clips only display output', () => {
    validateModel(synthetic);
    const scores = [2, 3, 4, 5, 6, 7, 8], category = 2;
    const x = predictionInput(scores, category);
    const hidden = synthetic.b1.map((bias, j) =>
      Math.max(0, x.reduce((sum, value, i) => sum + value * synthetic.W1[i][j], 0) + bias));
    const raw = hidden.reduce((sum, value, j) => sum + value * synthetic.W2[j][0], 0) + synthetic.b2[0];
    expect(predict(synthetic, scores, category)).toEqual({raw, score: Math.min(1, raw) * 10});
    expect(predict({...synthetic, b2: [-100]}, scores, category).score).toBe(0);
    expect(predict({...synthetic, b2: [100]}, scores, category).score).toBe(10);
  });

  it('rejects malformed, transposed, non-finite, and reordered parameters', () => {
    for (const model of [
      {...synthetic, W1: synthetic.W1.slice(1)},
      {...synthetic, W2: [[1, 2]]},
      {...synthetic, b1: [...synthetic.b1.slice(0, 7), Infinity]},
      {...synthetic, feature_order: [...synthetic.feature_order].reverse()},
    ]) expect(() => validateModel(model)).toThrow();
  });

  it('generates stable score bands and feedback from only the submitted controls', () => {
    expect(scoreBand(9).title).toBe('非常推荐');
    expect(scoreBand(5.3).title).toBe('略偏正面');
    expect(scoreBand(0).title).toBe('不太推荐');
    const result = feedback([10, 2, 3, 4, 5, 6, 7], 3);
    expect(result.strength).toContain('兴趣');
    expect(result.suggestions).toHaveLength(2);
    expect(result.categoryTip).toContain('兼容');
  });
});
