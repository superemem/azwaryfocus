<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { userProfile } from '$lib/stores/authStore';
	import { projectRefreshSignal } from '$lib/stores/refreshStore';

	export let isOpen: boolean;

	const dispatch = createEventDispatcher();

	let projectName = '';
	let projectDescription = '';
	let isLoading = false;
	let errorMessage = '';
	let allUsers: any[] = [];
	let selectedUserIds: string[] = [];

	// Ambil semua user selain diri sendiri
	async function fetchAllUsers() {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username')
			.neq('id', $userProfile.id);

		if (error) {
			console.error('Gagal mengambil daftar user:', error);
		} else {
			allUsers = data;
		}
	}

	// Reactive: fetch user saat modal dibuka
	$: if (isOpen) {
		fetchAllUsers();
	}

	function closeModal() {
		isOpen = false;
		projectName = '';
		projectDescription = '';
		selectedUserIds = [];
		errorMessage = '';
		dispatch('close');
	}

	async function addProject() {
		isLoading = true;
		const { data, error: insertError } = await supabase
			.from('projects')
			.insert({
				name: projectName,
				description: projectDescription,
				created_by: $userProfile.id,
				status: 'active'
			})
			.select();

		if (insertError) {
			console.error('Error adding project:', insertError);
			errorMessage = `Gagal menambahkan proyek: ${insertError.message}`;
			isLoading = false;
			return;
		}

		const newProjectId = data?.[0]?.id;

		// Insert default columns
		const defaultColumns = [
			{ name: 'To Do', project_id: newProjectId, order: 1 },
			{ name: 'In Progress', project_id: newProjectId, order: 2 },
			{ name: 'Done', project_id: newProjectId, order: 3 }
		];

		await supabase.from('columns').insert(defaultColumns);

		// Masukkan anggota proyek ke tabel project_members
		const membersToInsert = selectedUserIds.map((userId) => ({
			project_id: newProjectId,
			user_id: userId,
			invited_by: $userProfile.id
		}));

		if (membersToInsert.length > 0) {
			const { error: memberError } = await supabase.from('project_members').insert(membersToInsert);
			if (memberError) {
				console.error('Gagal menambahkan anggota proyek:', memberError);
			}
		}

		closeModal();
		projectRefreshSignal.update((n) => n + 1);
		isLoading = false;
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
		on:click|self={closeModal}
	>
		<div class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg" on:click|stopPropagation>
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-3xl font-bold text-white">Tambah Proyek Baru</h2>
				<button on:click={closeModal} class="text-gray-400 hover:text-white">
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
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-purple-600"
						placeholder="Masukkan nama proyek"
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
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-purple-600"
						placeholder="Deskripsi proyek"
					></textarea>
				</div>

				<div>
					<label for="inviteUsers" class="block text-gray-300 font-semibold mb-2"
						>Undang Pengguna</label
					>
					<select
						id="inviteUsers"
						multiple
						bind:value={selectedUserIds}
						class="w-full p-3 bg-gray-700 text-white rounded-xl border border-gray-500"
						size="5"
					>
						{#each allUsers as user}
							<option value={user.id}>{user.username}</option>
						{/each}
					</select>
					<p class="text-sm text-gray-400 mt-1">Gunakan Ctrl/Cmd untuk memilih lebih dari satu.</p>
				</div>

				{#if errorMessage}
					<p class="text-red-400 text-sm">{errorMessage}</p>
				{/if}

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						on:click={closeModal}
						class="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-500"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50"
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
