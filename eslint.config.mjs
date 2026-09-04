import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略（flat config 下 .eslintignore 已废弃，只能在这里声明）
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'repot/**', '.husky/**'],
  },

  // JS 基础规则，作用于所有 js/mjs/ts/tsx
  js.configs.recommended,

  // 全文件通用约定（server 的 no-console 在下方单独放行）
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // TS 类型感知规则——仅三个应用的 src（各应用 tsconfig 均 include ["src"]，projectService 可自动就近发现）
  {
    files: ['{host,remote,report}/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    rules: {
      // 与存量 import type 单行风格一致
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // React Hooks 官方推荐（含 React Compiler 稳定规则）
  {
    files: ['{host,remote,report}/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  // 组件文件的热更新边界：只导出组件
  {
    ...reactRefresh.configs.vite,
    files: ['{host,remote,report}/src/**/*.tsx'],
  },

  // 入口文件（index/bootstrap）不是 Fast Refresh 边界，豁免组件导出约束
  {
    files: ['{host,remote,report}/src/{index,bootstrap}.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Node 环境文件：构建配置 + mock 服务 + 本配置文件
  {
    files: ['{host,remote,report}/rspack.config.mjs', 'server/**/*.js', 'eslint.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },

  // 纯 JS 文件（server/index.js 等）关闭类型感知规则
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // mock 服务的 console 是合法输出
  {
    files: ['server/**/*.js'],
    rules: { 'no-console': 'off' },
  },

  // 永远最后：关闭与 Prettier 冲突的格式规则
  prettier,
);
