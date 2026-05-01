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

# Colors
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"
C = "\033[96m"; M = "\033[95m"; B = "\033[94m"
X = "\033[0m"; BD = "\033[1m"

class ErrorCode:
    VAL_001 = "VAL_001"  # Missing required fields
    VAL_002 = "VAL_002"  # Invalid mode
    VAL_003 = "VAL_003"  # Count must be at least 1
    AVL_001 = "AVL_001"  # No cards found
    SYS_001 = "SYS_001"  # System/Connection error
    SYS_003 = "SYS_003"  # another online
    SYS_004 = "SYS_004"  # access denied
    SYS_005 = "SYS_005"  # Unknown error
    TRF_001 = "TRF_001"  # Transfer process error

def log(msg, color=X, end=None):
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"{color}[{timestamp}] {msg}{X}"
    print(line, end=end)
    sys.stdout.flush()
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except:
        pass

def send_error(code, details=None):
    """ارسال خطا با کد استاندارد"""
    result = {
        "success": False,
        "error_code": code,
        "details": details or {},
        "summary": {}
    }
    output_result(result)
    sys.exit(1)

def retry(fn, retries=6, delay=1.5):
    for i in range(retries):
        try:
            return fn()
        except UnknownError:
            log(f"Retry {i+1}/{retries}...", Y)
            sleep(delay)
        except Exception as e:
            raise e
    return None

def connect(restore_key, label):
    try:
        session_dir = '../../config/sessions'
        os.makedirs(session_dir, exist_ok=True)
        session = os.path.join(session_dir, restore_key)
        bot = Client(session_name=session, restore_key=restore_key)
        retry(bot.getConstants)
        player = retry(lambda: bot.loadPlayer(True))
        if not player:
            raise Exception(f"Failed to load player: {label}")
        log(f"{label.upper()} connected: Lv.{player.get('level','?')} | Gold: {player.get('gold',0)}", G)
        return bot, player
    except OnlineOnAnotherDevice:
        send_error(ErrorCode.SYS_003, {"message": f"{label}: Online on another device"})
    except AccessDenied:
        send_error(ErrorCode.SYS_004, {"message": f"{label}: Access Denied"})
    except Exception as e:
        send_error(ErrorCode.SYS_005, {"message": f"{label}: {str(e)}"})

def disconnect(bot):
    try:
        bot.stopUpdates()
        log("Disconnected", C)
    except:
        pass

def get_cards_by_base_id(bot, base_id, count=None):
    player = bot.loadPlayer(True)
    cards = player.get("cards", [])
    base_id_str = str(base_id)
    filtered = []
    for c in cards:
        card_base = str(c.get("base_card_id") or c.get("base_id") or "")
        if card_base == base_id_str:
            print(c)
            filtered.append(c)

    if not filtered:
        send_error(ErrorCode.AVL_001, {"base_id": base_id})

    total_found = len(filtered)
    if count is not None and count > 0:
        filtered = filtered[:count]
        log(f"Found {total_found} cards with base_id {base_id}, limited to first {count}", C)
    else:
        log(f"Found {total_found} cards with base_id {base_id}", C)
    return filtered, total_found

def get_cards_by_ids(bot, ids_list):
    player = bot.loadPlayer(True)
    cards = player.get("cards", [])
    id_set = set(str(x).strip() for x in ids_list)
    filtered = [c for c in cards if str(c.get("id")) in id_set]

    if not filtered:
        send_error(ErrorCode.AVL_001, {"requested_ids": list(id_set)})

    log(f"Found {len(filtered)}/{len(id_set)} requested cards", C)
    return filtered

def submit_card(seller_bot, card_id):
    try:
        return retry(lambda: seller_bot.submitCardForAuction(card_id))
    except CardAlreadyInAuction:
        log(f"Card {card_id}: Already in auction (skipping submit)", Y)
        return "ALREADY_IN_AUCTION"
    except CannotSellCard:
        log(f"Card {card_id}: Cannot sell (Hero/Crystal)", R)
    except CardTypeNotFound:
        log(f"Card {card_id}: Type not found", R)
    except Exception as e:
        log(f"Card {card_id}: Submit error - {e}", R)
    return None

def find_auction(buyer_bot, base_card_id, card_id):
    result = buyer_bot.searchAuctionCardsById(base_card_id)
    if not result:
        return None
    auctions = result if isinstance(result, list) else result.get("auctions", [])
    for a in auctions:
        if a.get("card_id") == card_id:
            return a.get("id")
    return None

def do_bid(buyer_bot, auction_id):
    try:
        retry(lambda: buyer_bot.bidUpCardInAuction(auction_id))
        return True
    except AlreadyHighestBidder:
        return True
    except Exception as e:
        log(f"Bid failed: {e}", R)
        return False

def do_sell_now(seller_bot, auction_id):
    try:
        retry(lambda: seller_bot.sellCardNow(auction_id))
        return True
    except Exception as e:
        log(f"Sell now failed: {e}", R)
        return False

