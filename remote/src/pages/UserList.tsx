import { Card, Table, Tag } from 'antd';

interface User {
  key: number;
  name: string;
  role: string;
  status: '启用' | '禁用';
}

const dataSource: User[] = [
  { key: 1, name: '张三', role: '管理员', status: '启用' },
  { key: 2, name: '李四', role: '运营', status: '启用' },
  { key: 3, name: '王五', role: '访客', status: '禁用' },
];

const columns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '角色', dataIndex: 'role' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (s: User['status']) => (
      <Tag color={s === '启用' ? 'green' : 'red'}>{s}</Tag>
    ),
  },
];

export default function UserList() {
  return (
    <Card title="用户管理（来自 remote_app :3101）">
      <Table rowKey="key" dataSource={dataSource} columns={columns} pagination={false} />
    </Card>
  );
}
