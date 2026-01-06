import time, random
from fruitbot import Client
from fruitbot.network import Socket

def switch_delay():
    time.sleep(random.uniform(0.5, 1.0))

def normalize_speed(user_speed: float) -> float:
    base = float(user_speed)
    return round(random.uniform(base, base + 0.05), 3)

fruit_socket = Socket()


class Color:
    RESET = "\033[0m"
    WHITE = "\033[97m"

    TIME = "\033[96m"  
    OK = "\033[92m"  

    SEP = "\033[90m"  
    USER = "\033[38;5;39m"  

    DOON = "\033[38;5;82m"  
    XP = "\033[94m"  

    GOLD = "\033[38;5;220m"  
    GOLD_ADD = "\033[38;5;120m"  

    LEVEL = "\033[95m"  
    RANK = "\033[91m"
from fruitbot.crypto import Encryption
enc = Encryption(version=2)
import sqlite3
from time import sleep
import sys
import random
from colorama import Fore as color
import requests
import base64
import json
import string
import os
import hashlib
import ast
import io
from colorama import init, Style
import time
import uuid
import contextlib
SITE_USER = None  # global site username for captcha web flow
# (disabled) from tkinter import Tk, Label, Entry, Button
# (disabled) from PIL import Image, ImageTk

_silence = io.StringIO()
with contextlib.redirect_stdout(_silence), contextlib.redirect_stderr(_silence):
    from fruitbot import Client
    from fruitbot.network import Socket

fruit_socket = Socket()


import argparse, json, sys

parser = argparse.ArgumentParser(description="FruitCraft auto script")
parser.add_argument("--config", required=True,
                    help="JSON string containing config keys")
args = parser.parse_args()

try:
    cfg = json.loads(args.config)        # تبدیل JSON به دیکشنری
except Exception as e:
    print("Invalid JSON passed to --config:", e, file=sys.stderr)
    sys.exit(1)

# ------------------ مقداردهی متغیرها از cfg ------------------
FC = cfg.get("restore_key")              # ← همان کدی که قبلاً input می‌گرفت
if not FC:
    print("restore_key is missing inside --config JSON", file=sys.stderr)
    sys.exit(1)

# اگر مقادیر دیگری هم لازم دارید (مثلاً speed یا at_ac) از cfg بخوانید:
SPEED_BASE = float(cfg.get("speed", 1.0))
at_ac      = int(cfg.get("attacks", 7))
don_h      = cfg.get("doon_mode", "+")



def fancy_print(*args, sep=' ', end='\n', level='i'):
    """
    level: i | w | e | s
    """
    styles = {
        'i': {'color': color.CYAN, 'symbol': '[+]'},
        'w': {'color': color.YELLOW, 'symbol': '[!]'},
        'e': {'color': color.RED, 'symbol': '[×]'},
        's': {'color': color.GREEN, 'symbol': '[✓]'},
    }
    style = styles.get(level.lower(), styles['i'])
    timestamp = time.strftime("[%H:%M:%S]")
    prefix = f"{color.LIGHTBLACK_EX}{timestamp} {style['color']}{style['symbol']}{Style.RESET_ALL}"
    message = sep.join(str(arg) for arg in args)
    formatted_message = f"{Style.BRIGHT}{style['color']}{message}{Style.RESET_ALL}"
    print(f"{prefix} {formatted_message}", end=end)

def get_random_speed():
    global SPEED_BASE
    base = float(SPEED_BASE)
    return random.uniform(base, base + 0.05)

class Card:
    def __init__(self, card: dict):
        self.id = card.get('id')
        self.last_used_at = card.get('last_used_at')
        self.power = int(card.get('power')) if card.get('power') != None else None
        self.base_card_id = int(card.get('base_card_id')) if card.get('base_card_id') != None else None
        self.player_id = int(card.get('player_id')) if card.get('player_id') != None else None

    def __repr__(self):
        return f'<Card id={self.id}, power={self.power}, base_card_id={self.base_card_id}>'

    def __eq__(self, other):
        if isinstance(other, Card):
            return other.id == self.id


class Opponent:
    def __init__(self, opponent_data: dict):
        self.id = int(opponent_data.get('id'))
        self.name = self.decode_unicode(opponent_data.get('name')) if r'\u' in opponent_data.get(
            'name') else opponent_data.get('name')
        self.rank = int(opponent_data.get('rank')) if opponent_data.get('rank') != None else None
        self.xp = int(opponent_data.get('xp')) if opponent_data.get('xp') != None else None
        self.gold = int(opponent_data.get('gold')) if opponent_data.get('gold') != None else None
        self.tribe_permission = int(opponent_data.get('tribe_permission')) if opponent_data.get(
            'tribe_permission') != None else None
        self.level = int(opponent_data.get('level')) if opponent_data.get('level') != None else None
        self.def_power = int(opponent_data.get('def_power')) if opponent_data.get('def_power') != None else None
        self.status = bool(int(opponent_data.get('status'))) if opponent_data.get('status') != None else None
        self.league_id = int(opponent_data.get('league_id')) if opponent_data.get('league_id') != None else None
        self.league_rank = int(opponent_data.get('league_rank')) if opponent_data.get('league_rank') != None else None
        self.avatar_id = int(opponent_data.get('avatar_id')) if opponent_data.get('avatar_id') != None else None
        self.power_ratio = int(opponent_data.get('power_ratio')) if opponent_data.get('power_ratio') != None else None
        self.tribe_name = self.decode_unicode(opponent_data.get('tribe_name')) if opponent_data.get(
            'tribe_name') != None else None
        self.original = opponent_data

    def decode_unicode(self, s: str):
        try:
            decoded = bytes(s, "utf-8").decode("unicode_escape")
        except Exception:
            decoded = s
        return decoded.encode("utf-8", "ignore").decode("utf-8")

    def __repr__(self):
        return f'<Opponent id={self.id} name={self.name}>'

    def __eq__(self, other):
        if isinstance(other, Opponent):
            return self.id == other.id
        return False


