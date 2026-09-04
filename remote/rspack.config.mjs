import rspack from '@rspack/core';
import { codeInspectorPlugin } from 'code-inspector-plugin';

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: './src/index.tsx',
  devServer: {
    port: 3101,
    hot: true,
    // 允许主应用（localhost:3000）跨域拉取远程模块
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  output: {
    // 'auto'：chunk 地址跟随 remoteEntry.js 的加载源——既保证回到本应用 origin 拉取
    // （而不是主应用的），又让 localhost / 局域网 IP 两种访问方式都成立
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
    // 元素点击跳转源码（仅开发环境；远程页面被 host 消费后，点击落到本应用源码）
    ...(isDev ? [codeInspectorPlugin({ bundler: 'rspack' })] : []),
    // ===== 模块联邦：作为子应用暴露模块 =====
    new rspack.container.ModuleFederationPlugin({
      name: 'remote_app',
      filename: 'remoteEntry.js',
      // 按页面粒度暴露：主应用点哪个菜单才加载哪个 chunk
      exposes: {
        './UserList': './src/pages/UserList.tsx',
        './OrderList': './src/pages/OrderList.tsx',
      },
      // singleton: 保证主子应用共用同一份 react/antd，避免多实例报错
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        antd: { singleton: true },
      },
    }),
  ],
};
