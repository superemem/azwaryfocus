import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	// Fungsi statistik dasar (dipertahankan)
	const getTaskStats = async () => {
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

	const getProjectStats = async () => {
		const { count: initiatedCount } = await supabase
			.from('projects')
			.select('id', { count: 'exact' })
			.eq('created_by', userId);

		const { data: memberOf } = await supabase
			.from('project_members')
			.select('projects!inner(id, created_by)')
			.eq('user_id', userId);

		const invitedCount = memberOf?.filter((p) => p.projects.created_by !== userId).length || 0;

		return {
			initiated: initiatedCount ?? 0,
			invited: invitedCount
		};
	};

	const getUserProfile = async () => {
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();
		if (error) console.error('Error fetching user profile:', error);
		return profile || { username: 'User', avatar_url: null };
	};

	// Fungsi untuk mengambil semua data analitik dari RPC baru
	const getFullAnalytics = async (days = 7) => {
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

		// PERBAIKAN: Kelompokkan semua hasil ke dalam satu objek
		return {
			projectBreakdown: projectResult.data || [],
			taskBreakdown: taskResult.data || [],
			productivityTimeline: timelineResult.data || []
		};
	};

	// Jalankan semua pengambilan data secara paralel
	const [monthlyStats, projectStats, initialAnalytics, profile] = await Promise.all([
		getTaskStats(),
		getProjectStats(),
		getFullAnalytics(7), // Default: load data 7 hari terakhir
		getUserProfile()
	]);

	return {
		monthlyStats,
		projectStats,
		initialAnalytics, // Berisi { projectBreakdown, taskBreakdown, productivityTimeline }
		profile,
		session
	};
};
