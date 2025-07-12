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
		// PERBAIKAN: Pastikan 'project_id' diambil bersama data task.
		// Query untuk kolom yang umum sudah dihapus untuk mencegah bug.
		const { data: tasks, error: tasksError } = await supabase
			.from('tasks')
			.select('*, project_id, columns!inner(name), session_count') // Eksplisit tambahkan project_id
			.eq('assigned_to', userId)
			.in('columns.name', ['To Do', 'In Progress']);

		if (tasksError) {
			console.error('Error fetching pomodoro tasks:', tasksError);
			// Return empty state on error
			return {
				todoTasks: [],
				inProgressTasks: [],
				initialStats: { workSessions: 0, totalWorkMinutes: 0 },
				profile: null // Pastikan profile ada
			};
		}

		// Ambil statistik pomodoro
		const { data: statsData, error: statsError } = await supabase.rpc('get_pomodoro_stats_today', {
			p_user_id: userId,
			p_timezone: userTimezone
		});

		const initialStats = statsError
			? { workSessions: 0, totalWorkMinutes: 0 }
			: {
					workSessions: Number(statsData?.[0]?.work_sessions || 0),
					totalWorkMinutes: Number(statsData?.[0]?.total_work_minutes || 0)
				};

		// Ambil profil pengguna untuk pengaturan pomodoro
		const { data: profile } = await supabase
			.from('profiles')
			.select('pomodoro_settings')
			.eq('id', userId)
			.single();

		const todoTasks = tasks?.filter((task) => task.columns?.name === 'To Do') || [];
		const inProgressTasks = tasks?.filter((task) => task.columns?.name === 'In Progress') || [];

		return {
			todoTasks,
			inProgressTasks,
			initialStats,
			profile // Kirim data profile ke client
		};
	};

	return await getInitialData();
};
