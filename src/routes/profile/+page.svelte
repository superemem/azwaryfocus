<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { userProfile, session } from '$lib/stores/authStore';
	import { onMount, onDestroy } from 'svelte';
	import { allTasks } from '$lib/stores/kanbanDataStore';
	import type { AllTasks } from '$lib/types';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';

	let monthlyStats = { toDo: 0, inProgress: 0, done: 0 };
	let projectsInitiated = 0;
	let projectsInvited = 0;
	let loading = true;
	let loadingProjectsStats = true;
	let error: string | null = null;
	let tasksChannel: RealtimeChannel | null = null;

	let showEditModal = false;

	function calculateMonthlyStats(tasks: AllTasks[]) {
		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();

		let toDoCount = 0;
		let inProgressCount = 0;
		let doneCount = 0;

		tasks.forEach((task) => {
			if (task.created_at) {
				const taskDate = new Date(task.created_at);
				if (taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
					const columnName = task.columns?.name;
					if (columnName === 'To Do') toDoCount++;
					else if (columnName === 'In Progress') inProgressCount++;
					else if (columnName === 'Done') doneCount++;
				}
			}
		});

		monthlyStats = { toDo: toDoCount, inProgress: inProgressCount, done: doneCount };
	}

	async function fetchProjectStats() {
		loadingProjectsStats = true;
		if (!$session?.user) {
			projectsInitiated = 0;
			loadingProjectsStats = false;
			return;
		}

		const userId = $session.user.id;
		const { count: initiatedCount, error: initiatedError } = await supabase
			.from('projects')
			.select('id', { count: 'exact' })
			.eq('created_by', userId);

		projectsInitiated = initiatedError ? 0 : initiatedCount || 0;
		loadingProjectsStats = false;
	}

	async function fetchAndCalculateStats() {
		if (!$session?.user) return;
		loading = true;
		const userId = $session.user.id;

		try {
			const { data: profileData } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (profileData) userProfile.set(profileData);

			const { data: taskData, error: taskError } = await supabase
				.from('tasks')
				.select('*, columns(name)')
				.eq('assigned_to', userId);

			if (taskError) {
				error = taskError.message;
				return;
			}

			if (taskData) calculateMonthlyStats(taskData);
			else monthlyStats = { toDo: 0, inProgress: 0, done: 0 };
		} catch (err) {
			error = 'Terjadi kesalahan saat mengambil data';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit({ detail }) {
		const { newUsername, jobTitle } = detail;
		const userId = $session?.user?.id;
		if (!userId) return;

		const { error: updateError } = await supabase
			.from('profiles')
			.update({
				username: newUsername,
				job_title: jobTitle
			})
			.eq('id', userId);

		if (updateError) {
			alert('Gagal update profil: ' + updateError.message);
		} else {
			await fetchAndCalculateStats();
		}
	}

	onMount(() => {
		const interval = setInterval(() => {
			if ($session?.user?.id) {
				clearInterval(interval);
				fetchAndCalculateStats();
				fetchProjectStats();
			}
		}, 100);

		tasksChannel = supabase.channel('public:tasks');
		tasksChannel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'tasks',
					filter: `created_by=eq.${$session?.user?.id}`
				},
				() => fetchAndCalculateStats()
			)
			.subscribe();
	});

	onDestroy(() => {
		if (tasksChannel) supabase.removeChannel(tasksChannel);
	});
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Profil Pengguna</h1>

	{#if loading || loadingProjectsStats}
		<p class="text-gray-500">Memuat data profil...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if $userProfile}
		<div class="bg-white p-6 rounded-lg shadow-md mb-8">
			<div class="flex flex-col items-center text-center">
				{#if $userProfile.avatar_url}
					<img
						src={$userProfile.avatar_url}
						alt="Avatar"
						class="w-24 h-24 rounded-full object-cover border-4 border-gray-200 mx-auto"
					/>
				{:else}
					<div
						class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-5xl font-bold text-gray-500 mx-auto"
					>
						{($userProfile.username?.charAt(0) || 'G').toUpperCase()}
					</div>
				{/if}
				<div>
					<h2 class="text-3xl font-semibold text-gray-900 mt-4">
						{$userProfile.username || 'Pengguna'}
					</h2>
					<p class="text-gray-600">{$session?.user?.email || 'Email tidak tersedia'}</p>
					<p class="text-gray-600 italic">{$userProfile.job_title || 'Belum ada jabatan'}</p>
				</div>
				<button
					class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					on:click={() => (showEditModal = true)}>Edit Profil</button
				>
			</div>
		</div>

		<!-- MODAL -->
		<EditProfileModal
			isOpen={showEditModal}
			currentProfile={$userProfile}
			on:submit={handleSubmit}
			on:close={() => (showEditModal = false)}
		/>

		<!-- Statistik Tugas dan Proyek -->
		<h3 class="text-2xl font-bold text-gray-800 mb-4">Statistik Produktivitas Bulan Ini</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
			<!-- TO DO -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-blue-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Rencana Tugas</p>
						<p class="text-4xl font-bold text-blue-600 mt-1">{monthlyStats.toDo}</p>
					</div>
				</div>
			</div>

			<!-- IN PROGRESS -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-yellow-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Tugas Dikerjakan</p>
						<p class="text-4xl font-bold text-yellow-600 mt-1">{monthlyStats.inProgress}</p>
					</div>
				</div>
			</div>

			<!-- DONE -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-green-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Tugas Selesai</p>
						<p class="text-4xl font-bold text-green-600 mt-1">{monthlyStats.done}</p>
					</div>
				</div>
			</div>
		</div>

		<h3 class="text-2xl font-bold text-gray-800 mb-4">Statistik Proyek</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-purple-500">
				<p class="text-gray-500">Proyek Diinisiasi</p>
				<p class="text-5xl font-bold text-purple-600 mt-2">{projectsInitiated}</p>
			</div>
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-teal-500">
				<p class="text-gray-500">Proyek Diundang</p>
				<p class="text-5xl font-bold text-teal-600 mt-2">{projectsInvited}</p>
			</div>
		</div>
	{:else}
		<p class="text-gray-500">Silakan login untuk melihat profil.</p>
	{/if}
</div>
