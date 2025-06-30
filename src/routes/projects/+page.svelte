<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/authStore';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { selectedProjectId } from '$lib/stores/projectStore';
	import { projectRefreshSignal } from '$lib/stores/refreshStore';

	let projects: any[] = [];
	let loading = true;
	let error: string | null = null;

	// --- Fungsi untuk mengambil daftar proyek ---
	async function fetchProjects() {
		loading = true;
		error = null;
		if (!$session?.user) {
			projects = [];
			loading = false;
			// Penting: Arahkan pengguna ke login jika belum ada sesi
			goto('/login');
			return;
		}

		const userId = $session.user.id;

		// PERBAIKAN: Query yang lebih sederhana dan benar
		// Asumsi: Kita hanya mengambil proyek yang dibuat oleh user yang sedang login
		const { data, error: fetchError } = await supabase
			.from('projects')
			.select('*')
			.eq('status', 'active')
			.eq('created_by', userId) // Cukup gunakan .eq() untuk filter ini
			.order('created_at', { ascending: false });

		if (fetchError) {
			console.error('Error fetching projects:', fetchError);
			error = 'Gagal memuat daftar proyek.';
			projects = [];
		} else {
			projects = data;
		}

		loading = false;
	}

	// --- Fungsi untuk memilih proyek dan pindah ke Kanban board ---
	function selectProject(projectId: string) {
		selectedProjectId.set(projectId); // Atur ID proyek yang dipilih di store
		goto('/'); // Arahkan ke halaman Kanban Board
	}

	// --- Muat data saat komponen dimuat atau sesi berubah ---
	onMount(() => {
		fetchProjects();
	});

	// Reactive statement untuk memuat ulang data saat sesi berubah
	$: if ($session?.user) {
		// Cek jika session berubah, muat ulang data
		fetchProjects();
	}

	$: ($projectRefreshSignal, fetchProjects());
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Daftar Proyek</h1>

	{#if loading}
		<p class="text-gray-500">Memuat daftar proyek...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if projects.length === 0}
		<p class="text-gray-500">Kamu belum memiliki proyek. Buat yang baru!</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each projects as project (project.id)}
				<div
					class="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer transform"
					on:click={() => selectProject(project.id)}
				>
					<h2 class="text-2xl font-bold text-gray-800 mb-2">{project.name}</h2>
					<p class="text-gray-600 text-sm mb-4">{project.description || 'Tidak ada deskripsi.'}</p>
					<div class="text-xs text-gray-500">
						Dibuat pada: {new Date(project.created_at).toLocaleDateString()}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
