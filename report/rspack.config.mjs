import rspack from '@rspack/core';

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: './src/index.tsx',
  devServer: {
    port: 3102,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  output: {
    publicPath: 'http://localhost:3102/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    // ===== 模块联邦：报表域子应用 =====
    new rspack.container.ModuleFederationPlugin({
      name: 'report_app',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/pages/Dashboard.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        antd: { singleton: true },
      },
    }),
  ],
};
