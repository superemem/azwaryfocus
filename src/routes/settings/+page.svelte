<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import toast from 'svelte-5-french-toast';

	let { data, form } = $props<PageData & { form?: ActionData }>();

	// --- DAFTAR OPSI SUARA ---
	const ambientSounds = [
		{ id: 'none', name: 'Tidak Ada Suara' },
		{ id: '/suara-ombak-di-pantai.mp3', name: 'Suara Ombak' },
		{ id: '/lofi-girl.mp3', name: 'Lo-Fi Beat 1' },
		{ id: '/lofi-girl-2.mp3', name: 'Lo-Fi Beat 2' },
		{ id: '/lofi-background-chill.mp3', name: 'Lo-Fi Chill' },
		{ id: '/lofi-ambient.mp3', name: 'Lo-Fi Ambient' },
		{ id: '/ambient-lofi.mp3', name: 'Ambient Lo-Fi Chill' }
	];

	const notificationSounds = [
		{ id: '/sounds/victory.mp3', name: 'Victory' },
		{ id: '/bell.mp3', name: 'Bel' },
		{ id: '/lonceng.mp3', name: 'Lonceng' },
		{ id: '/terompet-kemenangan.wav', name: 'Terompet Kemenangan' },
		{ id: '/happy-win.mp3', name: 'Happy Win' },
		{ id: '/intro-news.mp3', name: 'News Intro' }
	];
	// -------------------------

	const defaultSettings = {
		work: 25,
		shortBreak: 5,
		longBreak: 15,
		workSound: 'none',
		endSessionSound: '/sounds/victory.mp3',
		endBreakSound: '/bell.mp3'
	};

	let settings = $state({ ...defaultSettings, ...data.profile?.pomodoro_settings });

	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	// --- FUNGSI PREVIEW SUARA ---
	let previewAudio: HTMLAudioElement;

	function playPreview(event: Event) {
		const target = event.target as HTMLSelectElement;
		const soundSrc = target.value;

		if (soundSrc && soundSrc !== 'none') {
			previewAudio.src = soundSrc;
			previewAudio.play().catch((e) => console.error('Audio play failed:', e));
		}
	}
</script>

<div class="p-8 max-w-2xl mx-auto">
	<h1 class="text-4xl font-bold text-gray-800 mb-2">Pengaturan</h1>
	<p class="text-gray-500 mb-8">Sesuaikan alur kerja Pomodoro sesuai gaya Anda.</p>

	<div class="bg-white p-8 rounded-lg shadow-md">
		<form method="POST" use:enhance>
			<div class="space-y-8">
				<!-- Pengaturan Durasi -->
				<fieldset class="space-y-6">
					<legend class="text-lg font-medium text-gray-900">Durasi Timer</legend>
					<div>
						<label for="work" class="block text-sm font-medium text-gray-700"
							>Sesi Fokus (menit)</label
						>
						<input
							type="number"
							name="work"
							id="work"
							bind:value={settings.work}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
							min="1"
						/>
					</div>

					<div>
						<label for="shortBreak" class="block text-sm font-medium text-gray-700"
							>Istirahat Pendek (menit)</label
						>
						<input
							type="number"
							name="shortBreak"
							id="shortBreak"
							bind:value={settings.shortBreak}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
							min="1"
						/>
					</div>

					<div>
						<label for="longBreak" class="block text-sm font-medium text-gray-700"
							>Istirahat Panjang (menit)</label
						>
						<input
							type="number"
							name="longBreak"
							id="longBreak"
							bind:value={settings.longBreak}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
							min="1"
						/>
					</div>
				</fieldset>

				<div class="border-t border-gray-200"></div>

				<!-- Pengaturan Suara -->
				<fieldset class="space-y-6">
					<legend class="text-lg font-medium text-gray-900">Pengaturan Suara</legend>
					<div>
						<label for="workSound" class="block text-sm font-medium text-gray-700"
							>Suara Latar Saat Sesi Fokus</label
						>
						<select
							name="workSound"
							id="workSound"
							bind:value={settings.workSound}
							onchange={playPreview}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						>
							{#each ambientSounds as sound}
								<option value={sound.id}>{sound.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="endSessionSound" class="block text-sm font-medium text-gray-700"
							>Notifikasi Sesi Fokus Selesai</label
						>
						<select
							name="endSessionSound"
							id="endSessionSound"
							bind:value={settings.endSessionSound}
							onchange={playPreview}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						>
							{#each notificationSounds as sound}
								<option value={sound.id}>{sound.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="endBreakSound" class="block text-sm font-medium text-gray-700"
							>Notifikasi Sesi Istirahat Selesai</label
						>
						<select
							name="endBreakSound"
							id="endBreakSound"
							bind:value={settings.endBreakSound}
							onchange={playPreview}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						>
							{#each notificationSounds as sound}
								<option value={sound.id}>{sound.name}</option>
							{/each}
						</select>
					</div>
				</fieldset>
			</div>

			<div class="mt-8 text-right">
				<button
					type="submit"
					class="inline-flex justify-center rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				>
					Simpan Pengaturan
				</button>
			</div>
		</form>
	</div>
</div>

<!-- Audio player untuk preview, tidak terlihat oleh pengguna -->
<audio bind:this={previewAudio}></audio>
