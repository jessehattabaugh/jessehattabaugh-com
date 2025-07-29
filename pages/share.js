import { html } from '../lib/html.js';

/**
 * Share submission page handler
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="share-page">
		<h2>📤 Share Something</h2>
		<p>Share interesting content with me and the world!</p>

		<form id="shareForm" class="share-form">
			<div class="form-group">
				<label for="email">Your Email Address *</label>
				<input type="email" id="email" name="email" required 
					   placeholder="your.email@example.com">
				<small>We'll send you a verification email</small>
			</div>

			<div class="form-group">
				<label for="title">Title *</label>
				<input type="text" id="title" name="title" required 
					   placeholder="Give your share a descriptive title">
			</div>

			<div class="form-group">
				<label for="text">Description *</label>
				<textarea id="text" name="text" required rows="4" 
						  placeholder="Describe what you're sharing and why it's interesting"></textarea>
			</div>

			<div class="form-group">
				<label for="url">URL (optional)</label>
				<input type="url" id="url" name="url" 
					   placeholder="https://example.com/interesting-link">
				<small>Link to the content you're sharing</small>
			</div>

			<div class="form-group">
				<label for="image">Image (optional)</label>
				<input type="file" id="image" name="image" accept="image/*">
				<small>Upload an image related to your share (max 5MB)</small>
			</div>

			<button type="submit" class="submit-button">📤 Submit Share</button>
		</form>

		<div id="status" class="status-message" style="display: none;"></div>
	</div>

	<style>
		.share-page {
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}

		.share-form {
			background: #f8f9fa;
			padding: 30px;
			border-radius: 8px;
			margin-top: 20px;
		}

		.form-group {
			margin-bottom: 20px;
		}

		.form-group label {
			display: block;
			margin-bottom: 5px;
			font-weight: bold;
			color: #333;
		}

		.form-group input,
		.form-group textarea {
			width: 100%;
			padding: 10px;
			border: 1px solid #ddd;
			border-radius: 4px;
			font-size: 16px;
			box-sizing: border-box;
		}

		.form-group input:focus,
		.form-group textarea:focus {
			outline: none;
			border-color: #007bff;
			box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
		}

		.form-group small {
			display: block;
			margin-top: 5px;
			color: #666;
			font-size: 14px;
		}

		.submit-button {
			background: #007bff;
			color: white;
			padding: 12px 30px;
			border: none;
			border-radius: 4px;
			font-size: 16px;
			cursor: pointer;
			width: 100%;
		}

		.submit-button:hover {
			background: #0056b3;
		}

		.submit-button:disabled {
			background: #6c757d;
			cursor: not-allowed;
		}

		.status-message {
			padding: 15px;
			border-radius: 4px;
			margin-top: 20px;
			text-align: center;
		}

		.status-message.success {
			background: #d4edda;
			color: #155724;
			border: 1px solid #c3e6cb;
		}

		.status-message.error {
			background: #f8d7da;
			color: #721c24;
			border: 1px solid #f5c6cb;
		}

		.status-message.loading {
			background: #d1ecf1;
			color: #0c5460;
			border: 1px solid #bee5eb;
		}
	</style>

	<script>
		document.getElementById('shareForm').addEventListener('submit', async function(e) {
			e.preventDefault();
			
			const statusEl = document.getElementById('status');
			const submitBtn = document.querySelector('.submit-button');
			
			// Show loading state
			statusEl.style.display = 'block';
			statusEl.className = 'status-message loading';
			statusEl.textContent = '📤 Submitting your share...';
			submitBtn.disabled = true;
			
			try {
				const formData = new FormData(this);
				const imageFile = formData.get('image');
				
				let imageData = null;
				let imageType = null;
				
				if (imageFile && imageFile.size > 0) {
					if (imageFile.size > 5 * 1024 * 1024) {
						throw new Error('Image file too large. Please choose a file smaller than 5MB.');
					}
					
					// Convert image to base64
					imageData = await new Promise((resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => {
							const base64 = reader.result.split(',')[1];
							resolve(base64);
						};
						reader.onerror = reject;
						reader.readAsDataURL(imageFile);
					});
					imageType = imageFile.type;
				}
				
				const payload = {
					email: formData.get('email'),
					title: formData.get('title'),
					text: formData.get('text'),
					url: formData.get('url') || '',
					imageData,
					imageType
				};
				
				const response = await fetch('/share', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload)
				});
				
				const result = await response.json();
				
				if (response.ok) {
					statusEl.className = 'status-message success';
					statusEl.textContent = '✅ Share submitted successfully! Check your email for verification instructions.';
					this.reset();
				} else {
					throw new Error(result.error || 'Failed to submit share');
				}
				
			} catch (error) {
				statusEl.className = 'status-message error';
				statusEl.textContent = '❌ Error: ' + error.message;
			} finally {
				submitBtn.disabled = false;
			}
		});
	</script>`;
}

export async function post() {
	// Handle form submission via redirect
	return {
		statusCode: 302,
		headers: {
			Location: '/share?submitted=true'
		}
	};
}