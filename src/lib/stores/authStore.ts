import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';

// Store untuk menyimpan session pengguna
export const session = writable<Session | null>(null);

// Store untuk menyimpan data profil pengguna
// Pastikan ini diekspor
export const userProfile = writable<{
	id: string;
	username: string;
	avatar_url: string | null;
} | null>(null);
