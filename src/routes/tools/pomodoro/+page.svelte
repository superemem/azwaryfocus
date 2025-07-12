<script lang="ts">
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import type { PageData } from './$types';
	import PomodoroTimer from '$lib/components/PomodoroTimer.svelte';
	import toast from 'svelte-5-french-toast';
	import { onMount } from 'svelte';
	import { Settings } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	// 1. TERIMA DATA DARI SERVER
	let { data } = $props<PageData>();

	// 2. STATE LOKAL MENGGUNAKAN RUNES
	let todoTasks = $state(data.todoTasks);
	let inProgressTasks = $state(data.inProgressTasks);
	let stats = $state(data.initialStats);
	let activeTask = $state<any | null>(null);
	let currentSessionInfo = $state<any>(null);

	let timerRef: PomodoroTimer;
	let completeAudio: HTMLAudioElement;

	// 3. FUNGSI-FUNGSI AKSI (DENGAN PERBAIKAN)

	function startSession(task: any) {
		if (currentSessionInfo) {
			toast.error('Selesaikan sesi yang sedang berjalan terlebih dahulu.');
			return;
		}
		activeTask = task;
		currentSessionInfo = {
			id: `sess_${Date.now()}`,
			taskId: task.id,
			startTime: Date.now(),
			mode: 'work'
		};
		timerRef.changeMode('work');
		timerRef.startTimerExtern();
	}

	function startSessionById(taskId: string) {
		const taskToStart = inProgressTasks.find((t) => t.id === taskId);
		if (taskToStart) {
			startSession(taskToStart);
		}
	}

	async function playTask(task: any) {
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		// 1. Cari ID kolom 'In Progress' yang benar untuk proyek tugas ini
		const { data: column, error } = await supabase
			.from('columns')
			.select('id')
			.eq('project_id', task.project_id)
			.eq('name', 'In Progress')
			.single();

		if (error || !column) {
			toast.error("Gagal memulai: Kolom 'In Progress' tidak ditemukan.");
			return;
		}

		// 2. Lanjutkan dengan ID kolom yang sudah benar
		todoTasks = todoTasks.filter((t) => t.id !== task.id);
		inProgressTasks.push(task);
		startSession(task);
		await supabase.from('tasks').update({ column_id: column.id }).eq('id', task.id);
	}

	async function finishTask(task: any) {
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		// 1. Cari ID kolom 'Done' yang benar untuk proyek tugas ini
		const { data: column, error } = await supabase
			.from('columns')
			.select('id')
			.eq('project_id', task.project_id) // Kuncinya di sini
			.eq('name', 'Done')
			.single();

		if (error || !column) {
			toast.error("Gagal menyelesaikan: Kolom 'Selesai' tidak ditemukan.");
			return;
		}

		// Hentikan timer jika tugas yang selesai adalah tugas yang aktif
		if (currentSessionInfo && currentSessionInfo.taskId === task.id) {
			timerRef.resetTimerExtern();
			currentSessionInfo = null;
		}

		// Update UI secara lokal
		inProgressTasks = inProgressTasks.filter((t) => t.id !== task.id);
		if (activeTask?.id === task.id) activeTask = null;

		// 2. Update task dengan ID kolom yang sudah benar
		await supabase.from('tasks').update({ column_id: column.id }).eq('id', task.id);
		toast.success(`Tugas "${task.title}" selesai!`);
	}

	async function handleSessionComplete(e: CustomEvent) {
		const { mode, duration, completed } = e.detail;
		if (!currentSessionInfo) return;
		const supabase = get(supabaseClientStore);
		if (!supabase) return;
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) return toast.error('Sesi tidak valid.');
		const sessionData = {
			id: currentSessionInfo.id,
			user_id: user.id,
			task_id: currentSessionInfo.taskId,
			start_time: new Date(currentSessionInfo.startTime).toISOString(),
			end_time: new Date().toISOString(),
			duration: Math.round(duration),
			mode,
			completed,
			interrupted: !completed
		};
		const { error } = await supabase.from('pomodoro_sessions').insert(sessionData);
		if (error) {
			toast.error('Gagal menyimpan sesi.');
		} else if (mode === 'work' && completed) {
			stats.workSessions++;
			stats.totalWorkMinutes += Math.floor(duration / 60000);
			toast.success('Sesi kerja selesai! Waktunya istirahat.');
			completeAudio?.play().catch(() => {});
			const taskIndex = inProgressTasks.findIndex((t) => t.id === currentSessionInfo!.taskId);
			if (taskIndex > -1) {
				inProgressTasks[taskIndex].session_count =
					(inProgressTasks[taskIndex].session_count || 0) + 1;
			}
			await supabase.rpc('increment', {
				table_name: 'tasks',
				row_id: currentSessionInfo.taskId,
				x: 1,
				field_name: 'session_count'
			});
		} else if (mode !== 'work') {
			toast.info('Waktu istirahat selesai!');
		}
		currentSessionInfo = null;
	}
