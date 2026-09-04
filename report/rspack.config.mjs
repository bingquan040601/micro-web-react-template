import rspack from '@rspack/core';
import { codeInspectorPlugin } from 'code-inspector-plugin';

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: './src/index.tsx',
  devServer: {
    port: 3102,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  output: {
    // 'auto'：chunk 地址跟随 remoteEntry.js 的加载源（见 remote/rspack.config.mjs 注释）
    publicPath: 'auto',
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
      // Less：交给 Rspack 内置 CSS 能力处理（dev 下通过 style 标签注入，支持 HMR）
      {
        test: /\.less$/,
        use: [{ loader: 'less-loader' }],
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    // 元素点击跳转源码（仅开发环境）
    ...(isDev ? [codeInspectorPlugin({ bundler: 'rspack' })] : []),
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
