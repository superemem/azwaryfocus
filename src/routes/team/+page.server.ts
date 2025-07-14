// src/routes/team/+page.server.ts
import { redirect, error } from '@sveltejs/kit'; // <-- 1. Tambahkan import 'error'
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		throw redirect(303, '/login');
	}

	// 2. Ambil profil user yang sedang login untuk cek role
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
		.single();

	// 3. Cek apakah role-nya bukan 'supervisor'. Jika ya, lempar error 403 (Forbidden)
	if (profile?.role !== 'supervisor') {
		throw error(403, 'Akses Ditolak: Anda harus menjadi Supervisor untuk melihat halaman ini.');
	}

	// Panggil fungsi RPC untuk mendapatkan semua pengguna dan statistik mereka (kode ini tetap sama)
	const { data: teamMembers, error: rpcError } = await supabase.rpc('get_all_users_stats');

	if (rpcError) {
		console.error('Error fetching team stats:', rpcError);
		return { teamMembers: [] };
	}

	return { teamMembers };
};
