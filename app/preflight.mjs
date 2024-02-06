/** @type {import('@enhance/types').EnhancePreflightFn} */
export default async function Preflight() {
	const { ARC_ENV } = process.env;
	const host =
		ARC_ENV === 'production'
			? 'https://jessehattabaugh.com'
			: ARC_ENV === 'staging'
			? 'https://staging.jessehattabaugh.com'
			: 'http://localhost:3333';
	return { host };
}
