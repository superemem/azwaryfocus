<script lang="ts">
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';

	// 1. STATE LOKAL MENGGUNAKAN RUNES
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let isValidToken = $state(false);
	let checkingToken = $state(true);

	// 2. onMount SEKARANG MENGGUNAKAN CLIENT DARI STORE
	onMount(() => {
		// Beri waktu sedikit agar supabase client dari layout selesai diinisialisasi
		setTimeout(() => {
			const supabase = get(supabaseClientStore);
			if (!supabase) {
				toast.error('Gagal menginisialisasi. Coba refresh.');
				checkingToken = false;
				return;
			}

			// Listener ini akan terpicu saat Supabase selesai memproses token dari URL
			const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
				if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
					// Jika user berhasil masuk atau password diupdate, token valid
					isValidToken = true;
					checkingToken = false;
					toast.success('Silakan masukkan password baru Anda.');
					// Hentikan listener setelah berhasil
					authListener.subscription.unsubscribe();
				}
			});

			// Jika setelah beberapa saat tidak ada event, anggap token tidak valid
			setTimeout(() => {
				if (checkingToken) {
					isValidToken = false;
					checkingToken = false;
					toast.error('Link reset password tidak valid atau sudah kadaluarsa.');
					authListener.subscription.unsubscribe();
					goto('/');
				}
			}, 3000);
		}, 100);
	});

	async function handleUpdatePassword() {
		if (!isValidToken) {
			toast.error('Sesi tidak valid. Silakan coba lagi dari link email Anda.');
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error('Password tidak cocok.');
			return;
		}
		if (newPassword.length < 6) {
			toast.error('Password minimal 6 karakter.');
			return;
		}

		loading = true;
		const supabase = get(supabaseClientStore);
		if (!supabase) {
			toast.error('Koneksi gagal.');
			loading = false;
			return;
		}

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (error) throw error;

			toast.success('Password berhasil diubah! Anda akan diarahkan...');
			setTimeout(() => {
				// Sign out agar user harus login ulang dengan password baru
				supabase.auth.signOut();
				goto('/');
			}, 2000);
		} catch (error: any) {
			toast.error(`Gagal mengubah password: ${error.message}`);
		} finally {
			loading = false;
		}
	}
</script>

{#if checkingToken}
	<div class="min-h-screen flex items-center justify-center bg-gray-900">
		<div class="text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
			<p class="text-gray-300 mt-4">Memverifikasi link reset...</p>
		</div>
	</div>
{:else if !isValidToken}
	<div class="min-h-screen flex items-center justify-center bg-gray-900">
		<div class="text-center p-8 bg-gray-800 rounded-lg">
			<p class="text-red-400 text-lg font-semibold mb-4">Link Reset Tidak Valid</p>
			<p class="text-gray-300">Anda akan diarahkan ke halaman utama...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
		<div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-10">
			<h2 class="text-3xl font-bold text-center text-white mb-8">Reset Password</h2>

			<form on:submit|preventDefault={handleUpdatePassword} class="space-y-6">
				<div>
					<label for="new-password" class="block text-sm font-medium text-gray-300 mb-2">
						Password Baru
					</label>
					<input
						id="new-password"
						type="password"
						bind:value={newPassword}
						required
						minlength="6"
						class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
						placeholder="Minimal 6 karakter"
					/>
				</div>

				<div>
					<label for="confirm-password" class="block text-sm font-medium text-gray-300 mb-2">
						Konfirmasi Password Baru
					</label>
					<input
						id="confirm-password"
						type="password"
						bind:value={confirmPassword}
						required
						class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
						placeholder="Ulangi password baru"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all"
				>
					{loading ? 'Menyimpan...' : 'Ubah Password'}
				</button>
			</form>
		</div>
	</div>
{/if}
