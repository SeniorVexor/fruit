'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function IpLogger() {
    const pathname = usePathname();

    useEffect(() => {
        // استخراج توکن از آدرس: /auth/token/[token]/...
        const match = pathname.match(/^\/auth\/token\/([^/]+)/);
        const token = match ? match[1] : null;

        if (token) {
            fetch('/api/log-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            }).catch(console.error); // خطا رو نادیده می‌گیریم، لاگ رو خراب نمی‌کنه
        }
    }, [pathname]);

    return null; // این کامپوننت چیزی نمایش نمی‌ده
}
