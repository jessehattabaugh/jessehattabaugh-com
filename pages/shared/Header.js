export default Header;

import Link from 'next/link';

function Header() {
	return (
		<header>
			<Link href="/">
				<a title="Return Home">
					<h1>Jesse Hattabaugh's Site</h1>
				</a>
			</Link>

			<nav>
				<Link href="/resume">
					<a title="Let's Work Together!">Resume</a>
				</Link>
			</nav>
		</header>
	);
}
