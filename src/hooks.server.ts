import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) =>
				cookies.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				)
		}
	});

	event.locals.supabase = supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();
	event.locals.session = session ?? null;

	if (session) {
		const {
			data: { user },
			error
		} = await supabase.auth.getUser();

		event.locals.user = error ? null : user;
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
