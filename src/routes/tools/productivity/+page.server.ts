// src/routes/tools/productivity/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, lempar ke halaman login
	if (!session) {
		throw redirect(303, '/login');
	}

	// Hitung rentang tanggal di server
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const endOfMonth = now.toISOString();

	// Panggil RPC untuk mendapatkan statistik
	const { data: stats, error } = await supabase.rpc('get_focus_stats', {
		start_date: startOfMonth,
		end_date: endOfMonth
	});

	if (error) {
		console.error('Gagal memuat statistik produktivitas:', error);
		return { stats: [] }; // Kembalikan array kosong jika error
	}

	return {
		stats: stats ?? []
	};
};
