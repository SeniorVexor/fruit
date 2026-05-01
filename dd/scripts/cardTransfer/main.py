import argparse
import json
import os
import sys
from datetime import datetime
from time import sleep
from fruitbot import Client
from fruitbot.exceptions import (
    UnknownError, CannotSellCard, CardAlreadyInAuction,
    AlreadyHighestBidder, CardTypeNotFound,
    OnlineOnAnotherDevice, AccessDenied
)

LOG_FILE = "transfer_log.txt"
MAX_BIDS = 7
MAX_RETRIES_PER_CARD = 3

# ANSI Color Codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

def flush_print(*args, **kwargs):
    """پرینت با فلش اجباری برای استریمینگ"""
    print(*args, **kwargs)
    sys.stdout.flush()

def write_log(symbol, msg):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ {symbol} ] {msg}\n")
    except Exception as e:
        print(f"[LOG ERROR] {e}", file=sys.stderr)

def log_entry(result_logs, level, message, console=True):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "message": message
    }
    result_logs.append(entry)
    write_log(level[0].upper(), message)

    if console:
        color = CYAN
        if level == "error": color = RED
        elif level == "warning": color = YELLOW
        elif level == "success": color = GREEN
        elif level == "info": color = BLUE

        log_line = f"{color}[{level.upper()}]{RESET} {message}"
        flush_print(log_line)

def retry_api_call(fn, retries=6, delay=2, logs=None):
    for i in range(retries):
        try:
            return fn()
        except UnknownError:
            if logs:
                flush_print(f"{YELLOW}[RETRY] {i+1}/{retries}...{RESET}")
            sleep(delay)
        except Exception as e:
            raise e
    return None

def connect(restore_key, label, logs):
    try:
        session_dir = '../../config/sessions'
        if not os.path.exists(session_dir):
            os.makedirs(session_dir)

        session = os.path.join(session_dir, restore_key)
        bot = Client(session_name=session, restore_key=restore_key)
        retry_api_call(bot.getConstants, logs=logs)
        player = retry_api_call(lambda: bot.loadPlayer(True), logs=logs)

        if not player:
            raise Exception(f"Failed to load player data for '{label}'")

        return bot, player

    except OnlineOnAnotherDevice:
        flush_print(f"{RED}[ERROR] Account '{label}' online on another device{RESET}")
        raise
    except AccessDenied:
        flush_print(f"{RED}[ERROR] Account '{label}': Access Denied - invalid key{RESET}")
        raise
    except Exception as e:
        flush_print(f"{RED}[ERROR] Connection failed for '{label}': {str(e)}{RESET}")
        raise

def disconnect(bot):
    try:
        flush_print("dc")
        bot.stopUpdates()
    except:
        pass

def get_all_cards_extended(bot, logs):
    """تلاش برای گرفتن همه کارت‌ها با روش‌های مختلف"""
    all_cards = []
    seen_ids = set()

    # روش 1: loadPlayer(True) - دیفالت
    try:
        player = bot.loadPlayer(True)
        if player and "cards" in player:
            cards = player["cards"]
            flush_print(f"{CYAN}[DEBUG] loadPlayer(True): {len(cards)} cards{RESET}")
            for c in cards:
                if c.get("id") not in seen_ids:
                    seen_ids.add(c["id"])
                    all_cards.append(c)
    except Exception as e:
        log_entry(logs, "error", f"loadPlayer(True) failed: {e}", console=True)

    flush_print(f"{GREEN}[SYSTEM] Final card count: {len(all_cards)}{RESET}")
    return all_cards

def get_cards_by_base_id(bot, base_id, logs):
    cards = get_all_cards_extended(bot, logs)
    base_id_str = str(base_id)
    filtered = []
    for c in cards:
        card_base = str(c.get("base_card_id") or c.get("base_id") or "")
        if card_base == base_id_str:
            filtered.append(c)
    return filtered

def submit_card(seller_bot, card_id, logs):
    try:
        return retry_api_call(lambda: seller_bot.submitCardForAuction(card_id), logs=logs)
    except CannotSellCard:
        flush_print(f"{RED}[SELL ERROR] Card {card_id} cannot be sold (hero/crystal?){RESET}")
    except CardAlreadyInAuction:
        flush_print(f"{YELLOW}[SELL ERROR] Card {card_id} already in auction{RESET}")
    except CardTypeNotFound:
        flush_print(f"{RED}[SELL ERROR] Card type {card_id} not found{RESET}")
    except Exception as e:
        flush_print(f"{RED}[SELL ERROR] {str(e)}{RESET}")
    return None

