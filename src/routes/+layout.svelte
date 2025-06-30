<script lang="ts">
	import '../app.css';
	import { supabase } from '$lib/supabase';
	import { onMount, getContext, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { session, userProfile } from '$lib/stores/authStore';
	import { selectedProjectId } from '$lib/stores/projectStore';
	import { allTasks, allColumns } from '$lib/stores/kanbanDataStore';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';
	import AddProjectModal from '$lib/components/AddProjectModal.svelte';

	let projects: any[] = [];
	let loading = true;
	let isEditProfileModalOpen = false;
	let isAddProjectModalOpen = false;

	// --- State untuk header Dashboard ---
	let todayDate = '';
	let uncompletedTasksCount = 0;
	let todayPlansCount = 0;

	// Function to format the date
	function formatDate(date: Date) {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		return date.toLocaleDateString('id-ID', options);
	}

	// --- Reactive logic untuk update header ---
	$: {
		todayDate = formatDate(new Date());

		// Pastikan allColumns dan allTasks punya data sebelum dihitung
		if ($allColumns.length > 0 && $allTasks.length > 0) {
			const toDoColumn = $allColumns.find((col) => col.name.toLowerCase() === 'to do');
			const inProgressColumn = $allColumns.find((col) => col.name.toLowerCase() === 'in progress');

			const toDoColumnId = toDoColumn ? toDoColumn.id : null;
			const inProgressColumnId = inProgressColumn ? inProgressColumn.id : null;

			todayPlansCount = toDoColumnId
				? $allTasks.filter((task) => task.column_id === toDoColumnId).length
				: 0;
			uncompletedTasksCount = inProgressColumnId
				? $allTasks.filter((task) => task.column_id === inProgressColumnId).length
				: 0;
		} else {
			todayPlansCount = 0;
			uncompletedTasksCount = 0;
		}
	}

	// --- FUNGSI UNTUK MENGAMBIL DATA PROFIL USER ---
	async function fetchUserProfile(userId: string) {
		console.log('DEBUG: Fetching user profile for ID:', userId);
		const { data: userProfileData, error: profileError } = await supabase
			.from('profiles') // <--- BARIS PERBAIKAN: Ubah nama tabel dari 'user_profiles' ke 'profiles'
			.select('*')
			.eq('id', userId)
			.single();

		if (profileError) {
			console.error('DEBUG: Error fetching user profile:', profileError);
			userProfile.set(null);
		} else {
			console.log('DEBUG: User profile fetched:', userProfileData);
			userProfile.set(userProfileData);
		}
	}

	// --- FUNGSI UNTUK MENGAMBIL DAFTAR PROYEK (SUDAH DIPERBAIKI) ---
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
			.eq('status', 'active') // BARIS PERBAIKAN: Hanya ambil proyek yang aktif
			.or(`created_by.eq.${userId}`)
			.order('created_at', { ascending: false });

		if (projectsError) {
			console.error('Error fetching projects:', projectsError);
			projects = [];
		} else {
			projects = projectsData;
			if (get(selectedProjectId) === null && projects.length > 0) {
				// Jika tidak ada proyek yang dipilih, atur proyek pertama sebagai default
				selectedProjectId.set(projects[0].id);
			} else if (projects.length === 0) {
				// Jika tidak ada proyek sama sekali, kosongkan store
				selectedProjectId.set(null);
			}
		}
		loading = false;
	}

	// --- FUNGSI BARU: MENGAMBIL SEMUA TASK DAN COLUMN BERDASARKAN SELECTED PROJECT ID ---
	async function fetchAllTasksAndColumns(projectId: string | null) {
		console.log('DEBUG: fetchAllTasksAndColumns triggered for projectId:', projectId);
		if (!projectId) {
			// Jika tidak ada proyek yang dipilih, kosongkan store
			allColumns.set([]);
			allTasks.set([]);
			return;
		}

		// --- Query 1: Ambil semua kolom untuk project yang dipilih ---
		const { data: columnsData, error: columnsError } = await supabase
			.from('columns')
			.select('*')
			.eq('project_id', projectId) // FILTER UTAMA BERDASARKAN PROJECT ID
			.order('order', { ascending: true });

		if (columnsError) {
			console.error('Error fetching columns:', columnsError);
			allColumns.set([]);
			allTasks.set([]);
			return;
		}

		allColumns.set(columnsData);
		const columnIds = columnsData.map((col) => col.id);

		// --- Query 2: Ambil semua tugas untuk kolom-kolom ini ---
		if (columnIds.length > 0) {
			const { data: tasksData, error: tasksError } = await supabase
				.from('tasks')
				.select(
					'*, assignee_profile:profiles!tasks_assigned_to_fkey(username), created_by_profile:profiles!tasks_created_by_fkey(username)'
				)
				.in('column_id', columnIds) // FILTER UTAMA BERDASARKAN COLUMN ID
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

	// --- Reactive statement untuk memuat task & column saat selectedProjectId berubah ---
	// Ini adalah logic yang paling penting untuk memperbaiki errormu.
	$: if ($selectedProjectId) {
		fetchAllTasksAndColumns($selectedProjectId);
	} else {
		// Ini akan dieksekusi saat selectedProjectId di-set null
		allColumns.set([]);
		allTasks.set([]);
	}

	// --- FUNGSI UNTUK LOGOUT ---
	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('Error logging out:', error.message);
		}
	}

	// --- Fungsi untuk meng-handle update profil dari modal ---
	async function handleProfileUpdate(event: CustomEvent) {
		const { newUsername, avatarFile } = event.detail;

		if (!$session?.user) {
			console.error('Tidak ada sesi pengguna untuk memperbarui profil.');
			return;
		}

		let avatarUrl: string | null = get(userProfile)?.avatar_url || null;

		// 1. Upload avatar baru jika ada file yang dipilih
		if (avatarFile) {
			const userId = $session.user.id;
			const filePath = `${userId}/${Date.now()}-${avatarFile.name}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile, {
					cacheControl: '3600',
					upsert: true
				});

			if (uploadError) {
				console.error('Error uploading avatar:', uploadError);
				return;
			}

			const { data: publicUrlData } = supabase.storage
				.from('avatars')
				.getPublicUrl(uploadData.path);
			avatarUrl = publicUrlData.publicUrl;
		}

		// 2. Update data profil di tabel 'profiles'
		const updates = {
			username: newUsername,
			avatar_url: avatarUrl,
			updated_at: new Date().toISOString()
		};
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updates)
			.eq('id', $session.user.id);

		if (updateError) {
			console.error('Error updating profile:', updateError);
		} else {
			console.log('Profil berhasil diperbarui!');
			userProfile.update((profile) => ({
				...profile,
				username: newUsername,
				avatar_url: avatarUrl
			}));
			isEditProfileModalOpen = false;
		}
	}

	// --- Fungsi untuk buka modal ---
	function openEditProfileModal() {
		isEditProfileModalOpen = true;
	}

	function openAddProjectModal() {
		isAddProjectModalOpen = true;
	}

	function handleProjectAdded() {
		isAddProjectModalOpen = false;
		fetchProjects(); // Panggil ulang fetchProjects untuk update daftar
	}

	// --- SETUP LISTENER SAAT KOMPONEN DIMUAT ---
	onMount(() => {
		// Cek sesi awal
		supabase.auth.getSession().then(({ data }) => {
			session.set(data.session);
		});

		// Set up real-time listener for auth changes
		const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
			console.log('Auth state change event:', event, 'Session:', newSession);
			session.set(newSession);

			if (event === 'SIGNED_IN') {
				console.log('User signed in. Redirecting to profile page...');
				if (newSession.user) {
					fetchProjects();
					fetchUserProfile(newSession.user.id);
				}
				if ($page.url.pathname === '/login') {
					goto('/profile');
				}
			} else if (event === 'SIGNED_OUT') {
				console.log('User signed out. Redirecting to login...');
				projects = [];
				userProfile.set(null);
				selectedProjectId.set(null);
				allTasks.set([]);
				allColumns.set([]);
				goto('/login');
			}
		});

		// --- Real-time listeners untuk projects, columns, dan tasks ---
		// Listener ini sekarang hanya memicu fetch untuk project yang relevan
		const projectsChannel = supabase.channel('public:projects');
		projectsChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () =>
				fetchProjects()
			)
			.subscribe();

		const columnsChannel = supabase.channel('public:columns');
		columnsChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, (payload) => {
				// Trigger fetch hanya jika perubahan terjadi di project yang sedang dipilih
				if (payload.new.project_id === $selectedProjectId) {
					fetchAllTasksAndColumns($selectedProjectId);
				}
			})
			.subscribe();

		const tasksChannel = supabase.channel('public:tasks');
		tasksChannel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
				// Trigger fetch hanya jika perubahan terjadi di project yang sedang dipilih
				if (payload.new.project_id === $selectedProjectId) {
					fetchAllTasksAndColumns($selectedProjectId);
				}
			})
			.subscribe();

		// --- Muat data awal saat onMount ---
		fetchProjects();
		if (get(session)?.user) {
			fetchUserProfile(get(session).user.id);
		}

		return () => {
			authListener.subscription.unsubscribe();
			supabase.removeChannel(projectsChannel);
			supabase.removeChannel(columnsChannel);
			supabase.removeChannel(tasksChannel);
		};
	});

	// --- MUAT DATA SAAT SESSION BERUBAH ---
	// Logika ini redundan setelah perbaikan onMount, tapi bisa dibiarkan
	$: if ($session?.user) {
		if ($page.url.pathname !== '/login') {
			fetchProjects();
			fetchUserProfile($session.user.id);
		}
	}
</script>

<div class="flex h-screen overflow-hidden">
	{#if $session && $page.url.pathname !== '/login'}
		<Sidebar
			{projects}
			userName={$userProfile?.username || 'Guest'}
			userAvatar={$userProfile?.avatar_url || null}
			on:refreshProjects={fetchProjects}
			on:openAddProjectModal={openAddProjectModal}
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
	{:else if $page.url.pathname === '/login'}
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
