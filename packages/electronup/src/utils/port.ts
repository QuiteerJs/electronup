export const DEFAULT_PORT = 8090

/**
 * 解析 --port : 未传时为 8090 , 否则必须是 1 - 65535 的整数 , 非法值直接报错
 *
 * cac 会把纯数字解析为 number , 其余保持字符串 ( 如 'abc' 、'' ) ; 旧实现 `port || 8090` 会把 0 / 空串静默回退
 */
export function parsePort(value: number | string | boolean | undefined): number {
  if (value === undefined)
    {return DEFAULT_PORT}

  const text = String(value).trim()
  const port = Number(text)
  if (!/^\d+$/.test(text) || !Number.isInteger(port) || port < 1 || port > 65535)
    {throw new Error(`--port 需要 1 - 65535 之间的整数 , 收到 : ${JSON.stringify(value)}`)}

  return port
}
