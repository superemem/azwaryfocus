// src/lib/services/realtime-service.ts
import type { SupabaseClient } from '@supabase/supabase-js';

// Interface tidak berubah
export interface RealtimeCallbacks {
	onTaskInsert?: (task: any) => void;
	onTaskUpdate?: (task: any) => void;
	onTaskDelete?: (taskId: string) => void;
	onColumnInsert?: (column: any) => void;
	onColumnUpdate?: (column: any) => void;
	onColumnDelete?: (columnId: string) => void;
	onProjectUpdate?: (project: any) => void;
}

export class RealtimeManager {
	private supabase: SupabaseClient; // <-- Simpan client yang benar di sini
	private taskChannel: any = null;
	private columnChannel: any = null;
	private projectChannel: any = null;
	private projectId: string;
	private callbacks: RealtimeCallbacks;

	// Constructor sekarang menerima client Supabase yang sudah login
	constructor(projectId: string, callbacks: RealtimeCallbacks, supabase: SupabaseClient) {
		this.projectId = projectId;
		this.callbacks = callbacks;
		this.supabase = supabase; // <-- Simpan client-nya
	}

	// Semua fungsi di bawah ini sekarang menggunakan `this.supabase`
	setupTaskListener() {
		if (this.taskChannel) {
			this.supabase.removeChannel(this.taskChannel);
		}

		this.taskChannel = this.supabase.channel(`public:tasks:project_id=eq.${this.projectId}`);

		this.taskChannel
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'tasks',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Task inserted', payload.new);
					this.callbacks.onTaskInsert?.(payload.new);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'tasks',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Task updated', payload.new);
					this.callbacks.onTaskUpdate?.(payload.new);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'tasks',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Task deleted', payload.old.id);
					this.callbacks.onTaskDelete?.(payload.old.id);
				}
			)
			.subscribe();
	}

	setupColumnListener() {
		if (this.columnChannel) {
			this.supabase.removeChannel(this.columnChannel);
		}

		this.columnChannel = this.supabase.channel(`public:columns:project_id=eq.${this.projectId}`);

		this.columnChannel
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'columns',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Column inserted', payload.new);
					this.callbacks.onColumnInsert?.(payload.new);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'columns',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Column updated', payload.new);
					this.callbacks.onColumnUpdate?.(payload.new);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'columns',
					filter: `project_id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Column deleted', payload.old.id);
					this.callbacks.onColumnDelete?.(payload.old.id);
				}
			)
			.subscribe();
	}

	setupProjectListener() {
		if (this.projectChannel) {
			this.supabase.removeChannel(this.projectChannel);
		}

		this.projectChannel = this.supabase.channel(`public:projects:id=eq.${this.projectId}`);

		this.projectChannel
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'projects',
					filter: `id=eq.${this.projectId}`
				},
				(payload) => {
					console.log('Real-time: Project updated', payload.new);
					this.callbacks.onProjectUpdate?.(payload.new);
				}
			)
			.subscribe();
	}

	setupAllListeners() {
		this.setupTaskListener();
		this.setupColumnListener();
		this.setupProjectListener();
	}

	cleanup() {
		if (this.taskChannel) {
			this.supabase.removeChannel(this.taskChannel);
			this.taskChannel = null;
		}
		if (this.columnChannel) {
			this.supabase.removeChannel(this.columnChannel);
			this.columnChannel = null;
		}
		if (this.projectChannel) {
			this.supabase.removeChannel(this.projectChannel);
			this.projectChannel = null;
		}
	}

	updateProjectId(newProjectId: string) {
		this.cleanup();
		this.projectId = newProjectId;
		this.setupAllListeners();
	}
}
