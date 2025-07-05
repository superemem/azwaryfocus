<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { session, userProfile } from '$lib/stores/authStore'; // <-- IMPORT userProfile di sini juga
	import toast from 'svelte-5-french-toast';

	export let isOpen: boolean;
	export let task: any = null;
	export let allProfiles: any[] = []; // Ini adalah semua profil yang di-fetch dari parent

	let localTitle = '';
	let localDescription = '';
	let localAssignedTo: string | null = null;
	let localPriority = 'Low';
	let localDueDate: string | null = null;

	const dispatch = createEventDispatcher();

	// Ambil user ID dari session
	$: currentUserId = $session?.user?.id;
	// Ambil role dari userProfile (ini yang benar)
	$: currentUserRole = $userProfile?.role || 'staff'; // Default ke 'staff' jika belum terload/null

	// Filter allProfiles untuk mendapatkan daftar user yang bisa di-assign oleh supervisor
	// Jika ada Supervisor, dia bisa assign ke dirinya sendiri atau ke semua staff.
	// Jika staff, daftar ini tidak akan digunakan untuk select.
	$: assignableUsers = allProfiles.filter(
		(profile) => profile.id !== currentUserId || currentUserRole === 'supervisor'
	);

	// Load data awal dari task. Gunakan currentUserId untuk staff default assigned_to.
	$: if (task && currentUserId) {
		// Pastikan currentUserId sudah tersedia
		localTitle = task.title;
		localDescription = task.description || '';

		// Jika task belum di-assign atau di-assign ke user yang tidak lagi ada, default ke user saat ini
		// Jika user adalah staff, secara otomatis assigned_to dirinya sendiri
		if (currentUserRole === 'staff') {
			localAssignedTo = currentUserId;
		} else {
			// Supervisor
			// Jika task sudah ada assigned_to, gunakan itu. Jika tidak, default ke null (unassigned)
			// Atau jika supervisor ingin meng-assign ke dirinya sendiri, bisa juga
			localAssignedTo = task.assigned_to || null; // Biarkan null jika belum di-assign
		}
		localPriority = task.priority || 'Low';
		localDueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null;
	} else if (!task) {
		// Reset form saat task null (misal, saat modal ditutup atau dibuka untuk task baru)
		localTitle = '';
		localDescription = '';
		localAssignedTo = currentUserId; // Default ke diri sendiri
		localPriority = 'Low';
		localDueDate = null;
	}

	function handleSave() {
		if (localTitle.trim() === '') {
			toast('Judul task tidak boleh kosong!');
			return;
		}

		let finalAssignedTo = localAssignedTo;

		// Logika untuk Staff: selalu tugaskan ke dirinya sendiri
		if (currentUserRole === 'staff') {
			finalAssignedTo = currentUserId;
		}
		// Logika untuk Supervisor: sudah ditangani oleh select,
		// localAssignedTo sudah bisa null jika dipilih "Unassigned"

		console.log('DEBUG (EditTaskModal): Saving task with assigned_to:', finalAssignedTo);

		dispatch('submit', {
			id: task.id, // ID task yang diedit
			title: localTitle,
			description: localDescription,
			assigned_to: finalAssignedTo, // Gunakan finalAssignedTo
			priority: localPriority,
			due_date: localDueDate
		});

		closeModal();
	}

	function closeModal() {
		dispatch('close');
	}
</script>

{#if isOpen && task}
	<div class="modal-backdrop" on:click|self={closeModal}>
		<div class="modal-content">
			<div class="modal-header">
				<h3>Edit Task</h3>
				<button class="close-btn" on:click={closeModal}>&times;</button>
			</div>
			<div class="modal-body">
				<label for="title">Judul:</label>
				<input id="title" type="text" bind:value={localTitle} />

				<label for="description">Deskripsi:</label>
				<textarea id="description" rows="4" bind:value={localDescription}></textarea>

				<label for="assignedTo">Tugaskan kepada:</label>
				{#if currentUserRole === 'supervisor'}
					<select id="assignedTo" bind:value={localAssignedTo}>
						<option value={null}>Unassigned</option>
						{#each allProfiles as profile (profile.id)}
							<option value={profile.id}>{profile.username}</option>
						{/each}
					</select>
				{:else}
					<p><strong>{$userProfile?.username || 'Kamu sendiri'}</strong></p>
				{/if}

				<label for="priority">Prioritas:</label>
				<select id="priority" bind:value={localPriority}>
					<option value="High">High</option>
					<option value="Medium">Medium</option>
					<option value="Low">Low</option>
				</select>

				<label for="dueDate">Tanggal Tenggat:</label>
				<input id="dueDate" type="date" bind:value={localDueDate} />

				<div class="assignee-info">
					<p>Dibuat oleh: <strong>{task.created_by_profile?.username || 'Unknown'}</strong></p>
				</div>
			</div>
			<div class="modal-footer">
				<button class="save-btn" on:click={handleSave}>Simpan Perubahan</button>
				<button class="cancel-btn" on:click={closeModal}>Batal</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Styles are the same as before */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
	.modal-content {
		background: white;
		padding: 25px;
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		gap: 15px;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #eee;
		padding-bottom: 10px;
	}
	.modal-header h3 {
		margin: 0;
		font-size: 1.5em;
	}
	.close-btn {
		background: none;
		border: none;
		font-size: 2em;
		cursor: pointer;
		color: #888;
	}
	.modal-body label {
		display: block;
		margin-bottom: 5px;
		font-weight: bold;
	}
	.modal-body input,
	.modal-body textarea,
	.modal-body select {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
		margin-bottom: 15px;
		font-size: 1em;
	}
	.modal-body textarea {
		resize: vertical;
	}
	.assignee-info {
		background-color: #f9f9f9;
		border: 1px solid #eee;
		padding: 10px;
		border-radius: 4px;
		font-size: 0.9em;
		color: #555;
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}
	.modal-footer button {
		padding: 10px 20px;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1em;
		font-weight: bold;
	}
	.save-btn {
		background-color: #007bff;
		color: white;
	}
	.cancel-btn {
		background-color: #6c757d;
		color: white;
	}
</style>
