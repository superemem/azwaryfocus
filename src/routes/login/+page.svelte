<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/authStore';
	import toast from 'svelte-5-french-toast';

	let email = '';
	let password = '';
	let loading = false;
	let isSigningUp = false;
	let isResetting = false;
	let showResetForm = false;

	async function handleLogin() {
		loading = true;

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});

			if (error) {
				handleError(error, 'login');
				return;
			}

			if (data.session) {
				session.set(data.session);
				toast.success('Berhasil masuk!');
				goto('/profile');
			}
			if (!validateForm()) return;
		} catch (err) {
			handleError(err, 'login');
		} finally {
			loading = false;
		}
	}

	async function handleSignup() {
		loading = true;

		const { data, error } = await supabase.auth.signUp({ email, password });

		if (error) {
			handleError(error, 'mendaftar');
		} else {
			toast.success('Cek email kamu untuk verifikasi!');
			isSigningUp = false;
		}
		if (!validateForm()) return;

		loading = true;
	}

	function validateForm() {
		if (!email.trim()) {
			toast.error('Email harus diisi');
			return false;
		}

		if (!email.includes('@')) {
			toast.error('Format email tidak valid');
			return false;
		}

		if (password.length < 6) {
			toast.error('Password minimal 6 karakter');
			return false;
		}

		return true;
	}

	async function handleResetPassword() {
		if (!email.trim()) {
			toast.error('Masukkan email terlebih dahulu');
			return;
		}

		isResetting = true;

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`
			});

			if (error) {
				handleError(error, 'reset password');
			} else {
				toast.success('Link reset password telah dikirim ke email kamu!');
				showResetForm = false;
			}
		} catch (err) {
			handleError(err, 'reset password');
		} finally {
			isResetting = false;
		}
	}

	function handleError(error: any, context: string) {
		console.error(`Error during ${context}:`, error);

		// Handle specific Supabase auth errors
		if (error.message === 'Invalid login credentials') {
			toast.error('Email atau password salah');
		} else if (error.message === 'Email not confirmed') {
			toast.error('Silakan cek email untuk verifikasi akun');
		} else if (error.message === 'Too many requests') {
			toast.error('Terlalu banyak percobaan. Coba lagi nanti');
		} else {
			toast.error(error.message || `Gagal ${context}`);
		}
	}

	// Perbaiki session polling
	async function waitForSession(data: any) {
		const MAX_WAIT = 5000; // Increase timeout
		const POLL_INTERVAL = 200;

		for (let i = 0; i < MAX_WAIT / POLL_INTERVAL; i++) {
			if (data.session) return data.session;
			await new Promise((r) => setTimeout(r, POLL_INTERVAL));
		}

		throw new Error('Session timeout');
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
	<div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-10 space-y-8">
		{#if showResetForm}
			<div class="bg-gray-700 p-4 rounded-lg">
				<h3 class="text-white font-medium mb-2">Reset Password</h3>
				<p class="text-gray-300 text-sm mb-4">
					Masukkan email kamu, kami akan kirim link reset password
				</p>

				<div class="flex gap-2">
					<button
						on:click={handleResetPassword}
						disabled={isResetting}
						class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
					>
						{isResetting ? 'Mengirim...' : 'Kirim Link'}
					</button>

					<button
						on:click={() => (showResetForm = false)}
						class="px-4 py-2 text-gray-400 hover:text-white"
					>
						Batal
					</button>
				</div>
			</div>
		{/if}
		<h2 class="text-4xl font-bold text-center text-white">
			{isSigningUp ? 'Daftar Akun Baru' : 'Masuk ke Kanban'}
		</h2>

		<form on:submit|preventDefault={isSigningUp ? handleSignup : handleLogin} class="space-y-6">
			<div>
				<label for="email" class="block text-sm font-medium text-gray-300">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
					class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
					placeholder="••••••••"
				/>
			</div>

			<button
				type="submit"
				class="w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				class:bg-blue-600={!loading}
				class:bg-blue-800={loading}
				disabled={loading}
			>
				{#if loading}
					Proses...
				{:else}
					{isSigningUp ? 'Daftar' : 'Masuk'}
				{/if}
			</button>
		</form>

		<div class="text-center">
			{#if !showResetForm}
				<button
					on:click={() => (showResetForm = true)}
					class="text-blue-400 hover:underline text-sm"
				>
					Lupa Password?
				</button>
			{/if}
			<button
				on:click={() => (isSigningUp = !isSigningUp)}
				class="text-blue-400 hover:underline transition-colors text-sm"
			>
				{isSigningUp ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
			</button>
		</div>
	</div>
</div>
