export default Layout;

import Header from './Header.js';

function Layout(props) {
	return (
		<main>
			<Header />
			{props.children}
		</main>
	);
}
