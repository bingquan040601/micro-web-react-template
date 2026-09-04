import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { message } from 'antd';

/* ============================================================
 * 统一请求封装（axios）
 *
 * 约定：
 *  - 后端统一响应信封 { code, data, message }，code === 0 为成功
 *  - 401 由本层统一登出跳转，业务方无需处理
 *  - 「同 url + 同参数」的未完成请求会被新请求自动取消（可配）
 *
 * 用法：
 *   import { get, post } from '../request';
 *   const user = await get<UserInfo>('/user/info');
 *   await post('/user', payload, { skipErrorToast: true }); // 错误自行处理
 * ========================================================== */

/** 后端统一响应信封 */
export interface ApiEnvelope<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/** 业务错误：HTTP 通了但 code !== 0，业务方 catch 后可按 code 分支处理 */
export class BizError extends Error {
  readonly code: number;

  constructor(code: number, msg: string) {
    super(msg);
    this.name = 'BizError';
    this.code = code;
  }
}

export interface RequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  /** 跳过全局错误 toast（业务方自行 catch 展示时使用） */
  skipErrorToast?: boolean;
  /** 默认 true：取消同 key 的未完成请求，防连击 / 快速切换产生竞态 */
  cancelDuplicate?: boolean;
}

const SUCCESS_CODE = 0;
const TOKEN_KEY = 'token';
const LOGIN_PATH = '/login';
const PENDING_KEY = '__pendingKey';

/* ---------- 错误提示：启动时由 antd <App> 内注入，未注入时降级为静态 message ---------- */

type ErrorToast = (content: string) => void;

let toastError: ErrorToast = (content) => {
  message.error(content);
};

/** 在 antd <App> 组件内调用（传 App.useApp().message.error），让 toast 消费 ConfigProvider 上下文 */
export function setErrorToast(fn: ErrorToast) {
  toastError = fn;
}

/* ---------- axios 实例 ---------- */

export const instance: AxiosInstance = axios.create({
  baseURL: '/api', // 按实际网关地址调整；dev 环境可配 devServer.proxy 转发
  timeout: 15_000,
});

/* ---------- 重复请求取消 ---------- */

const pending = new Map<string, AbortController>();

type TaggedConfig = InternalAxiosRequestConfig & { [PENDING_KEY]?: string };

function buildPendingKey(config: InternalAxiosRequestConfig): string {
  return [
    config.method,
    config.url,
    JSON.stringify(config.params),
    JSON.stringify(config.data),
  ].join('&');
}

function dropPending(config: TaggedConfig) {
  const key = config[PENDING_KEY];
  if (key && pending.get(key)?.signal === config.signal) {
    pending.delete(key);
  }
}

/* ---------- 401 统一跳登录（并发下只跳一次） ---------- */

let isRedirectingToLogin = false;

function toLogin() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  localStorage.removeItem(TOKEN_KEY);
  // request 层在 Router 之外，直接硬跳；接入 Router 后可换成注入的 navigate
  window.location.href = LOGIN_PATH;
}

/* ---------- 拦截器 ---------- */

instance.interceptors.request.use((config) => {
  const cfg = config as TaggedConfig & Pick<RequestConfig, 'cancelDuplicate'>;

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  if (cfg.cancelDuplicate !== false) {
    const key = buildPendingKey(cfg);
    pending.get(key)?.abort(); // 取消同 key 的前一个未完成请求
    const controller = new AbortController();
    cfg.signal = controller.signal;
    cfg[PENDING_KEY] = key;
    pending.set(key, controller);
  }
  return cfg;
});

// 响应拦截器把 AxiosResponse 脱壳成业务 data：运行时返回值不再是 AxiosResponse，
// 显式 any 是 axios 解包的标准写法，对外类型由下方的 request<T> 泛型兜底
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
instance.interceptors.response.use(
  (response: AxiosResponse): any => {
    dropPending(response.config);

    // 文件下载等非 JSON 响应直接放行
    if (response.config.responseType && response.config.responseType !== 'json') {
      return response.data;
    }

    const envelope = response.data as ApiEnvelope | undefined;
    if (envelope?.code === SUCCESS_CODE) {
      return envelope.data;
    }
    if (envelope?.code === 401) {
      // 后端把 401 放在业务码里的情况，兜一层
      toLogin();
      return Promise.reject(new BizError(401, envelope.message || '登录已过期'));
    }
    return Promise.reject(
      new BizError(envelope?.code ?? -1, envelope?.message || '服务开小差了，请稍后重试'),
    );
  },
  (error: AxiosError<ApiEnvelope>) => {
    if (error.config) {
      dropPending(error.config);
    }
    // 被「重复请求取消」abort 的请求：静默 reject，不弹 toast
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 || error.response?.data?.code === 401) {
      toLogin();
    }
    return Promise.reject(normalizeHttpError(error));
  },
);
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */

const STATUS_MESSAGE: Record<number, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有权限访问',
  404: '请求的资源不存在',
  500: '服务器异常，请稍后重试',
  502: '网关异常',
  503: '服务不可用，请稍后重试',
};

/** 把 HTTP 层错误归一化成带中文提示的 Error */
function normalizeHttpError(error: AxiosError<ApiEnvelope>): Error {
  if (error.code === 'ECONNABORTED') {
    return new Error('请求超时，请稍后重试');
  }
  if (!error.response) {
    return new Error('网络异常，请检查网络连接');
  }
  const { status, data } = error.response;
  return new Error(data?.message || STATUS_MESSAGE[status] || `请求失败（${status}）`);
}

/* ---------- 对外方法：统一错误 toast + 泛型脱壳 ---------- */

export async function request<T>(config: RequestConfig): Promise<T> {
  try {
    // 响应拦截器已脱壳，运行时返回值即 data，这里按泛型 T 断言
    return (await instance.request(config)) as T;
  } catch (error) {
    if (!axios.isCancel(error) && !config.skipErrorToast) {
      toastError(error instanceof Error ? error.message : '网络异常，请稍后重试');
    }
    throw error;
  }
}

export function get<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: RequestConfig,
): Promise<T> {
  return request<T>({ ...config, method: 'GET', url, params });
}

export function post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'POST', url, data });
}

export function put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'PUT', url, data });
}

export function del<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: RequestConfig,
): Promise<T> {
  return request<T>({ ...config, method: 'DELETE', url, params });
}
