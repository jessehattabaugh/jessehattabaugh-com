const {parse} = require('url');
const MongoClient = require('mongodb').MongoClient;

const {DB_USER, DB_PASSWORD, DB_NAME} = process.env;

module.exports = (req, res) => {
	const link = parse(req.url, true).query;
	return new Promise((resolve) => {
		connectToDB().then((client) => {
			const shares = client.db(DB_NAME).collection('shares');
			shares.insertOne(link);
			client.close();
			res.end(JSON.stringify(link));
			resolve(res);
		});
	});
};

function connectToDB() {
	return new Promise((resolve) => {
		MongoClient.connect(
			`mongodb+srv://${DB_USER}:${DB_PASSWORD}@jessehattabaugh-com-diyqj.mongodb.net/${DB_NAME}?retryWrites=true`,
			{useNewUrlParser: true},
			(err, client) => {
				if (err) throw new Error(err);
				resolve(client);
			},
		);
	});
}