def find_auction(buyer_bot, base_card_id, card_id, logs):
    result = buyer_bot.searchAuctionCardsById(base_card_id)
    if not result:
        return None
    auctions = result if isinstance(result, list) else result.get("auctions", [])
    for a in auctions:
        if a.get("card_id") == card_id:
            return a.get("id")
    return None

def do_bid(buyer_bot, auction_id, logs):
    try:
        retry_api_call(lambda: buyer_bot.bidUpCardInAuction(auction_id), logs=logs)
        return True
    except AlreadyHighestBidder:
        return True
    except Exception as e:
        flush_print(f"{RED}[BID ERROR] {str(e)}{RESET}")
        return False

def do_sell_now(seller_bot, auction_id, logs):
    try:
        retry_api_call(lambda: seller_bot.sellCardNow(auction_id), logs=logs)
        return True
    except Exception as e:
        flush_print(f"{RED}[SELL NOW ERROR] {str(e)}{RESET}")
        return False

def get_buyer_id(buyer_bot, logs):
    if hasattr(buyer_bot, 'player_id') and buyer_bot.player_id:
        return buyer_bot.player_id
    try:
        player = retry_api_call(lambda: buyer_bot.loadPlayer(True), logs=logs)
        buyer_bot.player_id = player.get("id")
        return buyer_bot.player_id
    except:
        return None

def transfer_single_card(seller_bot, buyer_bot, card, base_id, logs, index, total):
    card_id = card.get("id")
    power = card.get("power", "?")

    flush_print(f"\n{CYAN}{BOLD}[{index}/{total}]{RESET} {MAGENTA}Card #{card_id}{RESET} {BLUE}(Power: {power}){RESET}")

    if submit_card(seller_bot, card_id, logs) is None:
        return {"status": "lost", "stage": "submit", "reason": "failed_to_submit"}

    auction_id = find_auction(buyer_bot, base_id, card_id, logs)
    if not auction_id:
        flush_print(f"{YELLOW}  ↳ Auction not found{RESET}")
        return {"status": "lost", "stage": "find_auction", "reason": "auction_not_found"}

    flush_print(f"{BLUE}  ↳ Auction: {auction_id}{RESET}")

    interferers = set()
    buyer_id = get_buyer_id(buyer_bot, logs)

    for bid_num in range(1, MAX_BIDS + 1):
        flush_print(f"{CYAN}  ↳ Bid {bid_num}/{MAX_BIDS}...{RESET}", end="")

        if not do_bid(buyer_bot, auction_id, logs):
            flush_print(f" {RED}FAILED{RESET}")
            return {"status": "lost", "stage": f"bid_{bid_num}", "reason": "bid_failed"}

        flush_print(f" {GREEN}OK{RESET}", end="")

        try:
            auction_info = retry_api_call(lambda: buyer_bot.searchAuctionCardsById(base_id), logs=logs)
            auctions = auction_info if isinstance(auction_info, list) else (auction_info or {}).get("auctions", [])
            current = next((a for a in auctions if a.get("auction_id") == auction_id or a.get("id") == auction_id), None)

            if current:
                bidders = current.get("bidders", [])
                other_bidders = [b for b in bidders if b != buyer_id]
                if other_bidders:
                    interferers.update(other_bidders)
                    flush_print(f" {YELLOW}[INTERFERENCE]{RESET}")
                    if bid_num < MAX_BIDS:
                        continue
                else:
                    flush_print("")
        except Exception as e:
            flush_print(f" {RED}[ERROR]{RESET}")

        if do_sell_now(seller_bot, auction_id, logs):
            flush_print(f"{GREEN}{BOLD}  ✓ Transferred successfully!{RESET}")
            return {
                "status": "success",
                "card_id": card_id,
                "auction_id": auction_id,
                "interferers": list(interferers),
                "bids_used": bid_num
            }
        else:
            return {"status": "lost", "stage": "sell_now", "reason": "sell_failed"}

    flush_print(f"{RED}{BOLD}  ✗ Max bids reached{RESET}")
    return {"status": "lost", "stage": "max_bids_reached", "reason": "too_many_interferers", "interferers": list(interferers)}

