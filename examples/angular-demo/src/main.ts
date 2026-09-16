import 'zone.js';
// Load the Angular JIT compiler: this app has no ahead-of-time plugin, so the
// components are compiled in the browser by the runtime compiler. That applies
// to `vite build` as well as `vite dev` — `@angular/compiler` declares itself
// side-effect free, so the production bundle only keeps it because
// `vite.config.js` marks that module as side-effectful. Without it, bootstrap
// fails with "JIT compiler unavailable".
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';

// The Uppy Dashboard ships its own stylesheet. Without it the Dashboard renders
// as unstyled HTML — a native "browse files" button, a stray "Powered by Uppy"
// link, and content stacked at the top of a mostly empty box.
// Imported before the demo CSS so our overrides win.
import '@uppy/dashboard/css/style.min.css';
// When overriding styles, import the base CSS then your overrides.
import '@scanupload/qr-code-generator-angular/dist/index.css';
import './index.css';
import './override.css';

import { AppComponent } from './app.component';

if (import.meta.env.PROD) {
    console.log = () => {};
}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
