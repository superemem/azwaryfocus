<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Dispatcher untuk mengirim event dari modal ke komponen induk
	const dispatch = createEventDispatcher();

	// Variable untuk menyimpan input dari form
	let title: string = '';
	let description: string = '';

	// Props yang diterima dari komponen induk
	export let isOpen: boolean;

	// Fungsi untuk menutup modal
	function closeModal() {
		dispatch('close');
	}

	// Fungsi untuk menangani submit form
	function handleSubmit() {
		// Cek apakah judul sudah diisi
		if (title.trim()) {
			// Kirim event 'submit' beserta data tugas baru
			dispatch('submit', { title, description });
			// Reset form setelah submit
			title = '';
			description = '';
		}
		// Tutup modal setelah submit
		closeModal();
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
	.form-group textarea {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 5px;
		font-size: 16px;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}
	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #007bff;
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
		padding: 12px 25px;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		font-weight: bold;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
	}
	.submit-btn {
		background-color: #28a745;
		color: white;
	}
	.submit-btn:hover {
		background-color: #218838;
		transform: translateY(-1px);
	}
	.cancel-btn {
		background-color: #f0f0f0;
		color: #555;
	}
	.cancel-btn:hover {
		background-color: #e0e0e0;
		transform: translateY(-1px);
	}
</style>
