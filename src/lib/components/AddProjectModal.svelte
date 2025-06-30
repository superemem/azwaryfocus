<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { userProfile } from '$lib/stores/authStore';
	import { projectRefreshSignal } from '$lib/stores/refreshStore';

	// Props untuk mengontrol modal
	export let isOpen: boolean;

	// Dispatcher untuk event custom (menutup modal dan refresh data)
	const dispatch = createEventDispatcher();

	// State untuk form input
	let projectName = '';
	let projectDescription = '';
	let isLoading = false;
	let errorMessage = '';

	// Fungsi untuk menutup modal
	function closeModal() {
		isOpen = false;
		projectName = ''; // Reset form
		projectDescription = '';
		errorMessage = '';
		dispatch('close');
	}

	// src/lib/components/AddProjectModal.svelte
	// ...
	async function addProject() {
		// ... (kode awal fungsi)
		const { data, error: insertError } = await supabase
			.from('projects')
			.insert({
				name: projectName,
				description: projectDescription,
				created_by: $userProfile.id, // Sesuaikan dengan nama kolom yang sudah kita sepakati
				status: 'active' // Pastikan statusnya 'active'
			})
			.select(); // Tambahkan .select() untuk mendapatkan data yang di-insert, termasuk ID-nya.

		if (insertError) {
			console.error('Error adding project:', insertError);
			errorMessage = `Gagal menambahkan proyek: ${insertError.message}`;
		} else {
			// --- KODE BARU DIMULAI DI SINI ---
			console.log('DEBUG: Proyek berhasil di-insert:', data);
			const newProjectId = data[0].id; // Ambil ID proyek yang baru dibuat

			// Buat array objek untuk kolom default
			const defaultColumns = [
				{ name: 'To Do', project_id: newProjectId, order: 1 },
				{ name: 'In Progress', project_id: newProjectId, order: 2 },
				{ name: 'Done', project_id: newProjectId, order: 3 }
			];

			// Masukkan kolom-kolom tersebut ke tabel 'columns'
			const { data: columnsData, error: columnsError } = await supabase
				.from('columns')
				.insert(defaultColumns);

			if (columnsError) {
				console.error('Error inserting default columns:', columnsError);
				alert(
					'Proyek berhasil dibuat, tapi gagal membuat kolom default. Silakan tambahkan kolom secara manual.'
				);
			} else {
				console.log('DEBUG: Kolom default berhasil dibuat:', columnsData);
			}
			// --- KODE BARU SELESAI DI SINI ---

			// Kode refresh yang sudah kita sepakati
			closeModal();
			projectRefreshSignal.update((n) => n + 1);
		}
		isLoading = false;
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
		on:click|self={closeModal}
	>
		<div
			class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg transform transition-transform duration-300 scale-100"
			on:click|stopPropagation
		>
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-3xl font-bold text-white">Tambah Proyek Baru</h2>
				<button on:click={closeModal} class="text-gray-400 hover:text-white transition-colors">
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path></svg
					>
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
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-200"
						placeholder="Masukkan nama proyek"
					/>
				</div>
				<div>
					<label for="projectDescription" class="block text-gray-300 font-semibold mb-2"
						>Deskripsi (Opsional)</label
					>
					<textarea
						id="projectDescription"
						bind:value={projectDescription}
						rows="4"
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-200"
						placeholder="Deskripsi singkat proyek"
					></textarea>
				</div>

				{#if errorMessage}
					<p class="text-red-400 text-sm">{errorMessage}</p>
				{/if}

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						on:click={closeModal}
						class="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-500 transition-colors duration-200"
						>Batal</button
					>
					<button
						type="submit"
						class="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
