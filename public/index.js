// <main-content></main-content>
//import mainContent from './modules/mainContent.js';
//customElements.define('main-content', mainContent);
//console.debug('<main-content> defined');

import { history } from './modules/history.js';
history.listen((location, action) => {
	console.debug('location changed', location, action);
});
