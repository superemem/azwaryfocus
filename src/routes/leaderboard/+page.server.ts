// src/routes/leaderboard/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session }, url }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const period = url.searchParams.get('period') || 'daily';
	const timezone = 'Asia/Jakarta';

	// Helper function untuk convert ke timezone Indonesia
	const toIndonesiaTime = (date: Date) => {
		return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
	};

	// Dapatkan waktu sekarang dalam timezone Indonesia
	const nowInIndonesia = toIndonesiaTime(new Date());
	let startDate: Date;
	let endDate = new Date(); // End date tetap sekarang (UTC)

	if (period === 'daily') {
		// Hari ini di Indonesia
		startDate = new Date(nowInIndonesia);
		startDate.setHours(0, 0, 0, 0);
		// Convert balik ke UTC untuk kirim ke database
		startDate = new Date(startDate.getTime() - 7 * 60 * 60 * 1000); // WIB = UTC+7
	} else if (period === 'weekly') {
		// Minggu ini di Indonesia
		const dayOfWeek = nowInIndonesia.getDay();
		startDate = new Date(nowInIndonesia);
		startDate.setDate(nowInIndonesia.getDate() - dayOfWeek);
		startDate.setHours(0, 0, 0, 0);
		// Convert balik ke UTC
		startDate = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
	} else {
		// Bulan ini di Indonesia
		startDate = new Date(nowInIndonesia.getFullYear(), nowInIndonesia.getMonth(), 1);
		// Convert balik ke UTC
		startDate = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
	}

	console.log('Period:', period);
	console.log('Start Date (UTC):', startDate.toISOString());
	console.log('End Date (UTC):', endDate.toISOString());

	const { data: leaderboardData, error } = await supabase.rpc('get_leaderboard', {
		start_date: startDate.toISOString(),
		end_date: endDate.toISOString()
	});

	if (error) {
		console.error('Error fetching leaderboard:', error);
		return { leaderboard: [], period };
	}

	// Transform data untuk frontend
	const transformedData =
		leaderboardData?.map((item) => ({
			...item,
			total_focus_minutes: Math.floor(item.total_focus_seconds / 60),
			work_sessions: item.total_sessions,
			total_work_minutes: Math.floor(item.total_focus_seconds / 60)
		})) || [];

	return {
		leaderboard: transformedData,
		period
	};
};
