#!/usr/bin/env python3
import argparse
import json
import sys
import traceback
from time import sleep
from fruitbot import Client
from fruitbot.exceptions import InvalidRestoreKey, AccountBlocked, ServerMaintenance, OnlineOnAnotherDevice, UnknownError

LOG_FILE = "card_transfer_log.txt"

def stream_output(data):
    try:
        print("---STREAM---", flush=True)
        print(json.dumps(data, ensure_ascii=False), flush=True)
        print("---STREAM_END---", flush=True)
    except Exception as e:
        print(f"---STREAM---\n{{\"type\":\"error\",\"message\":\"Stream error: {e}\"}}\n---STREAM_END---", flush=True)

def log(symbol, color, msg):
    # color ignored for stream, just print to stderr
    print(f"[{symbol}] {msg}", file=sys.stderr)

def connect(restore_key, label):
    stream_output({"type": "info", "message": f"Connecting to {label}..."})
    try:
        bot = Client(session_name=restore_key, restore_key=restore_key)
        bot.getConstants()
        player = bot.loadPlayer(True)
    except InvalidRestoreKey:
        stream_output({"type": "error", "subtype": "invalid_key", "message": f"Invalid restore key for {label}"})
        sys.exit(1)
    except AccountBlocked:
        stream_output({"type": "error", "subtype": "account_blocked", "message": f"Account {label} blocked"})
        sys.exit(1)
    except ServerMaintenance:
        stream_output({"type": "error", "subtype": "server_maintenance", "message": "Server maintenance"})
        sys.exit(1)
    except OnlineOnAnotherDevice:
        stream_output({"type": "error", "subtype": "online_another_device", "message": f"{label} is online on another device"})
        sys.exit(1)
    except Exception as e:
        stream_output({"type": "error", "message": f"Unexpected error connecting {label}: {e}"})
        sys.exit(1)
    gold = player.get("gold", 0)
    stream_output({"type": "info", "message": f"{label} connected. Gold: {gold}"})
    return bot, player

def submit_card(seller_bot, card_id):
    try:
        return seller_bot.submitCardForAuction(card_id)
    except Exception as e:
        stream_output({"type": "error", "message": f"Submit card error: {e}"})
        return None

def find_auction(buyer_bot, base_card_id, card_id):
    result = buyer_bot.searchAuctionCardsById(base_card_id)
    auctions = result if isinstance(result, list) else result.get("auctions", [])
    for a in auctions:
        if a.get("card_id") == card_id:
            return a.get("id")
    return None

def do_bid(buyer_bot, auction_id):
    try:
        buyer_bot.bidUpCardInAuction(auction_id)
        return True
    except:
        return False

def do_sell_now(seller_bot, auction_id):
    try:
        seller_bot.sellCardNow(auction_id)
        return True
    except:
        return False

def get_cards_by_power(seller_bot, target_power, target_count):
    player = seller_bot.loadPlayer(True)
    all_cards = player.get("cards", [])
    power_cards = [c for c in all_cards if c.get("power", 0) == target_power]
    if len(power_cards) < target_count:
        stream_output({"type": "error", "message": f"Only {len(power_cards)} cards with power {target_power} available, requested {target_count}"})
        return []
    return power_cards[:target_count]

def transfer_cards(seller_bot, buyer_bot, cards, max_bids):
    success = 0
    lost = 0
    interferers = set()
    total = len(cards)
    for idx, card in enumerate(cards, 1):
        card_id = card.get("id")
        base_id = card.get("base_card_id") or card.get("base_id")
        power = card.get("power", "?")
        stream_output({"type": "card_start", "index": idx, "total": total, "card_id": card_id, "power": power})

        if not card_id or not base_id:
            stream_output({"type": "card_result", "card_id": card_id, "success": False, "message": "Missing id or base_id"})
            lost += 1
            continue

        # submit auction
        if submit_card(seller_bot, card_id) is None:
            lost += 1
            continue

        # find auction
        auction_id = find_auction(buyer_bot, base_id, card_id)
        if not auction_id:
            stream_output({"type": "card_result", "card_id": card_id, "success": False, "message": "Auction not found"})
            lost += 1
            continue

        sold = False
        for bid_num in range(1, max_bids + 1):
            if not do_bid(buyer_bot, auction_id):
                stream_output({"type": "card_result", "card_id": card_id, "success": False, "message": f"Bid {bid_num} failed"})
                break

            # check other bidders
            auction_info = buyer_bot.searchAuctionCardsById(base_id)
            auctions = auction_info if isinstance(auction_info, list) else (auction_info or {}).get("auctions", [])
            current = next((a for a in auctions if a.get("auction_id") == auction_id), None)
            if current:
                bidders = current.get("bidders", [])
                other = [b for b in bidders if b != buyer_bot.player_id]
                if other:
                    interferers.update(other)
                    stream_output({"type": "info", "message": f"Interferer detected: {other}"})
                    if bid_num < max_bids:
                        continue

            if do_sell_now(seller_bot, auction_id):
                stream_output({"type": "card_result", "card_id": card_id, "success": True, "message": f"Card transferred successfully"})
                success += 1
                sold = True
                break
            else:
                stream_output({"type": "card_result", "card_id": card_id, "success": False, "message": "Failed to sell now"})
                break
        if not sold:
            lost += 1
        sleep(0.5)

    # final report
    sp = seller_bot.loadPlayer(True)
    bp = buyer_bot.loadPlayer(True)
    stream_output({
        "type": "end",
        "report": {
            "success": success,
            "lost": lost,
            "interferers": list(interferers),
            "seller_gold": sp.get("gold", 0),
            "buyer_gold": bp.get("gold", 0)
        }
    })

def main():
    parser = argparse.ArgumentParser(description="Transfer cards between two accounts")
    parser.add_argument("--seller-key", required=True, help="Restore key of seller")
    parser.add_argument("--buyer-key", required=True, help="Restore key of buyer")
    parser.add_argument("--power", type=int, required=True, help="Card power to transfer")
    parser.add_argument("--count", type=int, required=True, help="Number of cards to transfer")
    parser.add_argument("--max-bids", type=int, default=7, help="Maximum bids per card")
    args = parser.parse_args()

    stream_output({"type": "info", "message": f"Starting card transfer: power={args.power}, count={args.count}"})

    seller_bot, _ = connect(args.seller_key, "seller")
    buyer_bot, _ = connect(args.buyer_key, "buyer")

    cards = get_cards_by_power(seller_bot, args.power, args.count)
    if not cards:
        stream_output({"type": "error", "message": "No suitable cards found. Exiting."})
        sys.exit(1)

    transfer_cards(seller_bot, buyer_bot, cards, args.max_bids)

if __name__ == "__main__":
    main()