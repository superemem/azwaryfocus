// src/routes/projects/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, session } }) => {
	// 1. Cek sesi (tetap penting)
	if (!session) {
		throw redirect(303, '/login');
	}

	const projectId = params.id;

	// 2. TANYA KE DATABASE: "BOLEH MASUK GAK?"
	// Panggil fungsi pintar yang baru kita buat.
	const { data: hasAccess, error: rpcError } = await supabase.rpc('can_user_access_project', {
		requesting_user_id: session.user.id,
		target_project_id: projectId
	});

	// Jika ada error saat bertanya, hentikan.
	if (rpcError) {
		console.error('RPC Error:', rpcError);
		throw error(500, 'Terjadi kesalahan saat memverifikasi akses.');
	}

	// 3. JIKA DATABASE BILANG "TIDAK", TOLAK.
	if (!hasAccess) {
		throw error(403, 'Anda tidak memiliki akses ke proyek ini.');
	}

	// 4. JIKA DATABASE BILANG "BOLEH", LANJUT.
	// Ambil nama proyek hanya untuk judul halaman.
	const { data: project } = await supabase
		.from('projects')
		.select('name')
		.eq('id', projectId)
		.single();

	return {
		projectId,
		project: {
			name: project?.name || 'Proyek'
		}
	};
};
