/**
 * TypeScript types for the questions database
 * Matches the Supabase schema from migration 20260118000004
 */

/**
 * Question categories
 */
export type QuestionCategory = "behavioral" | "technical" | "culture" | "curveball";

/**
 * Question difficulty levels
 */
export type QuestionDifficulty = "easy" | "medium" | "hard";

/**
 * Curveball question types
 */
export type CurveballQuestionType =
  | "estimation"
  | "hypothetical"
  | "self-reflection"
  | "creative"
  | "pressure";

/**
 * Answer framework for behavioral questions
 */
export interface BehavioralAnswerFramework {
  structure: string;
  key_elements: string[];
  time_allocation: string;
}

/**
 * Answer framework for technical questions
 */
export interface TechnicalAnswerFramework {
  approach: string;
  key_elements: string[];
  follow_up_prep: string;
}

/**
 * Answer framework for culture questions
 */
export interface CultureAnswerFramework {
  authenticity_check: string;
  key_elements: string[];
  red_flags_to_avoid: string[];
}

/**
 * Answer framework for curveball questions
 */
export interface CurveballAnswerFramework {
  composure_tip: string;
  approach: string;
  key_elements: string[];
}

/**
 * Union type for all answer frameworks
 */
export type AnswerFramework =
  | BehavioralAnswerFramework
  | TechnicalAnswerFramework
  | CultureAnswerFramework
  | CurveballAnswerFramework;

/**
 * Database row for questions table
 */
export interface DbQuestion {
  id: string;
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  interviewer_intent: string;
  good_answer_traits: string[];
  common_mistakes: string[];
  answer_framework: AnswerFramework;
  tags: string[];
  question_type: CurveballQuestionType | null;
  target_value: string | null;
  is_premium: boolean;
  source: string | null;
  source_url: string | null;
  original_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a question
 */
export interface CreateQuestionInput {
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  interviewer_intent: string;
  good_answer_traits: string[];
  common_mistakes: string[];
  answer_framework: AnswerFramework;
  tags: string[];
  question_type?: CurveballQuestionType | null;
  target_value?: string | null;
  is_premium?: boolean;
  source?: string | null;
  source_url?: string | null;
  original_id?: string | null;
}

/**
 * Database row for question_runs table
 */
export interface DbQuestionRun {
  id: string;
  company_slug: string;
  role_slug: string;
  questions_generated: number;
  status: "started" | "completed" | "failed";
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

/**
 * Input for creating a question run
 */
export interface CreateQuestionRunInput {
  company_slug: string;
  role_slug: string;
}

/**
 * Filter options for querying questions
 */
export interface QuestionFilters {
  company_slug?: string;
  role_slug?: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  is_premium?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search result with relevance
 */
export interface QuestionSearchResult extends DbQuestion {
  rank?: number;
}

/**
 * Aggregated question counts
 */
export interface QuestionCounts {
  company_slug: string;
  role_slug: string;
  count: number;
}
