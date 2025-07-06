<!-- src/routes/pomodoro/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { supabase } from '$lib/supabase';
	import { selectedProjectId } from '$lib/stores/projectStore';
	import { userProfile } from '$lib/stores/authStore';
	import PomodoroTimer from '$lib/components/PomodoroTimer.svelte';

	// Durasi dalam milliseconds
	const WORK_DURATION_MS = 25 * 60 * 1000;
	const MIN_COMPLETION_THRESHOLD = 0.8;
	const MIN_WORK_TIME_MS = WORK_DURATION_MS * MIN_COMPLETION_THRESHOLD;

	interface SessionData {
		id: string;
		taskId: string;
		startTime: number;
		endTime?: number;
		duration: number;
		mode: 'work' | 'break';
		completed: boolean;
		interrupted: boolean;
	}

	let currentSession: SessionData | null = null;
	let sessionHistory: SessionData[] = [];
	let timerRef: PomodoroTimer;
	let completeAudio: HTMLAudioElement;

	let sessionsToday = 0;
	let todoTasks: any[] = [];
	let inProgressTasks: any[] = [];
	let activeTask: any = null;
	let colToDo = '',
		colInProgress = '',
		colDone = '';
	let currentUserId: string | null = null;

	onMount(() => {
		const unsubscribeUser = userProfile.subscribe(async (value) => {
			currentUserId = value?.id || null;
			if (currentUserId) {
				await loadColumns();
				await loadTasks();
				// Call recoverSession after tasks are loaded
				recoverSession();
			} else {
				clearState();
			}
		});

		loadSessionsToday();

		document.addEventListener('visibilitychange', handleFocusChange);

		return () => {
			unsubscribeUser();
			document.removeEventListener('visibilitychange', handleFocusChange);
			if (currentSession) endSession('interrupted');
		};
	});

	function clearState() {
		todoTasks = [];
		inProgressTasks = [];
		activeTask = null;
		sessionsToday = 0;
		if (currentSession) endSession('interrupted');
		localStorage.removeItem('currentSession');
	}

	function startSession(taskId: string) {
		const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		currentSession = {
			id: sessionId,
			taskId,
			startTime: Date.now(),
			duration: 0,
			mode: 'work',
			completed: false,
			interrupted: false
		};
		localStorage.setItem('currentSession', JSON.stringify(currentSession));
		console.log('🟢 Session started:', currentSession);
	}

	function endSession(reason: 'completed' | 'interrupted' | 'manual') {
		if (!currentSession) return null;

		const endTime = Date.now();
		currentSession.endTime = endTime;
		currentSession.interrupted = reason !== 'completed';
		currentSession.completed = reason === 'completed';

		// Duration will be set by handleSessionComplete from timer
		if (currentSession.duration === 0) {
			currentSession.duration = endTime - currentSession.startTime;
		}

		console.log('🔴 Session ended:', {
			reason,
			duration: currentSession.duration,
			completed: currentSession.completed
		});

		sessionHistory.push({ ...currentSession });
		const todayKey = new Date().toISOString().slice(0, 10);
		const todaySessions = JSON.parse(localStorage.getItem(`sessions_${todayKey}`) || '[]');
		todaySessions.push(currentSession);
		localStorage.setItem(`sessions_${todayKey}`, JSON.stringify(todaySessions));

		const finished = currentSession;
		currentSession = null;
		localStorage.removeItem('currentSession');
		return finished;
	}

	function validateSessionCompletion(session: SessionData) {
		const validDuration = session.duration >= MIN_WORK_TIME_MS;
		const properlyCompleted = session.completed && !session.interrupted;
		console.log('✅ Session validation:', { validDuration, properlyCompleted });
		return validDuration && properlyCompleted;
	}

	function handleSessionComplete(e: CustomEvent) {
		console.log('🎯 Session complete event received:', e.detail);

		const { mode, duration, completed } = e.detail;

		// Only handle work sessions
		if (mode !== 'work') {
			console.log('⏭️ Skipping non-work session');
			// For break sessions, just reset the timer
			timerRef.resetTimerFromParent();
			return;
		}

		// Update current session duration from timer
		if (currentSession) {
			currentSession.duration = duration;
			console.log('⏱️ Updated session duration:', duration);
		}

		const session = endSession(completed ? 'completed' : 'interrupted');
		if (!session) return;

		const validDuration = session.duration >= MIN_WORK_TIME_MS;

		if (validDuration && completed) {
			sessionsToday++;
			saveSessionsToday();
			if (activeTask) updateTaskSessionCount(activeTask.id, activeTask.session_count + 1);
			playNotificationSound();
			showSessionFeedback('Session berhasil diselesaikan! 🎉', 'success');
		} else {
			showSessionFeedback(
				`Session tidak memenuhi minimum ${Math.floor(MIN_WORK_TIME_MS / 60000)} menit`,
				'warning'
			);
		}
	}

	async function playTask(task: any) {
		if (currentSession) {
			if (!confirm('Ada sesi yang sedang berjalan. Hentikan sesi saat ini?')) return;
			endSession('manual');
		}
		activeTask = task;
		await supabase.from('tasks').update({ column_id: colInProgress }).eq('id', task.id);
		await loadTasks();
		startSession(activeTask.id);
		timerRef.startTimerExtern();
	}

	async function finishTask(task: any) {
		if (currentSession && currentSession.taskId === task.id) endSession('manual');
		await supabase.from('tasks').update({ column_id: colDone }).eq('id', task.id);
		await loadTasks();
		if (activeTask?.id === task.id) activeTask = null;
		timerRef.resetTimerExtern();
	}

	function handleTimerStart() {
		console.log('▶️ Timer started');
	}

	function handleTimerStop() {
		console.log('⏹️ Timer stopped');
		if (currentSession) endSession('interrupted');
	}

	function handleTimerPause() {
		console.log('⏸️ Timer paused');
	}

	function handleTimerResume() {
		console.log('▶️ Timer resumed');
	}

	function handleFocusChange() {
		console.log(document.hidden ? '🔄 Tab inactive' : '👁️ Tab active');
	}

	function playNotificationSound() {
		completeAudio.play().catch(() => {});
	}

	function showSessionFeedback(message: string, type: 'success' | 'warning' | 'error') {
		const toast = document.createElement('div');
		toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
			type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
		}`;
		toast.textContent = message;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 3000);
	}

	function saveSessionsToday() {
		const key = new Date().toISOString().slice(0, 10);
		localStorage.setItem(`sessionsToday_${key}`, sessionsToday.toString());
	}

	function loadSessionsToday() {
		const key = new Date().toISOString().slice(0, 10);
		const saved = localStorage.getItem(`sessionsToday_${key}`);
		sessionsToday = saved ? parseInt(saved) : 0;
	}

	async function updateTaskSessionCount(taskId: string, newCount: number) {
		const { error } = await supabase
			.from('tasks')
			.update({ session_count: newCount })
			.eq('id', taskId);
		if (error) showSessionFeedback('Gagal update jumlah sesi task.', 'error');
		else {
			if (activeTask?.id === taskId) activeTask.session_count = newCount;
			await loadTasks();
		}
	}

	function recoverSession() {
		const saved = localStorage.getItem('currentSession');
		if (!saved) return;

		try {
			const sess: SessionData = JSON.parse(saved);
			const elapsed = Date.now() - sess.startTime;
			const elapsedSeconds = Math.floor(elapsed / 1000);
			const maxWorkSeconds = 25 * 60;

			if (elapsedSeconds < maxWorkSeconds * 1.5 && !sess.completed && !sess.interrupted) {
				currentSession = sess;
				const all = [...todoTasks, ...inProgressTasks];
				activeTask = all.find((t) => t.id === sess.taskId) || null;

				if (confirm(`Lanjutkan sesi "${activeTask?.title}" (${Math.floor(elapsed / 60000)}m)?`)) {
					// Set remaining time on timer component
					const remainingSeconds = Math.max(0, maxWorkSeconds - elapsedSeconds);
					timerRef.setRemainingTime(remainingSeconds);
					timerRef.startTimerExtern();
				} else {
					endSession('interrupted');
				}
			} else {
				localStorage.removeItem('currentSession');
			}
		} catch {
			localStorage.removeItem('currentSession');
		}
	}

	async function loadColumns() {
		const projectId = get(selectedProjectId);
		if (!projectId) return;
		const { data, error } = await supabase
			.from('columns')
			.select('id,name')
			.eq('project_id', projectId)
			.order('order', { ascending: true });
		if (error) return;
		colToDo = data.find((c) => c.name === 'To Do')?.id || '';
		colInProgress = data.find((c) => c.name === 'In Progress')?.id || '';
		colDone = data.find((c) => c.name === 'Done')?.id || '';
	}

	async function loadTasks() {
		const projectId = get(selectedProjectId);
		const userId = get(userProfile)?.id;
		if (!projectId || !userId) return clearState();
		const { data, error } = await supabase
			.from('tasks')
			.select('*')
			.eq('project_id', projectId)
			.eq('created_by', userId)
			.order('created_at', { ascending: true });
		if (error) return;
		todoTasks = data.filter((t) => t.column_id === colToDo);
		inProgressTasks = data.filter((t) => t.column_id === colInProgress);
		if (currentSession)
			activeTask = inProgressTasks.find((t) => t.id === currentSession.taskId) || null;
		else activeTask = null;
	}
</script>

<div class="p-6 max-w-4xl mx-auto space-y-8">
	{#if currentSession}
		<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
			<strong>🔄 Sesi Aktif:</strong>
			{activeTask?.title} —
			{Math.floor((Date.now() - currentSession.startTime) / 60000)}:
			{(Math.floor((Date.now() - currentSession.startTime) / 1000) % 60)
				.toString()
				.padStart(2, '0')}
		</div>
	{/if}

	<div class="bg-white p-4 rounded-lg shadow-sm">
		<h3 class="font-semibold text-gray-800 mb-2">Session Stats</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			<div>
				<div class="text-gray-500">Hari Ini</div>
				<div class="text-2xl font-bold text-green-600">{sessionsToday}</div>
			</div>
			<div>
				<div class="text-gray-500">Total Waktu</div>
				<div class="text-lg font-semibold">
					{Math.floor((sessionsToday * 25) / 60)}j {(sessionsToday * 25) % 60}m
				</div>
			</div>
			<div>
				<div class="text-gray-500">Sesi Aktif</div>
				<div class="text-lg font-semibold {currentSession ? 'text-blue-600' : 'text-gray-400'}">
					{currentSession ? 'Ya' : 'Tidak'}
				</div>
			</div>
			<div>
				<div class="text-gray-500">Target</div>
				<div class="text-lg font-semibold">8 sesi</div>
			</div>
		</div>
	</div>

	<div class="mx-auto w-full">
		<PomodoroTimer
			bind:this={timerRef}
			on:sessionComplete={handleSessionComplete}
			on:timerStart={handleTimerStart}
			on:timerStop={handleTimerStop}
			on:timerPause={handleTimerPause}
			on:timerResume={handleTimerResume}
		>
			<div slot="dailySessions" class="text-sm font-semibold whitespace-nowrap">
				<span class="text-gray-800">{sessionsToday} Sesi Valid</span>
				<br />
				<span class="text-gray-500">Min. 20 menit per sesi</span>
			</div>
			<div slot="sessionDots" class="flex space-x-1">
				{#each Array(16) as _, i}
					<span
						class="w-2 h-2 rounded-full transition-colors {i < sessionsToday
							? 'bg-green-500'
							: 'bg-gray-300'}"
						title="Sesi {i + 1} - {i < sessionsToday ? 'Selesai' : 'Belum'}"
					></span>
				{/each}
			</div>
		</PomodoroTimer>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
			<h3 class="font-semibold text-gray-800 mb-4 text-lg">To Do ({todoTasks.length})</h3>
			{#if todoTasks.length === 0}
				<p class="text-gray-500 italic">Tidak ada tugas di To Do.</p>
			{:else}
				<ul class="space-y-3">
					{#each todoTasks as task (task.id)}
						<li
							class="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
						>
							<span class="text-gray-700 font-medium">{task.title}</span>
							<button
								on:click={() => playTask(task)}
								class="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
				In Progress ({inProgressTasks.length})
			</h3>
			{#if inProgressTasks.length === 0}
				<p class="text-gray-500 italic">Tidak ada tugas di In Progress.</p>
			{:else}
				<ul class="space-y-3">
					{#each inProgressTasks as task (task.id)}
						<li
							class="flex items-center justify-between p-3 bg-blue-100 rounded-md border border-blue-300"
						>
							<span class="text-blue-800 font-medium">{task.title}</span>
							<div class="flex items-center space-x-2">
								<span class="text-sm text-blue-600">Sesi: {task.session_count || 0}</span>
								<button
									on:click={() => finishTask(task)}
									class="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
								>
									Selesai
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<audio bind:this={completeAudio} src="/victory.mp3" preload="auto" />
