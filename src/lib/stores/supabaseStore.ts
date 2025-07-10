// src/lib/stores/supabaseStore.ts

import { writable } from 'svelte/store';
import type { SupabaseClient } from '@supabase/supabase-js';

// GANTI NAMA 'supabase' MENJADI 'supabaseClientStore'
export const supabaseClientStore = writable<SupabaseClient | null>(null);
