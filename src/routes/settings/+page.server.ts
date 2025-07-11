// src/routes/settings/+page.server.ts
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
		const work = Number(formData.get('work'));
		const shortBreak = Number(formData.get('shortBreak'));
		const longBreak = Number(formData.get('longBreak'));

		// Validasi input
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

		const pomodoroSettings = {
			work,
			shortBreak,
			longBreak
		};

		// Simpan pengaturan baru ke database
		const { error } = await supabase
			.from('profiles')
			.update({ pomodoro_settings: pomodoroSettings })
			.eq('id', session.user.id);

		if (error) {
			return fail(500, { error: 'Gagal menyimpan pengaturan ke database.' });
		}

		return { success: true, message: 'Pengaturan berhasil disimpan!' };
	}
};
