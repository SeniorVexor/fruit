import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function ScriptNotPermittedPage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <div className="mx-auto bg-error/10 p-4 rounded-full mb-4">
                        <ShieldX className="w-16 h-16 text-error" />
                    </div>

                    <h2 className="card-title justify-center text-2xl mb-2">
                        دسترسی به این اسکریپت ندارید
                    </h2>

                    <p className="text-gray-500">
                        مجوز استفاده از این اسکریپت در لایسنس شما تعریف نشده است.
                        برای خرید یا دریافت دسترسی، با ادمین تماس بگیرید.
                    </p>

                    <div className="card-actions justify-center mt-6 gap-2">
                        <Link href={`/auth/token/`} className="btn btn-outline">
                            بازگشت به پنل
                        </Link>
                        {/*<a href="https://t.me/admin" target="_blank" className="btn btn-primary">*/}
                        {/*    تماس با ادمین*/}
                        {/*</a>*/}
                    </div>
                </div>
            </div>
        </div>
    );
}