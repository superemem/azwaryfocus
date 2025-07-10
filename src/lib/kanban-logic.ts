// src/lib/kanban-logic.ts

import { writable, derived, get, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabaseClientStore } from '$lib/stores/supabaseStore';
import { notificationService } from '$lib/notification-service';
import { RealtimeManager, type RealtimeCallbacks } from '$lib/realtime-service';

// Interface dan konstanta tidak berubah
export interface ProfileData {
	id: string;
	username: string;
}

export interface KanbanState {
	projectId: string | null;
	project: any | null;
	columns: any[];
	tasks: any[];
	profiles: ProfileData[];
	loading: boolean;
	error: string | null;
	searchQuery: string;
	projectLead: string | null;
	teamMembers: string[];
}
// ... (interface lain tidak berubah) ...

export class KanbanLogic {
	private state: Writable<KanbanState>;
	private realtimeManager: RealtimeManager | null = null;

	constructor() {
		this.state = writable({
			projectId: null,
			project: null,
			columns: [],
			tasks: [],
			profiles: [],
			loading: true,
			error: null,
			searchQuery: '',
			projectLead: null,
			teamMembers: []
		});
	}

	// Helper untuk mengambil client yang benar
	private getSupabaseClient() {
		const supabase = get(supabaseClientStore);
		if (!supabase) throw new Error('Pengguna belum login atau koneksi gagal.');
		return supabase;
	}

	// Getters untuk state (tidak berubah)
	get store() {
		return this.state;
	}
	get project() {
		return derived(this.state, ($s) => $s.project);
	}
	get columns() {
		return derived(this.state, ($s) => $s.columns);
	}
	get tasks() {
		return derived(this.state, ($s) => $s.tasks);
	}
	get profiles() {
		return derived(this.state, ($s) => $s.profiles);
	}
	get loading() {
		return derived(this.state, ($s) => $s.loading);
	}
	get error() {
		return derived(this.state, ($s) => $s.error);
	}
	get projectLead() {
		return derived(this.state, ($s) => $s.projectLead);
	}
	get teamMembers() {
		return derived(this.state, ($s) => $s.teamMembers);
	}

	get stats() {
		return derived(this.state, ($state) => {
			const tasks = $state.tasks || [];
			const columns = $state.columns || [];
			const todoId = columns.find((c) => c.name.toLowerCase() === 'to do')?.id;
			const inProgressId = columns.find((c) => c.name.toLowerCase() === 'in progress')?.id;
			const doneId = columns.find((c) => c.name.toLowerCase() === 'done')?.id;
			const todoCount = tasks.filter((t) => t.column_id === todoId).length;
			const inProgressCount = tasks.filter((t) => t.column_id === inProgressId).length;
			const doneCount = tasks.filter((t) => t.column_id === doneId).length;
			const totalTasks = todoCount + inProgressCount + doneCount;
			const progressPercent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
			return { todoCount, inProgressCount, doneCount, totalTasks, progressPercent };
		});
	}

	get filteredTasks() {
		return derived(this.state, ($state) => {
			const tasks = $state.tasks || [];
			if (!$state.searchQuery) return tasks;
			const query = $state.searchQuery.toLowerCase();
			return tasks.filter(
				(task) =>
					task.title?.toLowerCase().includes(query) ||
					task.description?.toLowerCase().includes(query)
			);
		});
	}

	private updateState(updates: Partial<KanbanState>) {
		this.state.update((current) => ({ ...current, ...updates }));
	}

	async loadProject(projectId: string) {
		if (!projectId) return this.resetProject();
		this.updateState({ loading: true, error: null, projectId });
		try {
			const supabase = this.getSupabaseClient();
			const { data, error } = await supabase.rpc('load_kanban_project', { project_id: projectId });
			if (error) throw error;
			this.updateState({
				project: data.project,
				columns: data.columns,
				tasks: data.tasks,
				profiles: data.members,
				projectLead: data.project_lead,
				teamMembers: data.members
					.filter((m: any) => m.username && m.username !== data.project_lead)
					.map((m: any) => m.username),
				loading: false
			});
			if (browser) this.setupRealtimeListeners(projectId);
		} catch (error: any) {
			this.updateState({ error: error.message, loading: false });
		}
	}

	async createTask(taskData: any) {
		const supabase = this.getSupabaseClient();
		const currentState = this.getCurrentState();
		if (!currentState.projectId) throw new Error('Tidak ada proyek yang dipilih.');
		const fullTaskData = { ...taskData, project_id: currentState.projectId };
		const { data: newTask, error } = await supabase
			.from('tasks')
			.insert(fullTaskData)
			.select()
			.single();
		if (error) throw error;
		if (browser) notificationService.taskCreated(newTask.title);
	}

	async updateTask(taskId: string, updates: any) {
		const supabase = this.getSupabaseClient();
		const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId);
		if (updateError) throw updateError;

		const { data: updatedTask, error: selectError } = await supabase
			.from('tasks')
			.select(
				'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
			)
			.eq('id', taskId)
			.single();

		if (selectError) throw selectError;

