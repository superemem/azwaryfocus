<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { Play, Pause, Coffee } from '@lucide/svelte';
	import { browser } from '$app/environment';

	const dispatch = createEventDispatcher();

	// 1. TERIMA PENGATURAN & DATA DARI PARENT
	let { settings, workSessionsToday } = $props<{
		settings?: { work: number; shortBreak: number; longBreak: number };
		workSessionsToday: number;
	}>();

	// 2. BUAT SUMBER KEBENARAN UNTUK DURASI (REAKTIF)
	// Perbaikan: Kunci objek sekarang menggunakan string agar cocok dengan tipe `currentMode`
	const durations = $derived({
		work: (settings?.work || 25) * 60,
		'short-break': (settings?.shortBreak || 5) * 60,
		'long-break': (settings?.longBreak || 15) * 60
	});

	// 3. STATE INTERNAL TIMER
	let timeRemaining = $state(durations.work);
	let isRunning = $state(false);
	let currentMode: 'work' | 'short-break' | 'long-break' = $state('work');
	let isChoosingBreak = $state(false);

	// "Jam Dinding" untuk timer pintar
	let targetEndTime = 0;
	let intervalId: any = null;
	let audio: HTMLAudioElement;
	let originalTitle = '';

	// 4. LOGIKA UNTUK LINGKARAN PROGRES (SVG)
	const radius = 45;
	const circumference = 2 * Math.PI * radius;
	const progressOffset = $derived(
		circumference * (1 - timeRemaining / (durations[currentMode] || durations.work))
	);

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
			} else if (!isChoosingBreak) {
				if (document.title !== originalTitle) document.title = originalTitle;
			}
		}
	});

	$effect(() => {
		if (!isRunning && !isChoosingBreak) {
			timeRemaining = durations[currentMode];
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
		const sessionDuration = durations[currentMode] * 1000;
		dispatch('sessionComplete', { mode: currentMode, duration: sessionDuration, completed: true });
		audio?.play().catch(() => {});

		if (currentMode === 'work') {
			isChoosingBreak = true;
			if (browser) document.title = 'Sesi Selesai!';
		} else {
			changeMode('work');
		}
	}

	function startBreak(mode: 'short-break' | 'long-break') {
		isChoosingBreak = false;
		changeMode(mode);
		startTimer();
	}

	export function changeMode(mode: typeof currentMode) {
		pauseTimer();
		currentMode = mode;
		timeRemaining = durations[mode];
		targetEndTime = 0;
		isChoosingBreak = false;
	}

	export function startTimerExtern() {
		startTimer();
	}
	export function resetTimerExtern() {
		pauseTimer();
		targetEndTime = 0;
		isChoosingBreak = false;
		timeRemaining = durations[currentMode];
		dispatch('timerStop', { mode: currentMode });
	}
	export function setRemainingTime(seconds: number) {
		timeRemaining = seconds;
		targetEndTime = Date.now() + seconds * 1000;
	}
</script>

<!-- BAGIAN HTML YANG SUDAH DI-REDESAIN TOTAL -->
<div class="pomodoro-bar">
	<!-- Lingkaran Timer -->
	<div class="timer-circle">
		<svg viewBox="0 0 100 100">
			<circle class="track" cx="50" cy="50" r={radius} />
			<circle
				class="progress"
				cx="50"
				cy="50"
				r={radius}
				stroke-dasharray={circumference}
				stroke-dashoffset={progressOffset}
			/>
		</svg>
		<div class="timer-content">
			<button
				on:click={isRunning ? pauseTimer : startTimer}
				class="play-pause-btn"
				aria-label={isRunning ? 'Pause' : 'Play'}
			>
				{#if isRunning}
					<Pause size={18} />
				{:else}
					<Play size={18} class="play-icon" />
				{/if}
			</button>
			<div class="time-text">{displayTime}</div>
		</div>
	</div>

	<!-- Tombol Istirahat -->
	<div class="break-buttons">
		<button
			class="break-btn"
			disabled={!isChoosingBreak}
			on:click={() => startBreak('short-break')}
		>
			<Coffee size={16} />
			<span>Istirahat {settings?.shortBreak || 5} mnt</span>
		</button>
		<button class="break-btn" disabled={!isChoosingBreak} on:click={() => startBreak('long-break')}>
			<Coffee size={16} />
			<span>Istirahat {settings?.longBreak || 15} mnt</span>
		</button>
	</div>

	<!-- Statistik Sesi -->
	<div class="session-stats">
		<p class="stats-title">Sesi Fokus Hari Ini</p>
		<div class="dots-container">
			{#each Array(16) as _, i}
				<span class="dot" class:completed={i < workSessionsToday}></span>
			{/each}
		</div>
	</div>
</div>

<audio bind:this={audio} src="/victory.mp3" preload="auto" />

<!-- BAGIAN STYLE BARU UNTUK TAMPILAN RESPONSIVE -->
<style>
	.pomodoro-bar {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		display: flex;
		flex-direction: column; /* Default: tumpuk ke bawah untuk mobile */
		align-items: center;
		gap: 1.5rem;
		background-color: #f1f5f9;
		padding: 1.5rem 1rem;
		border-radius: 1rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.timer-circle {
		position: relative;
		width: 240px; /* Sedikit lebih besar */
		height: 240px;
	}

	.timer-circle svg {
		transform: rotate(-90deg);
		width: 100%;
		height: 100%;
	}

	.timer-circle circle {
		fill: none;
		stroke-width: 5;
	}

	.timer-circle .track {
		stroke: #e2e8f0;
	}

	.timer-circle .progress {
		stroke: #22c55e;
		transition: stroke-dashoffset 0.3s linear;
	}

	.timer-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.play-pause-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #475569;
		padding: 0;
		margin-bottom: -4px;
	}
	.play-icon {
		margin-left: 4px;
	}

	.time-text {
		font-size: 2rem; /* text-4xl */
		font-weight: 700;
		color: #1e293b;
		font-feature-settings: 'tnum';
		font-variant-numeric: tabular-nums;
	}

	.break-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.break-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		background-color: #4b5563;
		color: #d1d5db;
	}

	.break-btn:not(:disabled) {
		background-color: #f97316;
		color: white;
	}

	.break-btn:not(:disabled):hover {
		background-color: #ea580c;
	}

	.session-stats {
		width: 100%;
		text-align: center;
	}

	.stats-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #475569;
		margin-bottom: 0.75rem;
	}

	.dots-container {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.5rem;
		max-width: 240px;
		margin: auto;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 9999px;
		background-color: #d1d5db;
		transition: background-color 0.3s;
	}

	.dot.completed {
		background-color: #22c55e;
	}

	/* Media Query untuk Desktop */
	@media (min-width: 768px) {
		.pomodoro-bar {
			flex-direction: row; /* Kembali ke horizontal */
			gap: 2rem;
			padding: 1rem;
		}
		.break-buttons {
			flex-direction: column;
		}
		.session-stats {
			margin-left: auto;
			text-align: left;
			width: auto;
		}
	}
</style>
