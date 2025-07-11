// src/routes/tools/pomodoro/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;
	const userTimezone = 'Asia/Jakarta'; // <-- Kita tentukan zona waktu di sini

	const getInitialData = async () => {
		const [tasksRes, statsRes, columnsRes] = await Promise.all([
			// Query untuk tugas tidak berubah
			supabase
				.from('tasks')
				.select('*, columns!inner(name), session_count')
				.eq('assigned_to', userId)
				.in('columns.name', ['To Do', 'In Progress']),

			// Panggil RPC baru yang timezone-aware
			supabase
				.rpc('get_pomodoro_stats_today', {
					p_user_id: userId,
					p_timezone: userTimezone
				})
				.single(),

			// Query untuk kolom tidak berubah
			supabase.from('columns').select('id, name')
		]);

		const { data: tasks, error: tasksError } = tasksRes;
		const { data: initialStats, error: statsError } = statsRes;
		const { data: columns, error: columnsError } = columnsRes;

		if (tasksError || statsError || columnsError) {
			console.error('Error fetching pomodoro data:', tasksError || statsError || columnsError);
			return {
				todoTasks: [],
				inProgressTasks: [],
				initialStats: { workSessions: 0, totalWorkMinutes: 0 },
				columnIds: {}
			};
		}

		const columnIds = {
			todo: columns?.find((c) => c.name === 'To Do')?.id || null,
			inProgress: columns?.find((c) => c.name === 'In Progress')?.id || null,
			done: columns?.find((c) => c.name === 'Done')?.id || null
		};

		return {
			todoTasks: tasks?.filter((task) => task.columns?.name === 'To Do') ?? [],
			inProgressTasks: tasks?.filter((task) => task.columns?.name === 'In Progress') ?? [],
			initialStats: {
				workSessions: initialStats?.work_sessions || 0,
				totalWorkMinutes: initialStats?.total_work_minutes || 0
			},
			columnIds
		};
	};

	return await getInitialData();
};
