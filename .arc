@app
jessehattabaugh-com

@aws
architecture arm64
region us-east-1
runtime nodejs16.x

@plugins
enhance/arc-plugin-enhance

@static
compression true
fingerprint true
ignore .shared
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
