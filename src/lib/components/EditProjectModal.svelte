<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { get } from 'svelte/store';
	import { selectedProject } from '$lib/stores/projectStore';
	import { invalidateAll } from '$app/navigation';

	export let isOpen = false;

	const dispatch = createEventDispatcher();

	let project = get(selectedProject);
	let projectName = project?.name || '';
	let projectDescription = project?.description || '';
	let status = project?.status || 'active';

	let submitting = false;
	let errorMessage = '';
	let successMessage = '';

	let availableUsers: any[] = [];
	let inviteUserIds: string[] = [];

	// Reaktif saat store berubah
	$: {
		project = $selectedProject;
		projectName = project?.name || '';
		projectDescription = project?.description || '';
		status = project?.status || 'active';
	}

	// Fetch user yang belum tergabung
	async function loadAvailableUsers() {
		if (!project?.id) return;

		const { data: allProfiles } = await supabase.from('profiles').select('id, username');
		const { data: members } = await supabase
			.from('project_members')
			.select('user_id')
			.eq('project_id', project.id);

		const memberIds = members?.map((m) => m.user_id) ?? [];
		availableUsers = allProfiles?.filter((u) => !memberIds.includes(u.id)) ?? [];
	}

	// Jalankan saat modal dibuka
	$: if (isOpen && project?.id) {
		loadAvailableUsers();
		// Reset messages when modal opens
		errorMessage = '';
		successMessage = '';
	}

	// Ensure project creator is a member
	async function ensureCreatorIsMember() {
		if (!project?.id) return;

		// Get current user ID
		const {
			data: { user }
		} = await supabase.auth.getUser();
		const currentUserId = user?.id;

		if (!currentUserId) return;

		// Check if current user is already a member
		const { data: existingMember } = await supabase
			.from('project_members')
			.select('id')
			.eq('project_id', project.id)
			.eq('user_id', currentUserId)
			.single();

		// If current user is not a member, add them
		if (!existingMember) {
			const { error } = await supabase.from('project_members').insert({
				project_id: project.id,
				user_id: currentUserId,
				invited_by: currentUserId
			});

			if (error) {
				console.error('Gagal menambahkan user sebagai member:', error);
			}
		}
	}

	// Invite user
	async function inviteUsersToProject() {
		if (inviteUserIds.length === 0) {
			errorMessage = 'Pilih minimal satu user untuk diundang.';
			return;
		}

		// Clear previous messages
		errorMessage = '';
		successMessage = '';

		// Get current user ID
		const {
			data: { user }
		} = await supabase.auth.getUser();
		const currentUserId = user?.id;

		if (!currentUserId) {
			errorMessage = 'Tidak dapat menentukan user yang sedang login.';
			return;
		}

		// Debug log
		console.log('Current user ID:', currentUserId);
		console.log('Project created_by:', project?.created_by);

		// Ensure creator is a member first
		await ensureCreatorIsMember();

		const inserts = inviteUserIds.map((userId) => ({
			project_id: project.id,
			user_id: userId,
			invited_by: currentUserId // Gunakan current user ID dari auth
		}));

		console.log('Inserts:', inserts);

		const { error } = await supabase.from('project_members').insert(inserts);

		if (error) {
			console.error('Gagal mengundang anggota:', error);
			errorMessage = 'Gagal mengundang anggota: ' + error.message;
		} else {
			// Success feedback
			const userCount = inviteUserIds.length;
			successMessage = `Berhasil mengundang ${userCount} anggota baru ke proyek.`;

			// Reset selection
			inviteUserIds = [];

			// Refresh available users list
			await loadAvailableUsers();

			// Dispatch event untuk refresh data di parent component
			dispatch('membersUpdated');
		}
	}

	// Submit form edit
	async function handleSubmit() {
		submitting = true;
		errorMessage = '';
		successMessage = '';

		if (!projectName.trim()) {
			errorMessage = 'Nama proyek tidak boleh kosong.';
			submitting = false;
			return;
		}

		if (!project?.id) {
			errorMessage = 'Tidak ada proyek yang dipilih untuk diedit.';
			submitting = false;
			return;
		}

		const { error } = await supabase
			.from('projects')
			.update({
				name: projectName,
				description: projectDescription,
				status,
				updated_at: new Date().toISOString()
			})
			.eq('id', project.id);

		if (error) {
			console.error('Error updating project:', error);
			errorMessage = 'Gagal memperbarui proyek: ' + error.message;
		} else {
			successMessage = 'Proyek berhasil diperbarui!';
			dispatch('projectUpdated');
			invalidateAll();

			// Close modal after short delay to show success message
			setTimeout(() => {
				dispatch('close');
			}, 1500);
		}

		submitting = false;
	}

	function handleClose() {
		// Reset messages when closing
		errorMessage = '';
		successMessage = '';
		dispatch('close');
	}

	// Clear messages when user starts typing
	function clearMessages() {
		errorMessage = '';
		successMessage = '';
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
			<h2 class="text-2xl font-bold mb-4">Edit Proyek</h2>
			<form on:submit|preventDefault={handleSubmit}>
				<!-- Nama Proyek -->
				<div class="mb-4">
					<label for="editProjectName" class="block text-gray-700 font-bold mb-2">
						Nama Proyek
					</label>
					<input
						type="text"
						id="editProjectName"
						bind:value={projectName}
						on:input={clearMessages}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					/>
				</div>

				<!-- Deskripsi -->
				<div class="mb-4">
					<label for="editProjectDescription" class="block text-gray-700 font-bold mb-2">
						Deskripsi
					</label>
					<textarea
						id="editProjectDescription"
						bind:value={projectDescription}
						on:input={clearMessages}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows="4"
					></textarea>
				</div>

				<!-- Status -->
				<div class="mb-6">
					<label for="editProjectStatus" class="block text-gray-700 font-bold mb-2">
						Status Proyek
					</label>
					<select
						id="editProjectStatus"
						bind:value={status}
						on:change={clearMessages}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="active">Active</option>
						<option value="on-hold">On Hold</option>
						<option value="completed">Completed</option>
						<option value="archived">Archived</option>
					</select>
				</div>

				<!-- Invite Anggota Tim -->
				{#if availableUsers.length > 0}
					<div class="mb-6">
						<label for="inviteUsers" class="block text-gray-700 font-bold mb-2">
							Tambah Anggota Tim Baru
						</label>
						<select
							id="inviteUsers"
							multiple
							bind:value={inviteUserIds}
							class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
							size="5"
						>
							{#each availableUsers as user}
								<option value={user.id}>{user.username || user.id}</option>
							{/each}
						</select>
						<p class="text-sm text-gray-500 mt-1">Gunakan Ctrl/Cmd untuk pilih banyak.</p>
						<button
							type="button"
							class="mt-2 bg-green-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
							on:click={inviteUsersToProject}
							disabled={inviteUserIds.length === 0}
						>
							Tambahkan ke Tim ({inviteUserIds.length})
						</button>
					</div>
				{:else}
					<div class="mb-6">
						<p class="text-gray-500 text-sm">Semua user sudah tergabung dalam proyek ini.</p>
					</div>
				{/if}

				<!-- Success Message -->
				{#if successMessage}
					<div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
						{successMessage}
					</div>
				{/if}

				<!-- Error Message -->
				{#if errorMessage}
					<div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
						{errorMessage}
					</div>
				{/if}

				<!-- Tombol -->
				<div class="flex justify-end gap-3">
					<button
						type="button"
						on:click={handleClose}
						class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-300 transition-colors"
						disabled={submitting}
					>
						Batal
					</button>
					<button
						type="submit"
						class="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
						disabled={submitting}
					>
						{#if submitting}
							Menyimpan...
						{:else}
							Simpan Perubahan
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
