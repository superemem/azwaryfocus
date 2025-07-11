<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { Play, Pause, RotateCcw } from '@lucide/svelte';
	import { browser } from '$app/environment';

	const dispatch = createEventDispatcher();

	// Durasi default dalam detik
	const DURATION_DEFAULTS = {
		work: 25 * 60,
		shortBreak: 5 * 60,
		longBreak: 15 * 60
	};

	// State internal timer
	let timeRemaining = $state(DURATION_DEFAULTS.work);
	let isRunning = $state(false);
	let currentMode: 'work' | 'short-break' | 'long-break' = $state('work');
	let cyclesCompleted = $state(0);

	// "Jam Dinding" untuk timer pintar
	let targetEndTime = 0;
	let intervalId: any = null;
	let audio: HTMLAudioElement;
	let originalTitle = '';

	// Tampilan waktu yang diformat
	const displayTime = $derived(formatTime(timeRemaining));

	// Efek untuk update judul tab
	onMount(() => {
		if (browser) originalTitle = document.title;
	});

	$effect(() => {
		if (browser) {
			if (isRunning) {
				const modeText = currentMode === 'work' ? 'Fokus' : 'Istirahat';
				document.title = `${displayTime} - ${modeText}`;
			} else {
				if (document.title !== originalTitle) {
					document.title = originalTitle;
				}
			}
		}
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
		if (browser) document.title = originalTitle;
	});

	function formatTime(sec: number) {
		const m = Math.floor(sec / 60)
			.toString()
			.padStart(2, '0');
		const s = (sec % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	}

	// Logika Timer Pintar
	function tick() {
		const remainingMs = targetEndTime - Date.now();
		if (remainingMs <= 0) {
			timeRemaining = 0;
			completeSession();
		} else {
			timeRemaining = Math.round(remainingMs / 1000);
		}
	}

	function startTimer() {
		if (isRunning) return;
		isRunning = true;
		if (targetEndTime === 0) {
			targetEndTime = Date.now() + timeRemaining * 1000;
		}
		intervalId = setInterval(tick, 250);
		dispatch('timerStart', { mode: currentMode });
	}

	function pauseTimer() {
		if (!isRunning) return;
		isRunning = false;
		clearInterval(intervalId);
		intervalId = null;
		dispatch('timerPause', { mode: currentMode });
	}

	function completeSession() {
		pauseTimer();
		const sessionDuration =
			(currentMode === 'work'
				? DURATION_DEFAULTS.work
				: currentMode === 'short-break'
					? DURATION_DEFAULTS.shortBreak
					: DURATION_DEFAULTS.longBreak) * 1000;

		dispatch('sessionComplete', {
			mode: currentMode,
			duration: sessionDuration,
			completed: true
		});

		audio?.play().catch(() => {});
	}

	function switchMode() {
		if (currentMode === 'work') {
			cyclesCompleted++;
			changeMode(cyclesCompleted % 4 === 0 ? 'long-break' : 'short-break');
		} else {
			changeMode('work');
		}
	}

	function changeMode(mode: typeof currentMode) {
		pauseTimer();
		currentMode = mode;
		timeRemaining = DURATION_DEFAULTS[mode];
		targetEndTime = 0;
	}

	// API untuk parent komponen
	export function startTimerExtern() {
		startTimer();
	}
	export function resetTimerExtern() {
		pauseTimer();
		targetEndTime = 0;
		timeRemaining = DURATION_DEFAULTS[currentMode];
		dispatch('timerStop', { mode: currentMode });
	}
	export function resetTimerFromParent() {
		switchMode();
	}
	export function setRemainingTime(seconds: number) {
		timeRemaining = seconds;
		targetEndTime = Date.now() + seconds * 1000;
	}
</script>

<!-- BAGIAN HTML YANG COMPACT & HORIZONTAL -->
<div class="pomodoro-bar">
	<div class="timer-display">{displayTime}</div>

	<div class="controls">
		<button
			on:click={isRunning ? pauseTimer : startTimer}
			class="control-btn primary"
			aria-label={isRunning ? 'Pause Timer' : 'Start Timer'}
		>
			{#if !isRunning}
				<Play size={24} class="play-icon" />
			{:else}
				<Pause size={24} />
			{/if}
		</button>
		<button on:click={resetTimerExtern} class="control-btn secondary" aria-label="Reset Timer">
			<RotateCcw size={18} />
		</button>
	</div>

	<div class="modes">
		<button on:click={() => changeMode('work')} class:active={currentMode === 'work'}>Kerja</button>
		<button on:click={() => changeMode('short-break')} class:active={currentMode === 'short-break'}
			>Istirahat</button
		>
		<button on:click={() => changeMode('long-break')} class:active={currentMode === 'long-break'}
			>Lama</button
		>
	</div>

	<div class="stats">
		<slot name="dailySessions" />
		<div class="dots">
			<slot name="sessionDots" />
		</div>
	</div>
</div>

<audio bind:this={audio} src="/victory.mp3" preload="auto" />

<!-- BAGIAN STYLE UNTUK TAMPILAN HORIZONTAL -->
<style>
	.pomodoro-bar {
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			'Open Sans',
			'Helvetica Neue',
			sans-serif;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		background-color: #f1f5f9; /* bg-slate-100 */
		padding: 1rem;
		border-radius: 1rem; /* rounded-2xl */
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
	}

	.timer-display {
		font-size: 2.25rem; /* text-4xl */
		font-weight: 700; /* font-bold */
		color: #1e293b; /* text-slate-800 */
		background-color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem; /* rounded-lg */
		font-feature-settings: 'tnum';
		font-variant-numeric: tabular-nums;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		border: none;
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.control-btn.primary {
		width: 3.5rem; /* w-14 */
		height: 3.5rem; /* h-14 */
		background-color: #7c3aed; /* bg-purple-600 */
		color: white;
	}
	.control-btn.primary:hover {
		background-color: #6d28d9; /* hover:bg-purple-700 */
	}
	.control-btn.primary .play-icon {
		margin-left: 3px;
	}

	.control-btn.secondary {
		width: 2.5rem; /* w-10 */
		height: 2.5rem; /* h-10 */
		background-color: #e2e8f0; /* bg-slate-200 */
		color: #475569; /* text-slate-600 */
	}
	.control-btn.secondary:hover {
		background-color: #cbd5e1; /* hover:bg-slate-300 */
	}

	.modes {
		display: flex;
		gap: 0.25rem;
		background-color: #e2e8f0; /* bg-slate-200 */
		padding: 0.25rem;
		border-radius: 9999px;
		margin-left: auto; /* Pushes modes to the right */
	}

	.modes button {
		border: none;
		background-color: transparent;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		font-size: 0.875rem; /* text-sm */
		font-weight: 600; /* font-semibold */
		color: #475569; /* text-slate-600 */
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.modes button.active {
		background-color: white;
		color: #1e293b; /* text-slate-800 */
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	.stats {
		text-align: right;
	}

	.dots {
		margin-top: 0.25rem;
	}
</style>
