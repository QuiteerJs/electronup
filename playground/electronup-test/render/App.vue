<script setup lang="tsx">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { AtomSpinner, FlowerSpinner } from 'epic-spinners'
import HelloWorld from './components/HelloWorld.vue'

const Btn = () => <button>这是tsx渲染的按钮</button>
</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo">
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo">
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />

  <FlowerSpinner
    :animation-duration="2500"
    :size="70"
    color="#ff1d5e"
  />

  <AtomSpinner
    :animation-duration="1000"
    :size="60"
    color="#ff1d5e"
  />

  <Btn />
</template>

<style scoped>
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
