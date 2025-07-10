// src/routes/profile/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, lempar ke halaman login
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	// Fungsi untuk menghitung statistik tugas
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

	// Fungsi untuk menghitung statistik proyek
	const getProjectStats = async () => {
		const { count: initiatedCount, error: initiatedError } = await supabase
			.from('projects')
			.select('id', { count: 'exact' })
			.eq('created_by', userId);

		const { count: invitedCount, error: invitedError } = await supabase
			.from('project_members')
			.select('project_id', { count: 'exact' })
			.eq('user_id', userId)
			.neq('project_id', null); // Pastikan tidak menghitung baris null

		if (initiatedError || invitedError) {
			console.error('Error fetching project stats:', initiatedError || invitedError);
		}

		return {
			initiated: initiatedCount ?? 0,
			// Kurangi 1 jika user juga owner di salah satu proyek yang diundang (opsional, tergantung logika bisnis)
			invited: (invitedCount ?? 0) > 0 ? invitedCount : 0
		};
	};

	// Jalankan semua pengambilan data secara bersamaan
	const [monthlyStats, projectStats] = await Promise.all([getTaskStats(), getProjectStats()]);

	// Kembalikan semua data yang sudah matang
	return {
		monthlyStats,
		projectStats
	};
};
