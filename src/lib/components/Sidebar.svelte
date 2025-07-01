<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { page } from '$app/stores';
	import { selectedProjectId } from '$lib/stores/projectStore';
	import AddProjectModal from '$lib/components/AddProjectModal.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { userProfile, session } from '$lib/stores/authStore';

	// Props dari +layout.svelte
	export let userName: string | null = null;
	export let userAvatar: string | null = null;
	// --- START: TERIMA PROP UNTUK MOBILE SIDBAR ---
	export let isSidebarOpen: boolean; // Terima state isSidebarOpen
	// --- END: TERIMA PROP UNTUK MOBILE SIDBAR ---

	let isModalOpen = false;
	let isTasksDropdownOpen = false; // <-- State untuk dropdown Tugas

	// --- Reactive variable untuk menandai link aktif ---
	$: activePath = $page.url.pathname;

	// --- Fungsi untuk membuka modal tambah proyek ---
	function openModal() {
		isModalOpen = true;
	}

	// --- Fungsi untuk handle project selection ---
	// Fungsi ini tidak lagi digunakan, navigasi ke proyek akan dilakukan dari halaman /projects.
	// Kita tetap sisakan, siapa tahu nanti perlu lagi.
	async function handleProjectSelection(projectId: string) {
		if (projectId === $selectedProjectId) {
			return;
		}
		selectedProjectId.set(projectId);
		await goto(`/`);
		await invalidateAll();
	}

	// --- Fungsi untuk navigasi ke halaman profile ---
	async function navigateToProfile() {
		await goto('/profile');
		// --- START: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
		if (window.innerWidth < 768) {
			// Contoh untuk breakpoint md (768px)
			isSidebarOpen = false;
		}
		// --- END: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
	}

	// --- Fungsi untuk navigasi ke halaman proyek ---
	async function navigateToProjects() {
		await goto('/projects');
		// --- START: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
		if (window.innerWidth < 768) {
			// Contoh untuk breakpoint md (768px)
			isSidebarOpen = false;
		}
		// --- END: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
	}

	// --- Fungsi untuk navigasi ke halaman tugas dengan status tertentu ---
	async function navigateToTaskStatus(status: 'to-do' | 'in-progress' | 'done') {
		await goto(`/tasks/${status}`);
		// --- START: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
		if (window.innerWidth < 768) {
			// Contoh untuk breakpoint md (768px)
			isSidebarOpen = false;
		}
		// --- END: TUTUP SIDBAR SETELAH NAVIGASI DI MOBILE ---
	}

	// --- Fungsi untuk toggle dropdown Tasks ---
	function toggleTasksDropdown() {
		isTasksDropdownOpen = !isTasksDropdownOpen;
	}
</script>

<aside
	class="fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 text-white flex flex-col p-6 shadow-2xl
           transform -translate-x-full transition-transform duration-300 ease-in-out
           md:relative md:translate-x-0 md:w-72"
	class:translate-x-0={isSidebarOpen}
>
	<div class="flex flex-col items-center mb-8 text-center">
		<button on:click={navigateToProfile}>
			{#if userAvatar}
				<img
					src={userAvatar}
					alt="User Avatar"
					class="w-20 h-20 rounded-full border-4 border-gray-700 object-cover shadow-xl hover:ring-2 hover:ring-purple-500 transition-all duration-200 cursor-pointer"
				/>
			{:else}
				<div
					class="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-4xl font-bold text-white border-4 border-gray-700 shadow-xl cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all duration-200"
				>
					{#if userName && userName.length > 0}
						{userName.charAt(0).toUpperCase()}
					{:else}
						U
					{/if}
				</div>
			{/if}
		</button>
		<p class="mt-3 text-lg font-semibold text-gray-100">{userName || 'Guest'}</p>
		<p class="text-xs text-gray-400 max-w-full truncate">
			{$session?.user?.email || 'Email tidak tersedia'}
		</p>
	</div>

	<nav class="flex-1 space-y-4">
		<button
			on:click={navigateToProfile}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all duration-200 {$page
				.url.pathname === '/profile'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<svg
				class="w-6 h-6 mr-3"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5.121 17.804A11.952 11.952 0 0112 15c2.316 0 4.542.493 6.697 1.304M12 12a4 4 0 100-8 4 4 0 000 8zm-2.457-3.697a2 2 0 112.457 2.457 2 2 0 01-2.457-2.457z"
				></path></svg
			>
			Profil
		</button>

		<button
			on:click={navigateToProjects}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all duration-200 {$page
				.url.pathname === '/projects'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<svg
				class="w-6 h-6 mr-3"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				></path></svg
			>
			Proyek
		</button>

		<a
			href="/tools/pomodoro"
			class="flex items-center p-4 rounded-lg hover:bg-gray-700 transition-colors"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				class="bi bi-stopwatch-fill"
				viewBox="0 0 16 16"
			>
				<path
					d="M6.5 0a.5.5 0 0 0 0 1H7v1.07A7.001 7.001 0 0 0 8 16a7 7 0 0 0 5.29-11.584l.013-.012.354-.354.353.354a.5.5 0 1 0 .707-.707l-1.414-1.415a.5.5 0 1 0-.707.707l.354.354-.354.354-.012.012A6.97 6.97 0 0 0 9 2.071V1h.5a.5.5 0 0 0 0-1zm2 5.6V9a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1 0-1h3V5.6a.5.5 0 1 1 1 0"
				/>
			</svg>
			<span class="ml-3 text-white font-medium">Pomodoro Timer</span>
		</a>
	</nav>

	<div class="mt-auto">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-widest">Projects</h3>
			<button
				on:click={openModal}
				class="text-gray-400 hover:text-white transition-colors duration-200"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path></svg
				>
			</button>
		</div>
		<p class="text-gray-500 text-sm italic">
			Pilih proyek di halaman "Proyek" untuk melihat Kanban board.
		</p>
	</div>
</aside>

<AddProjectModal
	isOpen={isModalOpen}
	on:close={() => (isModalOpen = false)}
	on:projectAdded={invalidateAll}
/>

<style>
	/* Styling for the dropdown dot */
	.dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 12px;
		transform: translateY(-1px);
	}

	/* Styling for the scrollbar (as before) */
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: #1f2937;
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: #4b5563;
		border-radius: 10px;
		border: 2px solid #1f2937;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: #6b7280;
	}
</style>
