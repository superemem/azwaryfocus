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

	async function fetchProjects() {
		loading = true;
		error = null;
		if (!$session?.user) {
			projects = [];
			loading = false;
			goto('/login');
			return;
		}

		const { data, error: fetchError } = await supabase
			.from('projects')
			.select(
				`
				id,
				name,
				description,
				status,
				created_at,
				created_by,
				creator:profiles!projects_created_by_fkey (
					username
				)
			`
			)
			.neq('status', 'archived') // Tampilkan semua kecuali yang diarsip
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

	function selectProject(projectId: string) {
		selectedProjectId.set(projectId);
		goto('/app');
	}

	onMount(() => {
		fetchProjects();
	});

	$: if ($session?.user) {
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
					<!-- Nama Proyek -->
					<h2 class="text-2xl font-bold text-gray-800 mb-1">{project.name}</h2>

					<!-- Status Project & Role -->
					<div class="flex items-center gap-2 mb-2">
						{#if project.status}
							<span
								class="text-xs px-3 py-1 rounded-full font-semibold"
								class:bg-green-100={project.status === 'active'}
								class:text-green-800={project.status === 'active'}
								class:bg-yellow-100={project.status === 'on-hold'}
								class:text-yellow-800={project.status === 'on-hold'}
								class:bg-blue-100={project.status === 'completed'}
								class:text-blue-800={project.status === 'completed'}
								class:bg-gray-100={project.status === 'archived'}
								class:text-gray-700={project.status === 'archived'}
							>
								{project.status.charAt(0).toUpperCase() + project.status.slice(1)}
							</span>
						{/if}

						{#if project.created_by === $session.user.id}
							<span
								class="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold"
								>Owner</span
							>
						{:else}
							<span class="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-semibold"
								>Invited</span
							>
						{/if}
					</div>

					<!-- Deskripsi -->
					<p class="text-gray-600 text-sm mb-3">
						{project.description || 'Tidak ada deskripsi.'}
					</p>

					<!-- Footer -->
					<div class="text-xs text-gray-500 mt-2">
						Dibuat oleh: {project.creator?.username || 'Tidak diketahui'}<br />
						Pada: {new Date(project.created_at).toLocaleDateString()}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
