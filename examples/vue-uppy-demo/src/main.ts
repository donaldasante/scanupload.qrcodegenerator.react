import { createApp } from 'vue';

// Uppy ships its own stylesheets; the Dashboard styles bundle the StatusBar and
// Informer styles with them, so those are not imported separately.
import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

// ScanUpload widget styles. Import before `./index.css` so the demo's layout
// rules win over the package defaults.
import '@scanupload/qr-code-generator-vue/dist/index.css';
import './index.css';

import App from './App.vue';

createApp(App).mount('#app');
