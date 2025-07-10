// src/routes/tools/pomodoro/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, lempar ke halaman login
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	// Ambil semua tugas yang relevan (To Do & In Progress) milik pengguna
	const { data: tasks, error } = await supabase
		.from('tasks')
		.select('*, columns!inner(name)')
		.eq('assigned_to', userId)
		.in('columns.name', ['To Do', 'In Progress']);

	if (error) {
		console.error('Error fetching tasks for Pomodoro:', error);
		return { todoTasks: [], inProgressTasks: [], columnIds: {} };
	}

	// Ambil ID kolom untuk aksi di client
	const { data: columns } = await supabase.from('columns').select('id, name');
	const columnIds = {
		todo: columns?.find((c) => c.name === 'To Do')?.id || null,
		inProgress: columns?.find((c) => c.name === 'In Progress')?.id || null,
		done: columns?.find((c) => c.name === 'Done')?.id || null
	};

	// Pisahkan tugas berdasarkan status kolom di server
	const todoTasks = tasks.filter((task) => task.columns?.name === 'To Do');
	const inProgressTasks = tasks.filter((task) => task.columns?.name === 'In Progress');

	return {
		todoTasks,
		inProgressTasks,
		columnIds
	};
};
