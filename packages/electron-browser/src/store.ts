import { BrowserWindow } from 'electron'

export class WinStore<T extends string> {
  private wins: Map<T, number>

  constructor() {
    this.wins = new Map()
  }

  setWin(name: T, id: number) {
    this.wins.set(name, id)
  }

  getWin(name: T) {
    const id = this.wins.get(name)
    return id === undefined ? undefined : BrowserWindow.fromId(id)
  }

  getWinId(name: T) {
    return this.wins.get(name)
  }

  getWins() {
    return this.wins
  }

  removeWin(name: T) {
    this.wins.delete(name)
  }
}
