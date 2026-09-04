import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { setErrorToast } from './request';
import './styles/global.less'; // 全局 reset：壳应用唯一入口引入

// 把带 ConfigProvider 上下文的 message 注入请求层，供全局错误 toast 使用
function ToastBridge() {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setErrorToast((content) => void message.error(content));
  }, [message]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN}>
    <AntdApp>
      <ToastBridge />
      <App />
    </AntdApp>
  </ConfigProvider>,
);
