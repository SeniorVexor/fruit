export interface RunScriptOptions {
    scriptName: string;
    payload: Record<string, unknown>;
    setOutput: (chunk: string) => void;
    onError?: (error: string) => void;
    onComplete?: () => void;
}

// ✅ خواندن stream chunk-by-chunk
export const runScript = async (options: RunScriptOptions): Promise<void> => {
    const { scriptName, payload, setOutput, onError, onComplete } = options;

    try {
        const response = await fetch('/api/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptName, payload }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream not available');

        const decoder = new TextDecoder();

        // ✅ خواندن بدون await کل (realtime)
        const readStream = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        onComplete?.();
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });

                    // ✅ فوراً append می‌کنیم (بدون جمع‌کردن)
                    setOutput(chunk);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'خطا در خواندن stream';
                onError?.(errorMessage);
            }
        };

        // ✅ شروع خواندن (non-blocking)
        readStream();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطا در اجرای اسکریپت';
        onError?.(errorMessage);
        throw error;
    }
};

export async function killScript(scriptName: string): Promise<void> {
    const response = await fetch(`/api/kill-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.log('Kill script failed:', response.status, errorData);
    } else {
        console.log('✅ Kill script sent successfully');
    }
}