class FruitCraft:
    def __init__(self):
        print(f"-----------------Creator : {color.LIGHTMAGENTA_EX}@Danial_dark22{color.RESET}-----------------")
        try:
            self.cookies_i2pdf = requests.get('https://www.i2pdf.com/fa/pdf-ocr', timeout=20).cookies.get_dict()
        except:
            fancy_print('internet Error', level='e')
            sys.exit()
        self.bs64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        self.host = 'http://fruit2.ariahamrah.ir:80'
        self.debug = True
        self.timeout = 10
        self.capacity = {'1': '200', '2': '1000', '3': '3000', '4': '10000', '5': '40000', '6': '100000', '7': '300000',
                         '8': '500000'}
        try:
            login_info = ast.literal_eval(open('./fruit.scriptHTTP', 'r').read())
            fc = login_info['fc']
            fancy_print(
                f'You are loggined. Do you want open it({color.LIGHTMAGENTA_EX}{fc[0:len(fc) // 2]}{(len(fc) - (len(fc) // 2)) * "*"}{color.CYAN})({color.GREEN}y{color.CYAN} or {color.RED}n{color.CYAN}) : ',
                end='')
            is_log = input()
            if is_log in ['y', 'Y', 'n', 'N']:
                if is_log in ['y', 'Y']:
                    pass
                elif is_log in ['n', 'N']:
                    open('./fruit.scriptHTTP', 'w').write('')
                    fancy_print("You are logout!", level='e')
                    raise FileNotFoundError
            else:
                fancy_print("invalid input!", level='e')
                sys.exit()
        except (FileNotFoundError, SyntaxError):
            data = self.login()
            login_info = data['login_data']
            login_info['fc'] = data['fc']
            self.load_data = data['load_data']
            open('./fruit.scriptHTTP', 'w').write(str(login_info))
        self.fruitPassport = login_info['FRUITPASSPORT']
        self.os_version = login_info['os_version']
        self.model = login_info['model']
        self.udid = login_info['udid']
        self.build = login_info['build']
        self.fc = login_info['fc']
        fruit_socket.user_id = login_info['id']
        self.header = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Cookie": f"FRUITPASSPORT={self.fruitPassport};",
            "User-Agent": f"Dalvik/2.1.0 (Linux; U; Android {self.os_version}; {self.model} Build/{self.build})",
            "Host": "iran.fruitcraft.ir",
            "Connection": "Keep-Alive",
            "Accept-Encoding": "gzip",        }

        if not hasattr(self, 'load_data'):
            self.load_data = self.load_player(self.fc)[0]
        fancy_print('Step[1] -> successful', level='s', end='\r')
        self.em = self.error_message()
        fancy_print('Step[2] -> successful', level='s', end='\r')
        self.cd = self.constants_device()
        fancy_print('Step[3] -> successful', level='s', end='\r')
        self.language_patch()
        fancy_print('Step[4] -> successful', level='s', end='\r')
        self.card_image = self.fruits_jsonex_port()
        fancy_print('Step[5] -> successful', level='s', end='\r')
        self.card_baseid = self.cards_jsonex_port()
        fancy_print('Step[6] -> successful', level='s', end='\r')
        self.player_comeback()
        fancy_print('Step[7] -> successful', level='s', end='\r')
        fancy_print(f'Successful login ---> Hello {self.decode_unicode(self.load_data["name"])}', level = 's')
        if self.load_data['needs_captcha']:
            self.captcha()

    def request(self, url: str, data: str, db: bool = None) -> dict | requests.Response:
        if db == None:
            debug = self.debug
        else:
            debug = db
        req_data = 'edata=' + enc.encrypt(data) + "&version=2"
        # print("req:", url, data)
        while True:
            try:
                response = requests.post(url=self.host + url, data=req_data, headers=self.header, timeout=self.timeout)
                if response.status_code == 429:
                    fancy_print("error 429, wait 7s", level="e")
                    sleep(7)
                # print("resp:", enc.decrypt(response.text))
                return_data = json.loads(enc.decrypt(response.text))
                if not return_data.get('status', False):
                    code = int(return_data.get('data', {}).get('code', -1))
                    # Allow caller to handle q-expired / session-refresh codes.
                    if code in (124, 33):
                        return return_data
                    return self.error_code(code, return_data.get('data', {}).get('arguments'))
                return return_data
            except (requests.ReadTimeout, requests.ConnectTimeout, requests.ConnectionError):
                for j in range(1, 6):
                    fancy_print(f'Internet error. Please wait -->{j}s/5s', end='\r', level='w')
                    sleep(1)
                print()
            except (json.JSONDecodeError, base64.binascii.Error, json.decoder.JSONDecodeError, UnicodeEncodeError):
                if debug == False:
                    return response.text
                else:
                    return response
            except json.decoder.JSONDecodeError:
                if debug == False:
                    return response.text
                else:
                    fancy_print('Server returned non-JSON response (hidden).', level='e')
                    fancy_print("This is an error. If you don't want debug output, set debug=False.", level='e')
                    sys.exit()

    def mamoriat(self, card: Card, q):
        data = f'{"cards":"{card.id}","check":"{hashlib.md5(str(q).encode()).hexdigest()}"}'
        return self.request('/battle/quest', data)

    def drop_opponents(self):
        data_opponents = self.request('/battle/getopponents', '{"client":"iOS"}')
        if type(data_opponents) != dict:
            if type(data_opponents) == requests.Response:
                try:
                    data_opponents = json.loads(self.decode_unicode(enc.decrypt(data_opponents.text.replace(r'\/', ''))))
                except ValueError:
                    data_opponents = ast.literal_eval(
                        self.decode_unicode(enc.decrypt(data_opponents.text.replace(r'\/', ''))))
            else:
                return data_opponents
        drop_list = list()
        for opponent in data_opponents['data']['players']:
            drop_list.append(Opponent(opponent_data=opponent))
        return drop_list

    def nabard(self, opponent_id, q, cards: list[Card], hero_id=None):

        if hero_id:
            data = '{"opponent_id":%i,"check":"%s","cards":"%s","attacks_in_today":0,"hero_id":%s}' % (
            opponent_id, hashlib.md5(str(q).encode()).hexdigest(), str([card.id for card in cards]), hero_id)
            data['hero_id'] = hero_id
        else:
            data = '{"opponent_id":%i,"check":"%s","cards":"%s","attacks_in_today":0}' % (
            opponent_id, hashlib.md5(str(q).encode()).hexdigest(), str([card.id for card in cards]))
        return self.request('/battle/battle', data=data)

    def image_to_text_i2pdf(self, image_data):
        image_width = 244
        image_height = 90
        page_width = 612
        page_height = 792

        x_position = (page_width - image_width) / 2
        y_position = (page_height - image_height) / 2
        image_bytes = image_data.getvalue()
        pdf_parts = []
        pdf_parts.append(b"%PDF-1.4\n")
        pdf_parts.append(b"1 0 obj\n")
        pdf_parts.append(b"<< /Type /Catalog /Pages 2 0 R >>\n")
        pdf_parts.append(b"endobj\n\n")
        pdf_parts.append(b"2 0 obj\n")
        pdf_parts.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n")
        pdf_parts.append(b"endobj\n\n")
        pdf_parts.append(b"3 0 obj\n")
        pdf_parts.append(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Contents 4 0 R /Resources << /XObject << /Image1 5 0 R >> >> >>\n" % (
            page_width, page_height))
        pdf_parts.append(b"endobj\n\n")
        pdf_parts.append(b"4 0 obj\n")
        pdf_parts.append(b"<< /Length 100 >>\n")
        pdf_parts.append(b"stream\n")
        pdf_parts.append(b"q\n")
        pdf_parts.append(b"%d 0 0 %d %d %d cm\n" % (image_width, image_height, x_position, y_position))
        pdf_parts.append(b"/Image1 Do\n")
        pdf_parts.append(b"Q\n")
        pdf_parts.append(b"endstream\n")
        pdf_parts.append(b"endobj\n\n")
        pdf_parts.append(b"5 0 obj\n")
        pdf_parts.append(
            f"<< /Type /XObject /Subtype /Image /Width {image_width} /Height {image_height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length {len(image_bytes)} /Filter [/DCTDecode] >>\n".encode(
                'utf-8'))
        pdf_parts.append(b"stream\n")
        pdf_parts.append(image_bytes)
        pdf_parts.append(b"\nendstream\n")
        pdf_parts.append(b"endobj\n\n")
        pdf_parts.append(b"xref\n")
        pdf_parts.append(b"0 6\n")
        pdf_parts.append(b"0000000000 65535 f \n")
        pdf_parts.append(b"0000000009 00000 n \n")
        pdf_parts.append(b"0000000058 00000 n \n")
        pdf_parts.append(b"0000000116 00000 n \n")
        pdf_parts.append(b"0000000250 00000 n \n")
        pdf_parts.append(b"0000000375 00000 n \n\n")
        pdf_parts.append(b"trailer\n")
        pdf_parts.append(b"<< /Size 6 /Root 1 0 R >>\n")
        pdf_parts.append(b"startxref\n")
        current_length = sum(len(part) for part in pdf_parts)
        pdf_parts.append(str(current_length).encode('utf-8'))
        pdf_parts.append(b"\n%%EOF")
        final_pdf = b"".join(pdf_parts)

        file_name = f'file_{uuid.uuid4().hex}.pdf'
        files = {'upload_file[]': (file_name, final_pdf, 'application/pdf')}
        data = {'service': 'pdf-ocr_fa'}
        save_file = requests.post("https://www.i2pdf.com/DevSDK/upload.php", files=files, data=data,
                                  cookies=self.cookies_i2pdf, timeout=20).json()
        fancy_print('create u format image', level='s')
        if save_file.get('status') != '1':
            return ['file error', False]
        data_get_answer = {
            'data': '{"pages":[{"p":1,"a":0}],"text":"true","doc":"false","docx_box":"true","docx_flow":"true","pdf":"false","pdf_searchable":"false","html":"false","imgInDocx":"false","lang":"gb,eng","ocr_layout":"single_column","ocr_engine":"1","imgInDocx":"false","app":"pdf_ocr"}'}
        data_math = requests.post('https://www.i2pdf.com/DevSDK/apps/pdf_ocr.php', data=data_get_answer,
                                  cookies=self.cookies_i2pdf, timeout=30)
        fancy_print('get aswer the captcha', level='s')
        tx = ''
        for char in str(data_math.text).split('$("#ocrTextBox").val("')[1]:
            if char == '"':
                break
            else:
                tx += char
        return [tx, True]

    def image_to_text_textin(self, image_data):
        headers = {
            "Host": "api.textin.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Referer": "https://ocr.oldfish.cn/",
            "Cache-Control": "no-cache",
            "pragma": "no-cache",
            "token": "",
            "Content-Type": "image/png",
            "Origin": "https://ocr.oldfish.cn",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "DNT": "1",
            "Sec-GPC": "1",
            "Priority": "u=4"
        }
        response = requests.post('https://api.textin.com/home/user_trial_ocr?service=text_recognize_3d1',
                                 headers=headers, data=image_data).json()
        if int(response.get('code')) == 200 and response.get('msg') == 'success':
            tx = ''
            for line in response['data']['result']['lines']:
                tx += line['text']
            return [tx, True]
        return ['error', False]

    def captcha(self):
        fancy_print("Your account have captch.", level='w')
        attempts = 0
        while True:
            fancy_print('Try for answer the captcha...', level='i')
            while True:
                try:
                    response = requests.get("http://iran.fruitcraft.ir/bot/getcaptcha", stream=False,
                                            timeout=self.timeout, cookies={'FRUITPASSPORT': self.fruitPassport})
                    response.raise_for_status()
                    image_data = io.BytesIO()
                    for chunk in response.iter_content(1024):
                        image_data.write(chunk)
                    image_data.seek(0)
                    if len(image_data.getvalue()) == 0:
                        fancy_print("An unexpected error occurred.", level='e')
                        switch_delay()
                        continue
                    fancy_print('Get captcha image was successful.', level='s')
                    break
                except:
                    for j in range(1, 6):
                        fancy_print(f'Internet error. Please wait -->{j}s/5s', end='\r', level='w')
                        sleep(1)
                    print()

            integer = None
            if attempts < 2:  # دو بار اول: OCR
                iok = False
                for i in range(1, 5):
                    try:
                        response_ocr = self.image_to_text_i2pdf(image_data=image_data)
                        server = 'i2pdf'
                        if not response_ocr[1]:
                            response_ocr = self.image_to_text_textin(image_data=image_data)
                            server = 'textin'
                            if not response_ocr[1]:
                                iok = True
                                break

                        try:
                            integer = str(self.calculate_expression(response_ocr[0]))
                        except ValueError:
                            if server == 'i2pdf':
                                response_ocr = self.image_to_text_textin(image_data=image_data)
                                try:
                                    integer = str(self.calculate_expression(response_ocr[0]))
                                except ValueError:
                                    iok = True
                                    break
                            else:
                                iok = True
                                break
                        break
                    except(requests.ReadTimeout, requests.ConnectTimeout, requests.ConnectionError):
                        if i == 4:
                            fancy_print("Your internet is bad.", level='e')
                        for j in range(1, 16):
                            fancy_print(f'Internet error. Please wait -->{j}s/15s  [{i}/3]', end='\r', level='w')
                            sleep(1)
                        print()
                    except requests.exceptions.JSONDecodeError:
                        fancy_print(f"An unexpected error occurred.", level='e')
                if iok:
                    fancy_print('error in get answer captcha', level='e')
                    attempts += 1
                    if attempts >= 3:
                        fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                        attempts = 0
                        switch_delay()
                    switch_delay()
                    continue
            
            else:  # Web flow: upload to site and wait for answer (no tkinter, phone-friendly)
                global SITE_USER
                if SITE_USER is None:
                    print()
                    fancy_print("Enter site username (script.php page): ", end='')
                    try:
                        SITE_USER = input().strip() or "user"
                    except Exception:
                        SITE_USER = "user"

                # Upload the captcha image to the website
                try:
                    up = site_upload_image(SITE_USER, image_data.getvalue())
                    fancy_print("Uploaded captcha to site.", level='s')
                    print(f"Open this page to answer: {SITE_BASE}/{SITE_USER}")
                except Exception as e:
                    fancy_print(f"Upload failed: {e}", level='e')
                    attempts += 1
                    if attempts >= 3:
                        fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                        attempts = 0
                        switch_delay()
                    switch_delay()
                    continue

                # Wait indefinitely (via long-poll) for user's answer
                try:
                    integer = site_wait_answer(SITE_USER)
                    fancy_print(f"User answer received: {integer}", level='s')
                except Exception as e:
                    fancy_print(f"Waiting for answer failed: {e}", level='e')
                    attempts += 1
                    if attempts >= 3:
                        fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                        attempts = 0
                        switch_delay()
                    switch_delay()
                    continue

            if integer is None:
                fancy_print('No captcha response entered.', level='e')
                attempts += 1
                if attempts >= 3:
                    fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                    attempts = 0
                    switch_delay()
                switch_delay()
                continue

            # ارسال جواب
            result = self.request("/bot/challengeresponse", '{"resp":"%s"}' % (integer))

            if type(result) != dict:
                fancy_print('Error in send answer the captcha', level='e')
                attempts += 1
                if attempts >= 3:
                    fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                    attempts = 0
                    switch_delay()
                switch_delay()
                continue
            if result['status'] == True:
                fancy_print('The CAPTCHA was successfully.', level='s')
                return True
            else:
                fancy_print('Error in send answer the captcha', level='e')
                attempts += 1
                if attempts >= 3:
                    fancy_print('CAPTCHA failed 3 times. Requesting a new CAPTCHA...', level='w')
                    attempts = 0
                    switch_delay()
                switch_delay()
                continue


    def drop_all_card(self, power_filter: int = None):
        if power_filter:
            drop_list = list()
            for card in self.load_data['cards']:
                if card['power'] <= power_filter:
                    drop_list.append(Card(card))
            return drop_list
        return [Card(card) for card in self.load_data['cards']]

    def calculate_expression(self, text: str):
        cleaned = text.strip().replace(" ", "").replace("\r", "").replace("\n", "").replace('F', '5').replace('I', '1')
        operators = ['+', '-', '*', '/', '×', '÷', 'x', 'X', ':']

        for i, char in enumerate(cleaned):
            if char in operators:
                op_pos = i
                break
        else:
            raise ValueError(f"No valid operator found in expression: {text!r}")

        left = cleaned[:op_pos]
        right = cleaned[op_pos + 1:]
        op = cleaned[op_pos]

        if not left.isdigit() or not right.isdigit():
            raise ValueError(f"Invalid operands in expression: {text!r}")

        num1 = int(left)
        num2 = int(right)

        if op in ['×', 'x', 'X']:
            op = '*'
        elif op in ['÷', ':']:
            op = '/'

        operations = {
            '+': lambda a, b: a + b,
            '-': lambda a, b: a - b,
            '*': lambda a, b: a * b,
            '/': lambda a, b: a // b if b != 0 else (_ for _ in ()).throw(ZeroDivisionError("Division by zero"))
        }

        if op not in operations:
            raise ValueError(f"Unsupported operator: {op}")

        return operations[op](num1, num2)

    def login(self):
        # FC قبلاً از بیرون دریافت شده
        os.system('cls' if os.name == 'nt' else 'clear')
        login_data = self.load_player(FC, is_login=False)
        return {'login_data': login_data[1], 'load_data': login_data[0], 'fc': FC}

    def load_player(self, FruitCraftCode: str, is_login: bool = True):
        global power_f, league_id, fruit_socket

        fancy_print(f"Trying to connect to {color.GREEN}fruitcraft{color.CYAN} for login...")
        if is_login:
            os_version = self.os_version
            model = self.model
            udid = self.udid
            build = self.drop_build_number
            new_head = self.header
        else:
            os_version = self.drop_android_version()
            model = self.drop_samsung_model()
            udid = self.drop_numeric_udid(string_=FruitCraftCode)
            build = self.drop_build_number()
            new_head = {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": f"Dalvik/2.1.0 (Linux; U; Android {os_version}; {model} Build/{build})",
                "Accept-Encoding": "gzip"
            }
        data = '{"game_version":"1.10.10746", "device_name":"unknown", "os_version":"%s", "model":"%s", "udid":"%s", "store_type":"myket", "restore_key":"%s", "os_type":2}' % (
        os_version, model, udid, FruitCraftCode)
        self.data = data
        while True:
            try:
                offline_account()
                # sleep(1)
                response = requests.post(self.host + "/player/load", data="edata=" + enc.encrypt(data) + "&version=2", headers=new_head,
                                         timeout=self.timeout)
                load_info = json.loads(enc.decrypt(response.text))

                break
            except (requests.ReadTimeout, requests.ConnectTimeout, requests.ConnectionError):

                for j in range(1, 6):
                    fancy_print(f'Internet error. Please wait -->{j}s/5s', end='\r', level='w')
                    sleep(1)
                print()
            except json.JSONDecodeError:

                for l in range(1, 6):
                    fancy_print(f'login error. please wait -->{l}s/5s', level='w', end='\r')
                    sleep(1)

        if load_info['status'] == False:
            fancy_print(f"Connection Field", level='e')
            try:
                arguments = load_info['data']['arguments']
            except KeyError:
                arguments = None
            self.error_code(int(load_info['data']['code']), arguments)
        else:
            power_f = sum(
                card.get("power", 0) for card in load_info["data"]["offense_building_assigned_cards"]
            ) // 10
            league_id = load_info["data"]["league_id"]
            fruit_socket.user_id = load_info["data"]["id"]

        if is_login:
            return [load_info['data']]
        else:
            return [load_info['data'],
                    {'FRUITPASSPORT': response.cookies.get_dict()['FRUITPASSPORT'], 'os_version': os_version,
                     'model': model, 'udid': udid, 'build': build, 'id': fruit_socket.user_id}]

    def auction_card(self, card_id: Card):
        return self.request('/auction/setcardforauction', '{"card_id":%s}' % (card_id.id))

    def error_message(self):
        return self.request('/error/messages', '{"lang_id":"fa-IR"}', False)

    def constants_device(self):
        return self.request('/device/constants', self.data)

    def language_patch(self):
        return self.request('/player/languagepatch', '{"client":"iOS"}')

    def fruits_jsonex_port(self):
        return self.request('/cards/fruitsjsonexport', '{"client":"iOS"}')

    def cards_jsonex_port(self):
        return self.request('/cards/cardsjsonexport', '{"client":"iOS"}', False)

    def player_comeback(self):
        return self.request('/player/comeback', '{"client":"iOS"}')

    def buy_card_pack(self, packid: int):
        """brown -> 1  green -> 2  yellow -> 3 red -> 4  silver -> 5  gold -> 6  platinum -> 7  monster -> 8  kristall -> 9"""
        data_buy = self.request('/store/buycardpack', '{"type":%i}' % (packid))
        if type(data_buy) != dict:
            return data_buy
        elif not data_buy['status']:
            return data_buy
        return_list = []
        for card in data_buy['data']['cards']:
            return_list.append(Card(card))
        data_buy['data']['cards'] = return_list
        return data_buy

    def collectgold(self):
        return self.request('/cards/collectgold', '{"client":"iOS"}')

    def error_code(self, status_code: int, arguments):
        if status_code == 154:
            sys.exit(f"The fruit code is {color.RED}invalid{color.RESET}")
        elif status_code == 101:
            sys.exit(f'Your account is {color.RED}blocked{color.RESET}:(')
        elif status_code == 124 or status_code == 184:
            print(f'You are {color.RED}logged in account{color.RESET}')
            sleep(10)
        elif status_code == 240:
            sys.exit('The league is being updated.')
        elif status_code == 177:
            return 'The card is being revived.'
        else:
            return (f'Unknown {color.RED}error{color.RESET} -->code:{status_code}  arguments:{arguments}')

    def drop_numeric_udid(self, length=15, string_=None) -> str:
        return str(int(hashlib.sha256(string_.encode()).hexdigest(), 16))[0:length]

    def drop_build_number(self) -> str:
        prefix = random.choice(['PPR', 'QP1', 'RKQ', 'SP1', 'TP1', 'UP2', 'VRQ', 'WP1', 'XP2', 'YP1'])
        letter = random.choice(string.ascii_uppercase)
        date = f"{random.randint(19, 22)}{random.randint(1, 12):02d}{random.randint(1, 31):02d}"
        build_num = f"{random.randint(1, 20):03d}"
        return f"{prefix}{letter}.{date}.{build_num}"

    def drop_samsung_model(self) -> str:
        samsung_models = [
            "SM-G970F",
            "SM-G973F",
            "SM-G975F",
            "SM-G960F",
            "SM-G965F",
            "SM-G991B",
            "SM-G996B",
            "SM-G998B",
            "SM-N970F",
            "SM-N975F",
            "SM-N980F",
            "SM-N986B",
            "SM-A305F",
            "SM-A315F",
            "SM-A515F",
            "SM-A705FN",
            "SM-A715F",
            "SM-M307F",
            "SM-M317F",
            "SM-M515F",
            "SM-F916B",
            "SM-F700F",
            "SM-F711B",
            "SM-F926B",
            "SM-T860",
            "SM-T870",
            "SM-T875",
            "SM-T970",
            "SM-G800F",
            "SM-G900F",
        ]
        return random.choice(samsung_models)

    def drop_android_version(self) -> str:
        major = random.choice(range(5, 14))
        minor = random.choice(range(0, 5))
        patch = random.choice(range(0, 10))
        if random.random() < 0.7:
            return f"{major}.{minor}.{patch}"
        else:
            return f"{major}.{minor}"


    def decode_unicode(self, s: str):
        try:
            decoded = bytes(s, "utf-8").decode("unicode_escape")
        except Exception:
            decoded = s
        return decoded.encode("utf-8", "ignore").decode("utf-8")


