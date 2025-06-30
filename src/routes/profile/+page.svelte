<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { userProfile, session } from '$lib/stores/authStore';
	import { onMount, onDestroy } from 'svelte';
	import { allTasks } from '$lib/stores/kanbanDataStore';
	import type { AllTasks } from '$lib/types';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	// Statistik tugas bulanan (tetap ada)
	let monthlyStats = {
		toDo: 0,
		inProgress: 0,
		done: 0
	};

	// --- VARIABEL BARU: Statistik Proyek ---
	let projectsInitiated = 0;
	let projectsInvited = 0;

	let loading = true;
	let loadingProjectsStats = true; // Status loading untuk statistik proyek
	let error: string | null = null;
	let tasksChannel: RealtimeChannel | null = null;

	// --- Fungsi untuk menghitung statistik bulanan ---
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
					const column_name = task.column_name?.toLowerCase();

					if (column_name === 'to do') {
						toDoCount++;
					} else if (column_name === 'in progress') {
						inProgressCount++;
					} else if (column_name === 'done') {
						doneCount++;
					}
				}
			}
		});

		monthlyStats = {
			toDo: toDoCount,
			inProgress: inProgressCount,
			done: doneCount
		};
	}

	// --- FUNGSI BARU: Mengambil statistik proyek ---
	async function fetchProjectStats() {
		loadingProjectsStats = true;
		if (!$session?.user) {
			projectsInitiated = 0;
			loadingProjectsStats = false;
			return;
		}

		const userId = $session.user.id;

		// Hitung proyek yang diinisiasi (dibuat sendiri)
		const { count: initiatedCount, error: initiatedError } = await supabase
			.from('projects')
			.select('id', { count: 'exact' })
			.eq('created_by', userId); // <-- Filter hanya untuk yang dibuat sendiri

		if (initiatedError) {
			console.error('Error fetching initiated projects count:', initiatedError);
			projectsInitiated = 0;
		} else {
			projectsInitiated = initiatedCount || 0;
		}

		// Variabel 'projectsInvited' tidak lagi dibutuhkan.
		// projectsInvited = 0;

		loadingProjectsStats = false;
	}

	// --- Ambil semua task dan hitung statistiknya ---
	async function fetchAndCalculateStats() {
		loading = true;
		error = null;
		if (!$session || !$session.user) {
			loading = false;
			return;
		}

		const { data: tasks, error: fetchError } = await supabase
			.from('tasks')
			.select('*, columns(name)')
			.eq('created_by', $session.user.id)
			.order('created_at', { ascending: false });

		if (fetchError) {
			console.error('Error fetching tasks for profile:', fetchError);
			error = 'Gagal mengambil data tugas.';
			loading = false;
			return;
		}

		allTasks.set(tasks.map((t) => ({ ...t, column_name: t.columns?.name })));
		calculateMonthlyStats($allTasks);
		loading = false;
	}

	onMount(() => {
		fetchAndCalculateStats();
		fetchProjectStats(); // <-- Panggil fungsi baru

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
				() => {
					console.log('Real-time task update detected for profile page. Recalculating stats.');
					fetchAndCalculateStats();
				}
			)
			.subscribe();
	});

	onDestroy(() => {
		if (tasksChannel) {
			supabase.removeChannel(tasksChannel);
		}
	});

	$: calculateMonthlyStats($allTasks);
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Profil Pengguna</h1>

	{#if loading || loadingProjectsStats}
		<p class="text-gray-500">Memuat data profil...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if $userProfile}
		<div class="bg-white p-6 rounded-lg shadow-md mb-8">
			<div class="flex items-center space-x-6">
				{#if $userProfile.avatar_url}
					<img
						src={$userProfile.avatar_url}
						alt="Avatar"
						class="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
					/>
				{:else}
					<div
						class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-5xl font-bold text-gray-500"
					>
						{($userProfile.username?.charAt(0) || 'G').toUpperCase()}
					</div>
				{/if}
				<div>
					<h2 class="text-3xl font-semibold text-gray-900">
						{$userProfile.username || 'Pengguna'}
					</h2>
					<p class="text-gray-600 mt-1">{$session?.user?.email || 'Email tidak tersedia'}</p>
					<p class="text-gray-500 mt-2">Kontak: -</p>
				</div>
			</div>
		</div>

		<h3 class="text-2xl font-bold text-gray-800 mb-4">Statistik Produktivitas Bulan Ini</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-blue-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Rencana Tugas</p>
						<p class="text-4xl font-bold text-blue-600 mt-1">{monthlyStats.toDo}</p>
					</div>
					<svg
						class="w-12 h-12 text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						></path></svg
					>
				</div>
			</div>
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-yellow-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Tugas Dikerjakan</p>
						<p class="text-4xl font-bold text-yellow-600 mt-1">{monthlyStats.inProgress}</p>
					</div>
					<svg
						class="w-12 h-12 text-yellow-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
				</div>
			</div>
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-green-500">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-gray-500">Tugas Selesai</p>
						<p class="text-4xl font-bold text-green-600 mt-1">{monthlyStats.done}</p>
					</div>
					<svg
						class="w-12 h-12 text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
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
