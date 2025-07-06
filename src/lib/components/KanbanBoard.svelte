<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { session } from '../stores/authStore';
	import { selectedProjectId, selectedProject } from '../stores/projectStore';
	import { goto } from '$app/navigation';

	// Components
	import AddTaskModal from '$lib/components/AddTaskModal.svelte';
	import EditTaskModal from '$lib/components/EditTaskModal.svelte';
	import EditProjectModal from '$lib/components/EditProjectModal.svelte';
	import Column from '$lib/components/Column.svelte';

	// Services - Fixed import path
	import { KanbanLogic } from '$lib/kanban-logic';
	import { handleError } from '$lib/errorHandler';

	export let projectId: string;
	export let projectLead;
	export let teamMembers: string[];

	// Initialize Kanban logic
	const kanban = new KanbanLogic();

	// Get stores from kanban - Fixed reactive approach
	const kanbanStore = kanban.store;
	const statsStore = kanban.stats;
	const filteredTasksStore = kanban.filteredTasks;

	// Extract state properties for easier access
	$: ({ project, columns, tasks, profiles, loading, error, searchQuery } = $kanbanStore);

	// Modal states
	let isAddModalOpen = false;
	let isEditModalOpen = false;
	let isEditProjectModalOpen = false;
	let selectedTask: any = null;
	let currentProjectId: string | null = null;

	// Update global stores when project changes
	$: if (project) {
		selectedProject.set(project);
	}

	// Load project when projectId changes - Fixed to prevent infinite loop
	$: if (projectId && projectId !== currentProjectId) {
		currentProjectId = projectId;
		kanban.loadProject(projectId);
	}

	// Modal handlers
	function openAddTaskModal() {
		const toDoColumn = kanban.findColumnByName('to do');
		if (toDoColumn) {
			isAddModalOpen = true;
		} else {
			handleError(new Error('Kolom "TO DO" tidak ditemukan'), 'menambahkan tugas');
		}
	}

	function openEditTaskModal(task: any) {
		selectedTask = task;
		isEditModalOpen = true;
	}

	function openEditProjectModal() {
		if (project) {
			isEditProjectModalOpen = true;
		} else {
			handleError(new Error('Project tidak ditemukan'), 'mengedit project');
		}
	}

	// Task handlers
	async function handleAddTask(event: CustomEvent) {
		const { title, description } = event.detail;

		if (!$session?.user) {
			handleError(new Error('Silakan login terlebih dahulu'), 'menambahkan tugas');
			return;
		}

		const toDoColumn = kanban.findColumnByName('to do');
		if (!toDoColumn) {
			handleError(new Error('Kolom "TO DO" tidak ditemukan'), 'menambahkan tugas');
			return;
		}

		try {
			await kanban.createTask({
				title,
				description,
				column_id: toDoColumn.id,
				assigned_to: $session.user.id,
				created_by: $session.user.id,
				order: 0
			});
		} catch (error) {
			handleError(error, 'menambahkan tugas');
		} finally {
			isAddModalOpen = false;
		}
	}

	async function handleEditTask(event: CustomEvent) {
		const { id, title, description, assigned_to, priority, due_date } = event.detail;

		try {
			await kanban.updateTask(id, {
				title,
				description,
				assigned_to,
				priority,
				due_date
			});
		} catch (error) {
			handleError(error, 'mengedit tugas');
		} finally {
			isEditModalOpen = false;
			selectedTask = null;
		}
	}

	async function handleDeleteTask(taskId: string) {
		const confirmed = confirm('Apakah kamu yakin ingin menghapus tugas ini?');
		if (!confirmed) return;

		try {
			await kanban.deleteTask(taskId);
		} catch (error) {
			handleError(error, 'menghapus tugas');
		}
	}

	async function handleMoveTask({ detail }) {
		const { id, toColumnId } = detail;

		try {
			await kanban.moveTask(id, toColumnId);
		} catch (error) {
			handleError(error, 'memindahkan tugas');
		}
	}

	// Project handlers
	async function handleArchiveProject() {
		try {
			const archived = await kanban.archiveCurrentProject();
			if (archived) {
				selectedProjectId.set(null);
				selectedProject.set(null);
				goto('/projects');
			}
		} catch (error) {
			handleError(error, 'mengarsipkan proyek');
		}
	}

	function handleProjectUpdated() {
		if (projectId) {
			kanban.loadProject(projectId);
		}
	}

	// Search handler
	function handleSearchChange(event: Event) {
		const target = event.target as HTMLInputElement;
		kanban.updateSearchQuery(target.value);
	}

	// Lifecycle
	onDestroy(() => {
		kanban.destroy();
	});
