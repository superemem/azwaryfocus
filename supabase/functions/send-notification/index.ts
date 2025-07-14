// Import library yang dibutuhkan
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// PERBAIKAN: Menggunakan 'npm:' specifier untuk import yang lebih stabil
import webpush from 'npm:web-push@3.6.7';

// Definisikan header CORS di satu tempat agar mudah dikelola
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Tipe data untuk payload notifikasi
interface NotificationPayload {
	title: string;
	body: string;
	icon?: string;
	badge?: string;
}

// Definisi tipe PushSubscription untuk Deno
interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

console.log('Fungsi send-notification siap.');

Deno.serve(async (req) => {
	// Menangani preflight request CORS. Ini adalah "panggilan telepon" awal dari browser.
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		// 1. Ambil data dari request body
		const { user_id, payload }: { user_id: string; payload: NotificationPayload } = await req.json();

		// 2. Buat koneksi ke Supabase dengan hak akses admin
		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		// 3. Ambil semua "alamat unik" notifikasi milik pengguna dari database
		const { data: subscriptions, error } = await supabaseAdmin
			.from('push_subscriptions')
			.select('subscription_object')
			.eq('user_id', user_id);

		if (error) {
			throw new Error(`Gagal mengambil langganan: ${error.message}`);
		}

		if (!subscriptions || subscriptions.length === 0) {
			console.log(`Tidak ada langganan notifikasi ditemukan untuk user: ${user_id}`);
			return new Response(JSON.stringify({ message: 'Tidak ada langganan ditemukan.' }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				status: 404
			});
		}

		// 4. Konfigurasi web-push dengan kunci VAPID dari environment variables
		const vapidPublicKey = Deno.env.get('PUBLIC_VAPID_PUBLIC_KEY');
		const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

		if (!vapidPublicKey || !vapidPrivateKey) {
			throw new Error('VAPID keys tidak ditemukan di environment variables.');
		}

		webpush.setVapidDetails(
			'mailto:your-email@example.com', // Ganti dengan email Anda
			vapidPublicKey,
			vapidPrivateKey
		);

		// 5. Kirim notifikasi ke setiap "alamat unik"
		const sendPromises = subscriptions.map((s) =>
			webpush.sendNotification(
				s.subscription_object as PushSubscription,
				JSON.stringify(payload)
			)
		);

		await Promise.all(sendPromises);

		console.log(`Berhasil mengirim ${subscriptions.length} notifikasi ke user: ${user_id}`);

		// 6. Kembalikan respons sukses
		return new Response(JSON.stringify({ message: 'Notifikasi berhasil dikirim!' }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			status: 200
		});
	} catch (err) {
		console.error('Error di dalam Edge Function:', err);
		return new Response(JSON.stringify({ error: err.message }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			status: 500
		});
	}
});
