import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import './app.less';

const { Sider, Header, Content } = Layout;

// 远程页面：按页面粒度懒加载，点菜单时才拉取对应 chunk
const Dashboard = lazy(() => import('report_app/Dashboard'));
const UserList = lazy(() => import('remote_app/UserList'));
const OrderList = lazy(() => import('remote_app/OrderList'));

// 菜单 key → 页面。userName 由壳下发，演示主子应用 props 通信
const PAGES: Record<string, { title: string; element: ReactNode }> = {
  dashboard: { title: '工作台', element: <Dashboard userName="Admin" /> },
  'user-list': { title: '用户管理', element: <UserList /> },
  'order-list': { title: '订单管理', element: <OrderList /> },
};

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
  {
    key: 'user-domain',
    icon: <TeamOutlined />,
    label: '用户域（remote_app）',
    children: [
      { key: 'user-list', label: '用户管理' },
      { key: 'order-list', icon: <ShoppingOutlined />, label: '订单管理' },
    ],
  },
];

export default function App() {
  const [active, setActive] = useState('dashboard');
  const page = PAGES[active];

  return (
    <Layout className="shell">
      <Sider width={220} style={{ background: '#001529' }}>
        <div className="shell-logo">🧩 MF Admin</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[active]}
          defaultOpenKeys={['user-domain']}
          items={menuItems}
          onClick={({ key }) => setActive(key)}
        />
      </Sider>
      <Layout>
        <Header className="shell-header">
          <span className="shell-header-title">{page.title}</span>
          <Dropdown menu={{ items: [{ key: 'logout', label: '退出登录' }] }}>
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
        </Header>
        <Content className="shell-content">
          <Suspense
            fallback={
              <div className="shell-loading">
                <Spin size="large" />
              </div>
            }
          >
            {page.element}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
