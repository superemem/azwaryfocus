// src/lib/server/projects/loadUserProjects.ts
import { supabase } from '$lib/supabase';

export async function loadUserProjects(userId: string) {
	// Ambil project yang dibuat oleh user (owner)
	const { data: ownedProjects, error: ownedError } = await supabase
		.from('projects')
		.select('*')
		.eq('created_by', userId)
		.eq('status', 'active');

	if (ownedError) throw new Error('Gagal mengambil proyek milik user');

	// Ambil project yang user-nya diundang sebagai anggota
	const { data: joined, error: joinedError } = await supabase
		.from('project_members')
		.select('project_id, projects(*)')
		.eq('user_id', userId);

	if (joinedError) throw new Error('Gagal mengambil proyek yang diikuti user');

	const joinedProjects = joined.map((item) => item.projects).filter(Boolean);

	// Gabungkan & hilangkan duplikat (kalau ada)
	const allProjects = [...ownedProjects, ...joinedProjects];
	const uniqueProjects = allProjects.filter(
		(p, index, self) => index === self.findIndex((x) => x.id === p.id)
	);

	return uniqueProjects;
}
