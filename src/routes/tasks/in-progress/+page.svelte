<script lang="ts">
	import type { PageData } from './$types';

	// 1. TERIMA DATA DARI SERVER
	// Tidak ada lagi onMount, tidak ada lagi store, tidak ada lagi fetch.
	let { data } = $props<PageData>();
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Tugas Dikerjakan</h1>

	{#if data.tasks.length === 0}
		<div class="text-center py-16">
			<p class="text-gray-500 text-lg">👍 Kerja bagus! Tidak ada tugas yang sedang dikerjakan.</p>
			<p class="text-gray-400">Cek daftar rencanamu untuk memulai tugas baru.</p>
		</div>
	{:else}
		<ul class="space-y-4">
			{#each data.tasks as task (task.id)}
				<li
					class="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500 transition hover:shadow-lg"
				>
					<h2 class="font-bold text-xl text-gray-800">{task.title}</h2>
					{#if task.description}
						<p class="text-gray-600 mt-1">{task.description}</p>
					{/if}
					<div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
						<span>
							<strong>Prioritas:</strong>
							<span
								class="font-semibold"
								class:text-red-600={task.priority === 'High'}
								class:text-yellow-600={task.priority === 'Medium'}
								class:text-blue-600={task.priority === 'Low'}
							>
								{task.priority || '-'}
							</span>
						</span>
						<span>
							<strong>Deadline:</strong>
							{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
						</span>
						<span>
							<strong>Dibuat oleh:</strong>
							{task.created_by_profile?.username || 'Tidak Diketahui'}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
