export type {
  AppController,
  AppErrorPhase,
  AppOptions,
  MainWindowOption,
  OpenContext,
  OpenSource,
  QuitTask,
  SecondInstanceContext,
  SingleInstanceOptions,
  WindowLookup,
} from './types';
export { setupApp } from './app';
export { extractUrls, normalizeSchemes, registerProtocols } from './protocol';
