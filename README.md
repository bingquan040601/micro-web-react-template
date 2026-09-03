# Rspack 模块联邦中后台骨架（方式一：内置 ModuleFederationPlugin）

主应用 `host` 是"壳"（侧边栏 + 顶栏 + 内容区），业务页面由两个子应用按页面粒度远程提供。

## 目录结构

```text
├── host/                       # 壳应用 :3100
│   ├── rspack.config.mjs       # remotes 注册两个子应用
│   └── src/
│       ├── index.tsx           # 入口：异步边界 import('./bootstrap')
│       ├── bootstrap.tsx       # ConfigProvider(zhCN) + 渲染壳
│       ├── App.tsx             # Layout：Sider 菜单 + Header + Content，菜单切换远程页面
│       ├── app.less            # 壳样式
│       └── declarations.d.ts   # 远程模块的 TS 类型声明
├── remote/                     # 用户域子应用 :3101
│   ├── rspack.config.mjs       # exposes: ./UserList、./OrderList（按页面暴露）
│   └── src/
│       ├── pages/UserList.tsx
│       ├── pages/OrderList.tsx
│       └── App.tsx             # 独立运行模式的预览页（不暴露给壳）
└── report/                     # 报表域子应用 :3102
    ├── rspack.config.mjs       # exposes: ./Dashboard（接收壳下发的 userName prop）
    └── src/pages/Dashboard.tsx
```

## 启动

```bash
npm --prefix remote run dev    # :3101
npm --prefix report run dev    # :3102
npm --prefix host run dev      # :3100（最后启动）
```

打开 <http://localhost:3100> 。注意：**改了 rspack.config.mjs 必须重启对应 dev server**，
dev server 不会监听配置文件变化，否则会报 `Module "./xxx" does not exist in container`。

## 关键设计点

1. **壳负责框架**：菜单、路由映射、登录态、ConfigProvider 主题/语言都在 host；
   子应用只暴露"内容区页面"，不感知壳的存在。
2. **按页面粒度 exposes**：点哪个菜单才加载哪个 chunk（配合 React.lazy），
   而不是整个子应用一把梭。
3. **主子通信**：壳通过 props 下发数据（示例：`Dashboard` 的 `userName`）。
4. **shared 单例**：react / react-dom / antd 三处共享单例，壳的 ConfigProvider
   对远程页面同样生效；注意 shared 的包不做 tree-shaking，会整包打成独立 chunk。
5. **异步边界**（必须）：入口 `index.tsx` 只写 `import('./bootstrap')`。
6. **remote 的 `output.publicPath` 必须是绝对地址**，否则 chunk 会从壳的域名下拉取。
7. **首屏 loading**：两段式。`host/index.html` 的 `#root` 内放纯 HTML 占位
   （logo + 纯 CSS spinner，效果见 boot-loading.png）。占位样式必须**内联且
   完全自包含**——高度、行高、字号、间距全部写死，不继承 body、不依赖
   JS 注入的 global.less，否则样式晚到时占位会跳变（位置飘移/字号突变）。
   React 挂载后由 `App.tsx` 的 `Suspense` fallback（Spin）接管，
   `.shell-loading` 填满内容区并居中，与首屏占位视觉中心基本重合。
8. **Rspack 2.x 额外依赖**：`@module-federation/runtime-tools`（MF 运行时）和
   `@rspack/dev-server`（dev server）。
9. **全局样式归壳管理**：`src/styles/global.less`（现代化 reset）只在各应用的
   `bootstrap.tsx` 引入。壳的 bootstrap 集成时一定执行；子应用的 bootstrap
   只在独立运行时执行，被壳集成时不执行——因此全局 reset 永远只有一份生效，
   不会多份互相污染。真实项目中建议抽成公共 npm 包（如 `@company/base-styles`）
   保证三处内容一致。
