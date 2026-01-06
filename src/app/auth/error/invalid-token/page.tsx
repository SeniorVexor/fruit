import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function InvalidTokenPage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <div className="mx-auto bg-error/10 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-16 h-16 text-error" />
                    </div>

                    <h2 className="card-title justify-center text-2xl mb-2">
                        توکن نامعتبر است
                    </h2>

                    <p className="text-gray-500">
                        لینک یا توکنی که وارد کرده‌اید معتبر نیست یا منقضی شده است. لطفاً دوباره تلاش کنید.
                    </p>

                    <div className="card-actions justify-center mt-6 gap-2">
                        <Link href="/" className="btn btn-ghost">
                            بازگشت به خانه
                        </Link>
                        <Link href="/auth/login" className="btn btn-error">
                            ورود مجدد
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}