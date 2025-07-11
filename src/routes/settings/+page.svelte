<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import toast from 'svelte-5-french-toast';

	let { data, form } = $props<PageData & { form?: ActionData }>();

	// Ambil pengaturan dari data layout, atau gunakan default jika tidak ada
	const defaultSettings = { work: 25, shortBreak: 5, longBreak: 15 };
	let settings = $state(data.profile?.pomodoro_settings || defaultSettings);

	// Tampilkan notifikasi saat form berhasil atau gagal
	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
		} else if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<div class="p-8 max-w-2xl mx-auto">
	<h1 class="text-4xl font-bold text-gray-800 mb-2">Pengaturan</h1>
	<p class="text-gray-500 mb-8">Sesuaikan alur kerja Pomodoro sesuai gaya Anda.</p>

	<div class="bg-white p-8 rounded-lg shadow-md">
		<form method="POST" use:enhance>
			<div class="space-y-6">
				<div>
					<label for="work" class="block text-sm font-medium text-gray-700"
						>Durasi Sesi Fokus (menit)</label
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
