<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { kanbanLogic } from '$lib/kanban-logic';
	import type { Session } from '@supabase/supabase-js';
	import toast from 'svelte-5-french-toast';

	// Komponen Anak & Ikon
	import AddTaskModal from '$lib/components/AddTaskModal.svelte';
	import EditTaskModal from '$lib/components/EditTaskModal.svelte';
	import EditProjectModal from '$lib/components/EditProjectModal.svelte';
	import Column from '$lib/components/Column.svelte';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	// 1. TERIMA PROPS
	let { projectId, session, profile } = $props<{
		projectId: string;
		session: Session | null;
		profile: any | null;
	}>();

	// 2. AMBIL STORE DARI KANBANLOGIC
	const projectStore = kanbanLogic.project;
	const columns = kanbanLogic.columns;
	const profiles = kanbanLogic.profiles;
	const loading = kanbanLogic.loading;
	const error = kanbanLogic.error;
	const projectLead = kanbanLogic.projectLead;
	const teamMembers = kanbanLogic.teamMembers;
	const stats = kanbanLogic.stats;
	const filteredTasks = kanbanLogic.filteredTasks;

	// 3. STATE LOKAL UNTUK UI & TAMPILAN ADAPTIF
	let isAddModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isEditProjectModalOpen = $state(false);
	let selectedTask = $state<any>(null);
	let searchQuery = $state('');
	let isDesktop = $state(true); // Default ke desktop
	let activeColumnIndex = $state(0); // Indeks kolom yang aktif di mobile

	// 4. EFFECTS & LIFECYCLE
	$effect(() => {
		if (projectId) kanbanLogic.loadProject(projectId);
	});
	$effect(() => {
		kanbanLogic.updateSearchQuery(searchQuery);
	});
	onDestroy(() => {
		kanbanLogic.destroy();
	});

	onMount(() => {
		const checkScreenSize = () => {
			isDesktop = window.innerWidth >= 768; // Breakpoint md
		};
		checkScreenSize();
		window.addEventListener('resize', checkScreenSize);
		return () => window.removeEventListener('resize', checkScreenSize);
	});

	// 5. HANDLERS
	function openEditTaskModal(task: any) {
		selectedTask = task;
		isEditModalOpen = true;
	}

	function handleDataRefresh() {
		if (projectId) kanbanLogic.loadProject(projectId);
	}

	// Navigasi kolom di mobile
	function nextColumn() {
		if ($columns && activeColumnIndex < $columns.length - 1) {
			activeColumnIndex++;
		}
	}
	function prevColumn() {
		if (activeColumnIndex > 0) {
			activeColumnIndex--;
		}
	}

	// Handler lain...
	async function handleAddTask(event: CustomEvent) {
		if (!session?.user) return toast.error('Sesi tidak valid.');
		const toDoColumn = kanbanLogic.findColumnByName('to do');
		if (!toDoColumn) return toast.error('Kolom "To Do" tidak ditemukan.');
		try {
			await kanbanLogic.createTask({
				...event.detail,
				column_id: toDoColumn.id,
				created_by: session.user.id,
				order: 0
			});
		} catch (e: any) {
			toast.error(`Gagal: ${e.message}`);
		} finally {
			isAddModalOpen = false;
		}
	}
	async function handleEditTask(event: CustomEvent) {
		const { id, updates } = event.detail;
		try {
			await kanbanLogic.updateTask(id, updates);
		} catch (e: any) {
			toast.error(`Gagal: ${e.message}`);
		} finally {
			isEditModalOpen = false;
		}
	}
	async function handleDeleteTask(task: any) {
		if (confirm(`Hapus tugas "${task.title}"?`)) {
			await kanbanLogic.deleteTask(task.id);
		}
	}
	async function handleMoveTask({ detail }: CustomEvent) {
		await kanbanLogic.moveTask(detail.id, detail.toColumnId);
	}
	async function handleArchiveProject() {
		const archived = await kanbanLogic.archiveCurrentProject();
		if (archived) goto('/projects');
	}
</script>

