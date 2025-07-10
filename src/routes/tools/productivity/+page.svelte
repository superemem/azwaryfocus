<script lang="ts">
	import type { PageData } from './$types';

	// 1. TERIMA DATA DARI SERVER
	// Tidak ada lagi onMount, tidak ada lagi store, tidak ada lagi fetch.
	let { data } = $props<PageData>();

	// Fungsi helper tetap di sini karena ini adalah logika presentasi
	function formatMinutes(sec: number | null) {
		if (sec === null || sec === undefined) return 0;
		return Math.round(sec / 60);
	}
</script>

<div class="p-8 max-w-4xl mx-auto space-y-6">
	<h1 class="text-4xl font-bold text-gray-800">Papan Peringkat Produktivitas</h1>
	<p class="text-gray-500">Statistik sesi Pomodoro untuk semua anggota tim bulan ini.</p>

	{#if data.stats.length === 0}
		<div class="text-center py-16 bg-white rounded-lg shadow-md">
			<p class="text-gray-500 text-lg">Belum ada data produktivitas yang tercatat bulan ini.</p>
			<p class="text-gray-400">Mulai sesi Pomodoro untuk melihat statistik di sini!</p>
		</div>
	{:else}
		<div class="overflow-x-auto bg-white rounded-lg shadow-md">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50">
						<th class="px-6 py-4 font-bold text-gray-600 uppercase border-b">Peringkat</th>
						<th class="px-6 py-4 font-bold text-gray-600 uppercase border-b">Nama</th>
						<th class="px-6 py-4 font-bold text-gray-600 uppercase border-b text-center">
							Total Sesi
						</th>
						<th class="px-6 py-4 font-bold text-gray-600 uppercase border-b text-right">
							Durasi (menit)
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.stats as row, i}
						<tr class="hover:bg-gray-100">
							<td class="px-6 py-4 border-b border-gray-200 font-bold text-lg">
								{#if i === 0}
									<span>🥇</span>
								{:else if i === 1}
									<span>🥈</span>
								{:else if i === 2}
									<span>🥉</span>
								{:else}
									{i + 1}
								{/if}
							</td>
							<td class="px-6 py-4 border-b border-gray-200 font-semibold text-gray-800">
								{row.username}
							</td>
							<td class="px-6 py-4 border-b border-gray-200 text-center">{row.sessions}</td>
							<td class="px-6 py-4 border-b border-gray-200 text-right font-medium">
								{formatMinutes(row.total_seconds)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
