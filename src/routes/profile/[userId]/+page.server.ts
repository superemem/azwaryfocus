import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session }, params }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const targetUserId = params.userId;

	// Fungsi untuk mengambil detail profil dari RPC (Sudah Benar)
	const getUserProfile = async (userId: string) => {
		const { data, error: rpcError } = await supabase
			.rpc('get_user_profile_details', { p_user_id: userId })
			.single();

		if (rpcError || !data) {
			console.error(`Error fetching profile for ${userId} via RPC:`, rpcError?.message);
			throw error(404, 'Profil tidak ditemukan');
		}
		return data;
	};

	// Fungsi untuk mengambil statistik tugas (Sudah Benar)
	const getTaskStats = async (userId: string) => {
		const { data: tasks, error } = await supabase
			.from('tasks')
			.select('columns(name), created_at')
			.eq('assigned_to', userId);

		if (error) {
			console.error('Error fetching task stats:', error);
			return { toDo: 0, inProgress: 0, done: 0 };
		}

		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();
		const stats = { toDo: 0, inProgress: 0, done: 0 };

		tasks.forEach((task) => {
			const taskDate = new Date(task.created_at);
			if (taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
				const columnName = task.columns?.name.toLowerCase();
				if (columnName === 'to do') stats.toDo++;
				else if (columnName === 'in progress') stats.inProgress++;
				else if (columnName === 'done') stats.done++;
			}
		});
		return stats;
	};

	// PERBAIKAN FINAL PADA FUNGSI INI
	const getProjectStats = async (userId: string) => {
		// 1. Hitung proyek yang diinisiasi oleh pengguna (DENGAN FILTER .eq())
		const { count: initiatedCount, error: initiatedError } = await supabase
			.from('projects')
			.select('id', { count: 'exact', head: true })
			.eq('created_by', userId); // <-- INI BAGIAN YANG DIPERBAIKI

		// 2. Panggil RPC untuk menghitung proyek undangan (Sudah Benar)
		const { data: invitedCount, error: invitedError } = await supabase.rpc(
			'get_invited_project_count',
			{ p_user_id: userId }
		);

		if (initiatedError || invitedError) {
			console.error('Error fetching project stats:', initiatedError || invitedError);
			return { initiated: 0, invited: 0 };
		}

		return {
			initiated: initiatedCount ?? 0,
			invited: invitedCount ?? 0
		};
	};

	// Fungsi untuk mengambil data analitik (Sudah Benar)
	const getFullAnalytics = async (userId: string, days = 7) => {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - (days - 1));
		startDate.setHours(0, 0, 0, 0);

		const timeRangeParams = {
			p_user_id: userId,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
			p_timezone: 'Asia/Jakarta'
		};

		const [projectResult, taskResult, timelineResult] = await Promise.all([
			supabase.rpc('get_project_pomodoro_breakdown', timeRangeParams),
			supabase.rpc('get_task_pomodoro_breakdown', { ...timeRangeParams, p_project_id: null }),
			supabase.rpc('get_project_productivity_timeline', {
				...timeRangeParams,
				p_group_by_unit: 'day'
			})
		]);

		return {
			projectBreakdown: projectResult.data || [],
			taskBreakdown: taskResult.data || [],
			productivityTimeline: timelineResult.data || []
		};
	};

	// Jalankan semua pengambilan data secara paralel (Sudah Benar)
	const [profile, monthlyStats, projectStats, initialAnalytics] = await Promise.all([
		getUserProfile(targetUserId),
		getTaskStats(targetUserId),
		getProjectStats(targetUserId),
		getFullAnalytics(targetUserId, 7)
	]);

	return {
		profile,
		monthlyStats,
		projectStats,
		initialAnalytics
	};
};
