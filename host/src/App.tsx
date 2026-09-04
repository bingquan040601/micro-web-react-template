import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { DashboardOutlined, ShoppingOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { fetchMenus } from './api/menu';
import type { MenuItemData } from './api/menu';
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

// 接口菜单 icon 字符串 → 图标组件，接口只下发标识，不与组件库耦合
const iconMap: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  team: <TeamOutlined />,
  shopping: <ShoppingOutlined />,
};

// 服务不可用时的兜底菜单，保证壳仍然可用
const DEFAULT_MENU: MenuItemData[] = [
  { key: 'dashboard', icon: 'dashboard', label: '工作台' },
  {
    key: 'user-domain',
    icon: 'team',
    label: '用户域（remote_app）',
    children: [
      { key: 'user-list', label: '用户管理' },
      { key: 'order-list', icon: 'shopping', label: '订单管理' },
    ],
  },
];

type AntdMenuItem = NonNullable<MenuProps['items']>[number];

function toMenuItems(list: MenuItemData[]): AntdMenuItem[] {
  return list.map(({ icon, children, ...rest }) => ({
    ...rest,
    icon: icon ? iconMap[icon] : undefined,
    children: children ? toMenuItems(children) : undefined,
  }));
}

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<AntdMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    fetchMenus()
      .then((list) => setMenuItems(toMenuItems(list)))
      .catch(() => setMenuItems(toMenuItems(DEFAULT_MENU))) // 错误 toast 由 request 层统一弹出
      .finally(() => setMenuLoading(false));
  }, []);

  const page = PAGES[active] ?? { title: '页面不存在', element: null };

  return (
    <Layout className="shell">
      <Sider width={220} style={{ background: '#001529' }}>
        <div className="shell-logo">🧩 MF Admin</div>
        {menuLoading ? (
          <div className="shell-loading">
            <Spin />
          </div>
        ) : (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[active]}
            defaultOpenKeys={['user-domain']}
            items={menuItems}
            onClick={({ key }) => setActive(key)}
          />
        )}
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
