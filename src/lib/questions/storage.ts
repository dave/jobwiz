/**
 * Questions storage functions for Supabase
 * Provides CRUD operations for interview questions and question runs
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DbQuestion,
  DbQuestionRun,
  CreateQuestionInput,
  CreateQuestionRunInput,
  QuestionFilters,
  QuestionSearchResult,
  QuestionCounts,
} from "./types";

/**
 * Validate slug format (lowercase, hyphenated)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Create a single question
 */
export async function createQuestion(
  supabase: SupabaseClient,
  input: CreateQuestionInput
): Promise<DbQuestion> {
  if (!isValidSlug(input.company_slug)) {
    throw new Error(`Invalid company_slug format: ${input.company_slug}`);
  }
  if (!isValidSlug(input.role_slug)) {
    throw new Error(`Invalid role_slug format: ${input.role_slug}`);
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      company_slug: input.company_slug,
      role_slug: input.role_slug,
      question_text: input.question_text,
      category: input.category,
      difficulty: input.difficulty,
      interviewer_intent: input.interviewer_intent,
      good_answer_traits: input.good_answer_traits,
      common_mistakes: input.common_mistakes,
      answer_framework: input.answer_framework,
      tags: input.tags,
      question_type: input.question_type ?? null,
      target_value: input.target_value ?? null,
      is_premium: input.is_premium ?? false,
      source: input.source ?? null,
      source_url: input.source_url ?? null,
      original_id: input.original_id ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create question: ${error.message}`);
  }

  return data as DbQuestion;
}

/**
 * Create multiple questions in a batch
 */
export async function createQuestionsBatch(
  supabase: SupabaseClient,
  questions: CreateQuestionInput[]
): Promise<DbQuestion[]> {
  if (questions.length === 0) return [];

  // Validate all slugs first
  for (const q of questions) {
    if (!isValidSlug(q.company_slug)) {
      throw new Error(`Invalid company_slug format: ${q.company_slug}`);
    }
    if (!isValidSlug(q.role_slug)) {
      throw new Error(`Invalid role_slug format: ${q.role_slug}`);
    }
  }

  const { data, error } = await supabase
    .from("questions")
    .insert(
      questions.map((input) => ({
        company_slug: input.company_slug,
        role_slug: input.role_slug,
        question_text: input.question_text,
        category: input.category,
        difficulty: input.difficulty,
        interviewer_intent: input.interviewer_intent,
        good_answer_traits: input.good_answer_traits,
        common_mistakes: input.common_mistakes,
        answer_framework: input.answer_framework,
        tags: input.tags,
        question_type: input.question_type ?? null,
        target_value: input.target_value ?? null,
        is_premium: input.is_premium ?? false,
        source: input.source ?? null,
        source_url: input.source_url ?? null,
        original_id: input.original_id ?? null,
      }))
    )
    .select();

  if (error) {
    throw new Error(`Failed to create questions batch: ${error.message}`);
  }

  return data as DbQuestion[];
}

/**
 * Upsert questions (insert or skip if duplicate based on original_id)
 */
export async function upsertQuestions(
  supabase: SupabaseClient,
  questions: CreateQuestionInput[]
): Promise<{ inserted: number; skipped: number }> {
  if (questions.length === 0) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const q of questions) {
    if (!isValidSlug(q.company_slug) || !isValidSlug(q.role_slug)) {
      skipped++;
      continue;
    }

    // Check if question with this original_id already exists
    if (q.original_id) {
      const { data: existing } = await supabase
        .from("questions")
        .select("id")
        .eq("company_slug", q.company_slug)
        .eq("role_slug", q.role_slug)
        .eq("original_id", q.original_id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }
    }

    try {
      await createQuestion(supabase, q);
      inserted++;
    } catch {
      skipped++;
    }
  }

  return { inserted, skipped };
}

/**
 * Get a question by ID
 */
export async function getQuestionById(
  supabase: SupabaseClient,
  id: string
): Promise<DbQuestion | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to get question: ${error.message}`);
  }

  return data as DbQuestion;
}

/**
 * Get questions with filters
 */
