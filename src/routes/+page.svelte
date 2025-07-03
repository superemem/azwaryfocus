<!-- routes/+page.svelte -->
<script>
	import { goto } from '$app/navigation';
</script>

<div class="flex flex-col items-center justify-center h-screen bg-white">
	<h1 class="text-3xl font-bold mb-3">Selamat datang Azwary Team!</h1>
	<p class="text-base font-medium m-6">
		let's focus today. Jangan lupa berdoa dulu ya sebelum mulai bekerja
	</p>
	<button class="bg-blue-600 text-white py-2 px-4 rounded" on:click={() => goto('/login')}>
		Masuk ke Aplikasi
	</button>
</div>
