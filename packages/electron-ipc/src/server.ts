import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import { BrowserWindow, ipcMain, webContents } from 'electron';

import type { ChannelDef, Contract, ContractFns } from './contract';
import { findChannel } from './contract';

/** handler 的第一个参数, 与 Electron 的 `(event, ...args)` 约定一致 */
export interface IpcContext<E extends IpcMainEvent | IpcMainInvokeEvent = IpcMainInvokeEvent> {
  /** 原始事件 */
  event: E;
  /** 发起调用的 webContents */
  sender: WebContents;
  /** 发起调用的窗口, webContents 不属于任何窗口时为 null */
  window: BrowserWindow | null;
}

type InvokeImpl<F extends (...args: any[]) => any> = (
  ctx: IpcContext,
  ...args: Parameters<F>
) => Awaited<ReturnType<F>> | Promise<Awaited<ReturnType<F>>>;

type SendImpl<F extends (...args: any[]) => any> = (
  ctx: IpcContext<IpcMainEvent>,
  ...args: Parameters<F>
) => void | Promise<void>;

/** 契约里没有该组通道时, 对应字段可省略 */
type Group<K extends string, Fns, Impl> = [keyof Fns] extends [never]
  ? { [P in K]?: Record<never, never> }
  : { [P in K]: Impl };

/** 主进程需要实现的处理函数表, 漏写或多写通道都会类型报错 */
export type ContractHandlers<C extends Contract> = Group<
  'invoke',
  ContractFns<C, 'invoke'>,
  { [N in keyof ContractFns<C, 'invoke'>]: InvokeImpl<ContractFns<C, 'invoke'>[N]> }
> &
  Group<
    'send',
    ContractFns<C, 'send'>,
    { [N in keyof ContractFns<C, 'send'>]: SendImpl<ContractFns<C, 'send'>[N]> }
  >;

export interface HandleOptions {
  /**
   * 校验调用来源, 返回 false 时 invoke 以错误拒绝、send 直接丢弃
   *
   * 默认 {@link isMainFrame}: 只接受顶层 frame, 页面内嵌的第三方 iframe 无法调用
   */
  validateSender?: (event: IpcMainEvent | IpcMainInvokeEvent) => boolean;
}

/** 默认的来源校验: 只接受顶层 frame */
export function isMainFrame(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame;
  return frame != null && frame.parent === null;
}

/** 参数校验, 没有 schema 时原样放行 */
async function parseArgs(def: ChannelDef, name: string, args: unknown[]): Promise<unknown[]> {
  if (!def.args) {
    return args;
  }
  const result = await def.args['~standard'].validate(args);
  if (result.issues) {
    const detail = result.issues.map((issue) => issue.message).join('; ');
    throw new TypeError(`[electron-ipc] 通道 ${name} 参数校验失败: ${detail}`);
  }
  return [...result.value];
}

function contextOf<E extends IpcMainEvent | IpcMainInvokeEvent>(event: E): IpcContext<E> {
  return { event, sender: event.sender, window: BrowserWindow.fromWebContents(event.sender) };
}

/**
 * 按契约注册主进程处理函数, 返回注销函数
 *
 * @example
 * ```ts
 * const dispose = handleContract(api, {
 *   invoke: { 'user:get': (ctx, id) => db.find(id) },
 *   send: { 'app:log': (ctx, msg) => logger.info(ctx.window?.id, msg) },
 * })
 * ```
 */
export function handleContract<C extends Contract>(
  contract: C,
  handlers: ContractHandlers<C>,
  options: HandleOptions = {},
): () => void {
  const validateSender = options.validateSender ?? isMainFrame;
  const impls = handlers as {
    invoke?: Record<string, (...args: any[]) => unknown>;
    send?: Record<string, (...args: any[]) => unknown>;
  };
  const invokeNames = contract.channels.invoke;
  const sendNames = contract.channels.send;

  // 先整体检查再注册, 避免半途抛错留下注册了一半的通道
  for (const [kind, names] of [
    ['invoke', invokeNames],
    ['send', sendNames],
  ] as const) {
    for (const name of names) {
      if (typeof impls[kind]?.[name] !== 'function') {
        throw new TypeError(`[electron-ipc] 契约通道 ${kind}:${name} 未实现处理函数`);
      }
    }
  }

  const listeners = new Map<string, (event: IpcMainEvent, ...args: unknown[]) => void>();
  const handled: string[] = [];
  const dispose = (): void => {
    for (const name of handled) {
      ipcMain.removeHandler(name);
    }
    for (const [name, listener] of listeners) {
      ipcMain.removeListener(name, listener);
    }
    handled.length = 0;
    listeners.clear();
  };

  try {
    for (const name of invokeNames) {
      const def = findChannel(contract, 'invoke', name)!;
      const impl = impls.invoke![name];
      ipcMain.handle(name, async (event, ...args) => {
        if (!validateSender(event)) {
          throw new Error(`[electron-ipc] 拒绝来自不可信 frame 的调用: ${name}`);
        }
        return impl(contextOf(event), ...(await parseArgs(def, name, args)));
      });
      handled.push(name);
    }

    for (const name of sendNames) {
      const def = findChannel(contract, 'send', name)!;
      const impl = impls.send![name];
      const listener = (event: IpcMainEvent, ...args: unknown[]): void => {
        if (!validateSender(event)) {
          return;
        }
        // send 没有回执, 校验失败或处理函数出错只能在主进程记录
        parseArgs(def, name, args)
          .then((parsed) => impl(contextOf(event), ...parsed))
          .catch((error: unknown) => console.error(error));
      };
      ipcMain.on(name, listener);
      listeners.set(name, listener);
    }
  } catch (error) {
    // 例如通道已被别处 handle, 回滚已注册的部分
    dispose();
    throw error;
  }

  return dispose;
}

type EmitTarget = WebContents | { readonly webContents: WebContents };

type OnFns<C extends Contract> = ContractFns<C, 'on'>;

export interface ContractEmitter<C extends Contract> {
  /** 推送给单个窗口或 webContents, 已销毁时静默忽略 */
  emit<N extends keyof OnFns<C> & string>(
    target: EmitTarget,
    channel: N,
    ...args: Parameters<OnFns<C>[N]>
  ): void;
  /** 推送给全部未销毁的 webContents */
  broadcast<N extends keyof OnFns<C> & string>(channel: N, ...args: Parameters<OnFns<C>[N]>): void;
}

function sendTo(contents: WebContents, name: string, args: unknown[]): void {
  if (!contents.isDestroyed()) {
    contents.send(name, ...args);
  }
}

/**
 * 按契约向渲染层推送
 *
 * @example
 * ```ts
 * const emitter = createEmitter(api)
 * emitter.emit(win, 'download:progress', 0.5)
 * ```
 */
export function createEmitter<C extends Contract>(contract: C): ContractEmitter<C> {
  const assertChannel = (name: string): void => {
    if (!findChannel(contract, 'on', name)) {
      throw new TypeError(`[electron-ipc] 契约中不存在推送通道: ${name}`);
    }
  };

  return {
    emit(target, name, ...args) {
      assertChannel(name);
      sendTo('webContents' in target ? target.webContents : target, name, args);
    },
    broadcast(name, ...args) {
      assertChannel(name);
      for (const contents of webContents.getAllWebContents()) {
        sendTo(contents, name, args);
      }
    },
  };
}