</script>

<div class="min-h-full text-gray-900 font-sans">
	{#if loading}
		<div class="flex justify-center items-center h-full">
			<p class="text-lg font-semibold text-gray-600">Loading Kanban board...</p>
		</div>
	{:else if error}
		<div class="flex justify-center items-center h-full">
			<p class="text-red-600 text-lg font-bold">Error: {error}</p>
		</div>
	{:else}
		<div class="flex justify-between items-center mb-6 flex-wrap gap-4">
			<h2 class="text-3xl font-bold text-gray-800">
				Project: {project?.name || 'Loading...'}
			</h2>
			{#if project?.status}
				<span
					class="inline-block px-3 py-1 text-xs font-semibold rounded-full
					{project.status === 'active' ? 'bg-green-100 text-green-800' : ''}
					{project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' : ''}
					{project.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
					{project.status === 'archived' ? 'bg-gray-200 text-gray-600' : ''}"
				>
					{project.status.replace('-', ' ').toUpperCase()}
				</span>
			{/if}
			<div class="flex flex-wrap gap-4">
				<input
					type="text"
					placeholder="Cari task berdasarkan judul..."
					value={searchQuery}
					on:input={handleSearchChange}
					class="w-full md:w-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
				/>
				<button
					on:click={openAddTaskModal}
					class="bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
				>
					+ Tambah Tugas Baru
				</button>
				<button
					on:click={openEditProjectModal}
					class="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
				>
					Edit Proyek
				</button>
				<button
					on:click={handleArchiveProject}
					class="bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
				>
					Arsipkan Proyek
				</button>
			</div>
		</div>
		<!-- ✨ Tambahan: Project Leader & Team -->
		<div class="mt-4 space-y-1">
			<p class="text-sm text-gray-700">
				<span class="font-semibold">Project Leader:</span>
				{projectLead}
			</p>
			<p class="text-sm text-gray-700">
				<span class="font-semibold">Project Team:</span>
				{#if teamMembers && teamMembers.length > 0}
					{#each teamMembers as member, i}
						<span>{member}{i < teamMembers.length - 1 ? ', ' : ''}</span>
					{/each}
				{:else}
					<span class="italic text-gray-500">Belum ada anggota</span>
				{/if}
			</p>
		</div>
		<!-- ✨ Selesai tambahan -->

		{#if project?.description}
			<p class="text-gray-600 text-lg mb-6">{project.description}</p>
		{/if}

		<!-- Display stats -->
		{#if $statsStore}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-blue-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-blue-600">To Do</h3>
					<p class="text-2xl font-bold text-blue-800">{$statsStore.todoCount}</p>
				</div>
				<div class="bg-yellow-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-yellow-600">In Progress</h3>
					<p class="text-2xl font-bold text-yellow-800">{$statsStore.inProgressCount}</p>
				</div>
				<div class="bg-green-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-green-600">Done</h3>
					<p class="text-2xl font-bold text-green-800">{$statsStore.doneCount}</p>
				</div>
				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-gray-600">Progress</h3>
					<p class="text-2xl font-bold text-gray-800">{$statsStore.progressPercent}%</p>
				</div>
			</div>
		{/if}

		<div class="flex gap-6 overflow-x-auto pb-6">
			{#each columns as column (column.id)}
				<Column
					{column}
					allColumns={columns}
					tasks={$filteredTasksStore.filter((t) => t.column_id === column.id)}
					on:edit={(e) => openEditTaskModal(e.detail)}
					on:delete={(e) => handleDeleteTask(e.detail)}
					on:move={handleMoveTask}
				/>
			{/each}
		</div>
	{/if}

	<AddTaskModal
		isOpen={isAddModalOpen}
		on:close={() => (isAddModalOpen = false)}
		on:submit={handleAddTask}
	/>

	<EditTaskModal
		isOpen={isEditModalOpen}
		task={selectedTask}
		allProfiles={profiles}
		on:close={() => (isEditModalOpen = false)}
		on:submit={handleEditTask}
	/>

	<EditProjectModal
		isOpen={isEditProjectModalOpen}
		on:close={() => (isEditProjectModalOpen = false)}
		on:projectUpdated={handleProjectUpdated}
	/>
</div>
