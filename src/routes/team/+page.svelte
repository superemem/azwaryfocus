<script lang="ts">
	import type { PageData } from './$types';

	// 1. TERIMA DATA DARI SERVER
	// Tidak ada lagi onMount, tidak ada lagi store, tidak ada lagi fetch.
	let { data } = $props<PageData>();
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Statistik Tim</h1>

	{#if data.teamMembers.length === 0}
		<div class="text-center py-16">
			<p class="text-gray-500 text-lg">Tidak ada anggota tim yang ditemukan.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
			{#each data.teamMembers as member (member.id)}
				<div
					class="bg-white p-6 rounded-xl shadow-md text-center transition hover:shadow-xl hover:-translate-y-1"
				>
					{#if member.avatar_url}
						<img
							src={member.avatar_url}
							alt="avatar"
							class="w-24 h-24 rounded-full mb-4 mx-auto object-cover border-4 border-gray-200"
						/>
					{:else}
						<div
							class="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-4xl font-bold text-purple-600 mb-4 mx-auto"
						>
							{member.username?.charAt(0)?.toUpperCase() || 'U'}
						</div>
					{/if}

					<h2 class="text-xl font-bold text-gray-900">{member.username || 'Tanpa Nama'}</h2>
					<p class="text-sm text-gray-500 italic mb-4">
						{member.job_title || 'Belum ada jabatan'}
					</p>
					<div class="space-y-2 text-left border-t pt-4">
						<div class="flex justify-between text-sm">
							<span class="text-gray-600">Total Proyek:</span>
							<span class="font-semibold text-gray-800">{member.projectCount}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-600">Tugas Selesai:</span>
							<span class="font-semibold text-green-600">{member.doneTaskCount}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
