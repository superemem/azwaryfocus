<script lang="ts">
	// 1. HAPUS SEMUA IMPORT LAMA, GUNAKAN YANG MODERN
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { User, LayoutDashboard, ListTodo, Clock, Trophy } from '@lucide/svelte'; // <-- Tambahkan Trophy

	// 2. GUNAKAN $props() UNTUK MENERIMA DATA (CARA SVELTE 5)
	let { userName, userAvatar, session, isSidebarOpen } = $props<{
		userName: string | null;
		userAvatar: string | null;
		session: Session | null;
		isSidebarOpen: boolean;
	}>();

	const dispatch = createEventDispatcher();

	// 3. STATE LOKAL UNTUK UI (PAKAI RUNES)
	let isTasksDropdownOpen = $state(false);

	// 4. FUNGSI-FUNGSI YANG SUDAH DIRAPIKAN
	function closeSidebarOnMobile() {
		// Beri tahu parent (layout) untuk menutup sidebar
		if (window.innerWidth < 768) {
			dispatch('close');
		}
	}

	async function navigateTo(path: string) {
		await goto(path);
		closeSidebarOnMobile();
	}

	function toggleTasksDropdown() {
		isTasksDropdownOpen = !isTasksDropdownOpen;
	}

	function openAddProjectModal() {
		// Beri tahu parent (layout) untuk membuka modal
		dispatch('openAddProjectModal');
		closeSidebarOnMobile();
	}
</script>

<!-- ======================================================= -->
<!-- BAGIAN HTML LENGKAP (TIDAK ADA YANG DIHAPUS) -->
<!-- ======================================================= -->
<aside
	class="fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col p-6 shadow-2xl transform -translate-x-full transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-72"
	class:translate-x-0={isSidebarOpen}
>
	<div class="flex flex-col items-center mb-8 text-center">
		<button on:click={() => navigateTo('/profile')}>
			{#if userAvatar}
				<img
					src={userAvatar}
					alt="User Avatar"
					class="w-20 h-20 rounded-full border-4 border-gray-700 object-cover shadow-xl hover:ring-2 hover:ring-purple-500 transition-all"
				/>
			{:else}
				<div
					class="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-4xl font-bold text-white border-4 border-gray-700 shadow-xl hover:ring-2 hover:ring-purple-500 transition-all"
				>
					{#if userName && userName.length > 0}
						{userName.charAt(0).toUpperCase()}
					{:else}
						G
					{/if}
				</div>
			{/if}
		</button>
		<p class="mt-3 text-lg font-semibold text-gray-100">{userName || 'Guest'}</p>
		<p class="text-xs text-gray-400 max-w-full truncate">
			{session?.user?.email || 'Email tidak tersedia'}
		</p>
	</div>

	<nav class="flex-1 space-y-2">
		<button
			on:click={() => navigateTo('/profile')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/profile'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<User class="w-5 h-5 mr-3" />
			Profil
		</button>

		<button
			on:click={() => navigateTo('/projects')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url.pathname.startsWith(
				'/projects'
			)
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<LayoutDashboard class="w-5 h-5 mr-3" />
			Proyek
		</button>

		<!-- Dropdown Tugas (sudah benar) -->
		<div class="space-y-1">
			<button
				on:click={toggleTasksDropdown}
				class="w-full flex items-center justify-between p-3 rounded-xl font-semibold text-gray-300 hover:bg-gray-800"
			>
				<span class="flex items-center">
					<ListTodo class="w-5 h-5 mr-3" />
					Tugas
				</span>
				<svg
					class="w-4 h-4 transform transition-transform"
					class:rotate-90={isTasksDropdownOpen}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path></svg
				>
			</button>

			{#if isTasksDropdownOpen}
				<div class="ml-6 space-y-1">
					<button
						on:click={() => navigateTo('/tasks/to-do')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/to-do'}>• To Do</button
					>
					<button
						on:click={() => navigateTo('/tasks/in-progress')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/in-progress'}>• In Progress</button
					>
					<button
						on:click={() => navigateTo('/tasks/done')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/done'}>• Done</button
					>
				</div>
			{/if}
		</div>

		<hr class="border-gray-700" />

		<button
			on:click={() => navigateTo('/tools/pomodoro')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/tools/pomodoro'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<Clock class="w-5 h-5 mr-3" />
			Pomodoro
		</button>

		<!-- ======================================================= -->
		<!-- TOMBOL BARU UNTUK LEADERBOARD -->
		<!-- ======================================================= -->
		<button
			on:click={() => navigateTo('/leaderboard')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/leaderboard'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
		>
			<Trophy class="w-5 h-5 mr-3" />
			Leaderboard
		</button>
	</nav>

	<div class="mt-auto">
		<button
			on:click={openAddProjectModal}
			class="w-full flex items-center justify-center p-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
		>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 6v6m0 0v6m0-6h6m-6 0H6"
				></path></svg
			>
			Proyek Baru
		</button>
	</div>
</aside>
