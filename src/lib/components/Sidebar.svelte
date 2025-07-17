<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import {
		User,
		LayoutDashboard,
		ListTodo,
		Clock,
		Trophy,
		Users,
		ChevronsLeft,
		Plus
	} from '@lucide/svelte';

	let { userName, userAvatar, session, isSidebarOpen, userRole, isSidebarCollapsed } = $props<{
		userName: string | null;
		userAvatar: string | null;
		session: Session | null;
		isSidebarOpen: boolean;
		userRole: string | null;
		isSidebarCollapsed: boolean;
	}>();

	const dispatch = createEventDispatcher();
	let isTasksDropdownOpen = $state(false);

	// --- AWAL PERBAIKAN ---

	// 1. Buat state untuk menampung lebar window
	let windowWidth = $state(0);

	// 2. Gunakan $effect untuk memantau perubahan ukuran window di sisi client
	$effect(() => {
		const handleResize = () => {
			windowWidth = window.innerWidth;
		};

		// Set nilai awal & tambahkan event listener
		handleResize();
		window.addEventListener('resize', handleResize);

		// Cleanup function untuk hapus listener saat komponen hancur
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// 3. Ganti `$` dengan `$derived` untuk variabel turunan
	let isCollapsedDesktop = $derived(isSidebarCollapsed && windowWidth >= 768);
	let showText = $derived(isSidebarOpen || !isCollapsedDesktop);

	// --- AKHIR PERBAIKAN ---

	function closeSidebarOnMobile() {
		// Pengecekan `windowWidth` lebih aman daripada `window.innerWidth` langsung
		if (windowWidth < 768) {
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
		dispatch('openAddProjectModal');
		closeSidebarOnMobile();
	}
</script>

<aside
	class="fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white shadow-2xl transition-all duration-300 ease-in-out h-screen -translate-x-full md:translate-x-0 p-4"
	class:translate-x-0={isSidebarOpen}
	class:md:w-72={!isSidebarCollapsed}
	class:md:w-20={isSidebarCollapsed}
	class:w-72={isSidebarOpen}
	class:md:p-2={isSidebarCollapsed}
>
	<button
		onclick={() => (isSidebarCollapsed = !isSidebarCollapsed)}
		class="absolute -right-3 top-8 z-10 hidden md:flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:outline-none"
		title={isSidebarCollapsed ? 'Buka sidebar' : 'Lipat sidebar'}
	>
		<ChevronsLeft class="w-4 h-4 transition-transform {isSidebarCollapsed ? 'rotate-180' : ''}" />
	</button>

	<div class="mb-8 mt-4">
		<button
			onclick={() => navigateTo('/profile')}
			class="flex items-center w-full p-2 rounded-lg hover:bg-gray-800 transition-colors"
			class:justify-center={isSidebarCollapsed && !isSidebarOpen}
		>
			{#if userAvatar}
				<img
					src={userAvatar}
					alt="User Avatar"
					class="w-10 h-10 rounded-full border-2 border-gray-700 object-cover flex-shrink-0"
				/>
			{:else}
				<div
					class="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-xl font-bold text-white border-2 border-gray-700 flex-shrink-0"
				>
					{#if userName && userName.length > 0}{userName.charAt(0).toUpperCase()}{:else}G{/if}
				</div>
			{/if}

			{#if showText}
				<div class="ml-3 text-left overflow-hidden">
					<p class="text-sm font-semibold text-gray-100 leading-tight truncate">
						{userName || 'Guest'}
					</p>
					<p class="text-xs text-gray-400 max-w-full truncate leading-tight">
						{session?.user?.email || 'Email tidak tersedia'}
					</p>
				</div>
			{/if}
		</button>
	</div>

	<nav class="flex-1 space-y-2">
		<button
			onclick={() => navigateTo('/profile')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/profile'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:justify-center={isSidebarCollapsed && !isSidebarOpen}
			title="Profil"
		>
			<User class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
			{#if showText}<span>Profil</span>{/if}
		</button>

		<button
			onclick={() => navigateTo('/projects')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url.pathname.startsWith(
				'/projects'
			)
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:justify-center={isSidebarCollapsed && !isSidebarOpen}
			title="Proyek"
		>
			<LayoutDashboard class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
			{#if showText}<span>Proyek</span>{/if}
		</button>

		<div class="space-y-1">
			<button
				onclick={toggleTasksDropdown}
				class="w-full flex items-center justify-between p-3 rounded-xl font-semibold text-gray-300 hover:bg-gray-800"
				title="Tugas"
			>
				<span
					class="flex items-center"
					class:w-full={isSidebarCollapsed && !isSidebarOpen}
					class:justify-center={isSidebarCollapsed && !isSidebarOpen}
				>
					<ListTodo class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
					{#if showText}<span>Tugas</span>{/if}
				</span>
				{#if showText}
					<svg
						class="w-4 h-4 transform transition-transform"
						class:rotate-90={isTasksDropdownOpen}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				{/if}
			</button>
			{#if isTasksDropdownOpen && showText}
				<div class="ml-6 space-y-1">
					<button
						onclick={() => navigateTo('/tasks/to-do')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/to-do'}>• To Do</button
					>
					<button
						onclick={() => navigateTo('/tasks/in-progress')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/in-progress'}>• In Progress</button
					>
					<button
						onclick={() => navigateTo('/tasks/done')}
						class="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700"
						class:bg-purple-700={$page.url.pathname === '/tasks/done'}>• Done</button
					>
				</div>
			{/if}
		</div>

		<hr class="border-gray-700" />

		{#if userRole === 'supervisor'}
			<button
				onclick={() => navigateTo('/team')}
				class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
					.pathname === '/team'
					? 'bg-purple-600 text-white shadow-lg'
					: 'text-gray-300 hover:bg-gray-800'}"
				class:justify-center={isSidebarCollapsed && !isSidebarOpen}
				title="Tim"
			>
				<Users class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
				{#if showText}<span>Tim</span>{/if}
			</button>
		{/if}

		<button
			onclick={() => navigateTo('/tools/pomodoro')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/tools/pomodoro'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:justify-center={isSidebarCollapsed && !isSidebarOpen}
			title="Pomodoro"
		>
			<Clock class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
			{#if showText}<span>Pomodoro</span>{/if}
		</button>

		<button
			onclick={() => navigateTo('/leaderboard')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/leaderboard'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:justify-center={isSidebarCollapsed && !isSidebarOpen}
			title="Leaderboard"
		>
			<Trophy class="w-5 h-5 flex-shrink-0 {showText ? 'mr-3' : ''}" />
			{#if showText}<span>Leaderboard</span>{/if}
		</button>
	</nav>

	<div class="mt-auto">
		<button
			onclick={openAddProjectModal}
			class="w-full flex items-center justify-center p-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
			title="Proyek Baru"
		>
			<Plus class="w-5 h-5 flex-shrink-0 {showText ? 'mr-2' : ''}" />
			{#if showText}
				<span>Proyek Baru</span>
			{/if}
		</button>
	</div>
</aside>