def log_attack(xp, xp_added, gold, gold_added, doon, opponent_name, level, rank, attack_result):
    # User name: Neon Blue | Numbers: White
    attack_header = f"{Color.USER}--- [{opponent_name}] ---{Color.RESET}"

    def fmt(label, value, label_color=Color.SEP):
        return f"{label_color}{label}:{Color.WHITE} {value}{Color.RESET}"

    parts = [
        fmt("doon", doon, Color.DOON),
        fmt("xp", xp, Color.XP),
        fmt("xp+", xp_added, Color.XP),
        fmt("gold", gold, Color.GOLD),
        fmt("gold+", gold_added, Color.GOLD_ADD),
        fmt("level", level, Color.LEVEL),
        fmt("rank", rank, Color.RANK),
    ]

    sep = f" {Color.SEP}|{Color.RESET} "
    log_message = f"{attack_header} " + sep.join(parts)
    fancy_print(log_message, level='s' if attack_result else 'e')



def create_or_open_db():
    global conn, cursor
    conn = sqlite3.connect(f'./players.scriptHTTP{league_id}')
    cursor = conn.cursor()
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS Accounts (
        id TEXT UNIQUE,
        name TEXT,
        power NUMERIC,
        level NUMERIC,
        PRIMARY KEY(id))'''
    )
    conn.commit()


def add_opponent_file(opponents: list[Opponent]):
    global conn, cursor
    for opponent in opponents:
        cursor.execute(
            '''INSERT INTO Accounts (id, name, power, level)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                power=excluded.power,
                level=excluded.level''',
            (opponent.id, opponent.name, opponent.def_power, opponent.level)
        )
    conn.commit()


def drop_opponent_file(max_power: int):
    conn = sqlite3.connect(f'./players.scriptHTTP{league_id}')
    cursor = conn.cursor()
    if not max_power: Exception
    query = '''SELECT id, name, power, level FROM Accounts WHERE power <= ?'''
    cursor.execute(query, (max_power,))
    enemies = cursor.fetchall()
    conn.close()
    return [Opponent({'id': e[0], 'name': e[1], 'def_power': e[2], 'level': e[3]}) for e in enemies]


def delete_database_file():
    db_path = f'./players.scriptHTTP{league_id}'
    if os.path.exists(db_path):
        os.remove(db_path)
        return True
    else:
        return False


def remove_opponent(opponent: Opponent):
    global conn, cursor

    try:
        cursor.execute(
            '''DELETE FROM Accounts WHERE id = ?''',
            (opponent.id,)
        )
        conn.commit()
        return True
    except sqlite3.Error as e:
        return False


def encode_base36(s):
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    result = 0
    for char in s:
        result = result * 36 + alphabet.index(char.lower())
    return result

def offline_account():
    fruit_socket.connect()
    fruit_socket.close()


# info = {"System": platform.system(),"Node Name": platform.node(),"Release": platform.release(),"Version": platform.version()};abs = str(base64.b64encode("".join([f"{key}: {value}" for key, value in info.items()]).encode()).decode())

def wait_with_countdown(seconds: int, label='Cooldown'):
    for r in range(seconds, 0, -1):
        bar_total = max(10, min(30, seconds))
        filled = int(bar_total * (seconds - r + 1) / seconds)
        bar = '█' * filled + '░' * (bar_total - filled)
        fancy_print(f'{label}: [{bar}] {r}s', level='w', end='\r')
        sleep(1)
    print()
# if abs != "":
#     fancy_print('Invalid phone!', level='e')
#     sys.exit()
# fancy_print('Entre your password : ', end='')
# PASS = input()
# if encode_base36(PASS) != :
#     fancy_print('Password is invalid!', level='e')
#     sys.exit()

power_f = None
league_id = None
f = FruitCraft()

try:
    # fancy_print(
    #     f'Enter script mode -> {color.LIGHTYELLOW_EX}normall(n) {color.LIGHTMAGENTA_EX}super(s){color.LIGHTCYAN_EX} : ',
    #     end='')
    # mode = input()
    mode = "s"
    # if mode.lower() == 'n':
    #     speed = 1
    #     don_h = None
    #     at_ac = 7

    # elif mode.lower() == 's':
    don_h = '+'  # input("Doon --> (-) or (+) : ")
    fancy_print("Enter Attacks To opponents(7) : ", end='')
    at_ac = int(input())
    fancy_print("Enter Speed(1) : ", end='')
    try:
        _sp = input().strip()
        SPEED_BASE = float(_sp) if _sp else 1.0
    except Exception:
        SPEED_BASE = 1.0
    if os.path.exists(f'./players.scriptHTTP{league_id}'):
        fancy_print(
            f'Do you want delete database?({color.LIGHTGREEN_EX}y{color.LIGHTCYAN_EX} , {color.LIGHTRED_EX}n{color.LIGHTCYAN_EX}) : ',
            end='')
        if input() in ['y', 'Y']:
            delete_database_file()
            fancy_print('Database deleted!', level='e')
    # fancy_print("Enter Your Power : ", end='')
    # power_f = int(input())
except:
    fancy_print('Invalid input!', level='e')
    sys.exit()

cards = f.drop_all_card(power_filter=86)
cards.reverse()
lenght_card = len(cards)
if lenght_card < 40:
    fancy_print('lenght card is low!', level='w')
    if int(f.load_data['gold']) < 15000:
        fancy_print('you don\'t have gold for buy silver card pack', level='e')
        sys.exit()
    fancy_print(
        f'Do you want buy cards({color.LIGHTGREEN_EX}y{color.LIGHTCYAN_EX} or {color.LIGHTRED_EX}n{color.LIGHTCYAN_EX}):',
        end='')
    buy = input()
    if buy in ['y', 'Y']:
        while True:
            new_cards = f.buy_card_pack(5)
            # (silent) don't print raw data
            for card in new_cards['data']['cards']:
                cards.append(card)

            lenght_card += 15
            if lenght_card < 40:
                break
            if int(new_cards['data']['gold']) < 15000:
                fancy_print('you don\'t have gold for buy silver card pack', level='e')
                sys.exit()

    else:
        fancy_print('+_+', level='e')
        sys.exit()

l = [0] * 101
index_card = 0
q = f.load_data['q']
out = False
lenght_not_player = 0
print('\n')
# while mode.lower() == 'n':
#     fancy_print('Get players close...')
#     sleep(3)
#     opponents = f.drop_opponents()
#     lenght_not_player += 1
#     fancy_print('Try to attack players...')
#     for opponent in opponents:
#         if opponent.def_power < power_f and not opponent.status:
#             lenght_not_player = 0
#             for i in range(at_ac):
#                 if index_card >= lenght_card:
#                     index_card = 0
#                 try:
#                     choice_card = cards[index_card]
#                 except IndexError:
#                     index_card = 0
#                     choice_card = cards[index_card]
#                 nabard_data = f.nabard(opponent_id=opponent.id, q=q, cards=[cards[index_card]])
#
#                 if type(nabard_data) == requests.Response:
#                     if nabard_data.status_code == 429:
#                         for j in range(15):
#                             fancy_print(f'server limit -> {j + 1}/15', end='\r')
#                             sleep(1)
#                         print()
#                     switch_delay()
    # continue
#                 elif type(nabard_data) != dict:
#                     if 'Please logout and try again in a 2 minutes.' in nabard_data:
#                         q += 6
#                     switch_delay()
    # continue
#                 if not nabard_data.get('status', True):
#                     code = int(nabard_data.get('data', {}).get('code', -1))
#                     if code in (124, 33):
#                         fancy_print('Q expired, reloading account...', level='w')
#                         try:
#                             f.load_data = f.load_player(f.fc)[0]
#                             q = f.load_data.get('q', q)
#                         except Exception:
#                             pass
#                         switch_delay()
    # continue
#                     err_count += 1
#                     if err_count >= 3:
#                         fancy_print('Too many error responses; backing off 10s', level='w')
#                         sleep(10)
#                         break
#                     switch_delay()
    # continue
#                 q = nabard_data['data']['q']
    # err_count = 0  # (commented: was inserted inside a commented block)
#                 if nabard_data['data']['needs_captcha']:
#                     f.captcha()
#                     switch_delay()
    # continue
#                 if not nabard_data['data']['outcome']:
#                     log_attack(opponent_name=opponent.name, doon=nabard_data['data']['weekly_score'],
#                                gold=nabard_data['data']['gold'], xp=nabard_data['data']['xp'],
#                                level=nabard_data['data']['level'], rank=nabard_data['data']['rank'],
#                                attack_result=False)
#                     out = False
#                     break
#                 else:
#                     log_attack(opponent_name=opponent.name, doon=nabard_data['data']['weekly_score'],
#                                gold=nabard_data['data']['gold'], xp=nabard_data['data']['xp'],
#                                level=nabard_data['data']['level'], rank=nabard_data['data']['rank'], attack_result=True)
#                     if random.choice(l) == 1:
#                         level = random.choice([1, 2, 3])
#                         print()
#                         fancy_print(f'random job -> buy card {level}')
#                         cbuy = f.buy_card_pack(level)
#                         if type(cbuy) != dict:
#                             fancy_print(str(cbuy), level='e')
#                         switch_delay()
    # continue
#                     if random.choice(l) == 1:
#                         print()
#                         fancy_print('random job -> collect gold')
#                         coll = f.collectgold()
#                         if type(coll) != dict:
#                             fancy_print(str(coll), level='e')
#                             switch_delay()
    # continue
#                         switch_delay()
    # continue
#                     index_card += 1
#                     out = True
#                 index_card += 1
#                 sleep(get_random_speed())
#             if not out:
#                 switch_delay()
    # continue
#             break
#         sleep(3)
#     if lenght_not_player != 0:
#         if lenght_not_player >= 3:
#             sys.exit()

go_to_get_opponents = 0
op_index = 0

bad_player = []
create_or_open_db()
add_opponent_file(f.drop_opponents())
while don_h == '+':
    fancy_print('Get players close...')
    sleep(random.uniform(1, 2))
    opponents = drop_opponent_file(power_f)
    if opponents == []:
        fancy_print('Escript can\'t get players. your power is low', level='e')
        sys.exit()
    lenght_not_player += 1
    fancy_print('Try to attack players...')
    for opponent in opponents:
        if opponent.def_power < power_f and opponent not in bad_player:
            lenght_not_player = 0
            err_count = 0
            for i in range(at_ac):
                if index_card >= lenght_card:
                    index_card = 0
                try:
                    choice_card = cards[index_card]
                except IndexError:
                    index_card = 0
                    choice_card = cards[index_card]
                nabard_data = f.nabard(opponent_id=opponent.id, q=q, cards=[cards[index_card]])
                # print(nabard_data)
                if type(nabard_data) == requests.Response:
                    if nabard_data.status_code == 429:
                        for j in range(15):
                            fancy_print(f'server limit -> {j + 1}/15', end='\r')
                            sleep(1)
                        print()
                    switch_delay()
                    continue
                elif type(nabard_data) != dict:
                    err_count += 1
                    if err_count >= 3:
                        fancy_print('Too many non-JSON responses; backing off 10s', level='w')
                        sleep(10)
                        break
                    switch_delay()
                    continue
                if not nabard_data.get('status', True):
                    code = int(nabard_data.get('data', {}).get('code', -1))
                    if code in (124, 33):
                        fancy_print('Q expired, reloading account...', level='w')
                        try:
                            f.load_data = f.load_player(f.fc)[0]
                            q = f.load_data.get('q', q)
                        except Exception:
                            pass
                        switch_delay()
                        continue
                    err_count += 1
                    if err_count >= 3:
                        fancy_print('Too many error responses; backing off 10s', level='w')
                        sleep(10)
                        break
                    switch_delay()
                    continue

                q = nabard_data['data']['q']
                err_count = 0
                if nabard_data['data']['needs_captcha']:
                    f.captcha()
                    switch_delay()
                    continue
                if nabard_data['data']['score_added'] == 0:
                    fancy_print(f'remove player -> {opponent.id}', level='w')
                    bad_player.append(opponent)
                    remove_opponent(opponent=opponent)
                    break
                if not nabard_data['data']['outcome']:
                    log_attack(opponent_name=opponent.name, doon=nabard_data['data']['weekly_score'],
                               gold=nabard_data['data']['gold'], gold_added=nabard_data['data']['gold_added'],
                               xp=nabard_data['data']['xp'], xp_added=nabard_data['data']['xp_added'],
                               level=nabard_data['data']['level'], rank=nabard_data['data']['rank'],
                               attack_result=False)
                    bad_player.append(opponent)
                    remove_opponent(opponent=opponent)
                    break
                else:
                    log_attack(opponent_name=opponent.name, doon=nabard_data['data']['weekly_score'],
                               gold=nabard_data['data']['gold'], gold_added=nabard_data['data']['gold_added'],
                               xp=nabard_data['data']['xp'], xp_added=nabard_data['data']['xp_added'],
                               level=nabard_data['data']['level'], rank=nabard_data['data']['rank'], attack_result=True)
                    if random.choice(l) == 1:
                        level = random.choice([1, 2, 3])
                        print()
                        fancy_print(f'random job -> buy card {level}')
                        cbuy = f.buy_card_pack(level)
                        if type(cbuy) != dict:
                            fancy_print(str(cbuy), level='e')
                        switch_delay()
                        continue
                    if random.choice(l) == 1:
                        print()
                        fancy_print('random job -> collect gold')
                        coll = f.collectgold()
                        if type(coll) != dict:
                            fancy_print(str(coll), level='e')
                            switch_delay()
                            continue
                        switch_delay()
                        continue
                    index_card += 1
                sleep(get_random_speed())
        sleep(random.uniform(1, 2))
    add_opponent_file(f.drop_opponents())
    if lenght_not_player != 0:
        _r = f.drop_opponents()
        if _r:
            add_opponent_file(_r)
        if lenght_not_player >= 3:
            sys.exit()
    
    

# Added attack option
ATTACKS = ['Sleep attack']