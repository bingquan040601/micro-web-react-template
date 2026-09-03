import Dashboard from './pages/Dashboard';

// 独立运行模式（直接访问 :3102）
export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>report_app 独立运行模式</h1>
      <Dashboard />
    </div>
  );
}
