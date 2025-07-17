<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data } = $props<PageData>();

	// Helper function untuk status styling
	function getStatusClass(status: string) {
		const statusMap = {
			active: 'bg-green-100 text-green-800',
			'on-hold': 'bg-yellow-100 text-yellow-800',
			completed: 'bg-blue-100 text-blue-800'
		};
		return statusMap[status as keyof typeof statusMap] || 'bg-gray-100 text-gray-800';
	}

	// Helper function untuk format tanggal yang lebih readable
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return `${diffDays} hari yang lalu`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`;

		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function selectProject(projectId: string) {
		goto(`/projects/${projectId}`);
	}

	// Keyboard navigation handler
	function handleKeydown(e: KeyboardEvent, projectId: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectProject(projectId);
		}
	}
</script>

<div class="p-8 max-w-7xl mx-auto">
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-800 mb-2">Daftar Project</h1>
		<p class="text-gray-600">
			Ini adalah daftar project Kamu saat ini. Jangan lupa cek tugas-tugas Kamu di masing-masing
			project ya 🥰
		</p>
	</div>

	{#if data.projects.length === 0}
		<div class="text-center py-16">
			<div class="mb-4">
				<svg
					class="w-16 h-16 text-gray-400 mx-auto"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
			</div>
			<h3 class="text-xl font-semibold text-gray-800 mb-2">Belum ada proyek</h3>
			<p class="text-gray-500 mb-4">Mulai dengan membuat proyek pertama kamu</p>
			<button
				class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
			>
				Buat Proyek Baru
			</button>
		</div>
	{:else}
		<!-- Project count dan filter bisa ditambahkan di sini -->
		<div class="mb-6 flex justify-between items-center">
			<p class="text-sm text-gray-600">
				Menampilkan {data.projects.length} proyek
			</p>
			<!-- TODO: Tambahkan filter/sort controls di sini -->
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each data.projects as project (project.id)}
				<article
					class="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all duration-200 cursor-pointer group"
					on:click={() => selectProject(project.id)}
					role="button"
					tabindex="0"
					on:keydown={(e) => handleKeydown(e, project.id)}
					aria-label="Buka proyek {project.name}"
				>
					<!-- Header dengan nama dan status -->
					<div class="mb-4">
						<h2
							class="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2"
						>
							{project.name}
						</h2>

						<div class="flex items-center gap-2 flex-wrap">
							{#if project.status}
								<span
									class="text-xs px-3 py-1 rounded-full font-semibold {getStatusClass(
										project.status
									)}"
								>
									{project.status === 'on-hold'
										? 'On Hold'
										: project.status.charAt(0).toUpperCase() + project.status.slice(1)}
								</span>
							{/if}

							<!-- Role badge -->
							{#if data.session && project.created_by === data.session.user.id}
								<span
									class="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold"
								>
									Owner
								</span>
							{:else}
								<span
									class="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-semibold"
								>
									Member
								</span>
							{/if}
						</div>
					</div>

					<!-- Deskripsi -->
					<p class="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
						{project.description || 'Tidak ada deskripsi tersedia.'}
					</p>

					<!-- Footer dengan tanggal -->
					<div class="mt-auto pt-4 border-t border-gray-100">
						<div class="flex items-center justify-between text-xs text-gray-500">
							<span>Dibuat {formatDate(project.created_at)}</span>
							<!-- Bisa ditambahkan info lain seperti jumlah task, member, dll -->
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
