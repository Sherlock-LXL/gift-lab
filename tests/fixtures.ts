import { choose, newSession, rate, savePreference } from '../src/engine';
import { radar } from '../src/data/radar';
import type { Session } from '../src/types';

// Entirely artificial test answers; never participant data.
export function completedFixture(seed = 42): Session {
  let s = newSession(seed);
  for (const q of radar) s = savePreference(s, {
    question_id: q.id, positive: [], negative: [], uncertain: [],
    skipped: true, answered_at: new Date().toISOString(),
  });
  for (let i = 0; i < 24; i++) {
    s = i < 3 ? rate(s, i, null, ['uncertain', 'unfamiliar', 'skipped'][i] as 'uncertain')
      : rate(s, i, i % 11, 'rated', ['beautiful']);
  }
  for (let i = 0; i < 30; i++) {
    s = choose(s, i, (['left', 'right', 'tie', 'neither', 'unknown'] as const)[i % 5], i === 29);
  }
  return { ...s, completed: true, completed_at: new Date().toISOString(), cursor: {stage: 'result', index: 0} };
}
