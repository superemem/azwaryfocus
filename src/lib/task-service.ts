// task-service.ts
import { supabase } from '$lib/supabase';

// Interface untuk data task
interface TaskData {
	title: string;
	description: string;
	column_id: string;
	assigned_to: string;
	created_by: string;
	project_id?: string;
	order: number;
	priority?: string;
	due_date?: string | null;
}

// Interface untuk update task
interface TaskUpdateData {
	title?: string;
	description?: string;
	column_id?: string;
	assigned_to?: string;
	priority?: string;
	due_date?: string | null;
	order?: number;
}

// Interface untuk callback listener
interface TaskListenerCallbacks {
	onInsert: (task: any) => void;
	onUpdate: (task: any) => void;
	onDelete: (taskId: string) => void;
}

// Tambah task baru
export async function tambahTask(taskData: TaskData) {
	const { data, error } = await supabase
		.from('tasks')
		.insert(taskData)
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		);

	if (error) {
		console.error('Error menambah task:', error);
		throw new Error('Gagal menambahkan tugas.');
	}

	console.log('Task berhasil ditambahkan:', data);
	return data[0]; // Return single task object
}

// Edit task yang sudah ada
export async function editTask(taskId: string, updates: TaskUpdateData) {
	const { data, error } = await supabase
		.from('tasks')
		.update(updates)
		.eq('id', taskId)
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		);

	if (error) {
		console.error('Error update task:', error.message);
		throw new Error('Gagal mengedit tugas.');
	}

	console.log('Task berhasil diupdate:', data);
	return data[0]; // Return updated task
}

// Hapus task
export async function hapusTask(taskId: string) {
	const { error } = await supabase.from('tasks').delete().eq('id', taskId);

	if (error) {
		console.error('Error hapus task:', error.message);
		throw new Error('Gagal menghapus tugas.');
	}

	return true;
}

// Pindah task ke kolom lain
export async function pindahTask(taskId: string, newColumnId: string) {
	const { data, error } = await supabase
		.from('tasks')
		.update({ column_id: newColumnId })
		.eq('id', taskId)
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		);

	if (error) {
		console.error('Error pindah task:', error.message);
		throw new Error('Gagal memindahkan tugas.');
	}

	return data[0]; // Return updated task
}

// Ambil semua task dalam project
export async function getProjectTasks(projectId: string) {
	const { data, error } = await supabase
		.from('tasks')
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		)
		.eq('project_id', projectId)
		.order('order', { ascending: true });

	if (error) {
		console.error('Error mengambil task:', error);
		throw new Error('Gagal mengambil daftar tugas.');
	}

	return data || [];
}

// Ambil task berdasarkan column IDs (untuk optimasi)
export async function getTasksByColumns(columnIds: string[]) {
	if (columnIds.length === 0) return [];

	const { data, error } = await supabase
		.from('tasks')
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		)
		.in('column_id', columnIds)
		.order('order', { ascending: true });

	if (error) {
		console.error('Error mengambil task:', error);
		throw new Error('Gagal mengambil daftar tugas.');
	}

	return data || [];
}

// Ambil semua columns untuk project
export async function getProjectColumns(projectId: string) {
	const { data, error } = await supabase
		.from('columns')
		.select('*')
		.eq('project_id', projectId)
		.order('order', { ascending: true });

	if (error) {
		console.error('Error mengambil kolom:', error);
		throw new Error('Gagal mengambil daftar kolom.');
	}

	return data || [];
}

// Ambil project details
export async function getProjectDetails(projectId: string) {
	const { data, error } = await supabase
		.from('projects')
		.select('id, name, description, status')
		.eq('id', projectId)
		.single();

	if (error) {
		console.error('Error mengambil project:', error);
		throw new Error('Gagal mengambil detail project.');
	}

	return data;
}

// Ambil semua profiles
export async function getAllProfiles() {
	const { data, error } = await supabase.from('profiles').select('id, username').order('username');

	if (error) {
		console.error('Error mengambil profiles:', error);
		throw new Error('Gagal mengambil daftar profiles.');
	}

	return data || [];
}

// Load semua data project sekaligus (optimized)
export async function loadFullProjectData(projectId: string) {
	try {
		// Parallel execution untuk performa lebih baik
		const [projectData, columnsData, profilesData] = await Promise.all([
			getProjectDetails(projectId),
			getProjectColumns(projectId),
			getAllProfiles()
		]);

		// Ambil tasks berdasarkan column IDs yang sudah ada
		const columnIds = columnsData.map((col) => col.id);
		const tasksData = await getTasksByColumns(columnIds);

		return {
			project: projectData,
			columns: columnsData,
			tasks: tasksData,
			profiles: profilesData
		};
	} catch (error) {
		console.error('Error loading project data:', error);
		throw error;
	}
}

// Setup listener realtime untuk task
export function setupTaskListener(projectId: string, callbacks: TaskListenerCallbacks) {
	const channel = supabase.channel(`public:tasks:project_id=eq.${projectId}`);

	channel
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'tasks',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Task baru ditambahkan:', payload.new);
				callbacks.onInsert(payload.new);
			}
		)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'tasks',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Task diupdate:', payload.new);
				callbacks.onUpdate(payload.new);
			}
		)
		.on(
			'postgres_changes',
			{
				event: 'DELETE',
				schema: 'public',
				table: 'tasks',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Task dihapus:', payload.old.id);
				callbacks.onDelete(payload.old.id);
			}
		)
		.subscribe();

	// Return fungsi unsubscribe
	return () => {
		supabase.removeChannel(channel);
	};
}

// Setup listener untuk columns
export function setupColumnListener(
	projectId: string,
	callbacks: {
		onInsert: (column: any) => void;
		onUpdate: (column: any) => void;
		onDelete: (columnId: string) => void;
	}
) {
	const channel = supabase.channel(`public:columns:project_id=eq.${projectId}`);

	channel
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'columns',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Column baru ditambahkan:', payload.new);
				callbacks.onInsert(payload.new);
			}
		)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'columns',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Column diupdate:', payload.new);
				callbacks.onUpdate(payload.new);
			}
		)
		.on(
			'postgres_changes',
			{
				event: 'DELETE',
				schema: 'public',
				table: 'columns',
				filter: `project_id=eq.${projectId}`
			},
			(payload) => {
				console.log('Column dihapus:', payload.old.id);
				callbacks.onDelete(payload.old.id);
			}
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}

// Untuk mengatur ulang urutan task
export async function updateTaskOrder(taskId: string, newOrder: number) {
	const { error } = await supabase.from('tasks').update({ order: newOrder }).eq('id', taskId);

	if (error) {
		console.error('Error mengubah urutan task:', error);
		throw new Error('Gagal menyimpan urutan tugas.');
	}

	return true;
}

// Cari task berdasarkan judul atau deskripsi
export async function searchTasks(projectId: string, searchTerm: string) {
	const { data, error } = await supabase
		.from('tasks')
		.select(
			'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
		)
		.eq('project_id', projectId)
		.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

	if (error) {
		console.error('Error mencari task:', error);
		throw new Error('Gagal mencari tugas.');
	}

	return data || [];
}

// Archive project
export async function archiveProject(projectId: string) {
	const { error } = await supabase
		.from('projects')
		.update({ status: 'archived' })
		.eq('id', projectId);

	if (error) {
		console.error('Error archive project:', error);
		throw new Error('Gagal mengarsipkan proyek.');
	}

	return true;
}
