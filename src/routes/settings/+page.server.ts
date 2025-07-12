import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { session } }) => {
	// Kita hanya perlu memastikan user sudah login untuk bisa mengakses halaman ini.
	// Data profil dan settings sudah di-load di layout utama.
	if (!session) {
		throw redirect(303, '/login');
	}
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, session } }) => {
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		// Ambil data durasi
		const work = Number(formData.get('work'));
		const shortBreak = Number(formData.get('shortBreak'));
		const longBreak = Number(formData.get('longBreak'));

		// PERBAIKAN: Ambil data suara
		const workSound = formData.get('workSound') as string;
		const endSessionSound = formData.get('endSessionSound') as string;
		const endBreakSound = formData.get('endBreakSound') as string;

		// Validasi input durasi
		if (
			isNaN(work) ||
			isNaN(shortBreak) ||
			isNaN(longBreak) ||
			work < 1 ||
			shortBreak < 1 ||
			longBreak < 1
		) {
			return fail(400, { error: 'Semua durasi harus diisi dengan angka positif.' });
		}

		// Gabungkan semua pengaturan menjadi satu objek
		const pomodoroSettings = {
			work,
			shortBreak,
			longBreak,
			workSound,
			endSessionSound,
			endBreakSound
		};

		// Simpan pengaturan baru ke database
		const { error } = await supabase
			.from('profiles')
			.update({ pomodoro_settings: pomodoroSettings })
			.eq('id', session.user.id);

		if (error) {
			console.error('Error updating settings:', error);
			return fail(500, { error: 'Gagal menyimpan pengaturan ke database.' });
		}

		return { success: true, message: 'Pengaturan berhasil disimpan!' };
	}
};
