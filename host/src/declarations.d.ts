// 远程模块构建时不存在，需要手动声明类型，避免 TS 报错
declare module 'remote_app/UserList' {
  import type { ComponentType } from 'react';
  const Component: ComponentType;
  export default Component;
}

declare module 'remote_app/OrderList' {
  import type { ComponentType } from 'react';
  const Component: ComponentType;
  export default Component;
}

declare module 'report_app/Dashboard' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<{ userName?: string }>;
  export default Component;
}

// Less 文件的 side-effect import
declare module '*.less';
