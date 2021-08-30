export default Index;

import Head from 'next/head';
import Layout from './shared/Layout';

function Index() {
	return (
		<Layout>
			<Head>
				<title>Jesse Hattabaugh</title>
				<meta
					name="description"
					content="Personal website of Jesse Hattabaugh"
				/>
				<meta
					name="viewport"
					content="initial-scale=1.0, width=device-width"
				/>
			</Head>
			<h2>Welcome to my site!</h2>
		</Layout>
	);
}
