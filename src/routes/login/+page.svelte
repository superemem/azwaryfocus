<script lang="ts">
	// 1. IMPORTS YANG BENAR
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import toast from 'svelte-5-french-toast';

	// 2. STATE MENGGUNAKAN RUNES
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let isSigningUp = $state(false);
	let showResetForm = $state(false);

	// 3. FUNGSI UTILITY UNTUK VALIDASI & ERROR
	function validateForm() {
		if (!email.trim() || !email.includes('@')) {
			toast.error('Format email tidak valid');
			return false;
		}
		if (password.length < 6) {
			toast.error('Password minimal 6 karakter');
			return false;
		}
		return true;
	}

	function handleError(error: any, context: string) {
		console.error(`Error during ${context}:`, error);
		if (error.message.includes('Invalid login credentials')) {
			toast.error('Email atau password salah');
		} else if (error.message.includes('Email not confirmed')) {
			toast.error('Silakan cek email untuk verifikasi akun');
		} else if (error.message.includes('User already registered')) {
			toast.error('Email ini sudah terdaftar. Silakan login.');
		} else {
			toast.error(error.message || `Gagal saat ${context}`);
		}
	}

	// 4. FUNGSI UTAMA (LOGIN, SIGNUP, RESET)
	async function handleLogin() {
		if (!validateForm()) return;
		loading = true;
		try {
			const supabase = get(supabaseClientStore);
			if (!supabase) throw new Error('Supabase client tidak ada');

			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) throw error;
			// Redirect tidak perlu, layout akan mengurusnya via invalidateAll()
		} catch (err) {
			handleError(err, 'login');
		} finally {
			loading = false;
		}
	}

	async function handleSignup() {
		if (!validateForm()) return;
		loading = true;
		try {
			const supabase = get(supabaseClientStore);
			if (!supabase) throw new Error('Supabase client tidak ada');

			const { error } = await supabase.auth.signUp({ email, password });
			if (error) throw error;

			toast.success('Pendaftaran berhasil! Cek email kamu untuk verifikasi.');
			isSigningUp = false; // Arahkan kembali ke form login
		} catch (err) {
			handleError(err, 'mendaftar');
		} finally {
			loading = false;
		}
	}

	async function handleResetPassword() {
		if (!email.trim() || !email.includes('@')) {
			toast.error('Masukkan email yang valid terlebih dahulu');
			return;
		}
		loading = true;
		try {
			const supabase = get(supabaseClientStore);
			if (!supabase) throw new Error('Supabase client tidak ada');

			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password` // Pastikan halaman ini ada
			});
			if (error) throw error;

			toast.success('Link reset password telah dikirim ke email kamu!');
			showResetForm = false;
		} catch (err) {
			handleError(err, 'reset password');
		} finally {
			loading = false;
		}
	}

	function toggleView() {
		isSigningUp = !isSigningUp;
		showResetForm = false; // Selalu sembunyikan form reset saat ganti view
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
	<div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-10 space-y-8">
		<h2 class="text-4xl font-bold text-center text-white">
			{#if showResetForm}
				Reset Password
			{:else if isSigningUp}
				Daftar Akun Baru
			{:else}
				Masuk ke Kanban
			{/if}
		</h2>

		{#if showResetForm}
			<div class="space-y-4">
				<p class="text-gray-300 text-sm text-center">
					Masukkan email kamu, kami akan kirim link untuk reset password.
				</p>
				<div>
					<label for="email-reset" class="block text-sm font-medium text-gray-300">Email</label>
					<input
						id="email-reset"
						type="email"
						bind:value={email}
						class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="nama@email.com"
					/>
				</div>
				<button
					on:click={handleResetPassword}
					disabled={loading}
					class="w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Mengirim...' : 'Kirim Link Reset'}
				</button>
			</div>
		{:else}
			<form on:submit|preventDefault={isSigningUp ? handleSignup : handleLogin} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="nama@email.com"
					/>
				</div>
				<div>
					<label for="password" class="block text-sm font-medium text-gray-300">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="•••••••• (minimal 6 karakter)"
					/>
				</div>

				<button
					type="submit"
					class="w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
					disabled={loading}
				>
					{loading ? 'Proses...' : isSigningUp ? 'Daftar' : 'Masuk'}
				</button>
			</form>
		{/if}

		<div class="text-center space-y-2">
			<button on:click={toggleView} class="text-blue-400 hover:underline transition-colors text-sm">
				{isSigningUp ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
			</button>
			{#if !isSigningUp}
				<button
					on:click={() => (showResetForm = !showResetForm)}
					class="text-blue-400 hover:underline text-sm"
				>
					{showResetForm ? 'Batal Reset' : 'Lupa Password?'}
				</button>
			{/if}
		</div>
	</div>
</div>
