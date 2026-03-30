export function isNullOrEmpty(value: string | null | undefined): boolean {
    return !value || value.trim().length === 0;
}

export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func(...args);
        }, delay);
    };
}

export function debounceAsync<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult> | TResult, delay: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (...args: TArgs): Promise<TResult> => {
        return new Promise((resolve, reject) => {
            if (timer) clearTimeout(timer);

            timer = setTimeout(() => {
                Promise.resolve(fn(...args))
                    .then(resolve)
                    .catch(reject);
            }, delay);
        });
    };
}

export function isExpired(token: string | null, bufferSeconds = 30): boolean {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        if (!exp) return true;
        const now = Date.now() / 1000;
        return now >= exp - bufferSeconds;
    } catch {
        return true;
    }
}

export function truncateWithDots(text: string, maxLength = 30) {
    if (typeof text !== 'string') return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}
