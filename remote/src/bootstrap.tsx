import { createRoot } from 'react-dom/client';
import RemoteApp from './App';
import './styles/global.less'; // 仅独立运行时生效；被壳集成时 bootstrap 不执行

// 子应用独立运行时（直接访问 3101 端口）渲染自己，方便单独开发调试
const el = document.getElementById('root');
if (el) {
  createRoot(el).render(<RemoteApp />);
}
