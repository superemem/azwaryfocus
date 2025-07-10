<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';
	import type { PageData } from './$types';

	// 1. TERIMA DATA DARI SERVER & LAYOUT
	// `data.profile` dan `data.session` datang dari layout.
	// `data.monthlyStats` dan `data.projectStats` datang dari +page.server.ts di atas.
	let { data } = $props<PageData>();

	// 2. STATE LOKAL UNTUK UI
	let showEditModal = $state(false);

	// 3. FUNGSI UNTUK HANDLE UPDATE (DARI MODAL)
	// Fungsi ini sekarang tidak perlu ada di sini, karena sudah ada di layout utama.
	// Modal akan di-handle oleh layout.
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-6">Profil Pengguna</h1>

	{#if data.session && data.profile}
		<div class="bg-white p-6 rounded-lg shadow-md mb-8">
			<div class="flex flex-col items-center text-center">
				{#if data.profile.avatar_url}
					<img
						src={data.profile.avatar_url}
						alt="Avatar"
						class="w-24 h-24 rounded-full object-cover border-4 border-gray-200 mx-auto"
					/>
				{:else}
					<div
						class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-5xl font-bold text-gray-500 mx-auto"
					>
						{(data.profile.username?.charAt(0) || 'G').toUpperCase()}
					</div>
				{/if}
				<div>
					<h2 class="text-3xl font-semibold text-gray-900 mt-4">
						{data.profile.username || 'Pengguna'}
					</h2>
					<p class="text-gray-600">{data.session.user.email || 'Email tidak tersedia'}</p>
					<!-- Jika ada job_title di profil, bisa ditambahkan di sini -->
				</div>
				<!-- Tombol Edit Profil sekarang ada di layout utama, jadi tidak perlu di sini -->
			</div>
		</div>

		<!-- Statistik Tugas dan Proyek -->
		<h3 class="text-2xl font-bold text-gray-800 mb-4">Statistik Produktivitas Bulan Ini</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
			<!-- TO DO -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-blue-500">
				<p class="text-gray-500">Rencana Tugas</p>
				<p class="text-4xl font-bold text-blue-600 mt-1">{data.monthlyStats.toDo}</p>
			</div>

			<!-- IN PROGRESS -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-yellow-500">
				<p class="text-gray-500">Tugas Dikerjakan</p>
				<p class="text-4xl font-bold text-yellow-600 mt-1">{data.monthlyStats.inProgress}</p>
			</div>

			<!-- DONE -->
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-green-500">
				<p class="text-gray-500">Tugas Selesai</p>
				<p class="text-4xl font-bold text-green-600 mt-1">{data.monthlyStats.done}</p>
			</div>
		</div>

		<h3 class="text-2xl font-bold text-gray-800 mb-4">Statistik Proyek</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-purple-500">
				<p class="text-gray-500">Proyek Diinisiasi</p>
				<p class="text-5xl font-bold text-purple-600 mt-2">{data.projectStats.initiated}</p>
			</div>
			<div class="bg-white p-6 rounded-lg shadow-md border-b-4 border-teal-500">
				<p class="text-gray-500">Proyek Diundang</p>
				<p class="text-5xl font-bold text-teal-600 mt-2">{data.projectStats.invited}</p>
			</div>
		</div>
	{:else}
		<p class="text-gray-500">Memuat data profil atau silakan login...</p>
	{/if}
</div>
