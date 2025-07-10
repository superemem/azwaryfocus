<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import toast from 'svelte-5-french-toast';

	// 1. TERIMA PROPS, SEKARANG TERMASUK PROFILE UNTUK MENGETAHUI ROLE
	let {
		isOpen,
		session,
		profile, // <-- Prop baru untuk role
		allProfiles
	} = $props<{
		isOpen: boolean;
		session: Session | null;
		profile: { role: string } | null; // <-- Tipe untuk prop baru
		allProfiles: { id?: string; user_id?: string; username: string }[];
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE LOKAL MENGGUNAKAN RUNES
	let title = $state('');
	let description = $state('');
	let dueDate = $state('');
	let priority = $state('Medium');
	let assignedTo = $state(session?.user?.id || '');

	// 3. FUNGSI-FUNGSI YANG SUDAH DIRAPIKAN
	function closeModal() {
		dispatch('close');
	}

	function handleSubmit() {
		if (!title.trim()) {
			toast.error('Judul tugas tidak boleh kosong.');
			return;
		}
		if (!session?.user) {
			toast.error('Sesi tidak valid, silakan login ulang.');
			return;
		}

		// Kirim data tugas. `assignedTo` akan otomatis benar berdasarkan role.
		dispatch('submit', {
			title,
			description,
			due_date: dueDate || null,
			priority,
			assigned_to: assignedTo || session.user.id
		});

		closeModal();
	}

	// Reactive: reset form saat modal ditutup
	$effect(() => {
		if (!isOpen) {
			title = '';
			description = '';
			dueDate = '';
			priority = 'Medium';
			// Selalu reset ke diri sendiri saat ditutup
			assignedTo = session?.user?.id || '';
		} else {
			// Saat dibuka, pastikan defaultnya adalah diri sendiri
			assignedTo = session?.user?.id || '';
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
		on:click|self={closeModal}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg"
			on:click|stopPropagation
			role="document"
		>
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-3xl font-bold text-white">Tambah Tugas Baru</h2>
				<button
					on:click={closeModal}
					class="text-gray-400 hover:text-white"
					aria-label="Tutup modal"
				>
					&times;
				</button>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="title" class="block text-gray-300 font-semibold mb-2">Judul Tugas</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
						placeholder="Contoh: Desain halaman utama"
						required
					/>
				</div>

				<div>
					<label for="description" class="block text-gray-300 font-semibold mb-2">Deskripsi</label>
					<textarea
						id="description"
						bind:value={description}
						rows="3"
						class="w-full p-4 rounded-xl bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
						placeholder="Detail atau catatan untuk tugas ini"
					></textarea>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="assignedTo" class="block text-gray-300 font-semibold mb-2"
							>Tugaskan Kepada</label
						>
						<!-- ======================================================= -->
						<!-- BAGIAN YANG DIPERBAIKI DENGAN LOGIKA ROLE -->
						<!-- ======================================================= -->
						{#if profile?.role === 'supervisor'}
							<!-- Tampilkan dropdown hanya untuk supervisor -->
							<select
								id="assignedTo"
								bind:value={assignedTo}
								class="w-full p-4 rounded-xl bg-gray-700 text-white border-gray-600 focus:ring-2 focus:ring-purple-600"
							>
								<option value={session?.user?.id}>Diri Sendiri (Supervisor)</option>
								{#each allProfiles as p (p.id || p.user_id)}
									{#if (p.id || p.user_id) !== session?.user?.id}
										<option value={p.id || p.user_id}>{p.username}</option>
									{/if}
								{/each}
							</select>
						{:else}
							<!-- Tampilkan teks statis untuk staff -->
							<div class="w-full p-4 rounded-xl bg-gray-700 text-gray-400">Diri Sendiri</div>
						{/if}
					</div>

					<div>
						<label for="priority" class="block text-gray-300 font-semibold mb-2">Prioritas</label>
						<select
							id="priority"
							bind:value={priority}
							class="w-full p-4 rounded-xl bg-gray-700 text-white border-gray-600 focus:ring-2 focus:ring-purple-600"
						>
							<option value="Low">Rendah</option>
							<option value="Medium">Sedang</option>
							<option value="High">Tinggi</option>
						</select>
					</div>
				</div>

				<div>
					<label for="dueDate" class="block text-gray-300 font-semibold mb-2"
						>Tanggal Tenggat (Opsional)</label
					>
					<input
						id="dueDate"
						type="date"
						bind:value={dueDate}
						class="w-full p-4 rounded-xl bg-gray-700 text-white border-gray-600 focus:ring-2 focus:ring-purple-600"
					/>
				</div>

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
						class="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
					>
						Tambah Tugas
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
