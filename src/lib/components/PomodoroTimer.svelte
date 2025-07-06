<!-- src/lib/components/PomodoroTimer.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { Play, Pause } from '@lucide/svelte';

	const dispatch = createEventDispatcher();

	let workDuration = 25 * 60; // detik
	let breakDuration = 5 * 60;
	let longBreakDuration = 15 * 60;

	let timeRemaining = workDuration;
	let isRunning = false;
	let currentMode: 'work' | 'short-break' | 'long-break' = 'work';
	let cyclesCompleted = 0;
	let intervalId: number | null = null;
	let audio: HTMLAudioElement;

	// Track actual session start time and elapsed time
	let sessionStartTime = 0;
	let totalElapsedTime = 0;

	export let displayTime = '';
	$: displayTime = formatTime(timeRemaining);

	function formatTime(sec: number) {
		const m = Math.floor(sec / 60)
			.toString()
			.padStart(2, '0');
		const s = (sec % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	}

	export function startTimerExtern() {
		dispatch('timerStart', { mode: currentMode });
		startTimer();
	}

	export function pauseTimerExtern() {
		dispatch('timerPause', { mode: currentMode });
		pauseTimer();
	}

	export function resumeTimerExtern() {
		dispatch('timerResume', { mode: currentMode });
		startTimer();
	}

	export function resetTimerExtern() {
		pauseTimer();
		resetSession();
		changeMode(currentMode);
		dispatch('timerStop', { mode: currentMode });
	}

	// Export function to set remaining time (for session recovery)
	export function setRemainingTime(seconds: number) {
		timeRemaining = Math.max(0, Math.min(seconds, workDuration));
	}

	function startTimer() {
		if (!isRunning) {
			isRunning = true;
			if (sessionStartTime === 0) {
				sessionStartTime = Date.now();
			}

			intervalId = setInterval(() => {
				if (timeRemaining > 0) {
					timeRemaining--;
					totalElapsedTime = Math.floor((Date.now() - sessionStartTime) / 1000);
				} else {
					completeSession();
				}
			}, 1000);
		}
	}

	function pauseTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
			isRunning = false;
		}
	}

	function resetSession() {
		sessionStartTime = 0;
		totalElapsedTime = 0;
	}

	export function resetTimerFromParent() {
		resetSession();
		switchMode();
	}

	// Modifikasi completeSession untuk tidak auto-reset
	function completeSession() {
		clearInterval(intervalId!);
		intervalId = null;
		isRunning = false;
		playAlarm();

		const actualDurationMs = totalElapsedTime * 1000;
		const wasCompleted = currentMode === 'work' && timeRemaining === 0;

		dispatch('sessionComplete', {
			mode: currentMode,
			duration: actualDurationMs,
			completed: wasCompleted
		});
	}

	function switchMode() {
		if (currentMode === 'work') {
			cyclesCompleted++;
			if (cyclesCompleted % 4 === 0) {
				changeMode('long-break');
			} else {
				changeMode('short-break');
			}
		} else {
			changeMode('work');
		}
	}

	function changeMode(mode: typeof currentMode) {
		currentMode = mode;
		timeRemaining =
			mode === 'work' ? workDuration : mode === 'short-break' ? breakDuration : longBreakDuration;
		resetSession();
	}

	function playAlarm() {
		if (audio) audio.play().catch(() => {});
	}

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="bg-white p-4 rounded-lg shadow-lg flex items-center justify-between">
	<div class="text-5xl font-inter font-semibold">{displayTime}</div>
	<button
		on:click={isRunning ? pauseTimerExtern : startTimerExtern}
		class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"
	>
		{#if !isRunning}
			<Play color="#ffffff" size={16} />
			<!-- play icon -->
		{:else}
			<Pause color="#ffffff" size={16} />
			<!-- pause icon -->
		{/if}
	</button>
</div>
<div class="flex space-x-2 mt-4 justify-center">
	<button on:click={() => changeMode('work')} class="px-4 py-2 rounded-lg">Kerja 25m</button>
	<button on:click={() => changeMode('short-break')} class="px-4 py-2 rounded-lg"
		>Istirahat 5m</button
	>
	<button on:click={() => changeMode('long-break')} class="px-4 py-2 rounded-lg"
		>Istirahat 15m</button
	>
</div>
<audio bind:this={audio} src="/victory.mp3" preload="auto" />

<slot name="dailySessions" />
<slot name="sessionDots" />
