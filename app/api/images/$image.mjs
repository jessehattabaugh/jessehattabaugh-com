import asap from "@architect/asap";

/** responds with an image from the static S3 bucket
 * @type {import('@enhance/types').EnhanceApiFn}
 * @see https://begin.com/blog/posts/2023-02-08-upload-files-in-forms-part-1#serving-uploaded-images
 */
export function get(req) {
	console.log("🏖️", { req });
	try {
		return asap({ cacheControl: "max-age=31536000" })(req);
	} catch (error) {
		console.error("🦀 asap error", error);
		return {
			statusCode: 404,
		};
	}
}
