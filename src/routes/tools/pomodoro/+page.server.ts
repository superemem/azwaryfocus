// src/routes/tools/pomodoro/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;
	const userTimezone = 'Asia/Jakarta'; // <-- Zona waktu pengguna

	const getInitialData = async () => {
		// Ambil tugas 'To Do' dan 'In Progress' beserta session_count
		const { data: tasks, error: tasksError } = await supabase
			.from('tasks')
			.select('*, columns!inner(name), session_count')
			.eq('assigned_to', userId)
			.in('columns.name', ['To Do', 'In Progress']);

		// DEBUG: Log tasks data
		console.log('Tasks data:', tasks);
		console.log('Tasks error:', tasksError);

		// ALTERNATIVE: Hitung manual dengan timezone yang benar
		const jakartaDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
		const todayStartJakarta = new Date(jakartaDate);
		todayStartJakarta.setHours(0, 0, 0, 0);

		console.log('Jakarta today start:', todayStartJakarta.toISOString());

		const { data: sessionsToday, error: sessionsError } = await supabase
			.from('pomodoro_sessions')
			.select('duration, mode, completed, start_time')
			.eq('user_id', userId)
			.gte('start_time', todayStartJakarta.toISOString());

		console.log('Sessions today:', sessionsToday);

		// Gunakan fungsi PostgreSQL yang timezone-aware
		const { data: statsData, error: statsError } = await supabase.rpc('get_pomodoro_stats_today', {
			p_user_id: userId,
			p_timezone: userTimezone
		});

		// DEBUG: Log stats data
		console.log('Stats data (PostgreSQL):', statsData);
		console.log('Stats error:', statsError);

		// FALLBACK: Jika fungsi PostgreSQL error, gunakan method manual
		let manualStats = null;
		if (sessionsToday && !sessionsError) {
			manualStats = {
				workSessions: sessionsToday.filter((s) => s.mode === 'work' && s.completed).length,
				totalWorkMinutes: Math.floor(
					sessionsToday
						.filter((s) => s.mode === 'work' && s.completed)
						.reduce((acc, s) => acc + (s.duration || 0), 0) / 60000
				)
			};
			console.log('Manual stats:', manualStats);
		}

		let fallbackStats = null;
		if (statsError) {
			fallbackStats = manualStats || { workSessions: 0, totalWorkMinutes: 0 };
		}

		// Ambil ID kolom untuk aksi di client
		const { data: columns, error: columnsError } = await supabase
			.from('columns')
			.select('id, name');

		// DEBUG: Log columns data
		console.log('Columns data:', columns);
		console.log('Columns error:', columnsError);

		if (tasksError || columnsError) {
			console.error('Error fetching pomodoro data:', tasksError || columnsError);
			return {
				todoTasks: [],
				inProgressTasks: [],
				initialStats: { workSessions: 0, totalWorkMinutes: 0 },
				columnIds: {}
			};
		}

		// Pilih statistik: PostgreSQL function vs manual calculation
		const initialStats = statsError
			? fallbackStats || { workSessions: 0, totalWorkMinutes: 0 }
			: {
					workSessions: Number(statsData?.[0]?.work_sessions || 0),
					totalWorkMinutes: Number(statsData?.[0]?.total_work_minutes || 0)
				};

		// DEBUG: Compare both methods
		console.log('PostgreSQL stats:', statsError ? 'ERROR' : statsData?.[0]);
		console.log('Manual stats:', manualStats);
		console.log('Final stats:', initialStats);

		console.log('Initial stats:', initialStats);

		const columnIds = {
			todo: columns?.find((c) => c.name === 'To Do')?.id || null,
			inProgress: columns?.find((c) => c.name === 'In Progress')?.id || null,
			done: columns?.find((c) => c.name === 'Done')?.id || null
		};

		// DEBUG: Log final filtering
		console.log('Raw tasks before filtering:', tasks);

		const todoTasks =
			tasks?.filter((task) => {
				const isToDoTask = task.columns?.name === 'To Do';
				console.log(
					`Task "${task.title}" - Column: "${task.columns?.name}" - Is ToDo: ${isToDoTask}`
				);
				return isToDoTask;
			}) || [];

		const inProgressTasks =
			tasks?.filter((task) => {
				const isInProgressTask = task.columns?.name === 'In Progress';
				console.log(
					`Task "${task.title}" - Column: "${task.columns?.name}" - Is InProgress: ${isInProgressTask}`
				);
				return isInProgressTask;
			}) || [];

		console.log('Final todoTasks:', todoTasks.length);
		console.log('Final inProgressTasks:', inProgressTasks.length);

		return {
			todoTasks,
			inProgressTasks,
			initialStats,
			columnIds
		};
	};

	return await getInitialData();
};
