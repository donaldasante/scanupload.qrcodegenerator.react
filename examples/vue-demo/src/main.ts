import { createApp } from 'vue';

if (import.meta.env.PROD) {
    console.log = () => {};
}

// When overriding styles, import the base CSS then your overrides,
import '@scanupload/qr-code-generator-vue/dist/index.css';
import './index.css';
import './override.css';
import App from './App.vue';

createApp(App).mount('#app');
