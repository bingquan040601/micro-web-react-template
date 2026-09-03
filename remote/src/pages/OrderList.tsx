import { Card, Table, Tag } from 'antd';

interface Order {
  key: number;
  orderNo: string;
  amount: number;
  status: '已支付' | '待支付' | '已退款';
}

const dataSource: Order[] = [
  { key: 1, orderNo: 'SO20260831001', amount: 1299.0, status: '已支付' },
  { key: 2, orderNo: 'SO20260831002', amount: 399.5, status: '待支付' },
  { key: 3, orderNo: 'SO20260830017', amount: 2680.0, status: '已退款' },
];

const statusColor: Record<Order['status'], string> = {
  已支付: 'green',
  待支付: 'gold',
  已退款: 'red',
};

const columns = [
  { title: '订单号', dataIndex: 'orderNo' },
  {
    title: '金额',
    dataIndex: 'amount',
    render: (v: number) => `¥ ${v.toFixed(2)}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (s: Order['status']) => <Tag color={statusColor[s]}>{s}</Tag>,
  },
];

export default function OrderList() {
  return (
    <Card title="订单管理（来自 remote_app :3101）">
      <Table rowKey="key" dataSource={dataSource} columns={columns} pagination={false} />
    </Card>
  );
}
