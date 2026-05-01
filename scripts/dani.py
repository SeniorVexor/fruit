import requests
import json
import io
import os
import uuid
import hashlib
import random
import time
import sys
from fruitbot import Client
from fruitbot.utils import Utils
from fruitbot.exceptions import UnknownError, OnlineOnAnotherDevice
from termcolor import colored
import colorama
colorama.init()

class CaptchaSolver:
    def __init__(self, fruitPassport):
        self.fruitPassport = fruitPassport
        self.host = 'http://fruit2.ariahamrah.ir:80'
        self.timeout = 10
        try:
            self.cookies_i2pdf = requests.get('https://www.i2pdf.com/fa/pdf-ocr', timeout=20).cookies.get_dict()
        except:
            self.cookies_i2pdf = {}
    
    def calculate_expression(self, text: str):
        try:
            cleaned = text.strip().replace(" ", "").replace("\r", "").replace("\n", "").replace('F', '5').replace('I', '1')
            operators = ['+', '-', '*', '/', '×', '÷', 'x', 'X', ':']
            
            for i, char in enumerate(cleaned):
                if char in operators:
                    op_pos = i
                    break
            else:
                return 20
            
            left = cleaned[:op_pos]
            right = cleaned[op_pos + 1:]
            op = cleaned[op_pos]
            
            if not left.isdigit() or not right.isdigit():
                return 20
            
            num1 = int(left)
            num2 = int(right)
            
            if op in ['×', 'x', 'X']:
                op = '*'
            elif op in ['÷', ':']:
                op = '/'
            
            if op == '+':
                return num1 + num2
            elif op == '-':
                return num1 - num2
            elif op == '*':
                return num1 * num2
            elif op == '/':
                return num1 // num2 if num2 != 0 else 20
            return 20
        except:
            return 20
    
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
        
        try:
            save_file = requests.post("https://www.i2pdf.com/DevSDK/upload.php", files=files, data=data,
                                      cookies=self.cookies_i2pdf, timeout=20).json()
            
            if save_file.get('status') != '1':
                return ['error', False]
            
            data_get_answer = {
                'data': '{"pages":[{"p":1,"a":0}],"text":"true","doc":"false","docx_box":"true","docx_flow":"true","pdf":"false","pdf_searchable":"false","html":"false","imgInDocx":"false","lang":"gb,eng","ocr_layout":"single_column","ocr_engine":"1","imgInDocx":"false","app":"pdf_ocr"}'}
            
            data_math = requests.post('https://www.i2pdf.com/DevSDK/apps/pdf_ocr.php', data=data_get_answer,
                                      cookies=self.cookies_i2pdf, timeout=30)
            
            tx = ''
            for char in str(data_math.text).split('$("#ocrTextBox").val("')[1]:
                if char == '"':
                    break
                else:
                    tx += char
            return [tx, True]
        except:
            return ['error', False]
    
    def solve_captcha(self):
        attempts = 0
        
        while attempts < 5:
            try:
                response = requests.get("http://iran.fruitcraft.ir/bot/getcaptcha", stream=False,
                                        timeout=self.timeout, cookies={'FRUITPASSPORT': self.fruitPassport})
                response.raise_for_status()
                
                image_data = io.BytesIO()
                for chunk in response.iter_content(1024):
                    image_data.write(chunk)
                image_data.seek(0)
                
                if len(image_data.getvalue()) == 0:
                    time.sleep(2)
                    attempts += 1
                    continue
                break
            except:
                time.sleep(5)
                attempts += 1
                continue
        
        if attempts >= 5:
            return "20"
        
        integer = None
        
        if attempts < 2:
            for i in range(2):
                response_ocr = self.image_to_text_i2pdf(image_data=image_data)
                
                if response_ocr[1]:
                    try:
                        integer = str(self.calculate_expression(response_ocr[0]))
                        break
                    except:
                        pass
        
        if integer is None:
            integer = "20"
        
        return integer

def create_client_with_retry(restore_code, max_retries=3):
    for attempt in range(max_retries):
        try:
            session_name = f"session_{int(time.time())}_{random.randint(1000, 9999)}"
            bot = Client(session_name=session_name, restore_key=restore_code)
            
            print(colored(f"Attempt {attempt + 1}/{max_retries}...", "yellow"))
            
            constants = bot.getConstants()
            player_data = bot.loadPlayer(True)
            
            return bot, constants, player_data
            
        except OnlineOnAnotherDevice:
            print(colored("Account online on another device. Waiting 10 seconds...", "red"))
            time.sleep(10)
            
        except Exception as e:
            print(colored(f"Error: {e}", "red"))
            time.sleep(5)
    
    print(colored(f"Failed to connect after {max_retries} attempts.", "red"))
    sys.exit()

