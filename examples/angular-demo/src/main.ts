import 'zone.js';
// Load the Angular JIT compiler: the Vite dev server transpiles components
// without ahead-of-time compilation, so the runtime compiler is required.
// (Production `vite build` uses AOT via @angular/build and does not need this.)
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';

// When overriding styles, import the base CSS then your overrides.
import '@scanupload/qr-code-generator-angular/dist/index.css';
import './index.css';
import './override.css';

import { AppComponent } from './app.component';

if (import.meta.env.PROD) {
    console.log = () => {};
}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
