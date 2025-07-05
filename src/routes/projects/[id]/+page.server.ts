// src/routes/projects/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect, error as kitError } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session || !locals.user) {
		console.warn('User not authenticated. Redirecting to /login.');
		throw redirect(303, '/login');
	}

	const projectId = params.id;

	// 1. Ambil data project
	const { data: project, error: projectError } = await locals.supabase
		.from('projects')
		.select('*')
		.eq('id', projectId)
		.single();

	if (projectError || !project) {
		console.error('Project fetch error:', projectError);
		// Jika project tidak ditemukan atau ada error, kembalikan ke halaman daftar proyek
		throw redirect(303, '/projects');
	}

	// 2. Ambil semua kolom (tanpa tasks nested di sini)
	const { data: columnsData, error: columnsError } = await locals.supabase
		.from('columns')
		.select('*') // Hanya select kolom
		.eq('project_id', projectId)
		.order('order', { ascending: true });

	if (columnsError) {
		console.error('Columns fetch error:', columnsError);
		throw kitError(500, 'Gagal mengambil kolom proyek');
	}

	// 3. Ambil semua tasks secara terpisah
	// Gunakan column_id dari columnsData yang sudah diambil
	const columnIds = columnsData.map((col) => col.id);
	let tasksData: any[] = [];
	if (columnIds.length > 0) {
		const { data: fetchedTasks, error: tasksError } = await locals.supabase
			.from('tasks')
			.select(
				'*, assignee_profile:profiles!tasks_assigned_to_fkey(id, username), created_by_profile:profiles!tasks_created_by_fkey(id, username)'
			)
			.in('column_id', columnIds) // Filter tasks berdasarkan column_id yang relevan
			.order('order', { ascending: true });

		if (tasksError) {
			console.error('Tasks fetch error:', tasksError);
			throw kitError(500, 'Gagal mengambil tugas proyek');
		}
		tasksData = fetchedTasks;
	}

	// 4. Ambil semua profile user (opsional, buat dropdown assign)
	const { data: profilesData, error: profilesError } = await locals.supabase
		.from('profiles')
		.select('id, username, avatar_url');

	if (profilesError) {
		console.error('Profiles fetch error:', profilesError);
		// Ini mungkin tidak fatal, jadi cukup log error
		// throw kitError(500, 'Gagal mengambil data pengguna'); // Bisa di-comment jika ingin aplikasi tetap jalan tanpa profiles
	}

	return {
		projectId, // Teruskan projectId secara eksplisit
		project,
		columnsData,
		tasksData, // ✅ Teruskan tasksData secara terpisah
		profiles: profilesData || [] // Pastikan selalu array
	};
};
