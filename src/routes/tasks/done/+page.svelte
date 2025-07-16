<!-- File: src/routes/tasks/done/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { Flag, Folder, Calendar } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { data } = $props<PageData>();

	// State untuk menyimpan tanggal yang dipilih di filter
	let dateFrom = $state(data.dateFrom);
	let dateTo = $state(data.dateTo);

	// Fungsi untuk memfilter tugas saat tombol diklik
	function applyDateFilter() {
		// Arahkan ke URL yang sama dengan parameter tanggal baru
		goto(`/tasks/done?from=${dateFrom}&to=${dateTo}`);
	}
</script>

<div class="p-8 max-w-7xl mx-auto">
	<!-- Pesan Motivasi Baru -->
	<div class="bg-purple-50 border-l-4 border-purple-500 text-purple-800 p-6 rounded-lg mb-8">
		<h2 class="font-bold text-xl">Kerja Bagus, {data.profile?.username || 'Kawan'}!</h2>
		<p class="mt-1">
			Terima kasih sudah bekerja keras. Ini adalah rekap tugas-tugas yang berhasil Kamu selesaikan.
			Jangan lupa istirahat yang cukup ya!
		</p>
	</div>

	<!-- Filter Tanggal Baru -->
	<div class="flex justify-between items-center mb-6 flex-wrap gap-4">
		<h1 class="text-3xl font-bold text-gray-800">Tugas Selesai</h1>
		<div class="flex items-center gap-4 bg-gray-100 p-3 rounded-lg">
			<label for="date-from" class="text-sm font-medium text-gray-600">Tampilkan dari:</label>
			<input
				type="date"
				id="date-from"
				bind:value={dateFrom}
				class="p-2 border border-gray-300 rounded-lg text-sm"
			/>
			<label for="date-to" class="text-sm font-medium text-gray-600">sampai:</label>
			<input
				type="date"
				id="date-to"
				bind:value={dateTo}
				class="p-2 border border-gray-300 rounded-lg text-sm"
			/>
			<button
				onclick={applyDateFilter}
				class="bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-purple-700"
			>
				Filter
			</button>
		</div>
	</div>

	{#if data.tasks.length === 0}
		<div class="text-center py-16 bg-gray-50 rounded-lg">
			<p class="text-gray-500 text-lg">Tidak ada tugas yang selesai pada rentang tanggal ini.</p>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Loop untuk setiap tugas (tidak berubah) -->
			{#each data.tasks as task (task.id)}
				<button
					onclick={() => goto(`/projects/${task.project_id}`)}
					class="w-full text-left bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center transition-all hover:shadow-md hover:border-green-600"
				>
					<!-- Sisi Kiri: Judul & Info Tambahan -->
					<div>
						<p class="font-semibold text-gray-800 line-through">{task.title}</p>
						<div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
							<span class="flex items-center gap-1.5" title="Proyek">
								<Folder size={14} />
								{task.projects?.name || '...'}
							</span>
							<span class="flex items-center gap-1.5" title="Prioritas">
								<Flag size={14} />
								{task.priority || 'Normal'}
							</span>
						</div>
					</div>

					<!-- Sisi Kanan: Tanggal Selesai -->
					<div class="text-right flex-shrink-0 ml-4">
						<div class="flex items-center gap-2 text-sm font-medium text-gray-600">
							<Calendar size={16} />
							<span>
								Selesai: {new Date(task.updated_at).toLocaleDateString('id-ID')}
							</span>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
