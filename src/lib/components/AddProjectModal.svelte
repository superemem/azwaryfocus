<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import type { Session } from '@supabase/supabase-js';

	// 1. TERIMA PROPS DENGAN CARA SVELTE 5
	let { isOpen, session } = $props<{
		isOpen: boolean;
		session: Session | null;
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE LOKAL MENGGUNAKAN RUNES
	let projectName = $state('');
	let projectDescription = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let allUsers = $state<{ id: string; username: string }[]>([]);
	let selectedUserIds = $state<string[]>([]);

	// 3. FUNGSI-FUNGSI YANG SUDAH DIPERBAIKI
	async function fetchAllUsers() {
		if (!session?.user) return;
		const supabase = get(supabaseClientStore);
		if (!supabase) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('id, username')
			.neq('id', session.user.id); // Gunakan user ID dari sesi

		if (error) {
			console.error('Gagal mengambil daftar user:', error);
		} else {
			allUsers = data || [];
		}
	}

	// Reactive: fetch user saat modal dibuka
	$effect(() => {
		if (isOpen) {
			fetchAllUsers();
		}
	});

	function closeModal() {
		// Reset state
		projectName = '';
		projectDescription = '';
		selectedUserIds = [];
		errorMessage = '';
		// Beri tahu parent untuk menutup
		dispatch('close');
	}

	async function addProject() {
		if (!projectName.trim()) {
			errorMessage = 'Nama proyek harus diisi.';
			return;
		}
		if (!session?.user) {
			errorMessage = 'Sesi tidak valid, silakan login ulang.';
			return;
		}

		isLoading = true;
		errorMessage = '';
		const supabase = get(supabaseClientStore);
		if (!supabase) {
			errorMessage = 'Koneksi gagal, coba lagi.';
			isLoading = false;
			return;
		}

		try {
			// Insert project
			const { data: newProject, error: insertError } = await supabase
				.from('projects')
				.insert({
					name: projectName,
					description: projectDescription,
					created_by: session.user.id,
					status: 'active'
				})
				.select()
				.single();

			if (insertError) throw insertError;

			const newProjectId = newProject.id;

			// Insert default columns
			const defaultColumns = [
				{ name: 'To Do', project_id: newProjectId, order: 1 },
				{ name: 'In Progress', project_id: newProjectId, order: 2 },
				{ name: 'Done', project_id: newProjectId, order: 3 }
			];
			const { error: columnError } = await supabase.from('columns').insert(defaultColumns);
			if (columnError) throw columnError;

			// Insert project members
			if (selectedUserIds.length > 0) {
				const membersToInsert = selectedUserIds.map((userId) => ({
					project_id: newProjectId,
					user_id: userId,
					invited_by: session.user.id
				}));
				const { error: memberError } = await supabase
					.from('project_members')
					.insert(membersToInsert);
				if (memberError) throw memberError;
			}

			// Beri tahu parent bahwa proyek berhasil dibuat
			dispatch('projectAdded');
			closeModal();
		} catch (error: any) {
			console.error('Error adding project:', error);
			errorMessage = `Gagal: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
		on:click|self={closeModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div
			class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg"
			on:click|stopPropagation
			role="document"
		>
			<div class="flex justify-between items-center mb-6">
				<h2 id="modal-title" class="text-3xl font-bold text-white">Tambah Proyek Baru</h2>
				<button
					on:click={closeModal}
					class="text-gray-400 hover:text-white"
					aria-label="Tutup modal"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={addProject} class="space-y-6">
				<div>
					<label for="projectName" class="block text-gray-300 font-semibold mb-2">Nama Proyek</label
					>
					<input
						id="projectName"
						type="text"
						bind:value={projectName}
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
						placeholder="Masukkan nama proyek"
						required
					/>
				</div>

				<div>
					<label for="projectDescription" class="block text-gray-300 font-semibold mb-2"
						>Deskripsi</label
					>
					<textarea
						id="projectDescription"
						bind:value={projectDescription}
						rows="3"
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
						placeholder="Deskripsi singkat tentang proyek ini"
					></textarea>
				</div>

				<div>
					<label for="inviteUsers" class="block text-gray-300 font-semibold mb-2"
						>Undang Pengguna (Opsional)</label
					>
					<select
						id="inviteUsers"
						multiple
						bind:value={selectedUserIds}
						class="w-full p-3 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-purple-600"
						size="5"
					>
						{#each allUsers as user (user.id)}
							<option value={user.id}>{user.username}</option>
						{/each}
					</select>
					<p class="text-sm text-gray-400 mt-1">Gunakan Ctrl/Cmd untuk memilih lebih dari satu.</p>
				</div>

				{#if errorMessage}
					<p class="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{errorMessage}</p>
				{/if}

				<div class="flex justify-end space-x-4 pt-4">
					<button
						type="button"
						on:click={closeModal}
						class="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-500 transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
						disabled={isLoading}
					>
						{#if isLoading}
							Menambahkan...
						{:else}
							Tambah Proyek
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
