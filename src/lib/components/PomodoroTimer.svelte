<script lang="ts">
	import { onDestroy } from 'svelte';

	// Durasi dalam detik
	let workDuration = 25 * 60;
	let breakDuration = 5 * 60;
	let longBreakDuration = 15 * 60;

	let timeRemaining = workDuration;
	let isRunning = false;
	let currentMode: 'work' | 'break' = 'work';
	let cycles = 0; // Menghitung siklus untuk istirahat panjang

	let intervalId: number | null = null;
	let audio: HTMLAudioElement;

	// Variabel untuk SVG progress bar
	let radius = 100;
	let circumference = 2 * Math.PI * radius;

	// Variabel reaktif untuk total durasi dan offset stroke SVG
	let totalDuration = workDuration;
	$: totalDuration =
		currentMode === 'work'
			? workDuration
			: currentMode === 'break' && timeRemaining === longBreakDuration
				? longBreakDuration
				: breakDuration;
	$: progress = timeRemaining / totalDuration;
	$: strokeOffset = circumference - progress * circumference;

	// Fungsi untuk memformat waktu ke MM:SS
	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Fungsi kontrol timer
	function startTimer() {
		if (!isRunning) {
			isRunning = true;
			intervalId = setInterval(() => {
				if (timeRemaining > 0) {
					timeRemaining--;
				} else {
					// Timer selesai
					clearInterval(intervalId!);
					isRunning = false;
					playAlarm();
					switchMode();
					startTimer(); // Mulai timer mode baru secara otomatis
				}
			}, 1000);
		}
	}

	function pauseTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			isRunning = false;
		}
	}

	function resetTimer() {
		pauseTimer();
		if (currentMode === 'work') {
			timeRemaining = workDuration;
		} else if (currentMode === 'break') {
			timeRemaining = breakDuration;
		} else {
			// Istirahat panjang
			timeRemaining = longBreakDuration;
		}
	}

	function switchMode() {
		if (currentMode === 'work') {
			cycles++;
			if (cycles % 4 === 0) {
				currentMode = 'break';
				timeRemaining = longBreakDuration;
				alert('Saatnya istirahat panjang!');
			} else {
				currentMode = 'break';
				timeRemaining = breakDuration;
				alert('Saatnya istirahat!');
			}
		} else {
			currentMode = 'work';
			timeRemaining = workDuration;
			alert('Saatnya kerja!');
		}
	}

	function playAlarm() {
		if (audio) {
			audio.play();
		}
	}

	// Bersihkan interval saat komponen dihancurkan
	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<div
	class="p-8 max-w-lg mx-auto bg-slate-900 rounded-3xl shadow-2xl space-y-6 text-center mt-12 text-white"
>
	<h3 class="text-4xl font-extrabold tracking-tight">Pomodoro Timer</h3>

	<div class="relative w-64 h-64 mx-auto my-8">
		<svg
			class="w-full h-full transform -rotate-90"
			viewBox="0 0 220 220"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				class="text-gray-700"
				stroke="currentColor"
				stroke-width="12"
				fill="#2d3748"
				r="100"
				cx="110"
				cy="110"
				stroke-opacity="0.3"
			/>
			<circle
				class="transition-all duration-100 ease-linear"
				stroke={currentMode === 'work' ? '#EF4444' : '#3B82F6'}
				stroke-width="12"
				stroke-linecap="round"
				fill="transparent"
				r="100"
				cx="110"
				cy="110"
				style={`stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeOffset};`}
			/>
		</svg>

		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<div class="text-6xl font-mono font-bold tracking-wider z-10">
				{formatTime(timeRemaining)}
			</div>
			<button
				on:click={isRunning ? pauseTimer : startTimer}
				class="absolute bottom-12 w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
			>
				{#if !isRunning}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-10 w-10"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-10 w-10"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<div class="flex justify-center gap-4 mt-8">
		<button
			on:click={() => {
				currentMode = 'work';
				resetTimer();
			}}
			class={`px-6 py-2 rounded-full font-bold transition-colors ${currentMode === 'work' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
		>
			Kerja (25m)
		</button>
		<button
			on:click={() => {
				currentMode = 'break';
				timeRemaining = breakDuration;
				resetTimer();
			}}
			class={`px-6 py-2 rounded-full font-bold transition-colors ${currentMode === 'break' && timeRemaining === breakDuration ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
		>
			Istirahat (5m)
		</button>
		<button
			on:click={() => {
				currentMode = 'break';
				timeRemaining = longBreakDuration;
				resetTimer();
			}}
			class={`px-6 py-2 rounded-full font-bold transition-colors ${currentMode === 'break' && timeRemaining === longBreakDuration ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
		>
			Istirahat Panjang (15m)
		</button>
	</div>

	<button
		on:click={resetTimer}
		class="bg-gray-500 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl hover:bg-gray-600 transition-transform transform hover:scale-105 mt-6"
	>
		Reset
	</button>
</div>

<audio bind:this={audio} src="/alarm-sound.wav" preload="auto"></audio>

<style>
	/* Kamu bisa tambahkan style kustom di sini jika diperlukan */
</style>
