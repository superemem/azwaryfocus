// src/routes/tools/pomodoro/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	const getInitialData = async () => {
		// Ambil tugas 'To Do' dan 'In Progress' beserta session_count
		const { data: tasks, error: tasksError } = await supabase
			.from('tasks')
			.select('*, columns!inner(name), session_count') // <-- Pastikan session_count diambil
			.eq('assigned_to', userId)
			.in('columns.name', ['To Do', 'In Progress']);

		// Ambil statistik sesi HARI INI
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const { data: sessionsToday, error: sessionsError } = await supabase
			.from('pomodoro_sessions')
			.select('duration, mode, completed')
			.eq('user_id', userId)
			.gte('start_time', todayStart.toISOString());

		// Ambil ID kolom untuk aksi di client
		const { data: columns, error: columnsError } = await supabase
			.from('columns')
			.select('id, name');

		if (tasksError || sessionsError || columnsError) {
			console.error('Error fetching pomodoro data:', tasksError || sessionsError || columnsError);
			return {
				todoTasks: [],
				inProgressTasks: [],
				initialStats: { workSessions: 0, totalWorkMinutes: 0 },
				columnIds: {}
			};
		}

		// Hitung statistik awal
		const initialStats = {
			workSessions: sessionsToday.filter((s) => s.mode === 'work' && s.completed).length,
			totalWorkMinutes: Math.floor(
				sessionsToday
					.filter((s) => s.mode === 'work' && s.completed)
					.reduce((acc, s) => acc + (s.duration || 0), 0) / 60000
			)
		};

		const columnIds = {
			todo: columns?.find((c) => c.name === 'To Do')?.id || null,
			inProgress: columns?.find((c) => c.name === 'In Progress')?.id || null,
			done: columns?.find((c) => c.name === 'Done')?.id || null
		};

		return {
			todoTasks: tasks.filter((task) => task.columns?.name === 'To Do'),
			inProgressTasks: tasks.filter((task) => task.columns?.name === 'In Progress'),
			initialStats,
			columnIds
		};
	};

	return await getInitialData();
};
