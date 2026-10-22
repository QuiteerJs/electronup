import { describe, expect, it } from 'vitest'
import { DEFAULT_PORT, parsePort } from './port'

describe('parsePort', () => {
  it('未传时使用默认端口', () => {
    expect(parsePort(undefined)).toBe(DEFAULT_PORT)
  })

  it('合法端口 ( number 或数字字符串 )', () => {
    expect(parsePort(3000)).toBe(3000)
    expect(parsePort('8080')).toBe(8080)
    expect(parsePort(1)).toBe(1)
    expect(parsePort(65535)).toBe(65535)
  })

  it.each(['abc', 0, '', ' ', -1, 65536, 80.5, '80.5', '1e3', true])('非法值报错 : %j', (value) => {
    expect(() => parsePort(value)).toThrow('--port 需要 1 - 65535 之间的整数')
  })
})
