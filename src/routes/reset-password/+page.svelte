<!-- src/routes/reset-password/+page.svelte -->
<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import toast from 'svelte-5-french-toast';

	let newPassword = '';
	let confirmPassword = '';
	let loading = false;
	let isValidToken = false;
	let checkingToken = true;

	onMount(async () => {
		// Cek apakah ada session dari URL fragments
		const { data, error } = await supabase.auth.getSession();

		if (data.session) {
			// Ada session aktif dari reset link
			isValidToken = true;
			checkingToken = false;
			toast.success('Silakan masukkan password baru');
		} else {
			// Coba handle auth callback dari URL
			const { data: authData, error: authError } = await supabase.auth.getUser();

			if (authData.user) {
				isValidToken = true;
				checkingToken = false;
			} else {
				// Tidak ada token valid
				toast.error('Link reset password tidak valid atau sudah kadaluarsa');
				setTimeout(() => goto('/'), 3000);
				checkingToken = false;
			}
		}
	});

	async function handleUpdatePassword() {
		if (!isValidToken) {
			toast.error('Session tidak valid');
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error('Password tidak cocok');
			return;
		}

		if (newPassword.length < 6) {
			toast.error('Password minimal 6 karakter');
			return;
		}

		loading = true;

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (error) {
				toast.error(error.message);
			} else {
				toast.success('Password berhasil diubah!');
				// Redirect ke dashboard/profile setelah berhasil
				setTimeout(() => goto('/profile'), 1500);
			}
		} catch (err) {
			console.error('Error updating password:', err);
			toast.error('Gagal mengubah password');
		} finally {
			loading = false;
		}
	}
</script>

{#if checkingToken}
	<div class="min-h-screen flex items-center justify-center bg-gray-900">
		<div class="text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
			<p class="text-gray-300 mt-4">Memverifikasi link reset...</p>
		</div>
	</div>
{:else if !isValidToken}
	<div class="min-h-screen flex items-center justify-center bg-gray-900">
		<div class="text-center">
			<p class="text-red-400 mb-4">Link reset password tidak valid</p>
			<p class="text-gray-300">Anda akan diarahkan ke halaman login...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
		<div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-10">
			<h2 class="text-3xl font-bold text-center text-white mb-8">Reset Password</h2>

			<form on:submit|preventDefault={handleUpdatePassword} class="space-y-6">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-2"> Password Baru </label>
					<input
						type="password"
						bind:value={newPassword}
						required
						minlength="6"
						class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Minimal 6 karakter"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-2">
						Konfirmasi Password Baru
					</label>
					<input
						type="password"
						bind:value={confirmPassword}
						required
						class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Ulangi password baru"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
				>
					{loading ? 'Menyimpan...' : 'Ubah Password'}
				</button>
			</form>

			<div class="text-center mt-6">
				<button on:click={() => goto('/')} class="text-blue-400 hover:underline text-sm">
					Kembali ke Login
				</button>
			</div>
		</div>
	</div>
{/if}
