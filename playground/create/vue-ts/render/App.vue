<script setup lang="ts">
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web'

const changeWin = (keys: IpcWindowOptions) => {
  window.$ipc.send(EventKeys.WindowOptionsKey, keys)
}

const btns = [{
  label: '窗口最大化',
  key: IpcWindowOptions.MAXIMIZE
}, {
  label: '取消窗口最大化',
  key: IpcWindowOptions.UNMAXIMIZE
}, {
  label: '窗口最小化',
  key: IpcWindowOptions.MINIMIZE
}, {
  label: '窗口恢复',
  key: IpcWindowOptions.RESTORE
}, {
  label: '窗口刷新',
  key: IpcWindowOptions.RELOAD
}, {
  label: '窗口失去焦点',
  key: IpcWindowOptions.BLUR
}, {
  label: '销毁窗口',
  key: IpcWindowOptions.DESTROY
}]
</script>

<template>
  <div>
    <img class="avatar" src="/avatar.png">
  </div>
  <button v-for="item in btns" :key="item.key" @click="changeWin(item.key)">
    {{ item.label }}
  </button>
</template>

<style scoped lang="scss">
.avatar {
  --s: 280px;
  --b: 5px;
  --bgColor: #ecd078;
  --borderColor: #c02942;
  --f: 1;
  --_g: 50% / calc(100% / var(--f)) 100% no-repeat content-box;
  --_o: calc((1 / var(--f) - 1) * var(--s) / 2 - var(--b));
  width: var(--s);
  height: var(--s);
  margin-bottom: 30px;
  cursor: pointer;
  padding-top: calc(var(--s) / 5);
  outline: var(--b) solid var(--borderColor);
  outline-offset: var(--_o);
  border-radius: 0 0 500px 500px;
  transition: 0.5s;
  transform: scale(var(--f));
  background:
    radial-gradient(circle closest-side,
      var(--bgColor) calc(99% - var(--b)),
      var(--borderColor) calc(100% - var(--b)),
      var(--borderColor) 99%,
      #0000 100%) var(--_g);

  -webkit-mask: linear-gradient(#000 0 0) no-repeat 50% calc(1px - var(--_o)) / calc(100% / var(--f) - 2 * var(--b) - 2px) 50%,
    radial-gradient(circle closest-side, #000 99%, #0000) var(--_g);

}

.avatar:hover {
  --f: 1.35;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
