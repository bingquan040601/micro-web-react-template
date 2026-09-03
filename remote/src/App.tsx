import { Tabs } from 'antd';
import UserList from './pages/UserList';
import OrderList from './pages/OrderList';

// 独立运行模式（直接访问 :3101）：自己包一层 Tab 模拟壳的页面切换
// 注意：这个组件本身不再暴露给主应用，主应用按页面粒度消费
export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>remote_app 独立运行模式</h1>
      <Tabs
        items={[
          { key: 'user', label: '用户管理', children: <UserList /> },
          { key: 'order', label: '订单管理', children: <OrderList /> },
        ]}
      />
    </div>
  );
}
