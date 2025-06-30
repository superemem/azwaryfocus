<script lang="ts">
	import {
		formattedTime,
		timerState,
		timerType,
		startTimer,
		pauseTimer,
		resetTimer,
		setTimerType,
		sessionCount,
		progressPercentage
	} from '$lib/stores/timerStore';

	// Mendapatkan nilai store
	$: currentTime = $formattedTime;
	$: state = $timerState;
	$: currentType = $timerType;
	$: sessionCounter = $sessionCount;
	$: progress = $progressPercentage;

	// Audio element untuk alarm
	let alarm: HTMLAudioElement;

	// Derived store untuk menentukan warna progres
	$: progressColor = currentType === 'work' ? '#f87171' : '#34d399'; // Merah untuk kerja, hijau untuk istirahat

	// Cek jika waktu habis, mainkan suara alarm
	$: if (state === 'running' && $formattedTime === '00:00') {
		if (alarm) {
			alarm.play();
		}
		// Biarkan timerStore yang menangani transisi sesi berikutnya secara otomatis
		// Jadi tidak perlu memanggil setTimerType di sini.
		// Cukup pause timer-nya.
		pauseTimer();
	}
</script>

<audio bind:this={alarm} src="/alarm-sound.wav" preload="auto"></audio>

<div class="max-w-5xl mx-auto p-6 space-y-6 text-[#004aad]">
	<div class="flex justify-between items-start">
		<div>
			<h1 class="text-3xl font-bold">POMODORO TIMER</h1>
			<p class="mt-1 max-w-md text-sm text-[#004aad] font-medium">
				Temukan kekuatan fokus yang bisa membantumu menyelesaikan tugas–tugas yang menumpuk
			</p>
		</div>
	</div>

	<div class="rounded-3xl max-w-screen-lg overflow-hidden flex shadow-xl">
		<div class="bg-black text-white w-1/2 p-8 flex flex-col justify-between items-center gap-4">
			<div class="text-7xl font-extrabold">{currentTime}</div>
			<button class="border border-white rounded-full px-4 py-2 font-semibold text-sm"
				>FOCUS TIME</button
			>

			<div class="flex gap-6">
				<button
					on:click={state === 'running' ? pauseTimer : startTimer}
					class="p-3 rounded-full bg-blue-700 hover:bg-blue-600 transition"
				>
					{#if state === 'running'}
						<svg class="w-6 h-6" fill="none" stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.26a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
							/><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
					{/if}
				</button>

				<button
					on:click={() => resetTimer(true)}
					class="p-3 rounded-full bg-blue-700 hover:bg-blue-600 transition"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<polyline points="23 4 23 10 17 10"></polyline>
						<polyline points="1 20 1 14 7 14"></polyline>
						<path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path>
						<path d="M20.49 15A9 9 0 015.87 18.36L1 14"></path>
					</svg>
				</button>
			</div>
		</div>

		<div class="bg-[#004aad] text-white w-1/2 p-8 flex flex-col justify-between gap-6">
			<div>
				<p class="text-sm text-white/80">FOCUS SESSION</p>
				<p class="font-bold text-lg">{sessionCounter} SESI FOKUS HARI INI</p>
			</div>

			<div class="flex justify-center"></div>

			<div class="flex flex-col gap-2">
				<button
					on:click={() => setTimerType('short-break')}
					class="rounded-full border border-white py-2 font-semibold hover:bg-white hover:text-[#004aad] transition"
				>
					5 MINUTES
				</button>
				<button
					on:click={() => setTimerType('long-break')}
					class="rounded-full border border-white py-2 font-semibold hover:bg-white hover:text-[#004aad] transition"
				>
					15 MINUTES
				</button>
			</div>
		</div>
	</div>
</div>
