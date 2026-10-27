/**
 * IPC 契约: 一处定义, 主进程 handler / 渲染层 client / preload 通道白名单都从这里推导
 *
 * 本文件不依赖 electron / node, 主进程、预加载、渲染层都可以直接引用
 */

import { EventKeys } from './eventKeys';

/**
 * Standard Schema v1 的最小类型, 兼容 zod / valibot / arktype 等
 *
 * 按规范直接内联, 不引入依赖
 * @see https://standardschema.dev
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}

// 与上方 interface 做声明合并, 承载规范里的辅助类型
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace StandardSchemaV1 {
  type Result<Output> =
    | { readonly value: Output; readonly issues?: undefined }
    | { readonly issues: ReadonlyArray<Issue> };

  interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
  }
}

type AnyFn = (...args: any[]) => any;

/** 单个通道的定义, `F` 只承载类型, 运行时只有可选的参数校验 */
export interface ChannelDef<F extends AnyFn = AnyFn> {
  /** 参数元组的校验 schema, 只在主进程边界执行 */
  readonly args?: StandardSchemaV1<unknown, readonly unknown[]>;
  /** 类型占位, 运行时恒为 undefined */
  readonly '~fn'?: F;
}

export interface ChannelOptions<F extends AnyFn> {
  /**
   * 参数元组的校验 schema, 例如 `z.tuple([z.string()])`
   *
   * 主进程收到调用时先校验, 失败则 invoke 以错误拒绝、send 直接丢弃, handler 拿到的是校验后的值
   */
  args?: StandardSchemaV1<unknown, Parameters<F>>;
}

/**
 * 声明一个通道, 用函数签名描述参数与返回值
 *
 * @example
 * ```ts
 * channel<(id: string) => User>()
 * channel<(id: string) => User>({ args: z.tuple([z.string()]) })
 * ```
 */
export function channel<F extends AnyFn>(options: ChannelOptions<F> = {}): ChannelDef<F> {
  return Object.freeze(options.args ? { args: options.args } : {}) as ChannelDef<F>;
}

type ChannelGroup = Record<string, ChannelDef>;

/** 三组通道均以渲染层视角命名, 与 preload 白名单的 `send / invoke / on` 一一对应 */
export interface ContractSpec {
  /** 渲染层 → 主进程, 有返回值 */
  invoke?: ChannelGroup;
  /** 渲染层 → 主进程, 单向 */
  send?: ChannelGroup;
  /** 主进程 → 渲染层推送 */
  on?: ChannelGroup;
}

/** preload 通道白名单 */
export interface ContractChannels {
  readonly send: readonly string[];
  readonly invoke: readonly string[];
  readonly on: readonly string[];
}

type Normalize<G> = G extends ChannelGroup ? G : Record<never, ChannelDef>;

export interface Contract<S extends ContractSpec = ContractSpec> {
  readonly invoke: Normalize<S['invoke']>;
  readonly send: Normalize<S['send']>;
  readonly on: Normalize<S['on']>;
  /** 从契约推导出的通道白名单, 直接交给 preload */
  readonly channels: ContractChannels;
}

export type ChannelKind = 'invoke' | 'send' | 'on';

/** 取出某组通道的函数签名表 */
export type ContractFns<C extends Contract, K extends ChannelKind> = {
  [N in keyof C[K] & string]: C[K][N] extends ChannelDef<infer F> ? F : never;
};

const KINDS: readonly ChannelKind[] = ['invoke', 'send', 'on'];

/**
 * 定义 IPC 契约
 *
 * @example
 * ```ts
 * // shared/ipc.ts
 * export const api = defineContract({
 *   invoke: { 'user:get': channel<(id: string) => User>() },
 *   send: { 'app:log': channel<(msg: string) => void>() },
 *   on: { 'download:progress': channel<(percent: number) => void>() },
 * })
 * ```
 */
export function defineContract<const S extends ContractSpec>(spec: S): Contract<S> {
  const groups = {} as Record<ChannelKind, ChannelGroup>;
  const channels = {} as Record<ChannelKind, readonly string[]>;
  for (const kind of KINDS) {
    const group = spec[kind] ?? {};
    for (const name of Object.keys(group)) {
      if (name.length === 0) {
        throw new TypeError(`[electron-ipc] ${kind} 中存在空通道名`);
      }
    }
    groups[kind] = Object.freeze({ ...group });
    channels[kind] = Object.freeze(Object.keys(group));
  }
  return Object.freeze({
    ...groups,
    channels: Object.freeze(channels),
  }) as unknown as Contract<S>;
}

/** 合并多个契约 (或现成的白名单) 的通道, 去重后交给 preload */
export function channelsOf(
  ...sources: ReadonlyArray<Contract | ContractChannels>
): ContractChannels {
  const merged = {} as Record<ChannelKind, readonly string[]>;
  for (const kind of KINDS) {
    const names = sources.flatMap(
      (source) => ('channels' in source ? source.channels : source)[kind],
    );
    merged[kind] = Object.freeze([...new Set(names)]);
  }
  return Object.freeze(merged);
}

/** 只认自有键, 防止 `toString` / `__proto__` 之类命中原型链 */
export function findChannel(
  contract: Contract,
  kind: ChannelKind,
  name: unknown,
): ChannelDef | undefined {
  const group: ChannelGroup = contract[kind];
  return typeof name === 'string' && Object.hasOwn(group, name) ? group[name] : undefined;
}

/** 本包内置通道 (`Ipc.init()` 注册) 的白名单, 用 `channelsOf(api, builtinChannels)` 一并放行 */
export const builtinChannels: ContractChannels = Object.freeze({
  send: Object.freeze([EventKeys.WindowOptionsKey]),
  invoke: Object.freeze([EventKeys.FileOptionsKey]),
  on: Object.freeze([]),
});
