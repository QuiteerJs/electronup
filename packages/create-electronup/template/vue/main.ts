import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import Loading from './loading/index.vue'
import './styles/style.css'

createApp(Loading).mount('#app-loading')

console.log(import.meta.env)

setTimeout(() => {
  const app = createApp(App)
  app.use(createPinia())
    .mount('#app')
}, 2000)
