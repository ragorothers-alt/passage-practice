import { createApp } from 'vue'
import '@fontsource-variable/bodoni-moda/wght.css'
import './styles/base.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')

// 請瀏覽器不要在空間不足時自動清掉資料；被拒絕也不影響使用
void navigator.storage?.persist?.()
