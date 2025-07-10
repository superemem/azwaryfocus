<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import toast from 'svelte-5-french-toast';

	// 1. TERIMA PROPS, TIDAK PAKAI STORE
	let { isOpen, task, session, allProfiles } = $props<{
		isOpen: boolean;
		task: any | null;
		session: Session | null;
		allProfiles: { id?: string; user_id?: string; username: string }[];
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE LOKAL DENGAN RUNES
	let title = $state('');
	let description = $state('');
	let assignedTo = $state('');
	let priority = $state('Medium');
	let dueDate = $state('');

	// 3. EFEK UNTUK MENGISI FORM SAAT MODAL DIBUKA ATAU TASK BERUBAH
	$effect(() => {
		if (isOpen && task) {
			title = task.title || '';
			description = task.description || '';
			assignedTo = task.assigned_to || session?.user?.id || '';
			priority = task.priority || 'Medium';
			dueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
		}
	});

	// 4. FUNGSI-FUNGSI YANG SUDAH DIRAPIKAN
	function closeModal() {
		dispatch('close');
	}

	function handleSubmit() {
		if (!title.trim()) {
			toast.error('Judul tugas tidak boleh kosong.');
			return;
		}
		dispatch('submit', {
			id: task.id,
			updates: {
				title,
				description,
				assigned_to: assignedTo,
				priority,
				due_date: dueDate || null
			}
		});
		closeModal();
	}
</script>

{#if isOpen && task}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
		on:click|self={closeModal}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg text-white"
			on:click|stopPropagation
			role="document"
		>
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-3xl font-bold">Edit Tugas</h2>
				<button on:click={closeModal} class="text-gray-400 hover:text-white" aria-label="Tutup">
					&times;
				</button>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="edit-title" class="block font-semibold mb-2">Judul</label>
					<input
						id="edit-title"
						type="text"
						bind:value={title}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						required
					/>
				</div>

				<div>
					<label for="edit-desc" class="block font-semibold mb-2">Deskripsi</label>
					<textarea
						id="edit-desc"
						bind:value={description}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						rows="3"
					></textarea>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="edit-assign" class="block font-semibold mb-2">Tugaskan Kepada</label>
						<select
							id="edit-assign"
							bind:value={assignedTo}
							class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						>
							<!-- ======================================================= -->
							<!-- BAGIAN YANG DIPERBAIKI -->
							<!-- ======================================================= -->
							{#each allProfiles || [] as profile (profile.id || profile.user_id)}
								<option value={profile.id || profile.user_id}>{profile.username}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-priority" class="block font-semibold mb-2">Prioritas</label>
						<select
							id="edit-priority"
							bind:value={priority}
							class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
						>
							<option value="High">Tinggi</option>
							<option value="Medium">Sedang</option>
							<option value="Low">Rendah</option>
						</select>
					</div>
				</div>

				<div>
					<label for="edit-dueDate" class="block font-semibold mb-2">Tanggal Tenggat</label>
					<input
						id="edit-dueDate"
						type="date"
						bind:value={dueDate}
						class="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600"
					/>
				</div>

				<div class="flex justify-end gap-4 pt-4">
					<button
						type="button"
						on:click={closeModal}
						class="px-6 py-3 bg-gray-600 font-bold rounded-xl hover:bg-gray-500"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-6 py-3 bg-purple-600 font-bold rounded-xl hover:bg-purple-700"
					>
						Simpan Perubahan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
