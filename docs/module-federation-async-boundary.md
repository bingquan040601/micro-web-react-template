# 约定：入口必须只有一行 `void import('./bootstrap')`（异步边界）

> 本仓库三个应用（host / remote / report）的 `src/index.tsx` 都只有这一行，
> 是现行约定。此文解释为什么必须这么写，以及 `void` 的作用。

## 疑问

`index.tsx` 是构建入口（各应用 `rspack.config.mjs` 的 `entry: './src/index.tsx'`，
没有任何源码文件 import 它），内容却只有：

```ts
void import('./bootstrap');
```

为什么不直接静态 `import './bootstrap'`？前面的 `void` 又是干什么的？

## 静态 import 的求值规则

ES 模块的静态 import 是**编译期绑定、执行前求值**：引擎在运行本模块体之前，
先把它的静态依赖图深度优先地执行一遍。`bootstrap.tsx` 又 import 了
react / react-dom / antd / 页面组件 / 请求层 / 全局样式，页面再往下还有依赖——
从 bootstrap 出发沿 import 链可达的所有模块，就是它的"模块图"。

写成 `import './bootstrap'` 时的实际执行顺序：

```text
react 模块体 → react-dom 模块体 → antd 模块体 → App/页面/…（整张模块图）
→ bootstrap.tsx 模块体（createRoot(...).render(...) 在这里跑）
→ index.tsx 模块体（已无事可做）
```

浏览器加载入口 chunk 后一口气同步执行到底，**中间没有任何异步间隙**。

## 为什么联邦场景下必须人为制造一个异步边界

`react` / `react-dom` / `antd` 在三个应用里都配了 `singleton: true`。
这个"单例"的确定分两个阶段：

- **构建期**：MF 插件把各应用提供的 shared 模块、版本号、singleton 标记
  固化进各自的 `remoteEntry.js`；同时把应用代码里对 shared 包的静态 import
  **改写成 Promise 化的共享消费调用**（`loadShare`）。
- **运行期**：各容器的 `init()` 把自己提供的 shared 模块注册进页面级共享的
  `shared scope` 对象；消费方要 react 时，runtime 在这个对象里做**本地版本
  比较**，挑出满足条件的实例。所谓"协商"是内存里的查表比较——不是运行时
  静态分析，也不是逐依赖的网络往返（网络只发生在加载 `remoteEntry.js`
  和 chunk 的时候）。

关键在 `loadShare` 是 Promise 化的：bootstrap 这张图要跑起来，中间必须能
`await`。而入口 chunk 的静态依赖**无法 await**——入口是同步执行到底的，
没有暂停点。如果入口静态 import bootstrap，react 只能在入口 chunk 里被
同步求值、固化成**本应用的私有副本**，协商路径根本走不到，singleton 失效；
集成模式下就会出现两个 React 实例、壳的 `ConfigProvider` 上下文在远程页面
里断掉这类问题。

动态 `import()` 则让 bootstrap 脱离入口的同步执行流：webpack 得以把它的
模块工厂变成**异步的**，先 `await loadShare('react')` 拿到单例，再执行
bootstrap 的模块体。所以异步边界（async boundary）的本质是**机制上的
"可等待点"**，而不只是时间上的空档——哪怕协商再快，同步入口里也永远没有
插入 `await` 的位置。这是 Module Federation 官方推荐写法。

## `void` 的作用

`import()` 返回 Promise，而启动代码故意不 await 它。仓库根开了类型感知
ESLint（`recommendedTypeChecked`），其中 `@typescript-eslint/no-floating-promises`
会报"浮动 Promise"。`void` 显式丢弃返回值，既消除 lint 报错，
也向读者标明"我知道它返回 Promise，是有意不处理"。

## 推论：bootstrap 只在独立运行时执行

- **独立预览**（直接访问 :3101 / :3102）：入口执行 → `import('./bootstrap')`
  触发 → 渲染子应用自己的预览 App。
- **集成模式**（通过 :3100 壳访问）：壳直接加载 exposes 的页面模块，
  **子应用的入口和 bootstrap 都不会执行**。因此子应用 bootstrap 里引入的
  `global.less`、注入的 `setErrorToast` 在集成模式下都不生效——用的是壳的
  那份。这正是三份 `global.less` / `request` 要保持内容同步、且全局 reset
  "永远只有壳那份生效"的原因。

## 一句话总结

shared 依赖的消费是 Promise 化的，只有挂在动态 import 之后的模块图才有
`await` 它的位置；`void import('./bootstrap')` 就是为应用代码造出这个
可等待点。静态 import 则会把 react 同步固化成本应用私有副本，单例失效。
