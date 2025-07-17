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

	function closeSidebarOnMobile() {
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
		dispatch('openAddProjectModal');
		closeSidebarOnMobile();
	}
</script>

<aside
	class="relative flex flex-col bg-gray-900 text-white p-4 shadow-2xl transition-all duration-300 ease-in-out
           md:h-screen"
	class:fixed={isSidebarOpen}
	class:inset-y-0={isSidebarOpen}
	class:left-0={isSidebarOpen}
	class:z-50={isSidebarOpen}
	class:w-72={isSidebarOpen || !isSidebarCollapsed}
	class:translate-x-0={isSidebarOpen}
	class:-translate-x-full={!isSidebarOpen}
	class:md:translate-x-0={true}
	class:md:w-20={isSidebarCollapsed}
	class:md:p-2={isSidebarCollapsed}
>
	<!-- Tombol Lipat/Buka untuk Desktop -->
	<button
		onclick={() => (isSidebarCollapsed = !isSidebarCollapsed)}
		class="absolute -right-3 top-8 z-10 hidden md:flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:outline-none"
		title={isSidebarCollapsed ? 'Buka sidebar' : 'Lipat sidebar'}
	>
		<ChevronsLeft class="w-4 h-4 transition-transform {isSidebarCollapsed ? 'rotate-180' : ''}" />
	</button>

	<!-- <<< PERUBAHAN: Header Profil diubah sesuai gaya Netlify -->
	<div class="mb-8 mt-4">
		<button
			onclick={() => navigateTo('/profile')}
			class="flex items-center w-full p-2 rounded-lg hover:bg-gray-800 transition-colors"
			class:justify-center={isSidebarCollapsed}
		>
			<!-- Avatar (ukuran tetap) -->
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

			<!-- Info User (nama & email) - Muncul saat tidak terlipat -->
			{#if !isSidebarCollapsed}
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

	<!-- Navigasi -->
	<nav class="flex-1 space-y-2">
		<button
			onclick={() => navigateTo('/profile')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/profile'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:md:justify-center={isSidebarCollapsed}
			title="Profil"
		>
			<User class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
			{#if !isSidebarCollapsed}<span>Profil</span>{/if}
		</button>

		<button
			onclick={() => navigateTo('/projects')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url.pathname.startsWith(
				'/projects'
			)
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:md:justify-center={isSidebarCollapsed}
			title="Proyek"
		>
			<LayoutDashboard class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
			{#if !isSidebarCollapsed}<span>Proyek</span>{/if}
		</button>

		<!-- Dropdown Tugas -->
		<div class="space-y-1">
			<button
				onclick={toggleTasksDropdown}
				class="w-full flex items-center justify-between p-3 rounded-xl font-semibold text-gray-300 hover:bg-gray-800"
				title="Tugas"
			>
				<span
					class="flex items-center"
					class:md:justify-center={isSidebarCollapsed}
					class:w-full={isSidebarCollapsed}
				>
					<ListTodo class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
					{#if !isSidebarCollapsed}<span>Tugas</span>{/if}
				</span>
				{#if !isSidebarCollapsed}
					<svg
						class="w-4 h-4 transform transition-transform"
						class:rotate-90={isTasksDropdownOpen}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				{/if}
			</button>

			{#if isTasksDropdownOpen && !isSidebarCollapsed}
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
				class:md:justify-center={isSidebarCollapsed}
				title="Tim"
			>
				<Users class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
				{#if !isSidebarCollapsed}<span>Tim</span>{/if}
			</button>
		{/if}

		<button
			onclick={() => navigateTo('/tools/pomodoro')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/tools/pomodoro'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:md:justify-center={isSidebarCollapsed}
			title="Pomodoro"
		>
			<Clock class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
			{#if !isSidebarCollapsed}<span>Pomodoro</span>{/if}
		</button>

		<button
			onclick={() => navigateTo('/leaderboard')}
			class="w-full flex items-center p-3 rounded-xl font-semibold transition-all {$page.url
				.pathname === '/leaderboard'
				? 'bg-purple-600 text-white shadow-lg'
				: 'text-gray-300 hover:bg-gray-800'}"
			class:md:justify-center={isSidebarCollapsed}
			title="Leaderboard"
		>
			<Trophy class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-3'}" />
			{#if !isSidebarCollapsed}<span>Leaderboard</span>{/if}
		</button>
	</nav>

	<!-- Tombol Proyek Baru -->
	<div class="mt-auto">
		<button
			onclick={openAddProjectModal}
			class="w-full flex items-center justify-center p-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
			title="Proyek Baru"
		>
			<Plus class="w-5 h-5 flex-shrink-0 {isSidebarCollapsed ? 'md:mr-0' : 'mr-2'}" />
			{#if !isSidebarCollapsed}
				<span>Proyek Baru</span>
			{/if}
		</button>
	</div>
</aside>
