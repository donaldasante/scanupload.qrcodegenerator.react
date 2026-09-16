import { mount } from 'svelte';

// The Uppy Dashboard ships its own stylesheet. Without it the Dashboard renders
// as unstyled HTML — a native "browse files" button, a stray "Powered by Uppy"
// link, and content stacked at the top of a mostly empty box.
// Imported before the demo CSS so our overrides win.
import '@uppy/dashboard/css/style.min.css';
// When overriding styles, import the base CSS then your overrides.
import '@scanupload/qr-code-generator-svelte/dist/index.css';
import './index.css';
import './override.css';

import App from './App.svelte';

if (import.meta.env.PROD) {
    console.log = () => {};
}

const app = mount(App, { target: document.getElementById('app')! });

export default app;
