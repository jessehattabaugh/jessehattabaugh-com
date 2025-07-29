import { html, raw } from '../lib/html.js';

/**
 * Shares listing page handler  
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	// For now, return static content until we can query DynamoDB from the frontend
	// In a real implementation, this would fetch published shares from the database
	
	const mockShares = [
		{
			shareId: '1',
			title: 'Amazing JavaScript Framework',
			text: 'Just discovered this incredible new framework that makes web development so much easier!',
			url: 'https://example.com/framework',
			email: 'user@example.com',
			publishedAt: '2024-01-15T10:30:00Z',
			imagePath: undefined
		},
		{
			shareId: '2', 
			title: 'Interesting Article on AI',
			text: 'This article provides great insights into the future of artificial intelligence and its impact on society.',
			url: 'https://example.com/ai-article',
			email: 'another@example.com',
			publishedAt: '2024-01-14T15:45:00Z',
			imagePath: 'shares/sample-image.jpg'
		}
	];

	return html`<div class="shares-page">
		<h2>🌍 Shared Content</h2>
		<p>Interesting things shared by the community!</p>

		<div class="shares-container">
			${mockShares.length === 0 ? 
				raw(`<div class="no-shares">
					<p>No shares have been published yet.</p>
					<p><a href="/share">Be the first to share something!</a></p>
				</div>`) :
				raw(mockShares.map(share => `
					<article class="share-card">
						<div class="share-header">
							<h3 class="share-title">${share.title}</h3>
							<span class="share-date">${new Date(share.publishedAt).toLocaleDateString()}</span>
						</div>
						
						<div class="share-content">
							<p class="share-text">${share.text}</p>
							
							${share.url ? `
								<div class="share-link">
									<a href="${share.url}" target="_blank" rel="noopener noreferrer">
										🔗 Visit Link
									</a>
								</div>
							` : ''}
							
							${share.imagePath ? `
								<div class="share-image">
									<img src="/static/${share.imagePath}" alt="Share image" loading="lazy">
								</div>
							` : ''}
						</div>
						
						<div class="share-footer">
							<span class="share-author">Shared by ${share.email.slice(0, 2)}***@${share.email.split('@')[1]}</span>
						</div>
					</article>
				`).join(''))
			}
		</div>

		<div class="share-cta">
			<a href="/share" class="share-button">📤 Share Something</a>
		</div>
	</div>

	<style>
		.shares-page {
			max-width: 800px;
			margin: 0 auto;
			padding: 20px;
		}

		.shares-container {
			margin: 30px 0;
		}

		.no-shares {
			text-align: center;
			padding: 60px 20px;
			background: #f8f9fa;
			border-radius: 8px;
			color: #666;
		}

		.no-shares a {
			color: #007bff;
			text-decoration: none;
			font-weight: bold;
		}

		.no-shares a:hover {
			text-decoration: underline;
		}

		.share-card {
			background: white;
			border: 1px solid #e9ecef;
			border-radius: 8px;
			padding: 25px;
			margin-bottom: 25px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			transition: box-shadow 0.2s ease;
		}

		.share-card:hover {
			box-shadow: 0 4px 8px rgba(0,0,0,0.15);
		}

		.share-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 15px;
			flex-wrap: wrap;
			gap: 10px;
		}

		.share-title {
			margin: 0;
			color: #333;
			font-size: 1.4em;
			flex: 1;
			min-width: 200px;
		}

		.share-date {
			color: #666;
			font-size: 0.9em;
			white-space: nowrap;
		}

		.share-content {
			margin-bottom: 20px;
		}

		.share-text {
			color: #333;
			line-height: 1.6;
			margin-bottom: 15px;
		}

		.share-link {
			margin: 15px 0;
		}

		.share-link a {
			display: inline-block;
			padding: 8px 16px;
			background: #007bff;
			color: white;
			text-decoration: none;
			border-radius: 4px;
			font-size: 0.9em;
			transition: background-color 0.2s ease;
		}

		.share-link a:hover {
			background: #0056b3;
		}

		.share-image {
			margin: 15px 0;
		}

		.share-image img {
			max-width: 100%;
			height: auto;
			border-radius: 4px;
			border: 1px solid #e9ecef;
		}

		.share-footer {
			border-top: 1px solid #e9ecef;
			padding-top: 15px;
			font-size: 0.85em;
			color: #666;
		}

		.share-author {
			font-style: italic;
		}

		.share-cta {
			text-align: center;
			margin-top: 40px;
			padding: 30px;
			background: #f8f9fa;
			border-radius: 8px;
		}

		.share-button {
			display: inline-block;
			padding: 12px 30px;
			background: #28a745;
			color: white;
			text-decoration: none;
			border-radius: 4px;
			font-size: 1.1em;
			font-weight: bold;
			transition: background-color 0.2s ease;
		}

		.share-button:hover {
			background: #218838;
		}

		@media (max-width: 600px) {
			.shares-page {
				padding: 10px;
			}

			.share-card {
				padding: 20px;
			}

			.share-header {
				flex-direction: column;
				align-items: flex-start;
			}

			.share-title {
				font-size: 1.2em;
			}
		}
	</style>`;
}