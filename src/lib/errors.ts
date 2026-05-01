export const errorMessages: Record<string, string> = {
    // Validation
    'VAL_001': 'فیلدهای ضروری وارد نشده‌اند (فروشنده/خریدار/هدف)',
    'VAL_002': 'حالت انتقال نامعتبر است (base_id یا single_id)',
    'VAL_003': 'تعداد کارت باید حداقل ۱ باشد',

    // Availability
    'AVL_001': 'کارتی با این مشخصات یافت نشد',

    // System
    'SYS_001': 'خطای اتصال به سرور',
    'SYS_002': 'خطای پردازش پاسخ سرور',
    'SYS_003': 'یک نشست دیگر در حال استفاده از این اکانت است. لطفاً کمی صبر کنید یا نشست قبلی را ببندید',
    'SYS_004': 'شما اجازه دسترسی به این منبع را ندارید (Access Denied)',
    'SYS_005': 'خطای غیرمنتظره رخ داد. لطفاً با پشتیبانی تماس بگیرید',
    '': '',

    // Transfer
    'TRF_001': 'خطای فرآیند انتقال کارت',
};

export function getErrorMessage(code: string | null | undefined): string {
    if (!code) return 'خطای نامشخص';
    return errorMessages[code] || `خطای ناشناخته (${code})`;
}

// اختیاری: بر اساس کد رنگ متفاوت بده
export function getErrorColor(code: string): string {
    if (code.startsWith('VAL_')) return 'text-yellow-600 bg-yellow-50';
    if (code.startsWith('AVL_')) return 'text-orange-600 bg-orange-50';
    if (code.startsWith('SYS_')) return 'text-red-600 bg-red-50';
    if (code.startsWith('TRF_')) return 'text-red-700 bg-red-100';
    return 'text-gray-600';
}
