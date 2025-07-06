// src/routes/projects/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect, error as kitError } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session || !locals.user) {
		throw redirect(303, '/login');
	}
	const projectId = params.id;

	// 1. Ambil data project dasar
	const { data: project, error: projectError } = await locals.supabase
		.from('projects')
		.select('*')
		.eq('id', projectId)
		.single();
	if (projectError || !project) throw redirect(303, '/projects');

	// 2. Ambil kolom
	const { data: columnsData, error: columnsError } = await locals.supabase
		.from('columns')
		.select('*')
		.eq('project_id', projectId)
		.order('order', { ascending: true });
	if (columnsError) throw kitError(500, 'Gagal mengambil kolom proyek');

	// 3. Ambil tasks
	const columnIds = columnsData.map((c) => c.id);
	let tasksData: any[] = [];
	if (columnIds.length) {
		const { data: fetchedTasks, error: tasksError } = await locals.supabase
			.from('tasks')
			.select(
				`
        *,
        assignee_profile:profiles!tasks_assigned_to_fkey(id,username),
        created_by_profile:profiles!tasks_created_by_fkey(id,username)
      `
			)
			.in('column_id', columnIds)
			.order('order', { ascending: true });
		if (tasksError) throw kitError(500, 'Gagal mengambil tugas proyek');
		tasksData = fetchedTasks;
	}

	// 4. (Opsional) Ambil semua profiles untuk dropdown assign
	const { data: profilesData, error: profilesError } = await locals.supabase
		.from('profiles')
		.select('id,username,avatar_url');
	if (profilesError) console.error('Profiles fetch error:', profilesError);

	// 5. Ambil tim + inviter (project lead) dalam satu query
	const { data: members, error: membersError } = await locals.supabase
		.from('project_members')
		.select(
			`
      user_id,
      invited_by,
      member:profiles!project_members_user_id_fkey(username),
      inviter:profiles!project_members_invited_by_fkey(username)
    `
		)
		.eq('project_id', projectId);
	if (membersError) throw kitError(500, 'Gagal mengambil data tim proyek');

	const teamMembers = members.map((m) => m.member.username);
	// Asumsi inviter sama untuk semua atau kita ambil yang pertama:
	const projectLead = members.length > 0 ? members[0].inviter.username : '—'; // fallback kalau kosong

	return {
		projectId,
		project,
		columnsData,
		tasksData,
		profiles: profilesData ?? [],
		projectLead,
		teamMembers
	};
};
