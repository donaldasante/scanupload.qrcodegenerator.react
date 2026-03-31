import SQG_STYLES from './index.css?inline';

export { SQG_STYLES };

let injected = false;

export function injectStyles(): void {
    if (injected) return;
    injected = true;
    const style = document.createElement('style');
    style.textContent = SQG_STYLES;
    document.head.appendChild(style);
}
