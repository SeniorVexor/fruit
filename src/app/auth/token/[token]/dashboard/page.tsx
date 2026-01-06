import Link from 'next/link';
import { Bot, ChevronLeft } from 'lucide-react';

export default function DashboardPage() {
    return (
        <div className="ovh min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-2xl w-full">
                <div className="card-body">
                    <Link href="/" className="flex items-center gap-2 text-sm text-base-content/70 hover:text-base-content mb-4">
                        <ChevronLeft className="w-4 h-4" />
                        بازگشت به صفحه اصلی
                    </Link>

                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Bot className="w-10 h-10 text-primary" />
                        <h1 className="text-3xl font-bold">پنل اسکریپت‌ها</h1>
                    </div>

                    <div className="alert alert-info mb-6">
                        <p className="text-sm">لطفاً یک اسکریپت را برای اجرا انتخاب کنید. برای استفاده از اسکریپت‌ها باید اشتراک فعال داشته باشید.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/dashboard/angor" className="card bg-base-200 hover:bg-base-300 transition-all hover:shadow-lg">
                            <div className="card-body items-center text-center">
                                <h3 className="card-title text-lg">🔧 اسکریپت Angor</h3>
                                <p className="text-sm text-base-content/70 mt-2">اسکریپت اصلی پردازش داده‌ها</p>
                                <div className="badge badge-primary mt-3">فعال</div>
                            </div>
                        </Link>

                        <Link href="/dashboard/another" className="card bg-base-200 hover:bg-base-300 transition-all hover:shadow-lg">
                            <div className="card-body items-center text-center">
                                <h3 className="card-title text-lg">📊 اسکریپت Another</h3>
                                <p className="text-sm text-base-content/70 mt-2">اسکریپت تحلیل پیشرفته</p>
                                <div className="badge badge-secondary mt-3">فعال</div>
                            </div>
                        </Link>
                    </div>

                    <div className="mt-6 pt-4 border-t border-base-300">
                        <div className="flex items-center justify-between text-sm text-base-content/60">
                            <span>وضعیت: متصل به سیستم</span>
                            <span>آخرین بروزرسانی: {new Date().toLocaleDateString('fa-IR')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}