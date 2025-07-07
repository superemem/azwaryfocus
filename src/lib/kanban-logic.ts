// $lib/services/kanban-logic.ts
import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	tambahTask,
	editTask,
	hapusTask,
	pindahTask,
	archiveProject,
	type TaskData,
	type TaskUpdateData
} from '$lib/task-service';
import { notificationService } from '$lib/notification-service';
import { RealtimeManager, type RealtimeCallbacks } from '$lib/realtime-service';
import { supabase } from '$lib/supabase';

// Column name constants
const COLUMN_TODO = 'to do';
const COLUMN_IN_PROGRESS = 'in progress';
const COLUMN_DONE = 'done';

// Debug flag for logging
const DEBUG = false;

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

export interface KanbanStats {
	todoCount: number;
	inProgressCount: number;
	doneCount: number;
	totalTasks: number;
	progressPercent: number;
}

export interface ProjectMembersData {
	projectLead: string;
	teamMembers: string[];
}

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
			loading: false,
			error: null,
			searchQuery: '',
			projectLead: null,
			teamMembers: []
		});
	}

	// Getter for state
	get store() {
		return this.state;
	}

	// Computed stats
	get stats() {
		return derived(this.state, ($state) => {
			const todoId = $state.columns.find((c) => c.name.toLowerCase() === 'to do')?.id;
			const inProgressId = $state.columns.find((c) => c.name.toLowerCase() === 'in progress')?.id;
			const doneId = $state.columns.find((c) => c.name.toLowerCase() === 'done')?.id;

			const todoCount = $state.tasks.filter((t) => t.column_id === todoId).length;
			const inProgressCount = $state.tasks.filter((t) => t.column_id === inProgressId).length;
			const doneCount = $state.tasks.filter((t) => t.column_id === doneId).length;
			const totalTasks = todoCount + inProgressCount + doneCount;
			const progressPercent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

			return {
				todoCount,
				inProgressCount,
				doneCount,
				totalTasks,
				progressPercent
			};
		});
	}

	// Filtered tasks based on search
	get filteredTasks() {
		return derived(this.state, ($state) => {
			if (!$state.searchQuery) return $state.tasks;

			const query = $state.searchQuery.toLowerCase();
			return $state.tasks.filter(
				(task) =>
					task.title.toLowerCase().includes(query) ||
					(task.description && task.description.toLowerCase().includes(query))
			);
		});
	}

	// Update state helper
	private updateState(updates: Partial<KanbanState>) {
		this.state.update((current) => ({ ...current, ...updates }));
	}

	/**
	 * Loads project members (lead and team) for a given projectId.
	 * Handles Supabase join result structure.
	 */
	async loadProjectMembers(projectId: string): Promise<ProjectMembersData> {
		try {
			if (DEBUG) console.log('🔍 Loading project members for project:', projectId);

			// Get project data with joined profile
			const { data: projectData, error: projectError } = await supabase
				.from('projects')
				.select(`created_by, profiles!projects_created_by_fkey(username)`) // profiles is usually an object
				.eq('id', projectId)
				.single();

			if (projectError || !projectData) {
				if (DEBUG) console.error('❌ Error fetching project data:', projectError);
				throw projectError;
			}

			if (DEBUG) console.log('✅ Project data loaded:', projectData);

			// Get project members with joined profile
			const { data: projectMembers, error: membersError } = await supabase
				.from('project_members')
				.select(`user_id, profiles!project_members_user_id_fkey(username), created_at`)
				.eq('project_id', projectId);

			if (membersError) {
				if (DEBUG) console.warn('⚠️ Error fetching project members:', membersError);
			}

			if (DEBUG) {
				console.log('📋 Project members raw data:', projectMembers);
				console.log('📋 Project members count:', projectMembers?.length || 0);
			}

			// Supabase join: profiles can be an array or object, normalize to object
			const getProfileUsername = (profile: any) => {
				if (!profile) return undefined;
				if (Array.isArray(profile)) return profile[0]?.username;
				return profile.username;
			};

			// Project lead username
			const projectLead = getProfileUsername(projectData.profiles) || 'Unknown Project Lead';
			if (DEBUG) console.log('👑 Project Lead:', projectLead);

			// Team members (exclude project lead)
			const teamMembers = (projectMembers || [])
				.filter((m) => {
					const username = getProfileUsername(m.profiles);
					const hasProfile = !!username;
					const isNotLead = m.user_id !== projectData.created_by;
					if (DEBUG)
						console.log(`🔍 Filtering member ${m.user_id}:`, { hasProfile, isNotLead, username });
					return hasProfile && isNotLead;
				})
				.map((m) => getProfileUsername(m.profiles))
				.filter((name) => name && name.trim() !== '');

			const uniqueTeamMembers = [...new Set(teamMembers)];
			if (DEBUG) console.log('✨ Unique team members:', uniqueTeamMembers);

			return {
				projectLead,
				teamMembers: uniqueTeamMembers
			};
		} catch (error) {
			if (DEBUG) console.error('💥 Error loading project members:', error);
			return {
				projectLead: 'Error loading leader',
				teamMembers: []
			};
		}
	}

	/**
	 * Loads all project data and members, updates state, and sets up realtime listeners.
	 */
	async loadProject(projectId: string) {
		if (!projectId) {
			this.resetProject();
			return;
		}

		const currentState = this.getCurrentState();
		if (currentState.loading && currentState.projectId === projectId) {
			return;
		}

		this.updateState({ loading: true, error: null, projectId });

		try {
			const { data, error } = await supabase.rpc('load_kanban_project', {
				project_id: projectId
			});

			if (error || !data) {
				throw error || new Error('RPC failed to load project');
			}

			const { project, columns, tasks, members, project_lead } = data;

			// Extract unique team members (exclude lead)
			const teamMembers = members
				.filter((m: any) => m.username && m.username !== project_lead)
				.map((m: any) => m.username);

			// Update state
			this.updateState({
				project,
				columns,
				tasks,
				profiles: members,
				projectLead: project_lead,
				teamMembers,
				loading: false
			});

			if (browser) {
				this.setupRealtimeListeners(projectId);
			}

			if (DEBUG) {
				console.log('Project loaded successfully:', project?.name);
				console.log('Project lead:', membersData.projectLead);
				console.log('Team members:', membersData.teamMembers);
			}
		} catch (error) {
			if (DEBUG) console.error('Error loading project:', error);
			const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data project';

			this.updateState({
				error: errorMessage,
				loading: false
			});

			if (browser) {
				notificationService.showError('Gagal memuat data project', errorMessage);
			}
		}
	}

	// Reset project state
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

	// Setup realtime listeners - only in browser
	private setupRealtimeListeners(projectId: string) {
		if (!browser) return;

		this.cleanupRealtimeListeners();

		try {
			const callbacks: RealtimeCallbacks = {
				onTaskInsert: (task) => {
					this.state.update((current) => ({
						...current,
						tasks: [...current.tasks, task]
					}));
				},
				onTaskUpdate: (task) => {
					this.state.update((current) => ({
						...current,
						tasks: current.tasks.map((t) => (t.id === task.id ? task : t))
					}));
				},
				onTaskDelete: (taskId) => {
					this.state.update((current) => ({
						...current,
						tasks: current.tasks.filter((t) => t.id !== taskId)
					}));
				},
				onColumnInsert: (column) => {
					this.state.update((current) => ({
						...current,
						columns: [...current.columns, column]
					}));
				},
				onColumnUpdate: (column) => {
					this.state.update((current) => ({
						...current,
						columns: current.columns.map((c) => (c.id === column.id ? column : c))
					}));
				},
				onColumnDelete: (columnId) => {
					this.state.update((current) => ({
						...current,
						columns: current.columns.filter((c) => c.id !== columnId),
						tasks: current.tasks.filter((t) => t.column_id !== columnId)
					}));
				},
				onProjectUpdate: (project) => {
					this.updateState({ project });
				}
			};

			this.realtimeManager = new RealtimeManager(projectId, callbacks);
			this.realtimeManager.setupAllListeners();
		} catch (error) {
			console.warn('Failed to setup realtime listeners:', error);
		}
	}

	// Cleanup realtime listeners
	private cleanupRealtimeListeners() {
		if (this.realtimeManager) {
			try {
				this.realtimeManager.cleanup();
				this.realtimeManager = null;
			} catch (error) {
				console.warn('Failed to cleanup realtime listeners:', error);
			}
		}
	}

	/**
	 * Create a new task in the current project.
	 * @param taskData Task data (without project_id)
	 */
	async createTask(taskData: Omit<TaskData, 'project_id'>) {
		try {
			const currentState = this.getCurrentState();
			if (!currentState.projectId) {
				throw new Error('Project ID tidak ditemukan');
			}

			// Ensure all required fields are present
			const requiredFields: (keyof Omit<TaskData, 'project_id'>)[] = [
				'title',
				'description',
				'column_id',
				'assigned_to',
				'created_by',
				'order'
			];
			for (const field of requiredFields) {
				if (!(field in taskData)) {
					throw new Error(`Field ${field} is required for creating a task.`);
				}
			}

			const fullTaskData: TaskData = {
				...taskData,
				project_id: currentState.projectId
			};

			const newTask = await tambahTask(fullTaskData);

			if (browser) {
				notificationService.taskCreated(newTask.title);
			}

			return newTask;
		} catch (error) {
			if (DEBUG) console.error('Error creating task:', error);
			const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan tugas';

			if (browser) {
				notificationService.showError('Gagal menambahkan tugas', errorMessage);
			}

			throw error;
		}
	}

	async updateTask(taskId: string, updates: TaskUpdateData) {
		try {
			const updatedTask = await editTask(taskId, updates);

			if (browser) {
				notificationService.taskUpdated(updatedTask.title);
			}

			return updatedTask;
		} catch (error) {
			console.error('Error updating task:', error);
			const errorMessage = error instanceof Error ? error.message : 'Gagal mengedit tugas';

			if (browser) {
				notificationService.showError('Gagal mengedit tugas', errorMessage);
			}

			throw error;
		}
	}

	async deleteTask(taskId: string) {
		try {
			const currentState = this.getCurrentState();
			const task = currentState.tasks.find((t) => t.id === taskId);

			await hapusTask(taskId);

			if (browser) {
				notificationService.taskDeleted(task?.title || 'Tugas');
			}
		} catch (error) {
			console.error('Error deleting task:', error);
			const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus tugas';

			if (browser) {
				notificationService.showError('Gagal menghapus tugas', errorMessage);
			}

			throw error;
		}
	}

	async moveTask(taskId: string, newColumnId: string) {
		try {
			const currentState = this.getCurrentState();
			const task = currentState.tasks.find((t) => t.id === taskId);
			const newColumn = currentState.columns.find((c) => c.id === newColumnId);

			if (!task || !newColumn) {
				throw new Error('Task atau kolom tidak ditemukan');
			}

			// Optimistic update
			this.state.update((current) => ({
				...current,
				tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, column_id: newColumnId } : t))
			}));

			await pindahTask(taskId, newColumnId);

			// Show appropriate notification
			if (browser) {
				const columnName = newColumn.name.toLowerCase();
				if (columnName === 'in progress') {
					notificationService.taskMovedToInProgress(task.title);
				} else if (columnName === 'done') {
					notificationService.taskCompleted(task.title);
				} else {
					notificationService.taskMoved(task.title, newColumn.name);
				}
			}
		} catch (error) {
			console.error('Error moving task:', error);
			// Revert optimistic update on error
			await this.loadProject(this.getCurrentState().projectId!);

			const errorMessage = error instanceof Error ? error.message : 'Gagal memindahkan tugas';

			if (browser) {
				notificationService.showError('Gagal memindahkan tugas', errorMessage);
			}

			throw error;
		}
	}

	// Project operations
	async archiveCurrentProject() {
		try {
			const currentState = this.getCurrentState();
			if (!currentState.project) {
				throw new Error('Tidak ada project yang aktif');
			}

			// Only show confirm dialog in browser
			if (browser) {
				const confirmed = confirm(
					`Apakah kamu yakin ingin mengarsipkan proyek "${currentState.project.name}"?`
				);
				if (!confirmed) return false;
			}

			await archiveProject(currentState.projectId!);

			if (browser) {
				notificationService.projectArchived(currentState.project.name);
			}

			this.resetProject();
			return true;
		} catch (error) {
			console.error('Error archiving project:', error);
			const errorMessage = error instanceof Error ? error.message : 'Gagal mengarsipkan proyek';

			if (browser) {
				notificationService.showError('Gagal mengarsipkan proyek', errorMessage);
			}

			throw error;
		}
	}

	// Search functionality
	updateSearchQuery(query: string) {
		this.updateState({ searchQuery: query });
	}

	// Helper methods
	getCurrentState(): KanbanState {
		let currentState: KanbanState;
		this.state.subscribe((state) => (currentState = state))();
		return currentState!;
	}

	findColumnByName(name: string): any | null {
		const currentState = this.getCurrentState();
		return (
			currentState.columns.find((col) => col.name.toLowerCase() === name.toLowerCase()) || null
		);
	}

	getTasksByColumn(columnId: string): any[] {
		const currentState = this.getCurrentState();
		return currentState.tasks.filter((task) => task.column_id === columnId);
	}

	// Cleanup
	destroy() {
		this.cleanupRealtimeListeners();
	}
}
