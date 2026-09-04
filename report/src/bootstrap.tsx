import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp } from 'antd';
import App from './App';
import { setErrorToast } from './request';
import './styles/global.less'; // 仅独立运行时生效；被壳集成时 bootstrap 不执行

// 把带上下文的 message 注入请求层；被壳集成时本 bootstrap 不执行，用的是壳注入的那份
function ToastBridge() {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setErrorToast((content) => void message.error(content));
  }, [message]);
  return null;
}

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <AntdApp>
      <ToastBridge />
      <App />
    </AntdApp>,
  );
}
