'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DashboardPage() {
    const params = useParams();
    const token = params.token as string;

    return (
        <div className="p-4">
            <h1>داشبورد</h1>
            <p>توکن شما: {token}</p>
            <Link href={`/auth/token/${token}/scripts/miner`}>رفتن به ماینر</Link>
        </div>
    );
}