import rspack from '@rspack/core';

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: './src/index.tsx',
  devServer: {
    port: 3100,
    hot: true,
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
    // ===== 模块联邦：作为主应用消费远程模块 =====
    new rspack.container.ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // 格式：别名: '远程应用名@远程地址/remoteEntry.js'
        remote_app: 'remote_app@http://localhost:3101/remoteEntry.js',
        report_app: 'report_app@http://localhost:3102/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        // antd 共享单例：主子应用复用一份，避免双倍体积和 ConfigProvider 上下文割裂
        antd: { singleton: true },
      },
    }),
  ],
};
