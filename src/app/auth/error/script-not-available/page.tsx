import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function ScriptNotAvailablePage() {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body text-center">
                    <div className="mx-auto bg-warning/10 p-4 rounded-full mb-4">
                        <FileQuestion className="w-16 h-16 text-warning" />
                    </div>

                    <h2 className="card-title justify-center text-2xl mb-2">
                        اسکریپت در دسترس نیست
                    </h2>

                    <p className="text-gray-500">
                        این اسکریپت در حال حاضر فعال نمی‌باشد. ممکن است در حال به‌روزرسانی باشد یا نیاز به اشتراک خاصی داشته باشد.
                    </p>

                    <div className="card-actions justify-center mt-6">
                        <Link href="/auth/token/" className="btn btn-primary w-full">
                            بازگشت به خانه
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}