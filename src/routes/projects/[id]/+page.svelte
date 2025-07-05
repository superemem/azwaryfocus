<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/authStore';
	import { selectedProjectId, selectedProject } from '$lib/stores/projectStore';
	// ✅ Hapus allColumns, allTasks dari sini jika KanbanBoard.svelte mengambilnya sendiri
	// import { allColumns, allTasks } from '$lib/stores/kanbanDataStore';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';

	// Terima data dari +page.server.ts
	export let data;

	// `loading` dan `error` di sini hanya untuk state awal +page.svelte
	// KanbanBoard.svelte akan punya loading/error statenya sendiri
	let loading = true;
	let error: string | null = null;

	// Ini bisa dihapus karena KanbanBoard.svelte akan memuat sendiri
	// let projectExists = false;

	// Set selectedProjectId dari URL segera setelah komponen diinisialisasi
	// Ini penting agar KanbanBoard.svelte mendapatkan projectId secepatnya
	$: {
		if (data.projectId) {
			selectedProjectId.set(data.projectId);
			// Selected project juga bisa diisi dari data server-side
			selectedProject.set(data.project);
		}
	}

	onMount(() => {
		// Cek jika project tidak berhasil dimuat di server-side
		if (!data.project || data.error) {
			// data.error akan ada jika page.server.ts melempar kitError
			error = data.error || 'Failed to load project.';
			loading = false;
			return;
		}

		// Tidak perlu set allColumns.set(data.columnsData) dan allTasks.set(data.tasksData) lagi
		// karena KanbanBoard.svelte akan memuatnya sendiri dan mengupdate stores itu.
		// Cukup pastikan selectedProjectId dan selectedProject terisi di store dari data loader

		loading = false; // Setelah memastikan data awal dimuat oleh server, nonaktifkan loading page
	});

	function goBackToProjects() {
		goto('/projects');
	}
</script>

<svelte:head>
	<title>{$selectedProject?.name || 'Project'} - Kanban Board</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<div
				class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
			></div>
			<p class="text-gray-600">Memuat proyek...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
				<h2 class="text-lg font-semibold mb-2">Error</h2>
				<p>{error}</p>
			</div>
			<button
				on:click={goBackToProjects}
				class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
			>
				← Kembali ke Proyek
			</button>
		</div>
	</div>
{:else if data.projectId}
	<div class="min-h-screen bg-gray-50">
		<div class="bg-white border-b border-gray-200 px-6 py-4">
			<nav class="flex items-center space-x-2 text-sm">
				<button on:click={goBackToProjects} class="text-blue-600 hover:text-blue-800 font-medium">
					Proyek
				</button>
				<span class="text-gray-400">/</span>
				<span class="text-gray-900 font-medium">
					{$selectedProject?.name || 'Memuat...'}
				</span>
			</nav>
		</div>

		<div class="p-6">
			<KanbanBoard projectId={data.projectId} />
		</div>
	</div>
{:else}
	<div class="flex justify-center items-center h-screen">
		<p class="text-xl text-gray-500">Proyek tidak ditemukan.</p>
	</div>
{/if}
