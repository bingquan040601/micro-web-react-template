import { get } from '../request';

/** 接口下发的菜单项：icon 为字符串标识，由 host 映射成图标组件 */
export interface MenuItemData {
  key: string;
  label: string;
  icon?: string;
  children?: MenuItemData[];
}

export function fetchMenus(): Promise<MenuItemData[]> {
  return get<MenuItemData[]>('/menus');
}
