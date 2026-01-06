import Link from 'next/link';
import { ServerOff } from 'lucide-react';

export default function ServerErrorPage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <div className="mx-auto bg-gray-200 p-4 rounded-full mb-4">
                        <ServerOff className="w-16 h-16 text-gray-500" />
                    </div>

                    <h2 className="card-title justify-center text-2xl mb-2">
                        خطای سرور
                    </h2>

                    <p className="text-gray-500">
                        مشکلی در ارتباط با سرور پیش آمده است. لطفاً لحظه‌ای بعد تلاش کنید یا با پشتیبانی تماس بگیرید.
                    </p>

                    <div className="card-actions justify-center mt-6">
                        <Link href="/" className="btn btn-neutral w-full">
                            تلاش مجدد
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}