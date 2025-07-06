<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '../stores/authStore';
	import { selectedProjectId, selectedProject } from '../stores/projectStore';
	import { allTasks, allColumns } from '$lib/stores/kanbanDataStore';
	import AddTaskModal from '$lib/components/AddTaskModal.svelte';
	import EditTaskModal from '$lib/components/EditTaskModal.svelte';
	import EditProjectModal from '$lib/components/EditProjectModal.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import Column from '$lib/components/Column.svelte';
	import { goto } from '$app/navigation';
	import { toast, Toaster } from '$lib/toast';
	import confetti from 'canvas-confetti';
	import { handleError } from '$lib/errorHandler';

	// Import service functions
	import {
		tambahTask,
		editTask,
		hapusTask,
		pindahTask,
		loadFullProjectData,
		setupTaskListener,
		setupColumnListener,
		archiveProject
	} from '$lib/task-service';

	export let projectId: string;
	export let projectCreator: string;
	export let teamMembers: string[];

	let columns: any[] = [];
	let tasks: any[] = [];
	let profiles: any[] = [];
	let loading = true;
	let error: string | null = null;

	let isModalOpen = false;
	let selectedColumnId: string | undefined;

	let isEditModalOpen = false;
	let selectedTask: any = null;

	let searchQuery = '';
	let isEditProjectModalOpen = false;

	// Real-time listener cleanup functions
	let taskListenerCleanup: (() => void) | null = null;
	let columnListenerCleanup: (() => void) | null = null;

	$: if (projectId) {
		console.log('DEBUG: Project ID changed, loading data for:', projectId);
		loadProjectData(projectId);
	}

	// Computed values
	$: todoId = columns.find((c) => c.name.toLowerCase() === 'to do')?.id;
	$: inProgressId = columns.find((c) => c.name.toLowerCase() === 'in progress')?.id;
	$: doneId = columns.find((c) => c.name.toLowerCase() === 'done')?.id;

	$: todoCount = tasks.filter((t) => t.column_id === todoId).length;
	$: inProgressCount = tasks.filter((t) => t.column_id === inProgressId).length;
	$: doneCount = tasks.filter((t) => t.column_id === doneId).length;
	$: totalTasks = todoCount + inProgressCount + doneCount;
	$: progressPercent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

	// Filtered tasks based on search
	$: filteredTasks = tasks.filter(
		(task) =>
			task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			task.description.toLowerCase().includes(searchQuery.toLowerCase())
	);

	async function loadProjectData(projectId: string) {
		if (!projectId) {
			console.log('DEBUG: No project ID provided to loadProjectData. Clearing board.');
			resetBoardState();
			return;
		}

		loading = true;
		error = null;
		console.log(`DEBUG: Starting loadProjectData for projectId: ${projectId}`);

		try {
			// Use the service function for optimized data loading
			const {
				project,
				columns: columnsData,
				tasks: tasksData,
				profiles: profilesData
			} = await loadFullProjectData(projectId);

			// Update local state
			$selectedProject = project;
			columns = columnsData;
			tasks = tasksData;
			profiles = profilesData;

			// Update global stores
			$allColumns = columnsData;
			$allTasks = tasksData;

			console.log('DEBUG: Project data loaded successfully');
			console.log('- Project:', project);
			console.log('- Columns:', columnsData.length);
			console.log('- Tasks:', tasksData.length);
			console.log('- Profiles:', profilesData.length);

			// Setup real-time listeners
			setupRealtimeListeners();
		} catch (err) {
			console.error('DEBUG: Error loading project data:', err);
			error = err.message || 'Gagal memuat data project';
			handleError(err, 'memuat data project');
		} finally {
			loading = false;
		}
	}

	function resetBoardState() {
		tasks = [];
		columns = [];
		profiles = [];
		$allTasks = [];
		$allColumns = [];
		$selectedProject = null;
		loading = false;
		cleanupListeners();
	}

	function setupRealtimeListeners() {
		// Cleanup previous listeners
		cleanupListeners();

		// Setup task listener
		taskListenerCleanup = setupTaskListener(projectId, {
			onInsert: (task) => {
				console.log('Real-time: Task inserted', task);
				tasks = [...tasks, task];
				$allTasks = tasks;
			},
			onUpdate: (task) => {
				console.log('Real-time: Task updated', task);
				tasks = tasks.map((t) => (t.id === task.id ? task : t));
				$allTasks = tasks;
			},
			onDelete: (taskId) => {
				console.log('Real-time: Task deleted', taskId);
				tasks = tasks.filter((t) => t.id !== taskId);
				$allTasks = tasks;
			}
		});

		// Setup column listener
		columnListenerCleanup = setupColumnListener(projectId, {
			onInsert: (column) => {
				console.log('Real-time: Column inserted', column);
				columns = [...columns, column];
				$allColumns = columns;
			},
			onUpdate: (column) => {
				console.log('Real-time: Column updated', column);
				columns = columns.map((c) => (c.id === column.id ? column : c));
				$allColumns = columns;
			},
			onDelete: (columnId) => {
				console.log('Real-time: Column deleted', columnId);
				columns = columns.filter((c) => c.id !== columnId);
				// Also remove tasks from deleted column
				tasks = tasks.filter((t) => t.column_id !== columnId);
				$allColumns = columns;
				$allTasks = tasks;
			}
		});
	}

	function cleanupListeners() {
		if (taskListenerCleanup) {
			taskListenerCleanup();
			taskListenerCleanup = null;
		}
		if (columnListenerCleanup) {
			columnListenerCleanup();
			columnListenerCleanup = null;
		}
	}

	// Helper untuk celebration
	function celebratoryToast(message: string) {
		confetti({
			particleCount: 200,
			spread: 360,
			origin: { y: 0.6 }
		});

		const audio = new Audio('/notification.mp3');
		audio.play().catch(() => {
			// Ignore audio play errors
		});

		toast.success(message, {
			duration: 4000
		});
	}

	function findColumnIdByName(columnName: string) {
		console.log(`DEBUG: findColumnIdByName called for: ${columnName}`);
		const column = columns.find((col) => col.name.toLowerCase() === columnName.toLowerCase());
		return column ? column.id : null;
	}

	function openModalForNewTask() {
		const toDoColumn = columns.find((col) => col.name.toLowerCase() === 'to do');
		if (toDoColumn) {
			selectedColumnId = toDoColumn.id;
			isModalOpen = true;
		} else {
			handleError(new Error('Kolom "TO DO" tidak ditemukan'), 'menambahkan tugas');
		}
	}

	function openEditProjectModal() {
		if ($selectedProject) {
			isEditProjectModalOpen = true;
		} else {
			handleError(new Error('Project tidak ditemukan'), 'mengedit project');
		}
	}

	function handleMove({ detail }) {
		const { id, toColumnId } = detail;
		updateTaskColumn(id, toColumnId);
	}

	async function handleArchiveProject() {
		const projectName = $selectedProject?.name || 'Proyek ini';
		const confirmed = confirm(
			`Apakah kamu yakin ingin mengarsipkan proyek "${projectName}"? Proyek ini akan disembunyikan dari daftar.`
		);

		if (!confirmed) return;

		try {
			await archiveProject($selectedProjectId);
			toast.success('Proyek berhasil diarsipkan!');
			selectedProjectId.set(null);
			selectedProject.set(null);
			goto('/projects');
		} catch (err) {
			handleError(err, 'mengarsipkan proyek');
		}
	}

	async function handleAddTask(event: CustomEvent) {
		const { title, description } = event.detail;

		if (!$session?.user) {
			handleError(new Error('Silakan login terlebih dahulu'), 'menambahkan tugas');
			return;
		}

		if (!selectedColumnId) {
			handleError(new Error('Kolom tujuan tidak ditemukan'), 'menambahkan tugas');
			return;
		}

		try {
			const taskData = {
				title,
				description,
				column_id: selectedColumnId,
				assigned_to: $session.user.id,
				created_by: $session.user.id,
				project_id: projectId,
				order: 0
			};

			const newTask = await tambahTask(taskData);
			console.log('Task added successfully:', newTask);

			// The real-time listener will handle the UI update
			toast.success('Tugas berhasil ditambahkan!');
		} catch (err) {
			handleError(err, 'menambahkan tugas');
		} finally {
			isModalOpen = false;
			selectedColumnId = undefined;
		}
	}

	function openEditModal(task: any) {
		selectedTask = task;
		isEditModalOpen = true;
	}

	async function handleEditTask(event: CustomEvent) {
		const { id, title, description, assigned_to, priority, due_date } = event.detail;

		try {
			const updates = { title, description, assigned_to, priority, due_date };
			const updatedTask = await editTask(id, updates);
			console.log('Task updated successfully:', updatedTask);

			// The real-time listener will handle the UI update
			toast.success('Tugas berhasil diperbarui!');
		} catch (err) {
			handleError(err, 'mengedit tugas');
		} finally {
			isEditModalOpen = false;
			selectedTask = null;
		}
	}

	async function deleteTask(taskId: string) {
		const confirmed = confirm('Apakah kamu yakin ingin menghapus tugas ini?');
		if (!confirmed) return;

		try {
			await hapusTask(taskId);
			// The real-time listener will handle the UI update
			toast.success('Tugas berhasil dihapus!');
		} catch (err) {
			handleError(err, 'menghapus tugas');
		}
	}

	async function updateTaskColumn(taskId: string, newColumnId: string) {
		try {
			const updatedTask = await pindahTask(taskId, newColumnId);

			// Update local state immediately for better UX
			tasks = tasks.map((task) =>
				task.id === taskId ? { ...task, column_id: newColumnId } : task
			);
			$allTasks = tasks;

			// Show appropriate celebration based on new column
			const newColName = columns.find((c) => c.id === newColumnId)?.name.toLowerCase();
			if (newColName === 'in progress') {
				celebratoryToast('Selamat Bekerja!\nGanbatte!🥳');
			} else if (newColName === 'done') {
				celebratoryToast('Yeay, tugas Kamu selesai!\nJangan lupa istirahat sejanak ya🎉');
			} else {
				toast.success('Tugas berhasil dipindahkan!');
			}
		} catch (err) {
			handleError(err, 'memindahkan tugas');
		}
	}

	// Cleanup on destroy
	onMount(() => {
		return () => {
			cleanupListeners();
		};
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
				Project: {$selectedProject?.name || 'Loading...'}
			</h2>
			{#if $selectedProject?.status}
				<span
					class="inline-block px-3 py-1 text-xs font-semibold rounded-full
					{$selectedProject.status === 'active' ? 'bg-green-100 text-green-800' : ''}
					{$selectedProject.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' : ''}
					{$selectedProject.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
					{$selectedProject.status === 'archived' ? 'bg-gray-200 text-gray-600' : ''}"
				>
					{$selectedProject.status.replace('-', ' ').toUpperCase()}
				</span>
			{/if}
			<div class="flex flex-wrap gap-4">
				<input
					type="text"
					placeholder="Cari task berdasarkan judul..."
					bind:value={searchQuery}
					class="w-full md:w-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
				/>
				<button
					on:click={openModalForNewTask}
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

		{#if $selectedProject?.description}
			<p class="text-gray-600 text-lg mb-6">{$selectedProject.description}</p>
		{/if}

		<div class="flex gap-6 overflow-x-auto pb-6">
			{#each columns as column (column.id)}
				<Column
					{column}
					allColumns={columns}
					tasks={filteredTasks.filter((t) => t.column_id === column.id)}
					on:edit={(e) => openEditModal(e.detail)}
					on:delete={(e) => deleteTask(e.detail)}
					on:move={handleMove}
				/>
			{/each}
		</div>
	{/if}

	<AddTaskModal
		isOpen={isModalOpen}
		on:close={() => (isModalOpen = false)}
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
		on:projectUpdated={() => {
			loadProjectData(projectId);
		}}
	/>
</div>
