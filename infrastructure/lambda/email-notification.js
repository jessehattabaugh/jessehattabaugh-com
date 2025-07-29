import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

/**
 * 📧 Email Notification Lambda Handler
 * Sends verification and approval emails for the shares workflow
 * 
 * @param {Object} event - Lambda invocation event
 * @returns {Object} Response
 */
export async function handler(event) {
	console.log('📧🚀 Processing email notification');

	try {
		const { type, shareId, email, title } = event;

		if (type === 'verification') {
			await sendVerificationEmail(shareId, email, title);
			await sendAdminNotificationEmail(shareId, email, title);
		}

		return { statusCode: 200, body: 'Emails sent successfully' };

	} catch (error) {
		console.error('📧💥 Email notification error:', error);
		return { statusCode: 500, body: 'Email sending failed' };
	}
}

/**
 * Sends verification email to the user
 * @param {string} shareId - Share ID
 * @param {string} email - User email
 * @param {string} title - Share title
 */
async function sendVerificationEmail(shareId, email, title) {
	console.info('📧✉️ Sending verification email to:', email);

	const verificationUrl = `https://${process.env.DOMAIN}/verify-email?token=${shareId}`;

	const emailParameters = {
		Source: `noreply@${process.env.DOMAIN}`,
		Destination: {
			ToAddresses: [email],
		},
		Message: {
			Subject: {
				Data: 'Please verify your email for your share submission',
				Charset: 'utf8',
			},
			Body: {
				Html: {
					Data: `
						<!DOCTYPE html>
						<html>
							<head>
								<style>
									body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
									.container { max-width: 600px; margin: 0 auto; padding: 20px; }
									.button { 
										display: inline-block; 
										padding: 12px 24px; 
										background-color: #007bff; 
										color: white; 
										text-decoration: none; 
										border-radius: 4px; 
										margin: 20px 0;
									}
									.footer { margin-top: 30px; font-size: 0.9em; color: #666; }
								</style>
							</head>
							<body>
								<div class="container">
									<h1>Verify Your Email Address</h1>
									<p>Thank you for submitting your share "${title}" to Jesse Hattabaugh's website!</p>
									<p>To complete your submission, please verify your email address by clicking the button below:</p>
									<a href="${verificationUrl}" class="button">Verify Email Address</a>
									<p>If the button doesn't work, you can copy and paste this link into your browser:</p>
									<p><a href="${verificationUrl}">${verificationUrl}</a></p>
									<div class="footer">
										<p>This email was sent because you submitted a share on jessehattabaugh.com.</p>
										<p>If you didn't submit this share, you can safely ignore this email.</p>
									</div>
								</div>
							</body>
						</html>
					`,
					Charset: 'utf8',
				},
				Text: {
					Data: `
						Verify Your Email Address
						
						Thank you for submitting your share "${title}" to Jesse Hattabaugh's website!
						
						To complete your submission, please verify your email address by visiting:
						${verificationUrl}
						
						This email was sent because you submitted a share on jessehattabaugh.com.
						If you didn't submit this share, you can safely ignore this email.
					`,
					Charset: 'utf8',
				},
			},
		},
	};

	try {
		await sesClient.send(new SendEmailCommand(emailParameters));
		console.info('📧✅ Verification email sent successfully');
	} catch (error) {
		console.error('📧❌ Verification email failed:', error);
		throw error;
	}
}

/**
 * Sends admin notification email for approval
 * @param {string} shareId - Share ID
 * @param {string} userEmail - User email
 * @param {string} title - Share title
 */
async function sendAdminNotificationEmail(shareId, userEmail, title) {
	console.info('📧👨‍💼 Sending admin notification email');

	const approvalUrl = `https://${process.env.DOMAIN}/approve-share?token=${shareId}`;

	const emailParameters = {
		Source: `noreply@${process.env.DOMAIN}`,
		Destination: {
			ToAddresses: [process.env.ADMIN_EMAIL],
		},
		Message: {
			Subject: {
				Data: `New Share Submission: "${title}"`,
				Charset: 'utf8',
			},
			Body: {
				Html: {
					Data: `
						<!DOCTYPE html>
						<html>
							<head>
								<style>
									body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
									.container { max-width: 600px; margin: 0 auto; padding: 20px; }
									.share-details { 
										background-color: #f8f9fa; 
										padding: 20px; 
										border-radius: 4px; 
										margin: 20px 0; 
									}
									.button { 
										display: inline-block; 
										padding: 12px 24px; 
										background-color: #28a745; 
										color: white; 
										text-decoration: none; 
										border-radius: 4px; 
										margin: 20px 0;
									}
									.warning { color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; }
								</style>
							</head>
							<body>
								<div class="container">
									<h1>New Share Submission for Approval</h1>
									<p>A new share has been submitted and is awaiting your approval.</p>
									
									<div class="share-details">
										<h3>Share Details:</h3>
										<p><strong>Title:</strong> ${title}</p>
										<p><strong>Submitted by:</strong> ${userEmail}</p>
										<p><strong>Share ID:</strong> ${shareId}</p>
									</div>
									
									<div class="warning">
										<p><strong>Note:</strong> The user must verify their email address before you can approve this share.</p>
									</div>
									
									<p>To approve and publish this share, click the button below:</p>
									<a href="${approvalUrl}" class="button">Approve Share</a>
									
									<p>If the button doesn't work, you can copy and paste this link into your browser:</p>
									<p><a href="${approvalUrl}">${approvalUrl}</a></p>
								</div>
							</body>
						</html>
					`,
					Charset: 'utf8',
				},
				Text: {
					Data: `
						New Share Submission for Approval
						
						A new share has been submitted and is awaiting your approval.
						
						Share Details:
						Title: ${title}
						Submitted by: ${userEmail}
						Share ID: ${shareId}
						
						Note: The user must verify their email address before you can approve this share.
						
						To approve and publish this share, visit:
						${approvalUrl}
					`,
					Charset: 'utf8',
				},
			},
		},
	};

	try {
		await sesClient.send(new SendEmailCommand(emailParameters));
		console.info('📧✅ Admin notification email sent successfully');
	} catch (error) {
		console.error('📧❌ Admin notification email failed:', error);
		throw error;
	}
}