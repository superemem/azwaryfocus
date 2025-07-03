<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/authStore';

	let teamMembers = [];
	let loading = true;
	let error = '';

	async function getDoneColumnId() {
		const { data, error } = await supabase
			.from('columns')
			.select('id')
			.ilike('name', 'done')
			.single();

		if (error || !data) {
			console.warn('Gagal mendapatkan ID kolom "Done":', error);
			return null;
		}

		return data.id;
	}

	onMount(async () => {
		if (!$session?.user) {
			goto('/login');
			return;
		}

		const { data: profileData, error: profileError } = await supabase.from('profiles').select('*');

		if (profileError) {
			error = 'Gagal memuat profil tim.';
			console.error(profileError);
		} else {
			const doneColumnId = await getDoneColumnId();

			const enrichedMembers = await Promise.all(
				profileData.map(async (member) => {
					const { count: projectCount } = await supabase
						.from('projects')
						.select('id', { count: 'exact' })
						.eq('created_by', member.id);

					let doneTaskCount = 0;
					if (doneColumnId) {
						const { count: taskCount } = await supabase
							.from('tasks')
							.select('id', { count: 'exact' })
							.eq('created_by', member.id)
							.eq('column_id', doneColumnId);
						doneTaskCount = taskCount || 0;
					}

					return {
						...member,
						projectCount: projectCount || 0,
						doneTaskCount
					};
				})
			);

			teamMembers = enrichedMembers;
		}

		loading = false;
	});
</script>

<div class="p-8">
	<h1 class="text-3xl font-bold mb-4">Tim Kamu</h1>

	{#if loading}
		<p>Memuat data...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
			{#each teamMembers as member}
				<div class="bg-white p-4 rounded shadow-md">
					{#if member.avatar_url}
						<img src={member.avatar_url} alt="avatar" class="w-16 h-16 rounded-full mb-2" />
					{:else}
						<div
							class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold mb-2"
						>
							{member.username?.charAt(0)?.toUpperCase() || 'U'}
						</div>
					{/if}

					<h2 class="text-lg font-semibold">{member.username || member.email}</h2>
					<p class="text-sm text-gray-600 italic">
						Posisi: {member.job_title || 'Belum ada jabatan'}
					</p>
					<p class="text-sm mt-2">Jumlah Proyek: {member.projectCount}</p>
					<p class="text-sm">Task Selesai: {member.doneTaskCount}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
