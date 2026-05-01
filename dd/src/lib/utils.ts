export function formatCompactNumber(num: number, maxDecimals: number = 0, locale: string = 'fa'): string {
    if (!isFinite(num)) return 'نامشخص';
    if (num === 0) return '۰';

    const abs = Math.abs(num);

    if (abs >= 1_000_000_000) {
        // میلیارد
        return (num / 1_000_000_000).toFixed(maxDecimals) + 'b';
    }

    if (abs >= 1_000_000) {
        // میلیون
        return (num / 1_000_000).toFixed(maxDecimals) + 'm';
    }

    if (abs >= 1_000) {
        // هزار
        return (num / 1_000).toFixed(maxDecimals) + 'k';
    }

    return num.toLocaleString(locale);
}