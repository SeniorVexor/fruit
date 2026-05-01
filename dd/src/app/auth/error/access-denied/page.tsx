import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <ShieldAlert className="w-16 h-16 text-error mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">دسترسی غیرمجاز</h2>
                    <p className="text-gray-500">شما اجازه دسترسی به این صفحه را ندارید.</p>
                    <Link href="/auth/token" className="btn btn-primary mt-4">بازگشت به خانه</Link>
                </div>
            </div>
        </div>
    );
}