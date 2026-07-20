import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CuratedWord = {
  word: string;
  category: string;
  length: number;
  difficulty: string;
};

/**
 * Reads from the word_bank Supabase table (supabase/schema.sql) - small,
 * hand-picked lists (Wordle's answer pool, Word Search's themed sets), as
 * opposed to dictionary.ts's isValidWord(), which validates against the
 * full ~274k-word dictionary. New words/categories can be added directly in
 * the Supabase dashboard without a deploy.
 */
export async function getWordList(
  category: string,
  length?: number,
  limit?: number
): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("word_bank").select("word").eq("category", category);
  if (length !== undefined) query = query.eq("length", length);
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load word list: ${error.message}`);
  return (data ?? []).map((row) => (row as { word: string }).word.toLowerCase());
}

export async function listCategories(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("word_bank").select("category");
  if (error) throw new Error(`Failed to list categories: ${error.message}`);
  return [...new Set((data ?? []).map((row) => (row as { category: string }).category))];
}
