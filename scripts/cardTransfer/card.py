from fruitbot import Client
import json,os


key="keep10286increase10"
session = f'../../config/sessions/{key}'
print(session)
bot = Client(restore_key=key,session_name=session)
bot.getConstants()
data = bot.loadPlayer(True)


bot.stopUpdates()

output_file = 'player_data.json'
try:
    card = data["cards"]
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(card, f, ensure_ascii=False, indent=2)

    print(f"\033[92m✓ داده‌ها با موفقیت ذخیره شدند:\033[0m {os.path.abspath(output_file)}")
    print(f"\033[94m  تعداد کارت‌ها:\033[0m {len(data.get('cards', []))}")
    print(f"\033[94m  نام بازیکن:\033[0m {data.get('profile', {}).get('name', 'N/A')}")

except Exception as e:
    print(f"\033[91m✗ خطا در ذخیره فایل:\033[0m {str(e)}")