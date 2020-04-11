const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/main.ts',
  mode: 'development',
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
      { test: /\.ts$/, loader: 'ts-loader' },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@Lib': path.resolve(__dirname, 'lib'),
      '@Types': path.resolve(__dirname, 'typings'),
    },
  },

  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 3001,
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './test/index.html',
    }),
  ],
};
