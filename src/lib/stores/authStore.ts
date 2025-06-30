import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase'; // <-- PASTIKAN INI DIIMPOR

// Store untuk menyimpan session pengguna
export const session = writable<Session | null>(null);

// Store untuk menyimpan data profil pengguna
export const userProfile = writable<{
	id: string;
	username: string;
	avatar_url: string | null;
} | null>(null);

// --- TAMBAHKAN FUNGSI INI DI SINI ---
// Fungsi untuk mengambil data profil dari Supabase dan mengupdate store
export async function fetchUserProfile(userId: string) {
	console.log('DEBUG: Fetching user profile for ID:', userId);
	const { data: userProfileData, error: profileError } = await supabase
		.from('user_profiles')
		.select('*')
		.eq('id', userId)
		.single(); // Mengambil satu baris saja

	if (profileError) {
		console.error('Error fetching user profile:', profileError);
		return null;
	}

	// Set nilai store dengan data profil yang ditemukan
	userProfile.set(userProfileData);
	return userProfileData;
}
