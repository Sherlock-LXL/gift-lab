export type Split = 'train' | 'holdout';
export type AnswerStatus = 'rated' | 'uncertain' | 'unfamiliar' | 'skipped';
export type Choice = 'left' | 'right' | 'tie' | 'neither' | 'unknown';
export interface Gift {
  id: string; family_id: string; name: string; category: string;
  price_cny: number[]; description: string; style_tags: string[];
  function_tags: string[]; scenario: string; selection_risks: string[];
  storage: string; use_frequency: string; icon: string;
  audience: 'general' | 'personalized'; interest_tags: string[];
  brand: string; customization: string; role: 'rating' | 'pair';
}
export interface Pair {
  id: string; gift_ids: string[];
  comparison_type: 'controlled' | 'tradeoff' | 'consistency';
  tested_factors: string[]; changed_variables: string[]; confounds: string[];
  audience: 'general' | 'personalized'; consistency_of: string | null; interpretation: string;
}
export interface Preference {
  question_id: string; positive: string[]; negative: string[]; uncertain: string[];
  skipped: boolean; answered_at: string;
}
export interface Rating {
  answer_id: string; gift_id: string; rating: number | null;
  status: AnswerStatus; reason_tags: string[]; skipped: boolean;
  split: Split; question_order: number; metadata_ref: string; answered_at: string;
  source: 'human';
}
export interface PairChoice {
  answer_id: string; pair_id: string; left_gift_id: string; right_gift_id: string;
  chosen: Choice; tested_factors: string[]; comparison_type: Pair['comparison_type'];
  actual_display_order: string[]; skipped: boolean; question_order: number;
  answered_at: string; source: 'human';
}
export interface Session {
  schema_version: '1.0'; question_bank_version: '1.0'; session_id: string;
  consent: boolean; created_at: string; completed_at: string | null;
  active_seconds: number; completed: boolean;
  preferences: Record<string, Preference>; gift_ratings: Rating[]; pairwise_choices: PairChoice[];
  plan: {
    seed: number; fixed_at: string;
    ratings: {gift_id: string; split: Split}[];
    pairs: {pair_id: string; left_gift_id: string; right_gift_id: string}[];
    personalization_basis: string;
  };
  cursor: {stage: 'welcome' | 'radar' | 'rating' | 'pair' | 'result'; index: number};
  gift_metadata: Gift[];
}
