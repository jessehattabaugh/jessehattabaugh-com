const ExtractPlugin = require('extract-text-webpack-plugin');
const getMediaFilename = require('link-media-html-webpack-plugin/get-media-filename');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const LinkMediaHTMLPlugin = require('link-media-html-webpack-plugin');
const path = require('path');

const screenStyleExtractor = new ExtractPlugin(
	getMediaFilename(path.resolve('./src/screen.css')),
);
const printStyleExtractor = new ExtractPlugin(
	getMediaFilename(path.resolve('./src/print.css')),
);

module.exports = {
	module: {
		rules: [
			{
				test: /print\.css$/,
				use: printStyleExtractor.extract('css-loader'),
			},
			{
				test: /screen\.css$/,
				use: screenStyleExtractor.extract('css-loader'),
			},
		],
	},
	plugins: [
		//screenStyleExtractor,
		printStyleExtractor,
		new HtmlWebpackPlugin({template: path.resolve('./src/index.html')}),
		//new LinkMediaHTMLPlugin(),
	],
};
