import { Card, Col, Row, Statistic } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';

interface DashboardProps {
  /** 由壳应用下发的当前登录用户名，演示主子应用 props 通信 */
  userName?: string;
}

export default function Dashboard({ userName = '访客' }: DashboardProps) {
  return (
    <div>
      <h2>👋 你好，{userName}（来自 report_app :3102）</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="今日订单" value={1284} suffix="单" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日营收" value={93412} precision={2} suffix="元" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="环比增长"
              value={12.6}
              precision={1}
              suffix="%"
              prefix={<ArrowUpOutlined />}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
