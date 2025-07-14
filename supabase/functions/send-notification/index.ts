// Import library yang dibutuhkan
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
	// Menangani preflight request CORS
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const { user_id, payload }: { user_id: string; payload: NotificationPayload } = await req.json();

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		// Ambil ID dan subscription object untuk proses penghapusan jika perlu
		const { data: subscriptions, error } = await supabaseAdmin
			.from('push_subscriptions')
			.select('id, subscription_object')
			.eq('user_id', user_id);

		if (error) {
			throw new Error(`Gagal mengambil langganan: ${error.message}`);
		}

		if (!subscriptions || subscriptions.length === 0) {
			return new Response(JSON.stringify({ message: 'Tidak ada langganan ditemukan.' }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				status: 404
			});
		}

		const vapidPublicKey = Deno.env.get('PUBLIC_VAPID_PUBLIC_KEY');
		const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

		if (!vapidPublicKey || !vapidPrivateKey) {
			throw new Error('VAPID keys tidak ditemukan di environment variables.');
		}

		webpush.setVapidDetails('mailto:your-email@example.com', vapidPublicKey, vapidPrivateKey);

		// =======================================================
		// LOGIKA BARU: Tangani langganan yang kadaluarsa
		// =======================================================
		let successCount = 0;
		const deletionPromises = [];

		for (const sub of subscriptions) {
			try {
				await webpush.sendNotification(
					sub.subscription_object as PushSubscription,
					JSON.stringify(payload)
				);
				successCount++;
			} catch (err) {
				// Jika error adalah 410 (Gone) atau 404 (Not Found), hapus dari database
				if (err.name === 'WebPushError' && (err.statusCode === 410 || err.statusCode === 404)) {
					console.log(`Langganan ${sub.id} kadaluarsa. Menjadwalkan untuk dihapus.`);
					deletionPromises.push(
						supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
					);
				} else {
					// Untuk error lain, cukup log tanpa menghentikan proses
					console.error(`Gagal mengirim notifikasi ke ${sub.id}:`, err);
				}
			}
		}

		// Jalankan semua proses penghapusan secara bersamaan
		if (deletionPromises.length > 0) {
			await Promise.all(deletionPromises);
			console.log(`Berhasil menghapus ${deletionPromises.length} langganan kadaluarsa.`);
		}
		// =======================================================

		console.log(`Berhasil mengirim ${successCount} notifikasi ke user: ${user_id}`);

		return new Response(JSON.stringify({ message: `Notifikasi terkirim ke ${successCount} perangkat.` }), {
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
