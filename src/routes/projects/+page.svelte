<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	// Data datang dari +layout.svelte, yang menerimanya dari +layout.server.ts
	// Tidak ada lagi fetch, tidak ada lagi onMount, tidak ada lagi store lama.
	let { data } = $props<PageData>();

	function selectProject(projectId: string) {
		goto(`/projects/${projectId}`);
	}
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Daftar Proyek</h1>

	{#if data.projects.length === 0}
		<p class="text-gray-500">Kamu belum memiliki proyek. Buat yang baru di sidebar!</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.projects as project (project.id)}
				<div
					class="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer transform"
					on:click={() => selectProject(project.id)}
					role="button"
					tabindex="0"
					on:keydown={(e) => e.key === 'Enter' && selectProject(project.id)}
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
							>
								{project.status.charAt(0).toUpperCase() + project.status.slice(1)}
							</span>
						{/if}

						<!-- Cek kepemilikan menggunakan data.session yang sudah pasti ada -->
						{#if data.session && project.created_by === data.session.user.id}
							<span
								class="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold"
								>Owner</span
							>
						{:else}
							<span class="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-semibold"
								>Member</span
							>
						{/if}
					</div>

					<!-- Deskripsi -->
					<p class="text-gray-600 text-sm mb-3">
						{project.description || 'Tidak ada deskripsi.'}
					</p>

					<!-- Footer -->
					<div class="text-xs text-gray-500 mt-2">
						Dibuat pada: {new Date(project.created_at).toLocaleDateString('id-ID')}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
