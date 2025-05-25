/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname.slice(1); // Remove leading slash

		// === Handle GET: Retrieve object ===
		if (request.method === 'GET') {
			const object = await env.AVATAR_BUCKET.get(pathname);
			if (!object) {
				return new Response('Not Found', { status: 404 });
			}

			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set('etag', object.httpEtag);

			return new Response(object.body, { headers });
		}

		// === Handle POST: Upload object ===
		if (request.method === 'POST') {
			const contentType = request.headers.get('content-type') || '';
			const body = await request.arrayBuffer();

			if (!pathname) {
				return new Response('Missing filename in URL', { status: 400 });
			}

			await env.AVATAR_BUCKET.put(pathname, body, {
				httpMetadata: { contentType },
			});

			const publicUrl = `https://avatar-worker.slugger4health-avatar.workers.dev/${pathname}`;
			return new Response(JSON.stringify({ success: true, url: publicUrl }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			});
		}

		// === Handle DELETE: Remove object ===
		if (request.method === 'DELETE') {
			if (!pathname) {
				return new Response('Missing filename in URL', { status: 400 });
			}

			const existing = await env.AVATAR_BUCKET.head(pathname);
			if (!existing) {
				return new Response('Not Found', { status: 404 });
			}

			await env.AVATAR_BUCKET.delete(pathname);
			return new Response(null, { status: 204 }); // No Content
		}

		// Method not allowed
		return new Response('Method Not Allowed', { status: 405 });
	},
};