</script>

<!-- ======================================================= -->
<!-- BAGIAN HTML (DENGAN PERBAIKAN SINTAKS) -->
<!-- ======================================================= -->
<div class="p-6 max-w-4xl mx-auto space-y-8">
	<h1 class="text-4xl font-bold text-gray-800">Pomodoro Timer</h1>
	<button
		onclick={() => goto('/settings')}
		class="text-gray-500 hover:text-purple-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
		aria-label="Buka Pengaturan Pomodoro"
	>
		<Settings size={24} />
	</button>

	<!-- Statistik Keseluruhan -->
	<div class="bg-white p-4 rounded-lg shadow-sm">
		<h3 class="font-semibold text-gray-800 mb-2">Statistik Hari Ini</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			<div>
				<div class="text-gray-500">Sesi Kerja</div>
				<div class="text-2xl font-bold text-green-600">{stats.workSessions}</div>
			</div>
			<div>
				<div class="text-gray-500">Total Waktu Fokus</div>
				<div class="text-lg font-semibold">
					{Math.floor(stats.totalWorkMinutes / 60)}j {stats.totalWorkMinutes % 60}m
				</div>
			</div>
			<div>
				<div class="text-gray-500">Sesi Aktif</div>
				<div class="text-lg font-semibold {currentSessionInfo ? 'text-blue-600' : 'text-gray-400'}">
					{currentSessionInfo ? 'Ya' : 'Tidak'}
				</div>
			</div>
			<div>
				<div class="text-gray-500">Target</div>
				<div class="text-lg font-semibold">8 sesi</div>
			</div>
		</div>
	</div>

	<!-- Timer Bar yang Compact -->
	<div class="mx-auto w-full">
		<PomodoroTimer
			bind:this={timerRef}
			on:sessionComplete={handleSessionComplete}
			settings={data.profile?.pomodoro_settings}
			workSessionsToday={stats.workSessions}
		>
			<div slot="dailySessions" class="text-sm font-semibold whitespace-nowrap">
				<span class="text-gray-800">{stats.workSessions} Sesi Valid</span>
			</div>
			<div slot="sessionDots" class="flex space-x-1">
				{#each Array(8) as _, i}
					<span
						class="w-2 h-2 rounded-full transition-colors {i < stats.workSessions
							? 'bg-green-500'
							: 'bg-gray-300'}"
						title="Sesi {i + 1}"
					></span>
				{/each}
			</div>
		</PomodoroTimer>
	</div>

	{#if activeTask}
		<div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-center rounded-lg">
			<p class="font-bold">Fokus saat ini:</p>
			<p class="text-lg">{activeTask.title}</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Kolom To Do -->
		<div class="bg-white p-4 rounded-lg shadow-sm">
			<h3 class="font-semibold text-gray-800 mb-4 text-lg">Rencana Tugas ({todoTasks.length})</h3>
			{#if todoTasks.length === 0}
				<p class="text-gray-500 italic text-center py-8">Tidak ada tugas di To Do.</p>
			{:else}
				<ul class="space-y-3 max-h-96 overflow-y-auto">
					{#each todoTasks as task (task.id)}
						<li class="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
							<span class="text-gray-700 font-medium">{task.title}</span>
							<button
								onclick={() => playTask(task)}
								class="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
								disabled={currentSessionInfo !== null}>Mulai</button
							>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Kolom In Progress -->
		<div class="bg-white p-4 rounded-lg shadow-sm">
			<h3 class="font-semibold text-gray-800 mb-4 text-lg">
				Sedang Dikerjakan ({inProgressTasks.length})
			</h3>
			{#if inProgressTasks.length === 0}
				<p class="text-gray-500 italic text-center py-8">Tidak ada tugas yang sedang dikerjakan.</p>
			{:else}
				<ul class="space-y-3 max-h-96 overflow-y-auto">
					{#each inProgressTasks as task (task.id)}
						<li
							class="flex items-center justify-between p-3 rounded-md border"
							class:bg-blue-100={activeTask?.id === task.id}
						>
							<div>
								<span class="font-medium" class:text-blue-800={activeTask?.id === task.id}
									>{task.title}</span
								>
								<span class="block text-xs text-gray-500"
									>Sesi Selesai: {task.session_count || 0}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<button
									onclick={() => startSessionById(task.id)}
									class="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50"
									disabled={currentSessionInfo !== null}>Lanjutkan</button
								>
								<button
									onclick={() => finishTask(task)}
									class="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600"
									>Selesai</button
								>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<audio bind:this={completeAudio} src="/victory.mp3" preload="auto"></audio>
