import { html } from '../../shared/html.js';
import { paths } from '../../shared/routes.js';
import { layout } from '../../shared/templates/layout.js';

/** @import { Group, Analytics } from '../analytics/data.js' */

const format = new Intl.NumberFormat('en-US');
const regions = new Intl.DisplayNames('en-US', { type: 'region', fallback: 'none' });

/** @param {string} title @param {string} column @param {Group[]} rows */
function breakdown(title, column, rows) {
	return html`<table>
		<caption>${title}</caption>
		<thead><tr><th scope="col">${column}</th><th scope="col">Page views</th></tr></thead>
		<tbody>${rows.map(({ dimensions: { label }, count }) => { return html`
			<tr><th scope="row">${column === 'Country' && /^[A-Z]{2}$/.test(label) ? regions.of(label) ?? label : label || 'Unknown'}</th>
			<td>${format.format(count)}</td></tr>`; })}</tbody>
	</table>`;
}

/** @param {{days: number, notice?: string, report?: Analytics, views?: number}} data */
export function analyticsPage({ days, notice, report, views = 0 }) {
	return layout({
		title: 'Visitor analytics', path: paths.analytics,
		body: html`<article data-analytics>
			<h1>Visitor analytics</h1>
			<form action="${paths.analytics}" method="get">
				<label for="analytics-days">Date range</label>
				<select id="analytics-days" name="days">
					${[7, 30].map((value) => { return html`<option value="${value}" ${value === days ? html`selected` : html``}>Last ${value} days</option>`; })}
				</select>
				<button type="submit" class="btn">Apply</button>
			</form>
			${notice ? html`<p role="status">${notice}</p>` : html`
				<p>${format.format(views)} page views in the last ${days} days. Cloudflare samples Web Analytics data.</p>
				${views ? html`
					${breakdown('Page views by day', 'Day (UTC)', report?.days ?? [])}
					${breakdown('Top pages by views', 'Page', report?.pages ?? [])}
					${breakdown('Top countries by views', 'Country', report?.countries ?? [])}
				` : html`<p>No page views in this date range.</p>`}
			`}
		</article>`,
	});
}
