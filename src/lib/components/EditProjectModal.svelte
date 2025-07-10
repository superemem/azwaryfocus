<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import type { Session } from '@supabase/supabase-js';

	// 1. TERIMA PROPS DENGAN CARA SVELTE 5
	let { isOpen, session, project } = $props<{
		isOpen: boolean;
		session: Session | null;
		project: any | null; // Menerima project object secara langsung
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE LOKAL MENGGUNAKAN RUNES
	let projectName = $state('');
	let projectDescription = $state('');
	let status = $state('active');
	let submitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let availableUsers = $state<{ id: string; username: string }[]>([]);
	let inviteUserIds = $state<string[]>([]);

	// 3. FUNGSI-FUNGSI YANG SUDAH DIPERBAIKI
	async function loadAvailableUsers() {
		if (!project?.id) return;
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		try {
			// Ambil semua profil dan anggota proyek secara bersamaan
			const [{ data: allProfiles }, { data: members }] = await Promise.all([
				supabase.from('profiles').select('id, username'),
				supabase.from('project_members').select('user_id').eq('project_id', project.id)
			]);

			const memberIds = new Set(members?.map((m) => m.user_id) ?? []);
			memberIds.add(project.created_by); // Pastikan owner tidak bisa diundang lagi
			availableUsers = allProfiles?.filter((u) => !memberIds.has(u.id)) ?? [];
		} catch (error) {
			console.error('Gagal memuat daftar user:', error);
		}
	}

	// Reactive: reset dan isi form saat modal dibuka atau project berubah
	$effect(() => {
		if (isOpen && project) {
			projectName = project.name || '';
			projectDescription = project.description || '';
			status = project.status || 'active';
			errorMessage = '';
			successMessage = '';
			loadAvailableUsers();
		}
	});

	function closeModal() {
		dispatch('close');
	}

	async function inviteUsersToProject() {
		if (inviteUserIds.length === 0 || !project?.id || !session?.user) return;
		submitting = true;
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		try {
			const inserts = inviteUserIds.map((userId) => ({
				project_id: project.id,
				user_id: userId,
				invited_by: session.user.id
			}));

			const { error } = await supabase.from('project_members').insert(inserts);
			if (error) throw error;

			successMessage = `Berhasil mengundang ${inviteUserIds.length} anggota baru.`;
			inviteUserIds = []; // Reset pilihan
			await loadAvailableUsers(); // Refresh daftar user
			dispatch('membersUpdated'); // Beri tahu parent
		} catch (error: any) {
			errorMessage = `Gagal mengundang: ${error.message}`;
		} finally {
			submitting = false;
		}
	}

	async function handleSubmit() {
		if (!projectName.trim() || !project?.id) return;
		submitting = true;
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		try {
			const { error } = await supabase
				.from('projects')
				.update({
					name: projectName,
					description: projectDescription,
					status
				})
				.eq('id', project.id);

			if (error) throw error;

			successMessage = 'Proyek berhasil diperbarui!';
			dispatch('projectUpdated'); // Beri tahu parent

			setTimeout(() => {
				closeModal();
			}, 1500);
		} catch (error: any) {
			errorMessage = `Gagal memperbarui: ${error.message}`;
		} finally {
			submitting = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
		on:click|self={closeModal}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg text-white"
			on:click|stopPropagation
			role="document"
		>
			<h2 class="text-3xl font-bold mb-6">Edit Proyek: {project?.name}</h2>

			<!-- Form Edit Proyek -->
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="editProjectName" class="block font-semibold mb-2">Nama Proyek</label>
					<input
						type="text"
						id="editProjectName"
						bind:value={projectName}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						required
					/>
				</div>
				<div>
					<label for="editProjectDescription" class="block font-semibold mb-2">Deskripsi</label>
					<textarea
						id="editProjectDescription"
						bind:value={projectDescription}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						rows="3"
					></textarea>
				</div>
				<div>
					<label for="editProjectStatus" class="block font-semibold mb-2">Status</label>
					<select
						id="editProjectStatus"
						bind:value={status}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
					>
						<option value="active">Aktif</option>
						<option value="on-hold">Ditunda</option>
						<option value="completed">Selesai</option>
					</select>
				</div>
				<div class="flex justify-end gap-4">
					<button
						type="button"
						on:click={closeModal}
						class="px-6 py-3 bg-gray-600 font-bold rounded-xl hover:bg-gray-500"
						disabled={submitting}>Batal</button
					>
					<button
						type="submit"
						class="px-6 py-3 bg-purple-600 font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50"
						disabled={submitting}
					>
						{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
					</button>
				</div>
			</form>

			<!-- Pembatas -->
			<hr class="border-gray-600 my-8" />

			<!-- Form Undang Anggota -->
			<div>
				<h3 class="text-2xl font-bold mb-4">Undang Anggota</h3>
				{#if availableUsers.length > 0}
					<div class="space-y-4">
						<select
							multiple
							bind:value={inviteUserIds}
							class="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
							size="5"
						>
							{#each availableUsers as user (user.id)}
								<option value={user.id}>{user.username}</option>
							{/each}
						</select>
						<button
							type="button"
							class="w-full py-3 bg-green-600 font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
							on:click={inviteUsersToProject}
							disabled={inviteUserIds.length === 0 || submitting}
						>
							Undang ({inviteUserIds.length}) Anggota
						</button>
					</div>
				{:else}
					<p class="text-gray-400">Semua pengguna sudah menjadi anggota proyek ini.</p>
				{/if}
			</div>

			<!-- Pesan Feedback -->
			{#if successMessage}
				<div class="mt-4 p-3 bg-green-900/50 text-green-300 rounded-lg text-center">
					{successMessage}
				</div>
			{/if}
			{#if errorMessage}
				<div class="mt-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-center">{errorMessage}</div>
			{/if}
		</div>
	</div>
{/if}
