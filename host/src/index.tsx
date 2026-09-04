// 异步边界：让模块联邦先加载 remoteEntry 并协商 shared 依赖
// void：显式标记浮动 Promise，满足 @typescript-eslint/no-floating-promises
void import('./bootstrap');
