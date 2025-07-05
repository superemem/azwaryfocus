// src/utils/errorHandler.js

/**
 * Fungsi penanganan error terpusat untuk aplikasi
 * @param {Error} error - Error object yang terjadi
 * @param {string} operationName - Nama operasi yang sedang dilakukan saat error terjadi
 */
export function handleError(error, operationName = 'operasi') {
	// Log error untuk debugging
	console.error(`Error saat ${operationName}:`, error);

	// Tampilkan pesan ke pengguna
	const userMessage = getUserFriendlyMessage(error, operationName);
	showToast(userMessage, 'error');

	return error; // Return error untuk chaining jika perlu
}

/**
 * Menghasilkan pesan error yang ramah pengguna
 */
function getUserFriendlyMessage(error, operation) {
	// Periksa error network
	if (
		error?.message?.includes('network') ||
		error?.message?.includes('connection') ||
		error?.message?.toLowerCase().includes('offline')
	) {
		return 'Masalah koneksi internet. Silakan periksa koneksi Anda.';
	}

	// Periksa error permission
	if (
		error?.code === 'PGRST301' ||
		error?.message?.includes('permission') ||
		error?.message?.includes('not allowed')
	) {
		return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
	}

	// Error timeout
	if (error?.message?.includes('timeout')) {
		return 'Permintaan memakan waktu terlalu lama. Silakan coba lagi nanti.';
	}

	// Error default
	return `Gagal ${operation}. Silakan coba lagi nanti.`;
}

/**
 * Menampilkan toast message
 * Note: Ganti ini dengan implementasi toast library yang Anda gunakan
 */
function showToast(message, type = 'info') {
	// Jika Anda belum menggunakan library toast, gunakan alert sementara
	if (type === 'error') {
		alert(message); // Akan diganti dengan toast library nanti
	} else {
		console.log(`[${type}] ${message}`);
	}

	// Contoh jika menggunakan toast library
	// toast.error(message, { duration: 4000 });
}
