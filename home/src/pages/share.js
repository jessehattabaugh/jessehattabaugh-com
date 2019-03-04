import React, {useEffect, useState} from 'react';

export default () => {
	const {title, setTitle} = useState('');
	const {text, setText} = useState('');
	const {url, setUrl} = useState('');

	useEffect(() => {
		const params = new URL(window.location).searchParams;
		setTitle(params.get('title'));
		setText(params.get('text'));
		// sometimes url is null, and the url is in text instead, FML
		setUrl(params.get('url') ? params.get('url') : params.get('text'));
	});

	return (
		<>
			<h1>Thanks for sharing!</h1>
			<form name="share" action="save">
				<fieldset>
					<h2>The link you're sharing</h2>
					<label>
						Title:{' '}
						<input
							name="title"
							value={title}
							onChange={setTitle}
							required
						/>
					</label>
					<label>
						Url:{' '}
						<input
							type="url"
							name="url"
							value={url}
							onChange={setUrl}
							required
						/>
					</label>
					<label>
						Text:
						<textarea name="text" onChange={setText}>
							{text}
						</textarea>
					</label>
				</fieldset>
				<fieldset>
					<h2>Who are you?</h2>
					<label>
						Name: <input name="name" autocomplete="name" />
					</label>
					<label>
						Email:
						<input type="email" name="email" autocomplete="email" />
					</label>
				</fieldset>
				<input type="submit" />
			</form>
		</>
	);
};
