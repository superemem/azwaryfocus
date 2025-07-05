<script lang="ts">
	import { supabase } from '$lib/supabase';
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

	export let projectId: string;

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

	$: if (projectId) {
		console.log('DEBUG: Project ID changed, loading data for:', projectId);
		loadProjectData(projectId);
	}

	async function loadProjectData(projectId: string) {
		if (!projectId) {
			console.log('DEBUG: No project ID provided to loadProjectData. Clearing board.');
			tasks = [];
			columns = [];
			$allTasks = [];
			$allColumns = [];
			loading = false;
			return;
		}

		loading = true;
		error = null;
		console.log(`DEBUG: Starting loadProjectData for projectId: ${projectId}`);

		const { data: projectData, error: projectError } = await supabase
			.from('projects')
			.select('id, name, description, status')
			.eq('id', projectId)
			.single();

		if (projectError) {
			console.error('DEBUG: Error fetching project data in KanbanBoard:', projectError);
			$selectedProject = null;
			columns = [];
			tasks = [];
			loading = false;
			return;
		}
		$selectedProject = projectData;
		console.log('DEBUG: Fetched project details:', projectData);

		const { data: columnsData, error: columnsError } = await supabase
			.from('columns')
			.select('*')
			.eq('project_id', projectId)
			.order('order', { ascending: true });

		if (columnsError) {
			console.error('DEBUG: Error fetching columns:', columnsError);
			error = 'Error fetching columns: ' + columnsError.message;
			loading = false;
			return;
		}
		columns = columnsData;
		$allColumns = columnsData; // Update global store juga
		console.log('DEBUG: Fetched columns:', columns.length, columnsData);

		const columnIdsForTasks = columns.map((col) => col.id); // Gunakan ID kolom yang baru saja diambil
		if (columnIdsForTasks.length === 0) {
			console.log('DEBUG: No columns found for this project. Tasks will be empty.');
			tasks = [];
			$allTasks = [];
			loading = false;
			return;
		}

		const { data: tasksData, error: tasksError } = await supabase
			.from('tasks')
			.select(
				'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
			)
			.in('column_id', columnIdsForTasks) // Gunakan ID kolom yang sudah difilter
			.order('order', { ascending: true });

		if (tasksError) {
			console.error('DEBUG: Error fetching tasks:', tasksError);
			error = 'Error fetching tasks: ' + tasksError.message;
			loading = false;
			return;
		}
		tasks = tasksData;
		$allTasks = tasksData; // Update global store juga
		console.log('DEBUG: Fetched tasks:', tasks.length, tasksData);

		const { data: profilesData, error: profilesError } = await supabase
			.from('profiles')
			.select('id, username')
			.order('username');

		if (profilesError) {
			console.error('DEBUG: Error fetching profiles:', profilesError);
		} else {
			profiles = profilesData;
			console.log('DEBUG: Fetched profiles:', profilesData.length);
		}

		loading = false;
		console.log('DEBUG: loadProjectData finished.');
	}

	// PERBAIKAN: Fungsi ini sekarang akan menggunakan array 'columns' lokal
	function findColumnIdByName(columnName: string) {
		console.log(`DEBUG: findColumnIdByName called for: ${columnName}`);
		console.log('DEBUG: Current local columns array:', columns);
		const column = columns.find((col) => col.name.toLowerCase() === columnName.toLowerCase());
		return column ? column.id : null;
	}

	function openModalForNewTask() {
		// Gunakan array 'columns' lokal
		const toDoColumn = columns.find((col) => col.name.toLowerCase() === 'to do');
		if (toDoColumn) {
			selectedColumnId = toDoColumn.id;
			isModalOpen = true;
		} else {
			alert('Kolom "TO DO" tidak ditemukan. Pastikan proyek memiliki kolom.');
			console.error('Cannot find "TO DO" column to add task to.');
		}
	}

	function openEditProjectModal() {
		if ($selectedProject) {
			isEditProjectModalOpen = true;
		} else {
			alert('Tidak ada proyek yang dipilih.');
		}
	}
	function handleMove({ detail }) {
		const { id, toColumnId } = detail;
		updateTaskColumn(id, toColumnId); // ini udah lo punya
	}

	async function archiveProject() {
		const projectName = $selectedProject?.name || 'Proyek ini';
		const confirmed = confirm(
			`Apakah kamu yakin ingin mengarsipkan proyek "${projectName}"? Proyek ini akan disembunyikan dari daftar.`
		);

		if (!confirmed) {
			return;
		}

		try {
			const { error: updateError } = await supabase
				.from('projects')
				.update({ status: 'archived' })
				.eq('id', $selectedProjectId);

			if (updateError) throw updateError;

			alert('Proyek berhasil diarsipkan!');
			selectedProjectId.set(null);
			selectedProject.set(null);
			goto('/projects'); // Arahkan ke halaman daftar proyek
		} catch (err) {
			console.error('Gagal mengarsipkan proyek:', err);
			alert('Gagal mengarsipkan proyek: ' + err.message);
		}
	}

	async function handleAddTask(event: CustomEvent) {
		const { title, description } = event.detail;

		if (!$session || !$session.user) {
			alert('Kamu harus login untuk menambah task.');
			return;
		}

		if (!selectedColumnId) {
			alert('Gagal menambah task: Kolom tujuan tidak ditemukan.');
			return;
		}

		const { data, error: insertError } = await supabase.from('tasks').insert({
			title: title,
			description: description,
			column_id: selectedColumnId,
			assigned_to: $session.user.id,
			created_by: $session.user.id,
			order: 0
		});

		if (insertError) {
			console.error('Error adding new task:', insertError);
			alert('Gagal menambah task. Cek konsol untuk detailnya.');
		} else {
			console.log('Task added successfully:', data);
			await loadProjectData(projectId); // Reload data setelah task ditambahkan
		}
		isModalOpen = false;
		selectedColumnId = undefined;
	}

	function openEditModal(task: any) {
		selectedTask = task;
		isEditModalOpen = true;
	}

	async function handleEditTask(event: CustomEvent) {
		const { id, title, description, assigned_to, priority, due_date } = event.detail;

		const { error: updateError } = await supabase
			.from('tasks')
			.update({ title, description, assigned_to, priority, due_date })
			.eq('id', id);

		if (updateError) {
			console.error('Error updating task:', updateError.message);
			alert('Gagal mengedit tugas: ' + updateError.message);
		} else {
			console.log('Task updated successfully:', { id, title, description, assigned_to });
			alert('Task berhasil diedit!');
			await loadProjectData(projectId);
		}
	}

	async function deleteTask(taskId: string) {
		const confirmed = confirm('Apakah kamu yakin ingin menghapus tugas ini?');
		if (!confirmed) return;

		const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);

		if (deleteError) {
			console.error('Error deleting task:', deleteError.message);
			alert('Gagal menghapus tugas: ' + deleteError.message);
		} else {
			console.log('Task deleted successfully.');
			await loadProjectData(projectId);
		}
	}

	async function updateTaskColumn(taskId: string, newColumnId: string) {
		const { error } = await supabase
			.from('tasks')
			.update({ column_id: newColumnId })
			.eq('id', taskId);

		if (error) {
			console.error('Error updating task:', error.message);
			alert('Gagal mengupdate tugas: ' + error.message);
		} else {
			// --- START OF CHANGES ---
			// 1. Update the local 'tasks' array directly
			tasks = tasks.map((task) =>
				task.id === taskId ? { ...task, column_id: newColumnId } : task
			);

			// 2. Update the global store (if you want other components to react)
			$allTasks = tasks;

			// 3. Display appropriate alerts based on the new column
			const newColumnName = columns.find((c) => c.id === newColumnId)?.name.toLowerCase();
			if (newColumnName === 'in progress') {
				alert('Selamat mengerjakan tugas. Semangat ya 🥳');
			} else if (newColumnName === 'done') {
				alert('Yeay, selamat kamu telah menyelesaikan tugas dengan baik 🎉');
			} else {
				alert('Tugas Telah Diupdate!');
			}

			// 4. Remove the full data reload:
			// await loadProjectData(projectId); // HAPUS BARIS INI
			// --- END OF CHANGES ---
		}
	}

	// Real-time listeners
	onMount(() => {
		const taskChannel = supabase.channel('public:tasks');
		taskChannel
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
				(payload) => {
					console.log('DEBUG: Real-time task change:', payload);
					loadProjectData(projectId);
				}
			)
			.subscribe();

		const columnChannel = supabase.channel('public:columns');
		columnChannel
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'columns', filter: `project_id=eq.${projectId}` },
				(payload) => {
					console.log('DEBUG: Real-time column change:', payload);
					loadProjectData(projectId);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(taskChannel);
			supabase.removeChannel(columnChannel);
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
					on:click={archiveProject}
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
					tasks={tasks.filter(
						(t) =>
							t.column_id === column.id && t.title.toLowerCase().includes(searchQuery.toLowerCase())
					)}
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