export async function getQuestions(
  supabase: SupabaseClient,
  filters: QuestionFilters = {}
): Promise<DbQuestion[]> {
  let query = supabase.from("questions").select("*");

  if (filters.company_slug) {
    query = query.eq("company_slug", filters.company_slug);
  }

  if (filters.role_slug) {
    query = query.eq("role_slug", filters.role_slug);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }

  if (typeof filters.is_premium === "boolean") {
    query = query.eq("is_premium", filters.is_premium);
  }

  // Apply ordering
  query = query.order("category").order("difficulty").order("created_at");

  // Apply pagination
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get questions: ${error.message}`);
  }

  return data as DbQuestion[];
}

/**
 * Get questions for a specific company/role combination
 */
export async function getQuestionsForPosition(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string
): Promise<DbQuestion[]> {
  return getQuestions(supabase, {
    company_slug: companySlug,
    role_slug: roleSlug,
  });
}

/**
 * Search questions using full-text search
 */
export async function searchQuestions(
  supabase: SupabaseClient,
  query: string,
  filters: QuestionFilters = {}
): Promise<QuestionSearchResult[]> {
  let dbQuery = supabase.from("questions").select("*");

  // Apply full-text search
  dbQuery = dbQuery.textSearch("search_vector", query, {
    type: "websearch",
    config: "english",
  });

  // Apply additional filters
  if (filters.company_slug) {
    dbQuery = dbQuery.eq("company_slug", filters.company_slug);
  }

  if (filters.role_slug) {
    dbQuery = dbQuery.eq("role_slug", filters.role_slug);
  }

  if (filters.category) {
    dbQuery = dbQuery.eq("category", filters.category);
  }

  if (filters.difficulty) {
    dbQuery = dbQuery.eq("difficulty", filters.difficulty);
  }

  if (filters.limit) {
    dbQuery = dbQuery.limit(filters.limit);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search questions: ${error.message}`);
  }

  // Add rank based on position in results
  return (data as DbQuestion[]).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

/**
 * Get question counts grouped by company/role
 */
export async function getQuestionCounts(
  supabase: SupabaseClient
): Promise<QuestionCounts[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("company_slug, role_slug")
    .order("company_slug")
    .order("role_slug");

  if (error) {
    throw new Error(`Failed to get question counts: ${error.message}`);
  }

  // Group and count manually since Supabase JS doesn't support GROUP BY
  const counts: Record<string, QuestionCounts> = {};

  for (const row of data) {
    const key = `${row.company_slug}:${row.role_slug}`;
    if (!counts[key]) {
      counts[key] = {
        company_slug: row.company_slug,
        role_slug: row.role_slug,
        count: 0,
      };
    }
    counts[key].count++;
  }

  return Object.values(counts);
}

/**
 * Delete all questions for a company/role combination
 */
export async function deleteQuestionsForPosition(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string
): Promise<number> {
  const { data, error } = await supabase
    .from("questions")
    .delete()
    .eq("company_slug", companySlug)
    .eq("role_slug", roleSlug)
    .select("id");

  if (error) {
    throw new Error(`Failed to delete questions: ${error.message}`);
  }

  return data?.length ?? 0;
}

// ============================================================================
// Question Run Functions
// ============================================================================

/**
 * Create a question run
 */
export async function createQuestionRun(
  supabase: SupabaseClient,
  input: CreateQuestionRunInput
): Promise<DbQuestionRun> {
  const { data, error } = await supabase
    .from("question_runs")
    .insert({
      company_slug: input.company_slug,
      role_slug: input.role_slug,
      status: "started",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create question run: ${error.message}`);
  }

  return data as DbQuestionRun;
}

/**
 * Complete a question run
 */
export async function completeQuestionRun(
  supabase: SupabaseClient,
  runId: string,
  questionsGenerated: number
): Promise<DbQuestionRun> {
  const startedRun = await supabase
    .from("question_runs")
    .select("started_at")
    .eq("id", runId)
    .single();

  const startedAt = startedRun.data?.started_at
    ? new Date(startedRun.data.started_at)
    : new Date();
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const { data, error } = await supabase
    .from("question_runs")
    .update({
      status: "completed",
      questions_generated: questionsGenerated,
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete question run: ${error.message}`);
  }

  return data as DbQuestionRun;
}

/**
 * Fail a question run
 */
export async function failQuestionRun(
  supabase: SupabaseClient,
  runId: string,
  errorMessage: string
): Promise<DbQuestionRun> {
  const { data, error } = await supabase
    .from("question_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to fail question run: ${error.message}`);
  }

  return data as DbQuestionRun;
}

/**
 * Check if questions exist for a company/role
 */
export async function questionsExist(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("company_slug", companySlug)
    .eq("role_slug", roleSlug)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check questions existence: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}
