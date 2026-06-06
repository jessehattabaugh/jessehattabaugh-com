import { expect, test } from '@playwright/test';
import worker from '../../worker/index.js';

const textEncoder = new TextEncoder();

/**
 * @param {ArrayBuffer | Uint8Array} value
 * @returns {string}
 */
function toBase64Url(value) {
	const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return Buffer.from(binary, 'binary').toString('base64url');
}

/**
 * @param {string} value
 * @returns {Uint8Array}
 */
function fromBase64Url(value) {
	return new Uint8Array(Buffer.from(value, 'base64url'));
}

/**
 * @param {string} publicKeyPem
 * @returns {string}
 */
function normalizePem(publicKeyPem) {
	return publicKeyPem.replace(/\r/g, '').trim();
}

class FakeStatement {
	/** @param {FakeDB} db @param {string} sql */
	constructor(db, sql) {
		this.db = db;
		this.sql = sql;
		this.args = [];
	}

	/** @param {...unknown} args */
	bind(...args) {
		this.args = args;
		return this;
	}

	async run() {
		if (this.sql.includes('INSERT INTO contact_messages')) {
			const [name, email, message] = this.args.map((value) => {
				return String(value);
			});
			this.db.messages.push({
				id: this.db.nextId++,
				name,
				email,
				message,
				created_at: new Date().toISOString(),
			});
			return { success: true };
		}
		if (this.sql.includes('DELETE FROM contact_messages')) {
			const [id] = this.args;
			this.db.messages = this.db.messages.filter((message) => {
				return message.id !== Number(id);
			});
			return { success: true };
		}
		throw new Error(`Unsupported SQL in run(): ${this.sql}`);
	}

	async all() {
		if (
			this.sql.includes('SELECT id, name, email, message, created_at FROM contact_messages')
		) {
			const results = [...this.db.messages].sort((left, right) => {
				if (left.created_at === right.created_at) {
					return right.id - left.id;
				}
				return right.created_at.localeCompare(left.created_at);
			});
			return { results };
		}
		throw new Error(`Unsupported SQL in all(): ${this.sql}`);
	}
}

class FakeDB {
	constructor() {
		this.messages = [];
		this.nextId = 1;
	}

	/** @param {string} sql */
	prepare(sql) {
		return new FakeStatement(this, sql);
	}
}

function createEnv() {
	return {
		ASSETS: {
			fetch: async () => {
				return new Response('Not Found', { status: 404 });
			},
		},
		DB: new FakeDB(),
	};
}

/**
 * @param {Record<string, string>} jar
 * @param {Response} response
 */
function updateCookieJar(jar, response) {
	const header = response.headers.get('set-cookie');
	if (!header) {
		return;
	}
	const chunks = header.split(/,\s*(?=[^;\s]+=)/g);
	for (const chunk of chunks) {
		const [pair] = chunk.split(';');
		const index = pair.indexOf('=');
		if (index === -1) {
			continue;
		}
		const name = pair.slice(0, index).trim();
		const value = pair.slice(index + 1).trim();
		if (!value) {
			delete jar[name];
			continue;
		}
		jar[name] = value;
	}
}

/**
 * @param {Record<string, string>} jar
 * @returns {string | undefined}
 */
function cookieHeader(jar) {
	const values = Object.entries(jar).map(([name, value]) => {
		return `${name}=${value}`;
	});
	if (values.length === 0) {
		return undefined;
	}
	return values.join('; ');
}

/**
 * @param {object} opts
 * @param {Record<string, any>} opts.env
 * @param {string} opts.path
 * @param {'GET' | 'POST'} [opts.method]
 * @param {URLSearchParams} [opts.form]
 * @param {Record<string, string>} [opts.cookies]
 * @returns {Promise<Response>}
 */
async function callWorker({ env, path, method = 'GET', form, cookies }) {
	const headers = new Headers();
	if (cookies) {
		const value = cookieHeader(cookies);
		if (value) {
			headers.set('cookie', value);
		}
	}
	let body;
	if (form) {
		headers.set('content-type', 'application/x-www-form-urlencoded');
		body = form.toString();
	}
	const request = new Request(`https://example.com${path}`, {
		method,
		headers,
		body,
		redirect: 'manual',
	});
	return worker.fetch(request, /** @type {any} */ (env));
}

/**
 * @returns {Promise<{ privateKey: CryptoKey, publicKeyPem: string, credentialId: string }>}
 */
async function createWebAuthnIdentity() {
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify',
	]);
	const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
	const publicKeyPem = [
		'-----BEGIN PUBLIC KEY-----',
		Buffer.from(spki)
			.toString('base64')
			.match(/.{1,64}/g)
			?.join('\n') ?? '',
		'-----END PUBLIC KEY-----',
	].join('\n');
	const credentialId = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
	return {
		privateKey: keyPair.privateKey,
		publicKeyPem: normalizePem(publicKeyPem),
		credentialId,
	};
}

/**
 * @param {string} html
 * @returns {string}
 */
