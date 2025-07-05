<script lang="ts">
	import '../app.css';
	import { supabase } from '$lib/supabase';
	import { onMount, getContext, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { session, userProfile, fetchUserProfile } from '$lib/stores/authStore';
	import { selectedProjectId } from '$lib/stores/projectStore';
	import { allTasks, allColumns } from '$lib/stores/kanbanDataStore';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';
	import AddProjectModal from '$lib/components/AddProjectModal.svelte';
	import { Toaster } from '$lib/toast';

	let projects: any[] = [];
	let loading = true;
	let isEditProfileModalOpen = false;
	let isAddProjectModalOpen = false;
	let isSidebarOpen = false;
	let todayDate = '';
	let uncompletedTasksCount = 0;
	let todayPlansCount = 0;

	function formatDate(date: Date) {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		return date.toLocaleDateString('id-ID', options);
	}

	$: todayDate = formatDate(new Date());

	$: if (Array.isArray($allColumns) && Array.isArray($allTasks)) {
		const toDoColumn = $allColumns.find((col) => col.name.toLowerCase() === 'to do');
		const inProgressColumn = $allColumns.find((col) => col.name.toLowerCase() === 'in progress');
		todayPlansCount = toDoColumn
			? $allTasks.filter((task) => task.column_id === toDoColumn.id).length
			: 0;
		uncompletedTasksCount = inProgressColumn
			? $allTasks.filter((task) => task.column_id === inProgressColumn.id).length
			: 0;
	} else {
		todayPlansCount = 0;
		uncompletedTasksCount = 0;
	}

	async function fetchProjects() {
		loading = true;
		const currentSession = get(session);
		if (!currentSession) {
			projects = [];
			loading = false;
			return;
		}
		const userId = currentSession.user?.id;
		if (!userId) {
			projects = [];
			loading = false;
			return;
		}
		const { data: projectsData, error: projectsError } = await supabase
			.from('projects')
			.select('id, name, created_at, description, created_by, status')
			.eq('status', 'active')
			.order('created_at', { ascending: false });
		if (projectsError) {
			console.error('Error fetching projects:', projectsError);
			projects = [];
		} else {
			projects = projectsData;
			if (get(selectedProjectId) === null && projects.length > 0) {
				selectedProjectId.set(projects[0].id);
			} else if (projects.length === 0) {
				selectedProjectId.set(null);
			}
		}
		loading = false;
	}

	async function fetchAllTasksAndColumns(projectId: string | null) {
		console.log('DEBUG: fetchAllTasksAndColumns triggered for projectId:', projectId);
		if (!projectId) {
			allColumns.set([]);
			allTasks.set([]);
			return;
		}
		const { data: columnsData, error: columnsError } = await supabase
			.from('columns')
			.select('*')
			.eq('project_id', projectId)
			.order('order', { ascending: true });
		if (columnsError) {
			console.error('Error fetching columns:', columnsError);
			allColumns.set([]);
			allTasks.set([]);
			return;
		}
		allColumns.set(columnsData);
		const columnIds = columnsData.map((col) => col.id);
		if (columnIds.length > 0) {
			const { data: tasksData, error: tasksError } = await supabase
				.from('tasks')
				.select(
					'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
				)
				.in('column_id', columnIds)
				.order('order', { ascending: true });
			if (tasksError) {
				console.error('Error fetching tasks:', tasksError);
				allTasks.set([]);
			} else {
				allTasks.set(tasksData);
			}
		} else {
			allTasks.set([]);
		}
	}

	$: if ($selectedProjectId) {
		fetchAllTasksAndColumns($selectedProjectId);
	} else {
		allColumns.set([]);
		allTasks.set([]);
	}

	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		if (error) console.error('Error logging out:', error.message);
	}

	async function handleProfileUpdate(event: CustomEvent) {
		const { newUsername, avatarFile } = event.detail;
		if (!$session?.user) return;
		let avatarUrl: string | null = get(userProfile)?.avatar_url || null;
		if (avatarFile) {
			const userId = $session.user.id;
			const fileExt = avatarFile.name.split('.').pop();
			const fileName = `${Date.now()}.${fileExt}`;
			const filePath = `${userId}/${fileName}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });
			if (uploadError) return;
			const { data: publicUrlData } = supabase.storage
				.from('avatars')
				.getPublicUrl(uploadData.path);
			avatarUrl = publicUrlData.publicUrl;
		}
		const updates = { username: newUsername, avatar_url: avatarUrl };
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updates)
			.eq('id', $session.user.id);
		if (!updateError) {
			userProfile.update((profile) => ({
				...profile,
				username: newUsername,
				avatar_url: avatarUrl
			}));
			isEditProfileModalOpen = false;
		}
	}

	function openEditProfileModal() {
		isEditProfileModalOpen = true;
	}
	function openAddProjectModal() {
		isAddProjectModalOpen = true;
	}
	function handleProjectAdded() {
		isAddProjectModalOpen = false;
		fetchProjects();
	}

	onMount(() => {
		supabase.auth.getSession().then(({ data }) => {
			session.set(data.session);
			if (data.session?.user) fetchUserProfile(data.session.user.id);
			const currentPath = get(page).url.pathname;
			if (!data.session && !['/', '/login'].includes(currentPath)) goto('/login');
		});
		const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
			session.set(newSession);
			if (event === 'SIGNED_IN') {
				if (newSession.user) {
					fetchProjects();
					fetchUserProfile(newSession.user.id);
				}
				if ($page.url.pathname === '/login') goto('/profile');
			} else if (event === 'SIGNED_OUT') {
				projects = [];
				userProfile.set(null);
				selectedProjectId.set(null);
				allTasks.set([]);
				allColumns.set([]);
				goto('/');
			}
		});
		const projectsChannel = supabase.channel('public:projects');
		projectsChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () =>
				fetchProjects()
			)
			.subscribe();
		const columnsChannel = supabase.channel('public:columns');
		columnsChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, (payload) => {
				if (payload.new.project_id === $selectedProjectId)
					fetchAllTasksAndColumns($selectedProjectId);
			})
			.subscribe();
		const tasksChannel = supabase.channel('public:tasks');
		tasksChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
				if (payload.new.project_id === $selectedProjectId)
					fetchAllTasksAndColumns($selectedProjectId);
			})
			.subscribe();
		fetchProjects();
		return () => {
			authListener.subscription.unsubscribe();
			supabase.removeChannel(projectsChannel);
			supabase.removeChannel(columnsChannel);
			supabase.removeChannel(tasksChannel);
		};
	});

	$: if ($session?.user) {
		if ($page.url.pathname !== '/login') {
			fetchProjects();
			fetchUserProfile($session.user.id);
		}
	}
</script>

<!-- UI tetap tidak diubah -->

<div class="flex h-screen overflow-hidden">
	{#if $session && $page.url.pathname !== '/login'}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
			class:opacity-100={isSidebarOpen}
			class:opacity-0={!isSidebarOpen}
			class:pointer-events-none={!isSidebarOpen}
			on:click={() => (isSidebarOpen = false)}
		></div>

		<button
			class="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white md:hidden"
			on:click={() => (isSidebarOpen = !isSidebarOpen)}
		>
			<svg
				class="w-6 h-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				></path>
			</svg>
		</button>

		<Sidebar
			{projects}
			userName={$userProfile?.username || 'Guest'}
			userAvatar={$userProfile?.avatar_url || null}
			on:refreshProjects={fetchProjects}
			on:openAddProjectModal={openAddProjectModal}
			bind:isSidebarOpen
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
							Kamu punya {todayPlansCount} rencana hari ini
						</p>
						<p class="text-gray-600 font-semibold">
							Kamu punya {uncompletedTasksCount} tugas yang belum selesai
						</p>
					</div>
					<div class="flex gap-4 items-center">
						<span class="text-gray-600 font-semibold hidden md:block"
							>Welcome, {$userProfile?.username || 'Guest'}!</span
						>
						<button
							on:click={openEditProfileModal}
							class="bg-gray-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-gray-800 transition-colors"
						>
							Edit Profil
						</button>
						<button
							on:click={handleLogout}
							class="bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-red-700 transition-colors"
						>
							Logout
						</button>
					</div>
				</div>
			{:else}
				<div class="flex justify-end items-center gap-4 mb-6">
					<span class="text-gray-600 font-semibold hidden md:block"
						>Welcome, {$userProfile?.username || 'Guest'}!</span
					>
					<button
						on:click={openEditProfileModal}
						class="bg-gray-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-gray-800 transition-colors"
					>
						Edit Profil
					</button>
					<button
						on:click={handleLogout}
						class="bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-red-700 transition-colors"
					>
						Logout
					</button>
				</div>
			{/if}
			<Toaster />
			<slot />
		</main>

		<EditProfileModal
			isOpen={isEditProfileModalOpen}
			currentProfile={$userProfile}
			on:close={() => (isEditProfileModalOpen = false)}
			on:submit={handleProfileUpdate}
		/>
		<AddProjectModal
			isOpen={isAddProjectModalOpen}
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
