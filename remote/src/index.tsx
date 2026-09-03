// 异步边界：用动态 import 启动应用，
// 让模块联邦先完成 shared 依赖（react/react-dom）的版本协商
import('./bootstrap');
