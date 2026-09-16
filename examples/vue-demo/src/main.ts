import { createApp } from 'vue';

if (import.meta.env.PROD) {
    console.log = () => {};
}

// The Uppy Dashboard ships its own stylesheet. Without it the Dashboard renders
// as unstyled HTML — a native "browse files" button, a stray "Powered by Uppy"
// link, and content stacked at the top of a mostly empty box.
// Imported before the demo CSS so our overrides win.
import '@uppy/dashboard/css/style.min.css';
// When overriding styles, import the base CSS then your overrides,
import '@scanupload/qr-code-generator-vue/dist/index.css';
import './index.css';
import './override.css';
import App from './App.vue';

createApp(App).mount('#app');
