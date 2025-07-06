<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	type Stat = {
		user_id: string;
		username: string;
		sessions: number;
		total_seconds: number;
	};

	let stats: Stat[] = [];
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const endOfMonth = now.toISOString();

	onMount(async () => {
		const { data, error } = await supabase.rpc('get_focus_stats', {
			start_date: startOfMonth,
			end_date: endOfMonth
		});
		if (error) {
			console.error('Gagal load stats:', error);
		} else {
			stats = data as Stat[];
		}
	});

	function formatMinutes(sec: number) {
		return Math.round(sec / 60);
	}
</script>

<div class="p-8 max-w-4xl mx-auto space-y-6">
	<h1 class="text-2xl font-bold">Produktivitas Tim (Bulan Ini)</h1>

	{#if stats.length}
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr>
						<th class="px-4 py-2 border-b">Nama</th>
						<th class="px-4 py-2 border-b">Sesi</th>
						<th class="px-4 py-2 border-b">Durasi (menit)</th>
					</tr>
				</thead>
				<tbody>
					{#each stats as row}
						<tr class="hover:bg-gray-100">
							<td class="px-4 py-2 border-b">{row.username}</td>
							<td class="px-4 py-2 border-b">{row.sessions}</td>
							<td class="px-4 py-2 border-b">{formatMinutes(row.total_seconds)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="text-gray-500">Belum ada sesi bulan ini.</p>
	{/if}
</div>
