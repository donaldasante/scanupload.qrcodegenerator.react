import { mount } from 'svelte';

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
