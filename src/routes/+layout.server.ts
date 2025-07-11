// src/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, langsung kembalikan data kosong
	if (!session) {
		return { session, profile: null, projects: [] };
	}

	const userId = session.user.id;

	// Ambil profil PENGGUNA dan semua PROYEK YANG BISA DIA AKSES secara bersamaan
	// RLS (Row-Level Security) akan menangani proyek milik sendiri dan undangan.
	const [profileRes, projectsRes] = await Promise.all([
		supabase
			.from('profiles')
			.select('username, avatar_url, role, pomodoro_settings')
			.eq('id', userId)
			.single(),
		supabase.from('projects').select('*').neq('status', 'archived')
	]);

	const profile = profileRes.data;
	let projects = projectsRes.data ?? [];

	// =======================================================
	// BAGIAN YANG DILENGKAPI: LOGIKA UNTUK SUPERVISOR
	// =======================================================
	if (profile?.role === 'supervisor') {
		// 1. Cari semua staff yang berada di bawah pengawasan supervisor ini.
		// Asumsi ada kolom 'supervisor_id' di tabel 'profiles'.
		const { data: staffProfiles } = await supabase
			.from('profiles')
			.select('id')
			.eq('supervisor_id', userId);

		if (staffProfiles && staffProfiles.length > 0) {
			// 2. Ambil semua ID staff.
			const staffIds = staffProfiles.map((s) => s.id);

			// 3. Ambil semua proyek yang dibuat oleh para staff tersebut.
			const { data: staffProjects } = await supabase
				.from('projects')
				.select('*')
				.in('created_by', staffIds)
				.neq('status', 'archived');

			// 4. Gabungkan proyek supervisor dengan proyek staff.
			if (staffProjects) {
				projects = [...projects, ...staffProjects];
			}
		}
	}

	// Urutkan berdasarkan tanggal dibuat (terbaru di atas)
	projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	// Hilangkan duplikat untuk jaga-jaga (jika supervisor juga diundang ke proyek staff)
	const uniqueProjects = projects.filter(
		(p, index, self) => p && index === self.findIndex((x) => x && x.id === p.id)
	);

	return {
		session,
		profile,
		projects: uniqueProjects
	};
};
