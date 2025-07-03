<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import '../../app.css';

	export let isOpen: boolean;
	export let currentProfile: {
		id: string;
		username: string;
		avatar_url: string | null;
		job_title?: string;
	} | null = null;

	let newUsername = '';
	let avatarFile: File | null = null;
	let avatarPreviewUrl: string | null = null;
	let jobTitle = '';

	const dispatch = createEventDispatcher();

	$: if (isOpen && currentProfile) {
		newUsername = currentProfile.username;
		avatarPreviewUrl = currentProfile.avatar_url;
		jobTitle = currentProfile.job_title || '';
		avatarFile = null;
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] || null;
		avatarFile = file;

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreviewUrl = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			avatarPreviewUrl = currentProfile?.avatar_url || null;
		}
	}

	function handleSubmit() {
		if (newUsername.trim() === '') {
			alert('Username tidak boleh kosong!');
			return;
		}
		dispatch('submit', {
			newUsername,
			avatarFile,
			jobTitle
		});
		dispatch('close');
	}

	function handleClose() {
		dispatch('close');
	}
</script>

{#if isOpen}
	<div class="modal-backdrop">
		<div class="modal-content">
			<div class="modal-header">
				<h3>Edit Profil</h3>
				<button class="close-btn" on:click={handleClose}>&times;</button>
			</div>
			<div class="modal-body">
				{#if currentProfile}
					<form on:submit|preventDefault={handleSubmit}>
						<div class="avatar-preview-container">
							{#if avatarPreviewUrl}
								<img src={avatarPreviewUrl} alt="Avatar Preview" class="avatar-preview" />
							{:else}
								<div class="avatar-placeholder">?</div>
							{/if}
						</div>

						<div class="form-group">
							<label for="avatar">Foto Profil:</label>
							<input id="avatar" type="file" accept="image/*" on:change={handleFileChange} />
						</div>

						<div class="form-group">
							<label for="username">Username:</label>
							<input id="username" type="text" bind:value={newUsername} />
						</div>

						<div class="form-group">
							<label for="job_title">Jabatan:</label>
							<select id="job_title" bind:value={jobTitle}>
								<option value="">- Pilih Jabatan -</option>
								<option value="Head Creative Marketing">Head Creative Marketing</option>
								<option value="CRM">CRM</option>
								<option value="Community and Partnership">Community and Partnership</option>
								<option value="Content Production">Content Production</option>
							</select>
						</div>

						<div class="modal-actions">
							<button type="submit" class="save-btn">Simpan Perubahan</button>
							<button type="button" class="cancel-btn" on:click={handleClose}>Batal</button>
						</div>
					</form>
				{:else}
					<p>Loading profil...</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Backdrop yang menutupi layar */
	.modal-backdrop {
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

	/* Konten modal */
	.modal-content {
		background-color: #fff;
		padding: 25px;
		border-radius: 8px;
		width: 90%;
		max-width: 450px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
		transform: scale(0.95);
		animation: scaleIn 0.2s forwards;
	}

	/* Animasi muncul */
	@keyframes scaleIn {
		to {
			transform: scale(1);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #eee;
		padding-bottom: 10px;
		margin-bottom: 20px;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.5em;
		color: #333;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2em;
		cursor: pointer;
		color: #888;
		padding: 0;
	}

	.close-btn:hover {
		color: #555;
	}

	.avatar-preview-container {
		text-align: center;
		margin-bottom: 20px;
	}
	.avatar-preview {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid #007bff;
	}
	.avatar-placeholder {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background-color: #eee;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 3em;
		color: #ccc;
		margin: 0 auto;
		border: 3px solid #ddd;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		font-weight: bold;
		margin-bottom: 8px;
		color: #555;
	}

	.form-group input {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1em;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: #007bff;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.modal-actions button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1em;
		font-weight: bold;
		transition:
			background-color 0.2s,
			transform 0.1s;
	}

	.save-btn {
		background-color: #007bff;
		color: white;
	}

	.save-btn:hover {
		background-color: #0056b3;
		transform: translateY(-1px);
	}

	.cancel-btn {
		background-color: #e0e0e0;
		color: #555;
	}

	.cancel-btn:hover {
		background-color: #ccc;
		transform: translateY(-1px);
	}
	.form-group select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1em;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.form-group select:focus {
		outline: none;
		border-color: #007bff;
	}
</style>
