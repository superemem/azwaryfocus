import { writable, derived, get } from 'svelte/store';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;

export const timerState = writable<'idle' | 'running' | 'paused'>('idle');
export const remainingTime = writable(WORK_DURATION);
export const sessionCount = writable(0);
export const timerType = writable<'work' | 'short-break' | 'long-break'>('work');

let interval: number | undefined;
let currentDuration = WORK_DURATION;

// Format MM:SS
export const formattedTime = derived(remainingTime, ($t) => {
	const m = Math.floor($t / 60)
		.toString()
		.padStart(2, '0');
	const s = ($t % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
});

// Persentase progres
export const progressPercentage = derived(remainingTime, ($t) => {
	if (currentDuration === 0) return 0;
	return (1 - $t / currentDuration) * 100;
});

export function startTimer() {
	if (interval) return;

	timerState.set('running');

	interval = window.setInterval(() => {
		remainingTime.update((time) => {
			if (time <= 0) {
				handleSessionEnd();
				return 0; // Biar nggak negatif
			}
			return time - 1;
		});
	}, 1000);
}

function handleSessionEnd() {
	pauseTimer();

	const currentType = get(timerType);

	if (currentType === 'work') {
		const currentSession = get(sessionCount) + 1;
		sessionCount.set(currentSession);

		if (currentSession % 4 === 0) {
			// Long break
			timerType.set('long-break');
			currentDuration = LONG_BREAK_DURATION;
		} else {
			// Short break
			timerType.set('short-break');
			currentDuration = SHORT_BREAK_DURATION;
		}
	} else {
		// Setelah break, kembali ke kerja
		timerType.set('work');
		currentDuration = WORK_DURATION;
	}

	remainingTime.set(currentDuration);
	startTimer(); // Mulai otomatis sesi selanjutnya
}

export function pauseTimer() {
	timerState.set('paused');
	if (interval) {
		clearInterval(interval);
		interval = undefined;
	}
}

export function resetTimer(resetAll = true) {
	if (interval) {
		clearInterval(interval);
		interval = undefined;
	}
	timerState.set('idle');

	if (resetAll) {
		timerType.set('work');
		currentDuration = WORK_DURATION;
		remainingTime.set(WORK_DURATION);
		sessionCount.set(0);
	} else {
		// Reset waktu tapi pertahankan sesi & type
		const currentType = get(timerType);
		if (currentType === 'work') currentDuration = WORK_DURATION;
		else if (currentType === 'short-break') currentDuration = SHORT_BREAK_DURATION;
		else currentDuration = LONG_BREAK_DURATION;

		remainingTime.set(currentDuration);
	}
}

export function setTimerType(type: 'work' | 'short-break' | 'long-break') {
	pauseTimer();
	timerType.set(type);

	if (type === 'work') currentDuration = WORK_DURATION;
	else if (type === 'short-break') currentDuration = SHORT;
}
