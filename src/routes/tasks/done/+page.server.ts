// src/routes/tasks/done/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Kita tambahkan 'parent' untuk bisa mengambil data profile dari layout
export const load: PageServerLoad = async ({ locals: { supabase, session }, url, parent }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	// Ambil data profile dari layout parent untuk pesan motivasi
	const { profile } = await parent();
	const userId = session.user.id;

	// --- LOGIKA BARU UNTUK FILTER RENTANG TANGGAL ---
	// Ambil tanggal dari URL, atau gunakan rentang 7 hari terakhir jika tidak ada
	const today = new Date();
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(today.getDate() - 7);

	const dateFrom = url.searchParams.get('from') || sevenDaysAgo.toISOString().split('T')[0];
	const dateTo = url.searchParams.get('to') || today.toISOString().split('T')[0];

	// Tentukan awal dan akhir hari berdasarkan tanggal yang dipilih
	const startDate = new Date(`${dateFrom}T00:00:00.000Z`);
	const endDate = new Date(`${dateTo}T23:59:59.999Z`);

	// <<< PERBAIKAN: Menggunakan due_date, bukan updated_at >>>
	// Ambil semua tugas yang ditugaskan ke user ini, berada di kolom 'Done',
	// DAN memiliki tenggat waktu pada rentang tanggal yang dipilih.
	const { data: tasks, error } = await supabase
		.from('tasks')
		.select(
			`
            id,
            title,
            priority,
            due_date,
            project_id,
            projects(name),
            columns!inner(name)
        `
		)
		.eq('assigned_to', userId)
		.eq('columns.name', 'Done')
		.gte('due_date', startDate.toISOString()) // Filter berdasarkan due_date
		.lte('due_date', endDate.toISOString()) // Filter berdasarkan due_date
		.order('due_date', { ascending: false }); // Urutkan berdasarkan due_date

	if (error) {
		console.error('Error fetching "Done" tasks:', error);
		return { tasks: [], dateFrom, dateTo, profile };
	}

	// Kembalikan data tugas, rentang tanggal, dan profil
	return {
		tasks: tasks ?? [],
		dateFrom,
		dateTo,
		profile
	};
};
