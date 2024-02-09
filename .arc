@app
jessehattabaugh-com

@aws
architecture arm64
region us-east-1
runtime nodejs20.x

@plugins
enhance/arc-plugin-enhance

@static
compression true
fingerprint false
prune true

@tables
shares
	createdAt **Number
	encrypt true
	isAuthorized Boolean
	shareId *String
	text String
	title String
	url String