		this.state.update((current) => {
			const taskIndex = current.tasks.findIndex((t) => t.id === taskId);
			if (taskIndex !== -1) {
				const newTasks = [...current.tasks];
				newTasks[taskIndex] = updatedTask;
				return { ...current, tasks: newTasks };
			}
			return current;
		});

		if (browser) notificationService.taskUpdated(updatedTask.title);
	}

	async deleteTask(taskId: string) {
		const taskToDelete = this.getCurrentState().tasks.find((t) => t.id === taskId);
		const taskTitle = taskToDelete?.title || 'Tugas';
		const supabase = this.getSupabaseClient();
		const { error } = await supabase.from('tasks').delete().eq('id', taskId);
		if (error) throw error;
		if (browser) notificationService.taskDeleted(taskTitle);
	}

	// =======================================================
	// BAGIAN YANG DIPERBAIKI: FUNGSI INI SEKARANG LEBIH AMAN
	// =======================================================
	async moveTask(taskId: string, newColumnId: string) {
		const originalTasks = this.getCurrentState().tasks;
		const taskToMove = originalTasks.find((t) => t.id === taskId);
		if (!taskToMove) return;

		// 1. Lakukan Optimistic Update. Ini menjaga data `assigned_to` yang sudah benar.
		this.state.update((current) => ({
			...current,
			tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, column_id: newColumnId } : t))
		}));

		try {
			const supabase = this.getSupabaseClient();
			// 2. Kirim HANYA perubahan kolom ke database. Jangan re-fetch.
			const { error } = await supabase
				.from('tasks')
				.update({ column_id: newColumnId })
				.eq('id', taskId);

			if (error) throw error;

			// 3. Jika berhasil, tampilkan notifikasi. UI sudah benar.
			if (browser) {
				const newColumn = this.getCurrentState().columns.find((c) => c.id === newColumnId);
				if (newColumn) {
					const columnName = newColumn.name.toLowerCase();
					if (columnName.includes('in progress'))
						notificationService.taskMovedToInProgress(taskToMove.title);
					else if (columnName.includes('done')) notificationService.taskCompleted(taskToMove.title);
					else notificationService.taskMoved(taskToMove.title, newColumn.name);
				}
			}
		} catch (error: any) {
			if (browser) notificationService.showError('Gagal memindahkan tugas', error.message);
			// 4. Jika gagal, kembalikan UI ke state semula.
			this.state.update((current) => ({ ...current, tasks: originalTasks }));
		}
	}

	async archiveCurrentProject() {
		const projectToArchive = this.getCurrentState().project;
		if (!projectToArchive) throw new Error('Tidak ada project yang aktif');
		if (browser && !confirm(`Arsipkan proyek "${projectToArchive.name}"?`)) return false;
		const supabase = this.getSupabaseClient();
		const { error } = await supabase
			.from('projects')
			.update({ status: 'archived' })
			.eq('id', projectToArchive.id);
		if (error) throw error;
		if (browser) notificationService.projectArchived(projectToArchive.name);
		this.resetProject();
		return true;
	}

	// Fungsi-fungsi lain (tidak berubah)
	private resetProject() {
		this.cleanupRealtimeListeners();
		this.updateState({
			projectId: null,
			project: null,
			columns: [],
			tasks: [],
			profiles: [],
			loading: false,
			error: null,
			projectLead: null,
			teamMembers: []
		});
	}

	private setupRealtimeListeners(projectId: string) {
		if (!browser) return;
		this.cleanupRealtimeListeners();
		try {
			const supabase = this.getSupabaseClient();
			const callbacks: RealtimeCallbacks = {
				onTaskInsert: (task) => this.state.update((c) => ({ ...c, tasks: [...c.tasks, task] })),
				onTaskUpdate: (task) =>
					this.state.update((c) => ({
						...c,
						tasks: c.tasks.map((t) => (t.id === task.id ? task : t))
					})),
				onTaskDelete: (taskId) =>
					this.state.update((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })),
				onColumnUpdate: (column) =>
					this.state.update((c) => ({
						...c,
						columns: c.columns.map((col) => (col.id === column.id ? column : col))
					})),
				onProjectUpdate: (project) => this.updateState({ project })
			};
			this.realtimeManager = new RealtimeManager(projectId, callbacks, supabase);
			this.realtimeManager.setupAllListeners();
		} catch (error) {
			console.warn('Failed to setup realtime listeners:', error);
		}
	}

	private cleanupRealtimeListeners() {
		if (this.realtimeManager) this.realtimeManager.cleanup();
		this.realtimeManager = null;
	}

	updateSearchQuery(query: string) {
		this.updateState({ searchQuery: query });
	}
	getCurrentState(): KanbanState {
		let s!: KanbanState;
		this.state.subscribe((v) => (s = v))();
		return s;
	}
	findColumnByName(name: string): any | null {
		return (
			this.getCurrentState().columns?.find((c) => c.name.toLowerCase() === name.toLowerCase()) ||
			null
		);
	}
	destroy() {
		this.cleanupRealtimeListeners();
	}
}

export const kanbanLogic = new KanbanLogic();
