import Link from 'next/link';
import { Crown, AlertCircle } from 'lucide-react';

export default function NoSubscriptionPage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <div className="mx-auto bg-warning/10 p-4 rounded-full mb-4">
                        <Crown className="w-16 h-16 text-warning" />
                    </div>

                    <h2 className="card-title justify-center text-2xl mb-2">
                        اشتراک فعال ندارید
                    </h2>

                    <div className="alert alert-warning bg-warning/10 text-warning">
                        <AlertCircle size={16} />
                        <span>مدت زمان استفاده از ربات شما به پایان رسیده است.</span>
                    </div>

                    <p className="text-gray-500 mt-4">
                        برای ادامه استفاده از خدمات پنل، لطفاً اشتراک خود را تمدید کنید.
                    </p>

                    <div className="card-actions justify-center mt-6 gap-2">
                        <Link href="/" className="btn btn-ghost">
                            بازگشت
                        </Link>
                        {/* لینک به صفحه خرید یا تمدید */}
                        <a
                            href="https://t.me/your_bot"
                            target="_blank"
                            className="btn btn-primary"
                        >
                            تمدید اشتراک
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}