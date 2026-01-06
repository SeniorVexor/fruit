import argparse
import json
import os  # <--- برای ایجاد پوشه اضافه شد

from fruitbot import Client
from fruitbot.exceptions import CardCoolingDown, CardCoolEnough, NotEnoughGold


class Drone:
    def __init__(self, restore_key):
        self.KEY = restore_key

        # 1. تعریف مسیر پوشه سشن (نسبت به روت پروژه)
        # چون spawn از روت اجرا می‌شود، باید دقیقا config/sessions بدهیم
        session_dir = 'config/sessions'

        # 2. ایجاد پوشه در صورت عدم وجود (خیلی مهم)
        if not os.path.exists(session_dir):
            os.makedirs(session_dir)

        # 3. تعیین مسیر کامل فایل سشن
        # کتابخانه fruitbot به صورت خودکار .fb به آخر آن اضافه می‌کند
        self.session = os.path.join(session_dir, self.KEY)

        print(f"📂 Session Path: {self.session}.fb")

        self.bot = Client(restore_key=self.KEY, session_name=self.session)
        self.bot.getConstants()
        self.LoadPlayer = self.bot.loadPlayer(True)

    def getShip(self, name: str = None):
        if name:
            print(f"🔍 Searching for: {name}")
            result = self.bot.searchTribes(str(name))

            # ارسال نتیجه به فرانت‌اند
            print("---RESULT_START---")
            print(json.dumps(result))
            print("---RESULT_END---")

            return result
        else:
            print("⭐ No search term provided.")
            return []

    def joinTribe(self, tribe_id: int):
        print(f"🚪 Joining Tribe ID: {tribe_id}")
        try:
            result = self.bot.joinTribe(tribe_id)

            # اگر کاربر قبلا عضو بوده یا این درخواست وجود داشته، تابع ممکن است خطا بدهد
            # اما اگر بدون خطا اجرا شد یعنی موفقیت
            print("---JOIN_RESULT---")
            print(json.dumps({"status": "success"}))
            print("---JOIN_END---")

        except Exception as e:
            error_msg = str(e).lower()

            status_code = "unknown_error"

            # تشخیص نوع خطا بر اساس متن پیام خطای کتابخانه
            if 'invalid restore key' in error_msg:
                status_code = "invalid_RestoreKey"
            elif 'undecided request' in error_msg:
                status_code = "undecided_request"
            elif 'already in tribe' in error_msg or 'already have a tribe' in error_msg:
                status_code = "already_in_tribe"
            elif 'not found' in error_msg:
                status_code = "tribe_not_found"
            elif 'request pending' in error_msg:
                status_code = "pending_request"

            print("---JOIN_RESULT---")
            # ارسال وضعیت خطا و متن اصلی خطا
            print(json.dumps({"status": status_code, "original_error": str(e)}))
            print("---JOIN_END---")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Bot script to search or join tribes")

    parser.add_argument('--key', type=str, required=True, help='Restore Key')

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--name', type=str, help='Name of the tribe to search for')
    group.add_argument('--join', type=int, help='ID of the tribe to join')

    args = parser.parse_args()

    drone = Drone(args.key)

    if args.name:
        drone.getShip(args.name)
    elif args.join:
        drone.joinTribe(args.join)