def get_collection_interval():
    while True:
        try:
            interval_input = input(colored("Enter base collection interval in seconds: ", "cyan")).strip()
            interval = float(interval_input)
            if interval <= 0:
                print(colored("Interval must be greater than 0.", "red"))
                continue
            if interval < 0.1:
                print(colored(f"Warning: Very short interval ({interval}s)", "yellow"))
                confirm = input(colored("Continue? (y/n): ", "yellow")).lower()
                if confirm != 'y':
                    continue
            return interval
        except ValueError:
            print(colored("Please enter a valid number.", "red"))
        except KeyboardInterrupt:
            print(colored("\nExiting...", "yellow"))
            sys.exit()

def collectGold(bot, captcha_solver):
    for i in range(10):
        try:
            result = bot.collectMinedGold()
            
            if isinstance(result, dict) and result.get('needs_captcha'):
                print(colored("Captcha via needs_captcha flag", "yellow"))
                if captcha_solver:
                    answer = captcha_solver.solve_captcha()
                    time.sleep(2)
                    continue
            
            if isinstance(result, dict) and result.get('code') == 183:
                print(colored("Captcha via error code 183", "yellow"))
                if captcha_solver:
                    answer = captcha_solver.solve_captcha()
                    time.sleep(2)
                    continue
            
            if isinstance(result, dict) and not result.get('success', True):
                error_msg = str(result).lower()
                if any(word in error_msg for word in ['captcha']):
                    print(colored("Captcha via error text", "yellow"))
                    if captcha_solver:
                        answer = captcha_solver.solve_captcha()
                        time.sleep(2)
                        continue
            
            return result
            
        except UnknownError as e:
            if "captcha" in str(e).lower():
                print(colored("Captcha via UnknownError", "yellow"))
                if captcha_solver:
                    answer = captcha_solver.solve_captcha()
                    time.sleep(2)
            time.sleep(3)
            continue
            
        except Exception as e:
            time.sleep(2)
            continue
    
    print(colored("Gold collection failed.", "red"))
    sys.exit()

def main():
    os.system('clear')
    restore_code = input(colored("Enter your key: ", "cyan")).strip()
    base_interval = get_collection_interval()
    
    print(colored(f"Base interval: {base_interval} seconds", "green"))
    print(colored(f"Random range: {base_interval} to {base_interval + 1} seconds", "green"))
    
    try:
        bot, constants, player_data = create_client_with_retry(restore_code)
        
        fruitPassport = None
        if hasattr(bot, 'fruitPassport'):
            fruitPassport = bot.fruitPassport
        elif hasattr(bot, '_session'):
            if hasattr(bot._session, 'cookies'):
                fruitPassport = bot._session.cookies.get('FRUITPASSPORT')

        captcha_solver = CaptchaSolver(fruitPassport) if fruitPassport else None
        
        print(colored(f"Auto collection every {base_interval}-{base_interval + 1}s (random)", "green"))
        
        collection_count = 0
        total_added = 0
        last_gold = None
        
        try:
            initial_response = collectGold(bot, captcha_solver)
            if isinstance(initial_response, dict):
                last_gold = initial_response.get('player_gold', 0)
                print(colored(f"Initial amount: {last_gold:,}", "cyan"))
        except:
            pass
        
        while True:
            try:
                collection_count += 1
                start_time = time.time()
                
                response = collectGold(bot, captcha_solver)
                
                if isinstance(response, dict):
                    current_gold = response.get('player_gold', 0)
                    added = 0
                    
                    if last_gold is not None:
                        added = current_gold - last_gold
                        total_added += added
                    
                    line = ""
                    line += colored(f"[{collection_count:03d}]", "yellow", attrs=["bold"])
                    line += colored(f" Gold: {current_gold:,}", "light_green")
                    line += colored(f" | +{added:,}", "light_magenta")
                    
                    print(line)
                    
                    last_gold = current_gold
                
                elapsed = time.time() - start_time
                
                # محاسبه تایم رندوم بین base_interval تا base_interval + 1
                random_interval = base_interval + random.random()  # random() بین 0 تا 1
                sleep_time = max(0.1, random_interval - elapsed)
                
                # نمایش تایم رندوم دقیق
                actual_wait = round(sleep_time, 2)
                print(colored(f"Random wait: {actual_wait}s (interval: {round(random_interval, 2)}s)", "light_blue"))
                
                if sleep_time > 1:
                    for remaining in range(int(sleep_time), 0, -1):
                        if remaining % 5 == 0 or remaining <= 3:
                            print(colored(f"\rNext in: {remaining}s", "light_blue", attrs=["bold"]), end="", flush=True)
                        time.sleep(1)
                    print()
                elif sleep_time > 0:
                    time.sleep(sleep_time)
                
            except KeyboardInterrupt:
                print(colored(f"\nCollections: {collection_count}", "yellow", attrs=["bold"]))
                print(colored(f"Total added: +{total_added:,}", "cyan", attrs=["bold"]))
                sys.exit()
            except Exception as e:
                print(colored(f"Error: {e}", "red"))
                time.sleep(5)
    
    except KeyboardInterrupt:
        print(colored("\nStopped", "yellow"))
    except Exception as e:
        print(colored(f"Fatal error: {e}", "red"))

if __name__ == "__main__":
    main()