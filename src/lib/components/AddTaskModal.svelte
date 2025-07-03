<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/authStore';

	const dispatch = createEventDispatcher();

	let title = '';
	let description = '';
	let dueDate = '';
	let assignedTo = '';
	let userRole = 'staff';
	let userId = '';
	let users: any[] = [];

	export let isOpen = false;

	// Dapatkan session info
	$: userRole = $session?.user?.role || 'staff';
	$: userId = $session?.user?.id || '';

	// Ambil semua user untuk opsi assign (hanya untuk supervisor)
	onMount(async () => {
		if (userRole === 'supervisor') {
			const { data, error } = await supabase.from('profiles').select('id, username');

			if (!error && data) {
				users = data;
			}
		}
	});

	function closeModal() {
		dispatch('close');
	}

	function handleSubmit() {
		if (!title.trim()) {
			alert('Judul tidak boleh kosong!');
			return;
		}

		const taskData = {
			title,
			description,
			due_date: dueDate || null,
			assigned_to: userRole === 'supervisor' ? assignedTo : userId
		};

		dispatch('submit', taskData);

		title = '';
		description = '';
		dueDate = '';
		assignedTo = '';
		closeModal();
	}

	$: if (!isOpen) {
		title = '';
		description = '';
		dueDate = '';
		assignedTo = '';
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click|self={closeModal}>
		<div class="modal-content">
			<h3>Tambah Tugas Baru</h3>
			<form on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="title">Judul Tugas</label>
					<input id="title" type="text" bind:value={title} required />
				</div>

				<div class="form-group">
					<label for="description">Deskripsi</label>
					<textarea id="description" bind:value={description}></textarea>
				</div>

				<div class="form-group">
					<label>Tugaskan kepada:</label>
					{#if userRole === 'supervisor'}
						<select bind:value={assignedTo} required>
							<option value="" disabled>Pilih user</option>
							{#each users as user}
								<option value={user.id}>{user.username}</option>
							{/each}
						</select>
					{:else}
						<p class="text-sm text-gray-700">Kamu sendiri</p>
					{/if}
				</div>

				<div class="form-group">
					<label for="dueDate">Tanggal Tenggat</label>
					<input id="dueDate" type="date" bind:value={dueDate} />
				</div>

				<div class="modal-actions">
					<button type="submit" class="submit-btn">Simpan</button>
					<button type="button" on:click={closeModal} class="cancel-btn">Batal</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
	.modal-content {
		background-color: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		width: 90%;
		max-width: 500px;
		box-sizing: border-box;
	}
	h3 {
		margin-top: 0;
		margin-bottom: 25px;
		font-size: 24px;
		color: #333;
		text-align: center;
	}
	.form-group {
		margin-bottom: 20px;
	}
	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-weight: bold;
		color: #555;
	}
	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 5px;
		font-size: 16px;
		box-sizing: border-box;
	}
	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 30px;
	}
	.modal-actions button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.1s ease;
	}
	.submit-btn {
		background-color: #22c55e;
		color: white;
	}
	.submit-btn:hover {
		background-color: #16a34a;
		transform: translateY(-1px);
	}
	.cancel-btn {
		background-color: #e5e7eb;
		color: #374151;
	}
	.cancel-btn:hover {
		background-color: #d1d5db;
		transform: translateY(-1px);
	}
</style>
