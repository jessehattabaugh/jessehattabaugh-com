export default Index;

import Link from 'next/link';

function Index() {
	return (
		<main>
			<h1>Jesse Hattabaugh's Website</h1>
			<nav>
				<Link href="/resume">
					<a title="Let's Work Together!">Resume</a>
				</Link>
			</nav>
		</main>
	);
}
