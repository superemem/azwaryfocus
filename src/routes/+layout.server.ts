// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	console.log('DEBUG SERVER: session', locals.session); // debug ini harus nunjukin session
	console.log('DEBUG SERVER: user', locals.session?.user); // harus ada user ID

	if (!locals.session) {
		return {
			session: null,
			user: null
		};
	}

	const { user } = locals.session;

	return {
		session: locals.session,
		user
	};
};
