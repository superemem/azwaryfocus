<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/authStore';
	import { onMount } from 'svelte';

	let tasks = [];
	let loading = true;

	onMount(async () => {
		const { data, error } = await supabase
			.from('tasks')
			.select('title, priority, due_date, columns(name)')
			.eq('created_by', $session.user.id);

		if (!error && data) {
			tasks = data.filter((task) => task.columns?.name?.toLowerCase() === 'to do');
		}

		loading = false;
	});
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Tugas - To Do</h1>

	{#if loading}
		<p>Memuat data...</p>
	{:else if tasks.length === 0}
		<p class="text-gray-500">Tidak ada tugas.</p>
	{:else}
		<ul class="space-y-4">
			{#each tasks as task}
				<li class="bg-white shadow p-4 rounded border-l-4 border-blue-500">
					<h2 class="font-semibold text-lg">{task.title}</h2>
					<p class="text-sm text-gray-500">Prioritas: {task.priority || '-'}</p>
					<p class="text-sm text-gray-500">
						Deadline: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>
