import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.less'; // 仅独立运行时生效；被壳集成时 bootstrap 不执行

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(<App />);
}
