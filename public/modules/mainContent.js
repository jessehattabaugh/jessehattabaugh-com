import {
	component,
	html,
	useEffect,
	useState,
} from 'https://cdn.pika.dev/haunted';
import { router } from './router.js';

export default component(mainContent, { useShadowDOM: false });

function mainContent() {
	const [content, setContent] = useState(html`<h3>🍉Loading...</h3>`);
	
	useEffect(() => {
		router.subscribe((route, previousRoute) => {
			setContent(html`<h4>Something else 🤡</h4>`);
			console.debug('router 🌈', route, previousRoute);
		});
		console.debug('subscribed to the router');
	}, []);

	return content;
}
