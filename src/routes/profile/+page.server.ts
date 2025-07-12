import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;
	const userTimezone = 'Asia/Jakarta';

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
		const { count: initiatedCount, error: initiatedError } = await supabase
			.from('projects')
			.select('id', { count: 'exact' })
			.eq('created_by', userId);

		const { data: memberOf, error: invitedError } = await supabase
			.from('project_members')
			.select('projects!inner(id, created_by)')
			.eq('user_id', userId);

		const invitedCount = memberOf?.filter((p) => p.projects.created_by !== userId).length || 0;

		if (initiatedError || invitedError) {
			console.error('Error fetching project stats:', initiatedError || invitedError);
		}

		return {
			initiated: initiatedCount ?? 0,
			invited: invitedCount
		};
	};

	// PERBAIKAN: Tambahkan debug dan error handling yang lebih baik
	const getFocusAnalytics = async (days = 7) => {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - (days - 1));
		startDate.setHours(0, 0, 0, 0);

		// Debug: Log parameters
		console.log('Analytics parameters:', {
			userId,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			userTimezone
		});

		// Pertama, cek apakah ada data pomodoro_sessions untuk user ini
		const { data: sessionCheck, error: sessionError } = await supabase
			.from('pomodoro_sessions')
			.select('id, user_id, mode, completed, start_time, duration')
			.eq('user_id', userId)
			.eq('mode', 'work')
			.eq('completed', true)
			.limit(5);

		if (sessionError) {
			console.error('Error checking pomodoro sessions:', sessionError);
		} else {
			console.log('Sample pomodoro sessions:', sessionCheck);
		}

		// Jalankan RPC function
		const { data, error } = await supabase.rpc('get_personal_analytics', {
			p_user_id: userId,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
			p_group_by_unit: 'day',
			p_timezone: userTimezone
		});

		if (error) {
			console.error('Error fetching focus analytics:', error);
			console.error('RPC Error details:', {
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint
			});
			return [];
		}

		console.log('Analytics data received:', data);
		return data || [];
	};

	// PERBAIKAN: Tambahkan function untuk mendapatkan profile
	const getUserProfile = async () => {
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (error) {
			console.error('Error fetching user profile:', error);
			return { username: 'User', avatar_url: null };
		}

		return profile;
	};

	const [monthlyStats, projectStats, initialAnalytics, profile] = await Promise.all([
		getTaskStats(),
		getProjectStats(),
		getFocusAnalytics(7),
		getUserProfile()
	]);

	return {
		monthlyStats,
		projectStats,
		initialAnalytics,
		profile,
		session
	};
};