function readChallenge(html) {
	const match = html.match(/name="challenge" value="([^"]+)"/);
	if (!match) {
		throw new Error('Could not read WebAuthn challenge from page');
	}
	return match[1];
}

/**
 * @param {object} opts
 * @param {CryptoKey} opts.privateKey
 * @param {string} opts.challenge
 * @param {string} opts.rpId
 * @param {string} opts.origin
 * @returns {Promise<{ clientDataJSON: string, authenticatorData: string, signature: string }>}
 */
async function createAssertion({ privateKey, challenge, rpId, origin }) {
	const clientData = JSON.stringify({ type: 'webauthn.get', challenge, origin });
	const clientDataBytes = textEncoder.encode(clientData);
	const rpIdHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', textEncoder.encode(rpId)),
	);
	const authenticatorData = new Uint8Array(37);
	authenticatorData.set(rpIdHash, 0);
	authenticatorData[32] = 0x01;
	const clientDataHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataBytes));
	const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
	signedData.set(authenticatorData, 0);
	signedData.set(clientDataHash, authenticatorData.length);
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		privateKey,
		signedData,
	);
	return {
		clientDataJSON: toBase64Url(clientDataBytes),
		authenticatorData: toBase64Url(authenticatorData),
		signature: toBase64Url(signature),
	};
}

test('contact form validates required fields and email', async () => {
	const env = createEnv();

	const contactPage = await callWorker({ env, path: '/contact' });
	expect(contactPage.status).toBe(200);
	expect(await contactPage.text()).toContain('<form method="post" action="/contact">');

	const missingFields = await callWorker({
		env,
		path: '/contact',
		method: 'POST',
		form: new URLSearchParams({ name: 'Jesse', email: 'jesse@example.com', message: '' }),
	});
	expect(missingFields.status).toBe(422);
	expect(await missingFields.text()).toContain('All fields are required.');

	const invalidEmail = await callWorker({
		env,
		path: '/contact',
		method: 'POST',
		form: new URLSearchParams({ name: 'Jesse', email: 'invalid-email', message: 'Hello!' }),
	});
	expect(invalidEmail.status).toBe(422);
	expect(await invalidEmail.text()).toContain('Please enter a valid email address.');
});

test('contact submission can be viewed and deleted through secured page', async () => {
	const env = createEnv();
	const identity = await createWebAuthnIdentity();
	env.ADMIN_AUTH_SECRET = 'integration-test-secret';
	env.ADMIN_WEBAUTHN_CREDENTIAL_ID = identity.credentialId;
	env.ADMIN_WEBAUTHN_PUBLIC_KEY = identity.publicKeyPem;
	env.ADMIN_WEBAUTHN_RP_ID = 'example.com';
	env.ADMIN_WEBAUTHN_ORIGIN = 'https://example.com';

	const submit = await callWorker({
		env,
		path: '/contact',
		method: 'POST',
		form: new URLSearchParams({
			name: 'Alice',
			email: 'alice@example.com',
			message: 'Need to talk',
		}),
	});
	expect(submit.status).toBe(303);
	expect(submit.headers.get('location')).toBe('https://example.com/thanks');

	const cookies = {};
	const adminLoginPage = await callWorker({ env, path: '/admin/contact-submissions', cookies });
	expect(adminLoginPage.status).toBe(401);
	updateCookieJar(cookies, adminLoginPage);
	const loginHtml = await adminLoginPage.text();
	expect(loginHtml).toContain('Authenticate with WebAuthn');

	const challenge = readChallenge(loginHtml);
	const assertion = await createAssertion({
		privateKey: identity.privateKey,
		challenge,
		rpId: 'example.com',
		origin: 'https://example.com',
	});

	const auth = await callWorker({
		env,
		path: '/admin/contact-submissions/auth',
		method: 'POST',
		cookies,
		form: new URLSearchParams({
			credentialId: identity.credentialId,
			clientDataJSON: assertion.clientDataJSON,
			authenticatorData: assertion.authenticatorData,
			signature: assertion.signature,
		}),
	});
	expect(auth.status).toBe(303);
	updateCookieJar(cookies, auth);

	const submissions = await callWorker({ env, path: '/admin/contact-submissions', cookies });
	expect(submissions.status).toBe(200);
	const submissionsHtml = await submissions.text();
	expect(submissionsHtml).toContain('alice@example.com');
	expect(submissionsHtml).toContain('Need to talk');

	const idMatch = submissionsHtml.match(/name=["']id["']\s+value=["'](\d+)["']/);
	expect(idMatch).not.toBeNull();
	const id = idMatch?.[1] ?? '0';

	const deletion = await callWorker({
		env,
		path: '/admin/contact-submissions/delete',
		method: 'POST',
		cookies,
		form: new URLSearchParams({ id }),
	});
	expect(deletion.status).toBe(303);

	const afterDelete = await callWorker({ env, path: '/admin/contact-submissions', cookies });
	expect(afterDelete.status).toBe(200);
	expect(await afterDelete.text()).not.toContain('alice@example.com');
});
