<script lang="ts">
	import FocusTimerUI from '$lib/components/FocusTimerUI.svelte';
	import { onMount } from 'svelte';

	// Variabel reaktif untuk menyimpan tanggal dan jam
	let todayDate: string = '';
	let currentClock: string = '';

	// Fungsi untuk mengupdate tanggal dan jam
	function updateDateTime() {
		const now = new Date();

		// Format tanggal (contoh: Senin, 30 Juni 2025)
		const dateOptions: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		todayDate = now.toLocaleDateString('id-ID', dateOptions);

		// Format jam (contoh: 15:03:31)
		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		};
		currentClock = now.toLocaleTimeString('id-ID', timeOptions);
	}

	// Panggil updateDateTime saat komponen dimuat, lalu update setiap detik
	onMount(() => {
		updateDateTime(); // Panggil pertama kali
		const interval = setInterval(updateDateTime, 1000); // Update setiap 1 detik

		// Hapus interval saat komponen dihancurkan untuk mencegah memory leak
		return () => clearInterval(interval);
	});
</script>

<div class="p-12 ml-10 space-y-8 max-w-7xl mx-auto">
	<div class="flex justify-between items-center">
		<h1 class="text-4xl font-bold text-blue-900">Azwary Focus</h1>
		<div class="text-right text-gray-500 font-semibold">
			<p class="text-lg">{todayDate}</p>
			<p class="text-sm">{currentClock}</p>
		</div>
	</div>

	<FocusTimerUI />

	<div class="flex flex-col md:flex-row gap-8">
		<div class="md:w-1/2 mx-auto"></div>

		<div class="md:w-1/2 space-y-4">
			<h2 class="text-2xl font-semibold text-gray-200">Daftar Tugas (Dinonaktifkan Sementara)</h2>
			<p class="text-gray-400">
				Fitur daftar tugas untuk Pomodoro akan kita aktifkan setelah timer-nya berfungsi.
			</p>
		</div>
	</div>
</div>
