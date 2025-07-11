// src/routes/leaderboard/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session }, url }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	// Baca filter dari URL, default-nya 'monthly'
	const period = url.searchParams.get('period') || 'monthly';

	const now = new Date();
	let startDate = new Date();

	// Tentukan rentang tanggal berdasarkan filter
	if (period === 'daily') {
		startDate.setHours(0, 0, 0, 0);
	} else if (period === 'weekly') {
		const dayOfWeek = now.getDay();
		startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
		startDate.setHours(0, 0, 0, 0);
	} else {
		// monthly
		startDate = new Date(now.getFullYear(), now.getMonth(), 1);
	}

	const { data: leaderboardData, error } = await supabase.rpc('get_leaderboard', {
		start_date: startDate.toISOString(),
		end_date: new Date().toISOString() // Selalu sampai waktu sekarang
	});

	if (error) {
		console.error('Error fetching leaderboard:', error);
		return { leaderboard: [], period };
	}

	return {
		leaderboard: leaderboardData ?? [],
		period // Kirim filter saat ini ke client
	};
};
