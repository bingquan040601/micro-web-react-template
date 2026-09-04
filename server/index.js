import http from 'node:http';

/* ============================================================
 * 本地 Mock 服务（零依赖，node:http）
 *
 * 约定与前端 request 层一致：
 *  - 统一响应信封 { code, data, message }，code === 0 为成功
 *  - 统一前缀 /api，host 的 devServer.proxy 把 /api 转发到这里
 *
 * 启动：npm --prefix server run dev   # :3200
 * ========================================================== */

const PORT = 3200;

/** 菜单 icon 用字符串下发，由前端 iconMap 映射成组件，避免接口与组件库耦合 */
const menus = [
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

const routes = {
  'GET /api/menus': () => ({ code: 0, data: menus, message: 'ok' }),
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  // 直连时（未走代理）允许跨域，便于单独调试
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) {
    send(res, 404, { code: 404, data: null, message: `接口不存在：${req.method} ${url.pathname}` });
    return;
  }

  // 加一点延迟，方便观察前端 loading 态
  setTimeout(() => send(res, 200, handler()), 300);
});

server.listen(PORT, () => {
  console.log(`mock server listening on http://localhost:${PORT}`);
});
