<!-- src/lib/components/NotificationBell.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { supabaseClientStore } from '$lib/stores/supabaseStore';
	import { Mail } from '@lucide/svelte'; // <<< PERUBAHAN: Menggunakan ikon Mail
	import { goto } from '$app/navigation';

	const supabase = get(supabaseClientStore);

	let notifications = $state<any[]>([]);
	let unreadCount = $state(0);
	let isOpen = $state(false);

	// Fungsi untuk mengambil notifikasi dari database
	async function fetchNotifications() {
		if (!supabase) return;
		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(10); // Ambil 10 notifikasi terbaru

		if (data) {
			notifications = data;
			unreadCount = data.filter((n) => !n.is_read).length;
		}
	}

	// Fungsi untuk menandai notifikasi sebagai sudah dibaca
	async function markAsRead(notificationId: string, link: string | null) {
		isOpen = false; // Tutup panel
		// Tandai sudah dibaca dulu
		await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
		// Baru pindah halaman jika ada link
		if (link) {
			await goto(link);
		}
		// Data akan otomatis ter-update oleh listener realtime
	}

	// Ambil data saat komponen pertama kali dimuat
	onMount(() => {
		fetchNotifications();

		// Dengarkan perubahan realtime pada tabel notifications
		const channel = supabase
			.channel('public:notifications')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
				fetchNotifications();
			})
			.subscribe();

		// Cleanup saat komponen dihancurkan
		return () => {
			supabase.removeChannel(channel);
		};
	});
</script>

<div class="relative">
	<!-- Tombol Surat -->
	<button onclick={() => (isOpen = !isOpen)} class="relative p-2 rounded-full hover:bg-gray-200">
		<Mail class="w-6 h-6 text-gray-600" />
		{#if unreadCount > 0}
			<span class="absolute top-0 right-0 flex h-5 w-5">
				<span
					class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
				></span>
				<span
					class="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center"
				>
					{unreadCount}
				</span>
			</span>
		{/if}
	</button>

	<!-- Panel Dropdown Notifikasi -->
	{#if isOpen}
		<div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
			<div class="p-4 font-bold border-b">Kotak Masuk</div>
			<div class="max-h-96 overflow-y-auto">
				{#if notifications.length === 0}
					<p class="text-center text-gray-500 py-8">Tidak ada notifikasi.</p>
				{:else}
					{#each notifications as notif}
						<button
							onclick={() => markAsRead(notif.id, notif.link)}
							class="w-full text-left p-4 hover:bg-gray-100 border-b"
						>
							<p class="text-sm" class:font-bold={!notif.is_read}>{notif.message}</p>
							<p class="text-xs text-gray-500 mt-1">
								{new Date(notif.created_at).toLocaleString('id-ID')}
							</p>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
