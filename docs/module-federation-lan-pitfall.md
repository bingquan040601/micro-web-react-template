# 坑：模块联邦写死 localhost，局域网下 #RUNTIME-008

> 本仓库已修复（2026-09-03）。此文存档排障思路与通用教训。

## 现象

本机 `http://localhost:3100` 一切正常；换成局域网地址 `http://172.23.80.1:3100`
（尤其是**用另一台设备**访问）后，点击菜单加载远程页面时报错：

```text
[ Federation Runtime ]: Failed to load script resources. #RUNTIME-008
args: {"remoteName":"report_app","resourceUrl":"http://localhost:3102/remoteEntry.js"}
ScriptNetworkError: Failed to load script "http://localhost:3102/remoteEntry.js" -
the script URL is unreachable or the server returned an error (network failure, 404, CORS, etc.)
```

注意报错里的 `resourceUrl` 是 `localhost:3102` —— 问题不在 3102 服务没起，
而在**浏览器去错了地方**。

## 根因：两层 localhost 写死

`localhost` 永远解析到"浏览器所在的那台设备"。用 `172.23.80.1:3100` 打开页面时，
页面里的代码跑在**客户端设备**上，此时 `localhost:3102` 指的是客户端自己 ——
上面什么都没有，自然 connection refused。

本仓库当时有两处写死：

1. **host 的 `remotes`**（`host/rspack.config.mjs`）：

   ```js
   remote_app: 'remote_app@http://localhost:3101/remoteEntry.js',  // ✗
   report_app: 'report_app@http://localhost:3102/remoteEntry.js',  // ✗
   ```

2. **子应用的 `output.publicPath`**（`remote/`、`report/` 的 rspack.config.mjs）：

   ```js
   publicPath: 'http://localhost:3101/',  // ✗
   ```

   这层更隐蔽：就算入口地址修好了，`remoteEntry.js` 加载成功后，它再去拉
   页面 chunk 时用的还是 publicPath 拼出的 localhost 地址，一样挂。

## 修复

核心思路：**不要写死任何主机名，让地址跟随"页面的打开方式"**。

### host：promise 动态 remote（`host/rspack.config.mjs`）

```js
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

remotes: {
  remote_app: dynamicRemote('remote_app', 3101),
  report_app: dynamicRemote('report_app', 3102),
},
```

`window.location.hostname` 在运行时才求值：用 localhost 打开就指向 localhost，
用局域网 IP 打开就指向局域网 IP。

### 子应用：`publicPath: 'auto'`

```js
output: {
  publicPath: 'auto',
},
```

`'auto'` 让 Rspack 运行时根据 `remoteEntry.js` 这个 `<script>` 自身的 URL
推导 chunk 基地址。remoteEntry 是从子应用 origin 加载的，所以 chunk 依然回到
子应用 origin 拉取 —— "不能从壳的域名拉 chunk" 这个不变量保持成立，
同时对 localhost / 局域网 IP 两种访问方式都成立。

## 为什么不直接换成局域网 IP

`remote_app@http://172.23.80.1:3101/remoteEntry.js` 看似能修，实则更差：

- 本机用 `localhost:3100` 打开时反而要去拉局域网 IP，混合且别扭；
- DHCP 换 IP、换网络环境就失效，得改代码重启；
- 代码里出现某台机器的一次性地址，无法入库共享。

一句话：**写死 localhost 是"只能本机玩"，写死局域网 IP 是"只能这台机器这个网络玩"，
跟随 location 才是"怎么访问都成立"。**

## 通用教训：分清"浏览器侧地址"和"服务端侧地址"

改配置前先问：这个地址最终是**谁的**网络栈去访问？

| 地址用途                                                                         | 求值位置                    | 能不能写 localhost                           |
| -------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| MF `remotes` 入口、`output.publicPath`、前端直连的 API/WebSocket 地址            | **客户端浏览器**            | ✗ 必须跟随 location 或用相对路径             |
| devServer `proxy.target`（如 host 的 `/api` → `localhost:3200`）、SSR/服务端回调 | **dev server / 服务器进程** | ✓ 服务端和 mock 在同一台机器，localhost 正确 |

本仓库 host 的 `/api` 代理之所以局域网下不用改，就是因为代理转发发生在
dev server 进程里，不在浏览器里。

## 排查 checklist

局域网/跨设备访问 MF 应用报错时：

1. 看报错里的 `resourceUrl` 主机名 —— 是 localhost 基本就是本坑；
2. `netstat -ano | grep <port>` 确认各 dev server 监听在 `0.0.0.0` 而不是 `127.0.0.1`；
3. 改了 `rspack.config.mjs` **必须重启** dev server（不监听配置变化），
   否则会看到 `Module "./xxx" does not exist in container` 之类的陈旧缓存报错；
4. 防火墙/安全组放行对应端口（本例 3100-3102）。
