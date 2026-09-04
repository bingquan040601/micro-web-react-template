import rspack from '@rspack/core';
import { codeInspectorPlugin } from 'code-inspector-plugin';

// rspack serve 时 CLI 自动设为 development，build 时为 production
const isDev = process.env.NODE_ENV !== 'production';

// 远程入口跟随当前页面的 hostname：localhost 和局域网 IP 访问都能拿到可达的地址。
// （静态写死 localhost 时，其他设备访问会把 localhost 解析到它自己身上 → RUNTIME-008）
const dynamicRemote = (name, port) => `promise new Promise((resolve, reject) => {
  const url = 'http://' + window.location.hostname + ':${port}/remoteEntry.js';
  const script = document.createElement('script');
  script.src = url;
  script.onload = () => {
    const container = window.${name};
    resolve({
      get: (request) => container.get(request),
      init: (arg) => { try { return container.init(arg); } catch (e) { console.error(e); } },
    });
  };
  script.onerror = () => reject(new Error('Failed to load remote entry: ' + url));
  document.head.appendChild(script);
})`;

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: './src/index.tsx',
  devServer: {
    port: 3100,
    hot: true,
    // /api 转发到本地 mock 服务（server/），见 request 层 baseURL
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3200',
        changeOrigin: true,
      },
    ],
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
    // 页面元素点击跳转源码：Alt+Shift+点击（默认唤起 VS Code，仅开发环境生效。
    // 三个应用都需开启——远程页面的源码位置属性在各自编译时注入，host 侧统一响应点击）
    ...(isDev ? [codeInspectorPlugin({ bundler: 'rspack' })] : []),
    // ===== 模块联邦：作为主应用消费远程模块 =====
    new rspack.container.ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // 格式：别名: dynamicRemote('远程应用名', 端口)
        remote_app: dynamicRemote('remote_app', 3101),
        report_app: dynamicRemote('report_app', 3102),
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
