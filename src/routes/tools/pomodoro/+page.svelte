<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import type { PageData } from './$types';
	import PomodoroTimer from '$lib/components/PomodoroTimer.svelte';
	import toast from 'svelte-5-french-toast';

	// 1. TERIMA DATA DARI SERVER
	let { data } = $props<PageData>();

	// 2. STATE LOKAL MENGGUNAKAN RUNES
	let todoTasks = $state(data.todoTasks);
	let inProgressTasks = $state(data.inProgressTasks);
	let sessionsToday = $state(0);
	let activeTask = $state<any | null>(null);
	let currentSession = $state<{ id: string; taskId: string; startTime: number } | null>(null);

	let timerRef: PomodoroTimer;
	let completeAudio: HTMLAudioElement;

	// Konstanta
	const WORK_DURATION_MS = 25 * 60 * 1000;
	const MIN_WORK_TIME_MS = 20 * 60 * 1000; // Minimal 20 menit

	// 3. onMount HANYA UNTUK LOGIKA CLIENT-SIDE
	onMount(() => {
		// Muat data sesi dari localStorage
		const key = `sessionsToday_${new Date().toISOString().slice(0, 10)}`;
		sessionsToday = parseInt(localStorage.getItem(key) || '0');

		// Coba pulihkan sesi yang belum selesai
		recoverSession();
	});

	// 4. FUNGSI-FUNGSI AKSI (SUDAH DIPERBAIKI)
	function startSession(task: any) {
		if (currentSession) {
			toast.error('Selesaikan sesi yang sedang berjalan terlebih dahulu.');
			return;
		}
		activeTask = task;
		currentSession = {
			id: `session_${Date.now()}`,
			taskId: task.id,
			startTime: Date.now()
		};
		localStorage.setItem('pomodoroSession', JSON.stringify(currentSession));
		timerRef.startTimerExtern();
	}

	async function playTask(task: any) {
		const supabase = get(supabaseClientStore);
		if (!supabase || !data.columnIds.inProgress) return;

		// Pindahkan task ke 'In Progress' di UI secara optimis
		todoTasks = todoTasks.filter((t) => t.id !== task.id);
		inProgressTasks.push(task);

		// Mulai sesi
		startSession(task);

		// Update di database
		const { error } = await supabase
			.from('tasks')
			.update({ column_id: data.columnIds.inProgress })
			.eq('id', task.id);
		if (error) {
			toast.error('Gagal memindahkan tugas.');
			// Kembalikan jika gagal
			inProgressTasks = inProgressTasks.filter((t) => t.id !== task.id);
			todoTasks.push(task);
		}
	}

	async function finishTask(task: any) {
		const supabase = get(supabaseClientStore);
		if (!supabase || !data.columnIds.done) return;

		// Hentikan sesi jika ada
		if (currentSession && currentSession.taskId === task.id) {
			endSession('manual');
		}

		// Pindahkan task dari UI
		inProgressTasks = inProgressTasks.filter((t) => t.id !== task.id);
		if (activeTask?.id === task.id) activeTask = null;

		// Update di database
		const { error } = await supabase
			.from('tasks')
			.update({ column_id: data.columnIds.done })
			.eq('id', task.id);
		if (error) {
			toast.error('Gagal menyelesaikan tugas.');
			// Kembalikan jika gagal
			inProgressTasks.push(task);
		} else {
			toast.success(`Tugas "${task.title}" selesai!`);
		}
	}

	function endSession(reason: 'completed' | 'interrupted' | 'manual') {
		if (!currentSession) return;
		currentSession = null;
		localStorage.removeItem('pomodoroSession');
		timerRef.resetTimerExtern();
	}

	function handleSessionComplete(e: CustomEvent) {
		const { duration, completed } = e.detail;

		if (!completed || duration < MIN_WORK_TIME_MS) {
			toast.error(`Sesi tidak valid (kurang dari ${MIN_WORK_TIME_MS / 60000} menit).`);
			endSession('interrupted');
			return;
		}

		sessionsToday++;
		const key = `sessionsToday_${new Date().toISOString().slice(0, 10)}`;
		localStorage.setItem(key, sessionsToday.toString());

		toast.success('Sesi Pomodoro berhasil! Waktunya istirahat.');
		completeAudio?.play().catch(() => {});
		endSession('completed');
	}

	function recoverSession() {
		const saved = localStorage.getItem('pomodoroSession');
		if (!saved) return;
		try {
			const sess = JSON.parse(saved);
			const elapsed = Date.now() - sess.startTime;
			if (elapsed > 0 && elapsed < WORK_DURATION_MS * 1.5) {
				if (confirm('Ditemukan sesi yang belum selesai. Lanjutkan?')) {
					const task = [...todoTasks, ...inProgressTasks].find((t) => t.id === sess.taskId);
					if (task) {
						currentSession = sess;
						activeTask = task;
						const remainingSeconds = Math.max(0, (WORK_DURATION_MS - elapsed) / 1000);
						timerRef.setRemainingTime(remainingSeconds);
						timerRef.startTimerExtern();
					} else {
						localStorage.removeItem('pomodoroSession');
					}
				} else {
					localStorage.removeItem('pomodoroSession');
				}
			} else {
				localStorage.removeItem('pomodoroSession');
			}
		} catch {
			localStorage.removeItem('pomodoroSession');
		}
	}
</script>

<div class="p-6 max-w-4xl mx-auto space-y-8">
	<h1 class="text-4xl font-bold text-gray-800">Pomodoro Timer</h1>

	<div class="mx-auto w-full">
		<PomodoroTimer
			bind:this={timerRef}
			on:sessionComplete={handleSessionComplete}
			on:timerStop={() => endSession('manual')}
		>
			<div slot="dailySessions" class="text-sm font-semibold whitespace-nowrap">
				<span class="text-gray-800">{sessionsToday} Sesi Valid</span>
				<br />
				<span class="text-gray-500">Min. 20 menit per sesi</span>
			</div>
			<div slot="sessionDots" class="flex space-x-1">
				{#each Array(8) as _, i}
					<span
						class="w-3 h-3 rounded-full transition-colors {i < sessionsToday
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
		<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
			<h3 class="font-semibold text-gray-800 mb-4 text-lg">Rencana Tugas ({todoTasks.length})</h3>
			{#if todoTasks.length === 0}
				<p class="text-gray-500 italic text-center py-8">Tidak ada tugas di To Do.</p>
			{:else}
				<ul class="space-y-3 max-h-96 overflow-y-auto">
					{#each todoTasks as task (task.id)}
						<li class="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
							<span class="text-gray-700 font-medium">{task.title}</span>
							<button
								on:click={() => playTask(task)}
								class="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
								disabled={activeTask !== null}
							>
								Mulai
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
							class:border-blue-300={activeTask?.id === task.id}
							class:bg-gray-50={activeTask?.id !== task.id}
						>
							<span class="font-medium" class:text-blue-800={activeTask?.id === task.id}>
								{task.title}
							</span>
							<button
								on:click={() => finishTask(task)}
								class="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
							>
								Selesai
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<audio bind:this={completeAudio} src="/victory.mp3" preload="auto" />