def output_result(result, seller_key):
    """
    ⭐ خروجی JSON به فایل در مسیر results/res_{seller_key}.json
    سپس اعلام مسیر فایل از طریق stdout
    """
    try:
        # ایجاد دایرکتوری results در کنار اسکریپت
        script_dir = os.path.dirname(os.path.abspath(__file__))
        results_dir = os.path.join(script_dir, "results")

        if not os.path.exists(results_dir):
            os.makedirs(results_dir)

        # مسیر فایل: results/res_{seller_key}.json
        file_name = f"res_{seller_key}.json"
        file_path = os.path.join(results_dir, file_name)
        abs_path = os.path.abspath(file_path)

        # نوشتن JSON در فایل با fsync برای اطمینان از ثبت روی دیسک
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            f.flush()
            try:
                os.fsync(f.fileno())  # ⭐ تضمین ثبت فیزیکی روی دیسک
            except:
                pass

        # اعلام مسیر فایل به stdout (برای خواندن توسط Node.js)
        flush_print(f"---RESULT_PATH---")
        flush_print(abs_path)
        flush_print(f"---RESULT_END---")
        sys.stdout.flush()

    except Exception as e:
        # ⭐ Fallback به stdout در صورت عدم امکان نوشتن فایل
        error_msg = f"Failed to write result file: {str(e)}"
        flush_print(f"{RED}[ERROR] {error_msg}{RESET}")
        flush_print(f"---RESULT_START---")
        flush_print(json.dumps({"success": False, "error": error_msg, "original_error": str(e)}, ensure_ascii=False))
        flush_print(f"---RESULT_END---")
        sys.stdout.flush()

