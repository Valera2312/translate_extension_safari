const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const XCODE_RESOURCES_PATH = path.resolve(__dirname, 'native-mac-app/DeepL Translator/Resources');

module.exports = {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.tsx',
  },
  output: {
    path: XCODE_RESOURCES_PATH,
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'src/public/manifest.json', to: 'manifest.json' },
        { from: 'src/public/icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
  ],
  devtool: 'source-map',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
};
