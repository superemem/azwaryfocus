<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/authStore';
	import { onMount } from 'svelte';

	let tasks = [];
	let loading = true;
	let error: string | null = null; // Tambahkan variabel error untuk debugging

	onMount(async () => {
		if (!$session || !$session.user) {
			error = 'Pengguna belum login.';
			loading = false;
			return;
		}

		const { data, error: fetchError } = await supabase
			.from('tasks')
			.select(
				`
                id,
                title,
                description,
                priority,
                due_date,
                columns(name),
                assignee_profile:profiles!tasks_assigned_to_fkey(username),
                created_by_profile:profiles!tasks_created_by_fkey(username)
                `
			)
			.eq('assigned_to', $session.user.id);

		if (fetchError) {
			console.error('Error fetching tasks for To Do page:', fetchError);
			error = 'Gagal memuat tugas: ' + fetchError.message;
		} else if (data) {
			tasks = data.filter((task) => task.columns?.name?.toLowerCase() === 'done');
			console.log('Fetched To Do tasks:', tasks); // Debugging
		}

		loading = false;
	});
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Tugas - To Do</h1>

	{#if loading}
		<p>Memuat data...</p>
	{:else if error}
		<p class="text-red-600">Error: {error}</p>
	{:else if tasks.length === 0}
		<p class="text-gray-500">Belum ada tugas yang selesai.</p>
	{:else}
		<ul class="space-y-4">
			{#each tasks as task (task.id)}
				<li class="bg-white shadow p-4 rounded border-l-4 border-blue-500">
					<h2 class="font-semibold text-lg">{task.title}</h2>
					<p class="text-sm text-gray-500">{task.description}</p>
					<p class="text-sm text-gray-500">Prioritas: {task.priority || '-'}</p>
					<p class="text-sm text-gray-500">
						Deadline: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
					</p>
					<p class="text-sm text-gray-500">
						Ditugaskan oleh: {task.created_by_profile?.username || 'Tidak Ditentukan'}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>
