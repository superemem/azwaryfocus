<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import toast from 'svelte-5-french-toast';
	import type { Session } from '@supabase/supabase-js';

	// 1. TERIMA PROPS DENGAN CARA SVELTE 5
	let { isOpen, session, profile } = $props<{
		isOpen: boolean;
		session: Session | null;
		profile: { username: string; avatar_url: string | null; job_title?: string } | null;
	}>();

	const dispatch = createEventDispatcher();

	// 2. STATE LOKAL UNTUK FORM
	let newUsername = $state('');
	let jobTitle = $state('');
	let avatarFile = $state<File | null>(null);
	let avatarPreviewUrl = $state<string | null>(null);

	// 3. EFEK UNTUK MENGISI FORM SAAT MODAL DIBUKA ATAU PROFIL BERUBAH
	$effect(() => {
		if (isOpen && profile) {
			newUsername = profile.username || '';
			jobTitle = profile.job_title || '';
			avatarPreviewUrl = profile.avatar_url;
			avatarFile = null; // Reset file input setiap kali modal dibuka
		}
	});

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			avatarFile = file;
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreviewUrl = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function handleSubmit() {
		if (!newUsername.trim()) {
			toast.error('Username tidak boleh kosong.');
			return;
		}
		// Kirim data ke parent (layout) untuk diproses
		dispatch('submit', { newUsername, avatarFile, jobTitle });
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" on:click|self={() => dispatch('close')}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>Edit Profil</h3>
				<button class="close-btn" on:click={() => dispatch('close')}>&times;</button>
			</div>
			<div class="modal-body">
				{#if profile}
					<form on:submit|preventDefault={handleSubmit} class="space-y-4">
						<div class="avatar-preview-container">
							<img
								src={avatarPreviewUrl ||
									`https://ui-avatars.com/api/?name=${newUsername || 'G'}&background=4f46e5&color=fff&size=128`}
								alt="Avatar Preview"
								class="avatar-preview"
							/>
							<label for="avatar-upload" class="avatar-change-btn"> Ubah Foto </label>
							<input
								id="avatar-upload"
								type="file"
								accept="image/*"
								on:change={handleFileChange}
								class="hidden"
							/>
						</div>

						<div class="form-group">
							<label for="username">Username</label>
							<input id="username" type="text" bind:value={newUsername} />
						</div>

						<div class="form-group">
							<label for="job_title">Jabatan</label>
							<select id="job_title" bind:value={jobTitle}>
								<option value="">- Pilih Jabatan -</option>
								<option value="Head Creative Marketing">Head Creative Marketing</option>
								<option value="CRM">CRM</option>
								<option value="Community and Partnership">Community and Partnership</option>
								<option value="Content Production">Content Production</option>
							</select>
						</div>

						<div class="modal-actions">
							<button type="button" class="cancel-btn" on:click={() => dispatch('close')}
								>Batal</button
							>
							<button type="submit" class="save-btn">Simpan Perubahan</button>
						</div>
					</form>
				{:else}
					<p>Memuat profil...</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
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
	.modal-content {
		background-color: #fff;
		padding: 25px;
		border-radius: 8px;
		width: 90%;
		max-width: 450px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
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
	.avatar-preview-container {
		text-align: center;
		margin-bottom: 1rem;
	}
	.avatar-preview {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		object-fit: cover;
		border: 4px solid #e5e7eb;
		margin: 0 auto 1rem;
	}
	.avatar-change-btn {
		cursor: pointer;
		padding: 0.5rem 1rem;
		background-color: #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
	}
	.form-group {
		margin-bottom: 1rem;
	}
	.form-group label {
		display: block;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #555;
	}
	.form-group input,
	.form-group select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1em;
		box-sizing: border-box;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 1.5rem;
	}
	.modal-actions button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1em;
		font-weight: bold;
	}
	.save-btn {
		background-color: #4f46e5;
		color: white;
	}
	.cancel-btn {
		background-color: #e0e0e0;
		color: #555;
	}
</style>
