const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');

const HOST = process.env.HOST ? HOST : 'localhost';
const PORT = process.env.PORT || 3000;
const PROJECT_DOMAIN = process.env.PROJECT_DOMAIN || null;
const DEV_SERVER_PUBLIC = PROJECT_DOMAIN
  ? `${PROJECT_DOMAIN}.glitch.me`
  : `${HOST}:${PORT}`;

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const IS_DEV = NODE_ENV === 'development';
const IS_GLITCH = PROJECT_DOMAIN !== null;

module.exports = [
  {
    entry: {
      index: './src/index.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js'
    },
    devServer: {
      public: DEV_SERVER_PUBLIC,
      port: PORT,
      disableHostCheck: true,
      contentBase: 'dist',
      hot: true
    },
    watchOptions: {
      aggregateTimeout: IS_GLITCH ? 500 : 0
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: ['babel-loader', 'eslint-loader']
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': `'${NODE_ENV}'`
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './src/index.html.ejs',
        chunks: 'index.js'
      }),
      new webpack.NamedModulesPlugin(),
      new webpack.HotModuleReplacementPlugin()
    ]
  }
];