def main():
    parser = argparse.ArgumentParser(description='Card Transfer Tool (NovaEX)')
    parser.add_argument('--seller', '--seller-key', dest='seller', required=True)
    parser.add_argument('--buyer', '--buyer-key', dest='buyer', default=None)
    parser.add_argument('--base-id', type=int, default=None)
    parser.add_argument('--power', type=int, default=None)
    parser.add_argument('--count', type=int, default=None)

    args = parser.parse_args()

    result = {
        "success": False,
        "timestamp": datetime.now().isoformat(),
        "mode": None,
        "logs": [],
        "data": {}
    }

    seller_bot = None
    buyer_bot = None

    try:
        # اتصال به سلر
        flush_print(f"{BLUE}[SYSTEM] Connecting to seller...{RESET}")
        seller_bot, seller_player = connect(args.seller, "seller", result["logs"])
        flush_print(f"{GREEN}[SYSTEM] Seller connected: Level {seller_player.get('level', '?')}, Gold: {seller_player.get('gold', 0)}{RESET}")

        # اگر base-id نباشد، یعنی مد list است
        if args.base_id is None:
            result["mode"] = "list_cards"
            flush_print(f"{BLUE}[SYSTEM] Fetching card list...{RESET}")

            cards = get_all_cards_extended(seller_bot, result["logs"])

            power_groups = {}
            for card in cards:
                p = card.get("power", 0)
                base = card.get("base_card_id") or card.get("base_id")
                name = card.get("name", base)

                if p not in power_groups:
                    power_groups[p] = []
                power_groups[p].append({
                    "card_id": card.get("id"),
                    "base_id": base,
                    "power": p,
                    "name": name
                })

            result["data"] = {
                "seller_gold": seller_player.get("gold", 0),
                "seller_level": seller_player.get("level"),
                "total_cards": len(cards),
                "cards_by_power": {str(k): v for k, v in sorted(power_groups.items(), reverse=True)}
            }
            result["success"] = True
            flush_print(f"{GREEN}[SYSTEM] Found {len(cards)} cards in {len(power_groups)} power groups{RESET}")

            # ⭐ خروجی به فایل به جای stdout
            output_result(result, args.seller)

            sleep(0.2)
            disconnect(seller_bot)
            return 0

        else:
            # مد انتقال (transfer)
            if not args.buyer:
                raise ValueError("Buyer key is required for transfer mode")

            result["mode"] = "transfer"
            flush_print(f"{BLUE}[SYSTEM] Connecting to buyer...{RESET}")
            buyer_bot, buyer_player = connect(args.buyer, "buyer", result["logs"])
            flush_print(f"{GREEN}[SYSTEM] Buyer connected: Level {buyer_player.get('level', '?')}{RESET}")

            initial_seller_gold = seller_player.get("gold", 0)
            initial_buyer_gold = buyer_player.get("gold", 0)

            flush_print(f"[DEBUG] Transfer params: base_id={args.base_id}, power={args.power}, count={args.count}")
            all_seller_cards = get_all_cards_extended(seller_bot, result["logs"])
            flush_print(f"[DEBUG] Total seller cards: {len(all_seller_cards)}")

            cards = get_cards_by_base_id(seller_bot, args.base_id, result["logs"])
            flush_print(f"[DEBUG] Cards matching base_id {args.base_id}: {len(cards)}")

            if args.power is not None:
                cards = [c for c in cards if c.get("power") == args.power]
                flush_print(f"[DEBUG] After power filter ({args.power}): {len(cards)}")

            if args.count is not None:
                cards = cards[:args.count]
                flush_print(f"[DEBUG] After count limit ({args.count}): {len(cards)}")

            if not cards:
                result["data"]["error"] = "No cards found matching criteria"
                result["success"] = False
                flush_print(f"\n{RED}No cards found!{RESET}")
                output_result(result, args.seller)
                disconnect(seller_bot)
                if buyer_bot:
                    disconnect(buyer_bot)
                return 1

            total_cards = len(cards)
            flush_print(f"\n{GREEN}{BOLD}Starting transfer of {total_cards} cards...{RESET}\n")

            transfers = []
            for idx, card in enumerate(cards, 1):
                attempt = 0
                transfer_success = False

                while attempt < MAX_RETRIES_PER_CARD and not transfer_success:
                    attempt += 1
                    if attempt > 1:
                        flush_print(f"{YELLOW}Retrying... (attempt {attempt}/{MAX_RETRIES_PER_CARD}){RESET}")
                        sleep(2)

                    transfer_res = transfer_single_card(
                        seller_bot, buyer_bot, card, args.base_id, result["logs"], idx, total_cards
                    )

                    if transfer_res["status"] == "success":
                        transfers.append({
                            "card_id": card.get("id"),
                            "base_id": args.base_id,
                            "power": card.get("power"),
                            "status": "success",
                            "attempts": attempt,
                            "interferers": transfer_res.get("interferers", []),
                            "bids_used": transfer_res.get("bids_used", 0)
                        })
                        transfer_success = True
                    elif attempt >= MAX_RETRIES_PER_CARD:
                        transfers.append({
                            "card_id": card.get("id"),
                            "base_id": args.base_id,
                            "power": card.get("power"),
                            "status": "lost",
                            "attempts": attempt,
                            "final_stage": transfer_res.get("stage"),
                            "reason": transfer_res.get("reason"),
                            "interferers": transfer_res.get("interferers", [])
                        })
                        flush_print(f"{RED}{BOLD}  ✗ Failed after {MAX_RETRIES_PER_CARD} attempts{RESET}")

                sleep(0.5)

            # Summary
            success_count = sum(1 for t in transfers if t["status"] == "success")
            lost_count = len(transfers) - success_count

            flush_print(f"\n{BOLD}{'='*50}{RESET}")
            flush_print(f"{GREEN}Success: {success_count}{RESET} | {RED}Lost: {lost_count}{RESET}")
            flush_print(f"{BOLD}{'='*50}{RESET}\n")

            try:
                final_seller = retry_api_call(lambda: seller_bot.loadPlayer(True), logs=result["logs"])
                final_buyer = retry_api_call(lambda: buyer_bot.loadPlayer(True), logs=result["logs"])
                final_seller_gold = final_seller.get("gold", 0)
                final_buyer_gold = final_buyer.get("gold", 0)
            except Exception as e:
                final_seller_gold = None
                final_buyer_gold = None
                flush_print(f"{YELLOW}[WARNING] Could not fetch final gold amounts: {e}{RESET}")

            all_interferers = set()
            for t in transfers:
                all_interferers.update(t.get("interferers", []))

            result["data"] = {
                "transfers": transfers,
                "summary": {
                    "total": len(transfers),
                    "success": success_count,
                    "lost": lost_count,
                    "all_interferers": list(all_interferers),
                    "seller_gold_initial": initial_seller_gold,
                    "buyer_gold_initial": initial_buyer_gold,
                    "seller_gold_final": final_seller_gold,
                    "buyer_gold_final": final_buyer_gold,
                    "gold_moved": abs(final_seller_gold - initial_seller_gold) if final_seller_gold is not None else None
                }
            }
            result["success"] = (lost_count == 0)

            # ⭐ خروجی به فایل
            output_result(result, args.seller)

            sleep(0.2)
            disconnect(seller_bot)
            if buyer_bot:
                disconnect(buyer_bot)
            return 0 if result["success"] else 1

    except Exception as e:
        flush_print(f"\n{RED}{BOLD}[FATAL ERROR] {str(e)}{RESET}")
        result["error"] = str(e)
        result["success"] = False
        import traceback
        result["traceback"] = traceback.format_exc()

        # ⭐ حتی در حالت خطا هم خروجی به فایل
        if 'args' in locals():
            output_result(result, args.seller)
        else:
            # اگر args تعریف نشده (خطای پارامترها)، fallback به stdout
            flush_print(f"---RESULT_START---")
            flush_print(json.dumps(result, ensure_ascii=False))
            flush_print(f"---RESULT_END---")

        if seller_bot:
            disconnect(seller_bot)
        if buyer_bot:
            disconnect(buyer_bot)
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
