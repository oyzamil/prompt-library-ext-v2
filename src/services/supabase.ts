import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ceugnezkirmmjqxxvmri.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWduZXpraXJtbWpxeHh2bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjY0NzAsImV4cCI6MjA2MjAwMjQ3MH0.7EhkodeuOP-MAMh2al2QxnbkyTBV4hKSFnYjbO0egOA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

declare type SupabaseData = {
  id: string;
  wage: string;
  wageType: string;
  currency: string;
  email: string;
  name: string;
};

export async function updateSupabaseData(table: string, data: SupabaseData, matchCondition: Partial<SupabaseData>): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Step 1: Check if data exists
    const { data: existing, error } = await supabase.from(table).select('*').match(matchCondition);

    if (error) return { success: false, error };

    if (existing && existing.length > 0) {
      // Step 2: Update if it exists
      const { error } = await supabase.from(table).update(data).match(matchCondition);

      if (error) return { success: false, error };
      return { success: true, data: data };
    } else {
      // Step 3: Insert if not exists
      const { error } = await supabase.from(table).insert([data]);

      if (error) return { success: false, error };
      return { success: true, data: data };
    }
  } catch (error) {
    return { success: false, error };
  }
}

export async function getSupabaseData({ table = 'users', key }: { table?: string; key: Record<string, any> }): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    let query = supabase.from(table).select('*');

    // Apply each key-value as a filter condition
    for (const [field, value] of Object.entries(key)) {
      query = query.eq(field, value);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error };
    }

    return { success: true, data: data[0] };
  } catch (err) {
    return { success: false, error: err };
  }
}