def transfer_card(seller_bot, buyer_bot, card, base_id, idx, total):
    card_id = card.get("id")
    power = card.get("power", "?")
    name = card.get("name", f"Card_{card_id}")

    log(f"\n{BD}[{idx}/{total}]{X} {M}{name}{X} (ID:{card_id}, PWR:{power})")

    auction_result = submit_card(seller_bot, card_id)
    if auction_result is None:
        return {"status": "failed", "stage": "submit", "card_id": card_id}

    already_in_auction = (auction_result == "ALREADY_IN_AUCTION")
    if already_in_auction:
        log(f"  Using existing auction...", B)

    sleep(0.5)
    auction_id = find_auction(buyer_bot, base_id, card_id)
    if not auction_id:
        log("  Auction not found", R)
        return {"status": "failed", "stage": "find_auction", "card_id": card_id}

    log(f"  Auction ID: {auction_id}", B)

    for bid_num in range(1, MAX_BIDS + 1):
        if not do_bid(buyer_bot, auction_id):
            return {"status": "failed", "stage": f"bid_{bid_num}", "card_id": card_id}

        log(f"  Bid {bid_num}/{MAX_BIDS} OK", end=" ")

        try:
            info = buyer_bot.searchAuctionCardsById(base_id)
            auctions = info if isinstance(info, list) else info.get("auctions", [])
            current = next((a for a in auctions if a.get("id") == auction_id), None)
            if current:
                bidders = current.get("bidders", [])
                buyer_id = buyer_bot.player_id if hasattr(buyer_bot, 'player_id') else None
                others = [b for b in bidders if b != buyer_id]
                if others:
                    log(f" [Interference!]", Y)
                    continue
        except:
            pass

        if do_sell_now(seller_bot, auction_id):
            log(f" {G}{BD}✓ SUCCESS{X}")
            return {"status": "success", "card_id": card_id, "bids": bid_num}
        log("")

    log(f"  {R}{BD}✗ Max bids reached{X}")
    return {"status": "failed", "stage": "max_bids", "card_id": card_id}

def output_result(result):
    print("\n" + "="*50)
    print(f"{BD}FINAL RESULT:{X}")
    print("="*50)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("---RESULT_END---")
    sys.stdout.flush()

def main():
    parser = argparse.ArgumentParser(description='NovaEX Card Transfer')
    parser.add_argument('--seller', required=True)
    parser.add_argument('--buyer', required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--base-id', type=int)
    group.add_argument('--ids')
    parser.add_argument('--count', type=int)

    args = parser.parse_args()

    # Validation
    if not args.seller or not args.buyer:
        send_error(ErrorCode.VAL_001, {"field": "seller/buyer"})

    if args.count is not None and args.count < 1:
        send_error(ErrorCode.VAL_003, {"count": args.count})

    result = {
        "success": False,
        "params": {
            "seller": args.seller[:10] + "...",
            "buyer": args.buyer[:10] + "...",
            "target": args.base_id or args.ids,
            "count": args.count
        },
        "summary": {}
    }

    seller_bot = None
    buyer_bot = None

    try:
        log(f"{BD}Connecting Seller...{X}", B)
        seller_bot, seller_player = connect(args.seller, "seller")

        log(f"{BD}Connecting Buyer...{X}", B)
        buyer_bot, buyer_player = connect(args.buyer, "buyer")

        buyer_bot.player_id = buyer_player.get("id")
        initial_seller_gold = seller_player.get("gold", 0)
        initial_buyer_gold = buyer_player.get("gold", 0)

        if args.base_id:
            cards, total_available = get_cards_by_base_id(seller_bot, args.base_id, args.count)
            base_id_for_search = args.base_id

            if args.count is None:
                result["success"] = True
                result["summary"] = {
                    "mode": "base_id",
                    "transfers": [],
                    "card": [
                        {"id": c.get("id"), "base_id": c.get("base_card_id"), "power": c.get("power")}
                        for c in cards[:5]
                    ]
                }
                output_result(result)
                disconnect(seller_bot)
                disconnect(buyer_bot)
                return 0
        else:
            ids_list = [x.strip() for x in args.ids.split(",") if x.strip()]
            if not ids_list:
                send_error(ErrorCode.VAL_001, {"field": "ids"})
            cards = get_cards_by_ids(seller_bot, ids_list)
            base_id_for_search = cards[0].get("base_card_id") if cards else None

        if not cards:
            send_error(ErrorCode.AVL_001)

        log(f"\n{BD}Starting transfer of {len(cards)} cards...{X}\n", M)

        transfers = []
        for idx, card in enumerate(cards, 1):  # اصلاح enumerte به enumerate
            attempt = 0
            success = False

            while attempt < MAX_RETRIES_PER_CARD and not success:
                attempt += 1
                if attempt > 1:
                    log(f"  Retry attempt {attempt}...", Y)
                    sleep(2)

                res = transfer_card(seller_bot, buyer_bot, card, base_id_for_search, idx, len(cards))
                res["attempts"] = attempt

                if res["status"] == "success":
                    transfers.append(res)
                    success = True
                elif attempt >= MAX_RETRIES_PER_CARD:
                    transfers.append(res)
                    log(f"  Failed after {MAX_RETRIES_PER_CARD} attempts", R)

            sleep(0.3)

        success_count = sum(1 for t in transfers if t["status"] == "success")

        try:
            final_seller = seller_bot.loadPlayer(True)
            final_buyer = buyer_bot.loadPlayer(True)
        except:
            final_seller = final_buyer = {}

        result["summary"] = {
            "total": len(cards),
            "success_count": success_count,
            "fail_count": len(cards) - success_count,
            "seller_gold_before": initial_seller_gold,
            "seller_gold_after": final_seller.get("gold"),
            "buyer_gold_before": initial_buyer_gold,
            "buyer_gold_after": final_buyer.get("gold"),
            "gold_moved": abs(final_seller.get("gold",0) - initial_seller_gold) if final_seller else None,
            "transfers": transfers
        }
        result["success"] = (success_count == len(cards))

        output_result(result)
        disconnect(seller_bot)
        disconnect(buyer_bot)
        return 0 if result["success"] else 1

    except SystemExit:
        raise
    except Exception as e:
        log(f"\n{BD}{R}FATAL ERROR: {e}{X}", R)
        send_error(ErrorCode.TRF_001, {"message": str(e)})

if __name__ == "__main__":
    sys.exit(main())