// src/service-worker.js

// Variabel untuk menyimpan ID timer, agar kita bisa membatalkannya jika perlu
let timerId = null;

// Event 'install' dan 'activate' tetap sama
self.addEventListener('install', (event) => {
	console.log('Service Worker: Menginstall...');
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('Service Worker: Aktif.');
	event.waitUntil(self.clients.claim());
});

// Event 'fetch' kita biarkan kosong
self.addEventListener('fetch', (event) => {
	return;
});

// =======================================================
// BAGIAN BARU: Menerima Perintah dari Aplikasi (misal: dari halaman Pomodoro)
// =======================================================
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'START_TIMER') {
		console.log('Service Worker: Menerima perintah START_TIMER', event.data.payload);
		// Hapus timer lama jika ada
		if (timerId) {
			clearTimeout(timerId);
		}

		const { duration, title, body } = event.data.payload;

		// Set timer baru di background
		timerId = setTimeout(() => {
			console.log('Service Worker: Timer selesai, menampilkan notifikasi.');
			self.registration.showNotification(title, {
				body: body,
				icon: '/favicon.png',
				badge: '/favicon.png',
				vibrate: [200, 100, 200] // Pola getar yang lebih terasa
			});
			timerId = null; // Reset ID timer
		}, duration);
	}

	if (event.data && event.data.type === 'STOP_TIMER') {
		console.log('Service Worker: Menerima perintah STOP_TIMER');
		if (timerId) {
			clearTimeout(timerId);
			timerId = null;
			console.log('Service Worker: Timer dihentikan.');
		}
	}
});

// Event 'push' untuk notifikasi dari server (tetap ada untuk fitur lain nanti)
self.addEventListener('push', (event) => {
	console.log('Service Worker: Menerima push event dari server.');
	let payload = { title: 'Notifikasi Baru', body: 'Anda punya pesan baru.', icon: '/favicon.png' };
	if (event.data) {
		try {
			payload = event.data.json();
		} catch (e) {
			console.error('Gagal mem-parsing data push:', e);
		}
	}
	const options = {
		body: payload.body,
		icon: payload.icon || '/favicon.png',
		badge: payload.badge || '/favicon.png',
		vibrate: [100, 50, 100],
		data: { url: self.location.origin }
	};
	event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Event 'notificationclick' (tetap sama)
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow(event.notification.data.url || self.location.origin));
});
