export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public response?: any
    ) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = 'ApiError';
    }
}

export async function postData<T = any>(
    url: string,
    data?: Record<string, any> | any[] | null,
    options?: {
        headers?: Record<string, string>;
        signal?: AbortSignal;
        timeout?: number;
    }
): Promise<T> {
    const controller = new AbortController();
    const signal = controller.signal;

    if (options?.timeout) {
        setTimeout(() => controller.abort(), options.timeout);
    }

    const finalSignal = options?.signal || signal;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            },
            body: data ? JSON.stringify(data) : undefined,
            signal: finalSignal
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = await response.text();
            }

            throw new ApiError(response.status, response.statusText, errorData);
        }

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            return (await response.json()) as T;
        }

        return (await response.text()) as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        if (error instanceof ApiError) {
            console.error('API Error:', error.status, error.message);
            throw error;
        }
        if (error instanceof Error) {
            console.error('Network error:', error.message);
            throw new Error('Network error occurred');
        }
        throw new Error('Unknown error occurred');
    }
}

export async function deleteData(
    url: string,
    options?: {
        headers?: Record<string, string>;
        signal?: AbortSignal;
        timeout?: number;
    }
): Promise<void> {
    const controller = new AbortController();
    const signal = controller.signal;

    if (options?.timeout) {
        setTimeout(() => controller.abort(), options.timeout);
    }

    const finalSignal = options?.signal || signal;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            },
            signal: finalSignal
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = await response.text();
            }

            throw new ApiError(response.status, response.statusText, errorData);
        }
        return;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        if (error instanceof ApiError) {
            console.error('API Error:', error.status, error.message);
            throw error;
        } else {
            console.error('Network error:', error);
            throw new Error('Network error occurred');
        }
    }
}
