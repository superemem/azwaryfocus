// src/routes/tasks/to-do/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, lempar ke halaman login
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	// Ambil semua tugas yang ditugaskan ke user ini DAN berada di kolom 'To Do'
	const { data: tasks, error } = await supabase
		.from('tasks')
		.select(
			`
            id,
            title,
            description,
            priority,
            due_date,
            columns!inner(name),
            created_by_profile:profiles!tasks_created_by_fkey(username)
        `
		)
		.eq('assigned_to', userId)
		.eq('columns.name', 'To Do'); // Filter langsung di database

	if (error) {
		console.error('Error fetching "To Do" tasks:', error);
		return { tasks: [] }; // Kembalikan array kosong jika error
	}

	// Kembalikan data yang sudah matang
	return {
		tasks: tasks ?? []
	};
};
