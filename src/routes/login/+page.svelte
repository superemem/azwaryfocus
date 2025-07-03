<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/authStore';

	let email = '';
	let password = '';
	let loading = false;
	let isSigningUp = false;

	async function handleLogin() {
		loading = true;
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		loading = false;

		if (error) {
			alert(error.message);
		} else {
			goto('/profile'); // Redirect to dashboard after successful login
		}
	}

	async function handleSignup() {
		loading = true;
		const { error } = await supabase.auth.signUp({ email, password });
		loading = false;

		if (error) {
			alert(error.message);
		} else {
			alert('Cek email kamu untuk verifikasi!');
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
	<div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-10 space-y-8">
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
			<button
				on:click={() => (isSigningUp = !isSigningUp)}
				class="text-blue-400 hover:underline transition-colors text-sm"
			>
				{isSigningUp ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
			</button>
		</div>
	</div>
</div>
