// src/routes/team/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	// Jika tidak ada sesi, lempar ke halaman login
	if (!session) {
		throw redirect(303, '/login');
	}

	// Ambil semua profil pengguna terlebih dahulu
	const { data: profiles, error: profileError } = await supabase
		.from('profiles')
		.select('id, username, avatar_url, job_title');

	if (profileError) {
		console.error('Error fetching profiles:', profileError);
		return { teamMembers: [] };
	}

	// Ambil semua data agregat dalam beberapa query besar, bukan satu per satu
	const [{ data: projectCountsData }, { data: doneTasksData }] = await Promise.all([
		supabase.rpc('count_projects_by_user'), // Asumsi ada RPC untuk ini
		supabase.rpc('count_done_tasks_by_user') // Asumsi ada RPC untuk ini
	]);

	// Jika tidak ada RPC, kita bisa gunakan cara manual yang lebih efisien:
	// const { data: allProjects } = await supabase.from('projects').select('created_by');
	// const { data: allDoneTasks } = await supabase.from('tasks').select('created_by, columns!inner(name)').eq('columns.name', 'Done');

	// Buat map untuk lookup cepat
	const projectCounts = new Map(
		projectCountsData?.map((item) => [item.user_id, item.project_count]) ?? []
	);
	const doneTaskCounts = new Map(
		doneTasksData?.map((item) => [item.user_id, item.task_count]) ?? []
	);

	// Gabungkan data profil dengan data statistik
	const teamMembers = profiles.map((member) => ({
		...member,
		projectCount: projectCounts.get(member.id) || 0,
		doneTaskCount: doneTaskCounts.get(member.id) || 0
	}));

	return {
		teamMembers
	};
};
