<script lang="ts">
	// 1. IMPORTS
	import '../app.css';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { createBrowserClient, isBrowser, parse, serialize } from '@supabase/ssr';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { kanbanLogic } from '$lib/kanban-logic';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';
	import AddProjectModal from '$lib/components/AddProjectModal.svelte';
	import { Toaster } from '$lib/toast';

	// 2. TERIMA DATA DARI SERVER
	let { data } = $props<LayoutData>();

	// 3. BUAT SUPABASE CLIENT
	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { fetch },
		cookies: {
			get(key: string) {
				if (!isBrowser()) return;
				const cookies = parse(document.cookie);
				return cookies[key];
			},
			set(key: string, value: string, options) {
				if (!isBrowser()) return;
				document.cookie = serialize(key, value, options);
			},
			remove(key: string, options) {
				if (!isBrowser()) return;
				document.cookie = serialize(key, '', { ...options, maxAge: -1 });
			}
		}
	});

	// 4. ISI STORE
	supabaseClientStore.set(supabase);

	// 5. LISTENER AUTH
	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidateAll();
			}
		});
		return () => subscription.unsubscribe();
	});

	// 6. STATE LOKAL & EFFECTS
	let isEditProfileModalOpen = $state(false);
	let isAddProjectModalOpen = $state(false);
	let isSidebarOpen = $state(false);
	let selectedProjectId: string | null = $state(null);

	$effect(() => {
		if (selectedProjectId === null && data.projects.length > 0) {
			selectedProjectId = data.projects[0].id;
		} else if (data.projects.length === 0) {
			selectedProjectId = null;
		}
	});

	$effect(() => {
		if (selectedProjectId) {
			kanbanLogic.loadProject(selectedProjectId);
		} else {
			kanbanLogic.resetProject();
		}
	});

	// 7. FUNGSI-FUNGSI HELPER
	const todayDate = new Date().toLocaleDateString('id-ID', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	async function handleLogout() {
		await supabase.auth.signOut();
	}

	function handleProjectAdded() {
		isAddProjectModalOpen = false;
		invalidateAll();
	}

	async function handleProfileUpdate(event: CustomEvent) {
		const { newUsername, avatarFile } = event.detail;
		if (!data.session?.user) return;

		let avatarUrl = data.profile?.avatar_url;

		if (avatarFile) {
			const userId = data.session.user.id;
			const fileExt = avatarFile.name.split('.').pop();
			const filePath = `${userId}/${Date.now()}.${fileExt}`;
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile);
			if (uploadError) return console.error('Upload avatar error:', uploadError);
			const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
			avatarUrl = publicUrlData.publicUrl;
		}

		const { error } = await supabase
			.from('profiles')
			.update({ username: newUsername, avatar_url: avatarUrl })
			.eq('id', data.session.user.id);

		if (!error) {
			isEditProfileModalOpen = false;
			invalidateAll();
		}
	}
</script>

<!-- BAGIAN HTML LENGKAP -->
<div class="flex h-screen overflow-hidden">
	{#if data.session && $page.url.pathname !== '/login'}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
			class:opacity-100={isSidebarOpen}
			class:opacity-0={!isSidebarOpen}
			class:pointer-events-none={!isSidebarOpen}
			on:click={() => (isSidebarOpen = false)}
		></div>

		<button
			class="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white md:hidden"
			on:click={() => (isSidebarOpen = !isSidebarOpen)}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				></path></svg
			>
		</button>

		<Sidebar
			session={data.session}
			userName={data.profile?.username || data.session.user.email}
			userAvatar={data.profile?.avatar_url || null}
			bind:isSidebarOpen
			on:openAddProjectModal={() => (isAddProjectModalOpen = true)}
			on:close={() => (isSidebarOpen = false)}
		/>

		<main class="flex-1 p-8 overflow-y-auto bg-gray-100">
			{#if $page.url.pathname === '/'}
				<div
					class="flex flex-col md:flex-row md:justify-between md:items-end mb-6 space-y-4 md:space-y-0"
				>
					<div>
						<h1 class="text-4xl font-bold text-gray-800">Dashboard</h1>
						<p class="text-gray-500 mt-1">{todayDate}</p>
						<p class="text-gray-600 font-semibold mt-2">
							Kamu punya {kanbanLogic.stats.todoCount} rencana hari ini
						</p>
						<p class="text-gray-600 font-semibold">
							Kamu punya {kanbanLogic.stats.inProgressCount} tugas yang belum selesai
						</p>
					</div>
					<div class="flex gap-4 items-center">
						<span class="text-gray-600 font-semibold hidden md:block"
							>Welcome, {data.profile?.username || data.session.user.email}!</span
						>
						<button
							on:click={() => (isEditProfileModalOpen = true)}
							class="bg-gray-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-gray-800"
							>Edit Profil</button
						>
						<button
							on:click={handleLogout}
							class="bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-red-700"
							>Logout</button
						>
					</div>
				</div>
			{:else}
				<div class="flex justify-end items-center gap-4 mb-6">
					<span class="text-gray-600 font-semibold hidden md:block"
						>Welcome, {data.profile?.username || data.session.user.email}!</span
					>
					<button
						on:click={() => (isEditProfileModalOpen = true)}
						class="bg-gray-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-gray-800"
						>Edit Profil</button
					>
					<button
						on:click={handleLogout}
						class="bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-red-700"
						>Logout</button
					>
				</div>
			{/if}
			<Toaster class="center-toaster w-64 text-wrap" position="center" />
			<slot />
		</main>

		<!-- Modals -->
		<EditProfileModal
			isOpen={isEditProfileModalOpen}
			session={data.session}
			profile={data.profile}
			on:close={() => (isEditProfileModalOpen = false)}
			on:submit={handleProfileUpdate}
		/>
		<AddProjectModal
			isOpen={isAddProjectModalOpen}
			session={data.session}
			on:close={() => (isAddProjectModalOpen = false)}
			on:projectAdded={handleProjectAdded}
		/>
	{:else if $page.url.pathname === '/login' || $page.url.pathname === '/'}
		<div class="flex-1">
			<slot />
		</div>
	{:else}
		<div class="flex items-center justify-center w-screen h-screen">
			<p class="text-gray-600">Redirecting to login...</p>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: sans-serif;
	}
</style>
