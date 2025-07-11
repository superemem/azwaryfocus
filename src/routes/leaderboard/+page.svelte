<script lang="ts">
	import type { PageData } from './$types';
	import { Crown } from '@lucide/svelte'; // <-- Path import yang konsisten
	import { goto } from '$app/navigation'; // <-- Hapus invalidateAll karena tidak dipakai

	let { data } = $props<PageData>();

	// Fungsi untuk memformat detik menjadi HH:MM:SS
	function formatDuration(totalSeconds: number | null) {
		if (!totalSeconds) return '00:00:00';
		const hours = Math.floor(totalSeconds / 3600)
			.toString()
			.padStart(2, '0');
		const minutes = Math.floor((totalSeconds % 3600) / 60)
			.toString()
			.padStart(2, '0');
		const seconds = Math.floor(totalSeconds % 60)
			.toString()
			.padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	// Fungsi untuk mengubah filter dan memuat ulang data
	function handleFilterChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newPeriod = target.value;
		goto(`/leaderboard?period=${newPeriod}`, {
			invalidateAll: true,
			keepFocus: true
		});
	}
</script>

<div class="leaderboard-container p-8 max-w-4xl mx-auto">
	<div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
		<div class="text-center md:text-left">
			<h1 class="text-4xl font-bold text-gray-800">Focus Leaderboard</h1>
			<p class="text-gray-500 mt-2">Siapa yang Si Paling Fokus di tim?</p>
		</div>
		<div>
			<select
				on:change={handleFilterChange}
				value={data.period}
				class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
			>
				<option value="daily">Hari Ini</option>
				<option value="weekly">Minggu Ini</option>
				<option value="monthly">Bulan Ini</option>
			</select>
		</div>
	</div>

	{#if data.leaderboard.length === 0}
		<div class="text-center py-16 bg-white rounded-lg shadow-md">
			<p class="text-gray-500 text-lg">Belum ada data produktivitas yang tercatat.</p>
			<p class="text-gray-400">Mulai sesi Pomodoro untuk muncul di papan peringkat!</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-md overflow-hidden">
			<ul>
				{#each data.leaderboard as user, i}
					<li
						class="flex items-center p-4 border-b border-gray-200"
						class:bg-amber-50={i === 0}
						class:bg-slate-50={i === 1}
						class:bg-orange-50={i === 2}
					>
						<div class="w-12 text-center font-bold text-lg text-gray-500">
							{#if i === 0}
								<Crown class="mx-auto text-amber-400" />
							{:else}
								{i + 1}
							{/if}
						</div>
						<img
							src={user.avatar_url ||
								`https://ui-avatars.com/api/?name=${user.username}&background=random`}
							alt="Avatar {user.username}"
							class="w-12 h-12 rounded-full mx-4 object-cover"
						/>
						<div class="flex-1">
							<p class="font-semibold text-gray-800">{user.username}</p>
							<p class="text-xs text-gray-500">{user.total_sessions} sesi fokus</p>
						</div>
						<div class="text-right">
							<p class="font-bold text-lg text-purple-600">
								{formatDuration(user.total_focus_seconds)}
							</p>
							<p class="text-xs text-gray-500">Durasi Fokus</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.leaderboard-container {
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			'Open Sans',
			'Helvetica Neue',
			sans-serif;
	}
</style>
