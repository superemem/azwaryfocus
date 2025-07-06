// $lib/services/realtime-service.ts
import { supabase } from '$lib/supabase';

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
	private taskChannel: any = null;
	private columnChannel: any = null;
	private projectChannel: any = null;
	private projectId: string;
	private callbacks: RealtimeCallbacks;

	constructor(projectId: string, callbacks: RealtimeCallbacks) {
		this.projectId = projectId;
		this.callbacks = callbacks;
	}

	setupTaskListener() {
		if (this.taskChannel) {
			supabase.removeChannel(this.taskChannel);
		}

		this.taskChannel = supabase.channel(`public:tasks:project_id=eq.${this.projectId}`);

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
			supabase.removeChannel(this.columnChannel);
		}

		this.columnChannel = supabase.channel(`public:columns:project_id=eq.${this.projectId}`);

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
			supabase.removeChannel(this.projectChannel);
		}

		this.projectChannel = supabase.channel(`public:projects:id=eq.${this.projectId}`);

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
			supabase.removeChannel(this.taskChannel);
			this.taskChannel = null;
		}
		if (this.columnChannel) {
			supabase.removeChannel(this.columnChannel);
			this.columnChannel = null;
		}
		if (this.projectChannel) {
			supabase.removeChannel(this.projectChannel);
			this.projectChannel = null;
		}
	}

	updateProjectId(newProjectId: string) {
		this.cleanup();
		this.projectId = newProjectId;
		this.setupAllListeners();
	}
}