<div class="min-h-full text-gray-900 font-sans">
	{#if $loading}
		<div class="flex justify-center items-center h-full pt-20">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
				<p class="mt-4 text-lg font-semibold text-gray-600">Memuat Papan Kanban...</p>
			</div>
		</div>
	{:else if $error}
		<div class="flex justify-center items-center h-full pt-20">
			<div class="text-center p-6 bg-red-50 rounded-lg">
				<p class="text-red-600 text-lg font-bold">Error: {$error}</p>
				<button
					on:click={() => goto('/projects')}
					class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
				>
					Kembali ke Daftar Proyek
				</button>
			</div>
		</div>
	{:else}
		<div class="flex justify-between items-center mb-6 flex-wrap gap-4">
			<h2 class="text-3xl font-bold text-gray-800">
				{$projectStore?.name || 'Memuat Nama Proyek...'}
			</h2>
			{#if $projectStore?.status}
				<span
					class="inline-block px-3 py-1 text-xs font-semibold rounded-full
                    {$projectStore.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    {$projectStore.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' : ''}
                    {$projectStore.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                    {$projectStore.status === 'archived' ? 'bg-gray-200 text-gray-600' : ''}"
				>
					{$projectStore.status.replace('-', ' ').toUpperCase()}
				</span>
			{/if}
			<div class="flex flex-wrap gap-4">
				<input
					type="text"
					placeholder="Cari task..."
					bind:value={searchQuery}
					class="w-full md:w-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
				/>
				<button
					on:click={() => (isAddModalOpen = true)}
					class="bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-emerald-700"
				>
					+ Tambah Tugas
				</button>
				<button
					on:click={() => (isEditProjectModalOpen = true)}
					class="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-700"
				>
					Edit Proyek
				</button>
				<button
					on:click={handleArchiveProject}
					class="bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-gray-700"
				>
					Arsipkan
				</button>
			</div>
		</div>

		<div class="mt-4 space-y-1">
			<p class="text-sm text-gray-700">
				<span class="font-semibold">Project Leader:</span>
				{$projectLead || 'Memuat...'}
			</p>
			<p class="text-sm text-gray-700">
				<span class="font-semibold">Tim Proyek:</span>
				{#if $teamMembers && $teamMembers.length > 0}
					{$teamMembers.join(', ')}
				{:else}
					<span class="italic text-gray-500"
						>{$projectLead ? 'Belum ada anggota tim' : 'Memuat...'}</span
					>
				{/if}
			</p>
		</div>

		{#if $projectStore?.description}
			<p class="text-gray-600 text-lg my-6 bg-gray-50 p-4 rounded-lg">
				{$projectStore.description}
			</p>
		{/if}

		{#if $stats}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-blue-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-blue-600">To Do</h3>
					<p class="text-2xl font-bold text-blue-800">{$stats.todoCount}</p>
				</div>
				<div class="bg-yellow-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-yellow-600">In Progress</h3>
					<p class="text-2xl font-bold text-yellow-800">{$stats.inProgressCount}</p>
				</div>
				<div class="bg-green-50 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-green-600">Done</h3>
					<p class="text-2xl font-bold text-green-800">{$stats.doneCount}</p>
				</div>
				<div class="bg-gray-100 p-4 rounded-lg">
					<h3 class="text-sm font-semibold text-gray-600">Progress</h3>
					<p class="text-2xl font-bold text-gray-800">{$stats.progressPercent}%</p>
				</div>
			</div>
		{/if}

		<!-- TAMPILAN KANBAN YANG ADAPTIF -->
		{#if isDesktop}
			<div class="flex gap-6 overflow-x-auto pb-6">
				{#each $columns as column (column.id)}
					<Column
						{column}
						allColumns={$columns}
						tasks={($filteredTasks ?? []).filter((t) => t.column_id === column.id)}
						on:edit={(e) => openEditTaskModal(e.detail)}
						on:delete={(e) => handleDeleteTask(e.detail)}
						on:move={handleMoveTask}
					/>
				{/each}
			</div>
		{:else}
			<div class="w-full">
				{#if $columns && $columns.length > 0}
					{@const activeColumn = $columns[activeColumnIndex]}
					<div class="flex items-center justify-between mb-4">
						<button
							on:click={prevColumn}
							disabled={activeColumnIndex === 0}
							class="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-30"
							aria-label="Kolom Sebelumnya"
						>
							<ChevronLeft size={24} />
						</button>
						<div class="text-center">
							<h3 class="font-bold text-lg text-gray-700 uppercase">{activeColumn?.name}</h3>
							<p class="text-sm text-gray-500">
								({($filteredTasks ?? []).filter((t) => t.column_id === activeColumn?.id).length} tugas)
							</p>
						</div>
						<button
							on:click={nextColumn}
							disabled={activeColumnIndex >= $columns.length - 1}
							class="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-30"
							aria-label="Kolom Berikutnya"
						>
							<ChevronRight size={24} />
						</button>
					</div>
					<Column
						column={activeColumn}
						allColumns={$columns}
						tasks={($filteredTasks ?? []).filter((t) => t.column_id === activeColumn.id)}
						on:edit={(e) => openEditTaskModal(e.detail)}
						on:delete={(e) => handleDeleteTask(e.detail)}
						on:move={handleMoveTask}
					/>
				{:else}
					<p class="text-center text-gray-500 py-10">Proyek ini belum memiliki kolom.</p>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Modals -->
	<AddTaskModal
		isOpen={isAddModalOpen}
		{session}
		{profile}
		allProfiles={$profiles}
		on:close={() => (isAddModalOpen = false)}
		on:submit={handleAddTask}
	/>
	<EditTaskModal
		isOpen={isEditModalOpen}
		task={selectedTask}
		{session}
		allProfiles={$profiles}
		on:close={() => (isEditModalOpen = false)}
		on:submit={handleEditTask}
	/>
	<EditProjectModal
		isOpen={isEditProjectModalOpen}
		{session}
		project={$projectStore}
		on:close={() => (isEditProjectModalOpen = false)}
		on:projectUpdated={handleDataRefresh}
		on:membersUpdated={handleDataRefresh}
	/>
</div>
