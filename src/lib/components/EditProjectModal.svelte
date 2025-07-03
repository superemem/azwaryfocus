<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { get } from 'svelte/store';
	import { selectedProject } from '$lib/stores/projectStore';
	import { invalidateAll } from '$app/navigation';

	export let isOpen = false;

	let project = get(selectedProject);
	let projectName = project?.name || '';
	let projectDescription = project?.description || '';
	let status = project?.status || 'active'; // ⬅️ Tambahkan status

	let submitting = false;
	let errorMessage = '';

	const dispatch = createEventDispatcher();

	// Update input secara reaktif jika store berubah
	$: {
		project = $selectedProject;
		projectName = project?.name || '';
		projectDescription = project?.description || '';
		status = project?.status || 'active'; // ⬅️ Tambahkan status
	}

	async function handleSubmit() {
		submitting = true;
		errorMessage = '';

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
				status, // ⬅️ Update status juga
				updated_at: new Date().toISOString()
			})
			.eq('id', project.id);

		if (error) {
			console.error('Error updating project:', error);
			errorMessage = 'Gagal memperbarui proyek: ' + error.message;
		} else {
			dispatch('projectUpdated');
			invalidateAll();
			dispatch('close');
		}

		submitting = false;
	}

	function handleClose() {
		dispatch('close');
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
			<h2 class="text-2xl font-bold mb-4">Edit Proyek</h2>
			<form on:submit|preventDefault={handleSubmit}>
				<div class="mb-4">
					<label for="editProjectName" class="block text-gray-700 font-bold mb-2">
						Nama Proyek
					</label>
					<input
						type="text"
						id="editProjectName"
						bind:value={projectName}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					/>
				</div>

				<div class="mb-4">
					<label for="editProjectDescription" class="block text-gray-700 font-bold mb-2">
						Deskripsi
					</label>
					<textarea
						id="editProjectDescription"
						bind:value={projectDescription}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows="4"
					></textarea>
				</div>

				<!-- Tambahan: Dropdown status proyek -->
				<div class="mb-6">
					<label for="editProjectStatus" class="block text-gray-700 font-bold mb-2">
						Status Proyek
					</label>
					<select
						id="editProjectStatus"
						bind:value={status}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="active">Active</option>
						<option value="on-hold">On Hold</option>
						<option value="completed">Completed</option>
						<option value="archived">Archived</option>
					</select>
				</div>

				{#if errorMessage}
					<p class="text-red-500 text-sm mb-4">{errorMessage}</p>
				{/if}

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
						class="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-700 transition-colors"
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
