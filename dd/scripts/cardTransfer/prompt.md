# sakht form braye script card transfer

## inputs (form1):
1. seller restore key * -> str , text
2. buyer restore key * -> str, text

## steps:
1. form 1
2. run on mode 1
3. get cards list
4. sort and design 
5. select catg card 
6. import count cards 
7. start transfer and show results on streamming

## select catg card (step 5):
vaghti ke script run shod o card ha ro sort shode neshon dad , user bayad yeki az categori ha ro select kone , tedad card haii ke mikhad transfer kone ro besge ( step 6) ta bere braye run shodan nahaii 

## get cards ( step 3 ):
vaghti ba mode 1 run mishe [python main.py --seller "there90837591"] chenin resulti dare :
```json 
{
  "success": true,
  "timestamp": "2026-04-13T12:37:44.482540",
  "mode": "list_cards",
  "logs": [
    {
      "timestamp": "2026-04-13T12:37:44.482561",
      "level": "info",
      "message": "Connecting to account 'seller'..."
    },
    {
      "timestamp": "2026-04-13T12:37:45.628631",
      "level": "info",
      "message": "Account 'seller' connected. Gold: 32109622774"
    }
  ],
  "data": {
    "seller_gold": 32109622774,
    "seller_level": 1922,
    "total_cards": 292,
    "cards_by_power": {
      "2553806841": [
        {
          "card_id": 726464130,
          "base_id": 841,
          "power": 2553806841,
          "name": "Unknown"
        }
      ],
      "2239415516": [
        {
          "card_id": 726456198,
          "base_id": 843,
          "power": 2239415516,
          "name": "Unknown"
        }
      ],
      "89960493": [
        {
          "card_id": 726460714,
          "base_id": 399,
          "power": 89960493,
          "name": "Unknown"
        }
      ],
      "240000": [
        {
          "card_id": 739186249,
          "base_id": 316,
          "power": 240000,
          "name": "Unknown"
        }
      ],
      "25": [
        {
          "card_id": 739165742,
          "base_id": 121,
          "power": 25,
          "name": "Unknown"
        }
      ],
      "23": [
        {
          "card_id": 739165795,
          "base_id": 275,
          "power": 23,
          "name": "Unknown"
        }
      ]
    }
  }
}
```
ke mire braye sort o show shodan 

## sort and design (step 4 ):
bayad hame ro bar assas priority (obj name {data.cards_by_power.*}) be tartib neshon bede albate ke bayad az yek filter mohem rad beshe ke oon ham block list (braye base id ha) hast ke base id haye block shode ro nabayad neshon bede ,va yek list json dige darim ke name barkhi az base id ha ro dar oon vared kardim chon hamishe name == unknown hast ( unknown ha ro nabayad nameshono neshon bede  )
va inke dar har page nation max 5 catg ro bayad neshon bede 
dar balaye page ham yek range hast ke user mitone min o max poer card haii ke neshon mide ro moshakhas kone ( default min=14 , max=30000000000)
mikham be sorat 3B,15M,500K o ... neshon date beshe ke zaher behtari dashte bashe

## import count cards ( step 6 ):
yek form miare ke number input hast 3 btn komaki dare , -1/+1/max 
baad mire braye run

## start transfer and show results on streaming ( step 7 ):
chon result ha be sorat json hast , mitone oon ha ro be sorat yek ui ziba o hamgam ba ui panel neshon bede 


## code script: 
```python 
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

def write_log(symbol, msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ {symbol} ] {msg}\n")

def log_entry(result_logs, level, message):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "message": message
    }
    result_logs.append(entry)
    write_log(level[0].upper(), message)
    print(f"[{level.upper()}] {message}", file=sys.stderr)

def retry_api_call(fn, retries=6, delay=2, logs=None):
    for i in range(retries):
        try:
            return fn()
        except UnknownError:
            if logs:
                log_entry(logs, "warning", f"UnknownError - retry {i+1}/{retries}...")
            sleep(delay)
        except Exception as e:
            raise e
    return None

def connect(restore_key, label, logs):
    log_entry(logs, "info", f"Connecting to account '{label}'...")
    try:
        session_dir = '../config/sessions'

        # 2. ایجاد پوشه در صورت عدم وجود (خیلی مهم)
        if not os.path.exists(session_dir):
            os.makedirs(session_dir)

        # 3. تعیین مسیر کامل فایل سشن
        # کتابخانه fruitbot به صورت خودکار .fb به آخر آن اضافه می‌کند
        session = os.path.join(session_dir, restore_key)

        print(f"📂 Session Path: {session}.fb")
        bot = Client(session_name=session, restore_key=restore_key)
        retry_api_call(bot.getConstants, logs=logs)
        player = retry_api_call(lambda: bot.loadPlayer(True), logs=logs)
    except OnlineOnAnotherDevice:
        log_entry(logs, "error", f"Account '{label}' online on another device")
        raise
    except AccessDenied:
        log_entry(logs, "error", f"Account '{label}': Access Denied - invalid or expired restore key")
        raise

    if not player:
        raise Exception(f"Failed to connect to '{label}'")

    gold = player.get("gold", 0)
    log_entry(logs, "info", f"Account '{label}' connected. Gold: {gold}")
    return bot, player

def get_all_cards(bot, logs):
    player = retry_api_call(lambda: bot.loadPlayer(True), logs=logs)
    return player.get("cards", [])

def get_cards_by_base_id(bot, base_id, logs):
    cards = get_all_cards(bot, logs)
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
        log_entry(logs, "error", f"Card {card_id} cannot be sold (hero/crystal?)")
    except CardAlreadyInAuction:
        log_entry(logs, "error", f"Card {card_id} already in auction")
    except CardTypeNotFound:
        log_entry(logs, "error", f"Card type {card_id} not found")
    except Exception as e:
        log_entry(logs, "error", f"Submit error: {str(e)}")
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
        log_entry(logs, "error", f"Bid error: {str(e)}")
        return False

def do_sell_now(seller_bot, auction_id, logs):
    try:
        retry_api_call(lambda: seller_bot.sellCardNow(auction_id), logs=logs)
        return True
    except Exception as e:
        log_entry(logs, "error", f"SellNow error: {str(e)}")
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

def transfer_single_card(seller_bot, buyer_bot, card, base_id, logs):
    card_id = card.get("id")
    power = card.get("power", "?")

    log_entry(logs, "info", f"Processing card {card_id} (power: {power})")

    # Submit to auction
    if submit_card(seller_bot, card_id, logs) is None:
        return {"status": "lost", "stage": "submit", "reason": "failed_to_submit"}

    # Find auction
    auction_id = find_auction(buyer_bot, base_id, card_id, logs)
    if not auction_id:
        log_entry(logs, "warning", f"Auction not found for card {card_id}")
        return {"status": "lost", "stage": "find_auction", "reason": "auction_not_found"}

    log_entry(logs, "info", f"Auction found: {auction_id}")

    # Bid and sell
    interferers = set()
    buyer_id = get_buyer_id(buyer_bot, logs)

    for bid_num in range(1, MAX_BIDS + 1):
        log_entry(logs, "info", f"Bid {bid_num}/{MAX_BIDS} ...")

        if not do_bid(buyer_bot, auction_id, logs):
            return {"status": "lost", "stage": f"bid_{bid_num}", "reason": "bid_failed"}

        # Check auction state
        try:
            auction_info = retry_api_call(lambda: buyer_bot.searchAuctionCardsById(base_id), logs=logs)
            auctions = auction_info if isinstance(auction_info, list) else (auction_info or {}).get("auctions", [])
            current = next((a for a in auctions if a.get("auction_id") == auction_id or a.get("id") == auction_id), None)

            if current:
                bidders = current.get("bidders", [])
                other_bidders = [b for b in bidders if b != buyer_id]
                if other_bidders:
                    interferers.update(other_bidders)
                    log_entry(logs, "warning", f"Interference detected: {other_bidders}")
                    if bid_num < MAX_BIDS:
                        continue
        except Exception as e:
            log_entry(logs, "error", f"Error checking auction state: {e}")

        # Try sell now
        if do_sell_now(seller_bot, auction_id, logs):
            log_entry(logs, "info", f"Card {card_id} transferred successfully")
            return {
                "status": "success",
                "card_id": card_id,
                "auction_id": auction_id,
                "interferers": list(interferers),
                "bids_used": bid_num
            }
        else:
            return {"status": "lost", "stage": "sell_now", "reason": "sell_failed"}

    return {"status": "lost", "stage": "max_bids_reached", "reason": "too_many_interferers", "interferers": list(interferers)}

def main():
    parser = argparse.ArgumentParser(description='Card Transfer Tool (NovaEX)')
    parser.add_argument('--seller', required=True, help='Restore key for seller')
    parser.add_argument('--buyer', required=True, help='Restore key for buyer')
    parser.add_argument('--base-id', type=int, default=None,
                        help='Base ID of card to transfer (if not provided, lists cards)')
    parser.add_argument('--power', type=int, default=None,
                        help='Filter cards by power (optional)')
    parser.add_argument('--count', type=int, default=None,
                        help='Number of cards to transfer (optional, default: all matching)')

    args = parser.parse_args()

    result = {
        "success": False,
        "timestamp": datetime.now().isoformat(),
        "mode": None,
        "logs": [],
        "data": {}
    }

    try:
        seller_bot, seller_player = connect(args.seller, "seller", result["logs"])

        if args.base_id is None:
            # Mode 1: List cards
            result["mode"] = "list_cards"
            cards = get_all_cards(seller_bot, result["logs"])

            power_groups = {}
            for card in cards:
                p = card.get("power", 0)
                base = card.get("base_card_id") or card.get("base_id")
                name = card.get("name", "Unknown")

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

        else:
            # Mode 2: Transfer
            result["mode"] = "transfer"
            buyer_bot, buyer_player = connect(args.buyer, "buyer", result["logs"])

            initial_seller_gold = seller_player.get("gold", 0)
            initial_buyer_gold = buyer_player.get("gold", 0)

            cards = get_cards_by_base_id(seller_bot, args.base_id, result["logs"])

            if args.power is not None:
                cards = [c for c in cards if c.get("power") == args.power]

            if args.count is not None:
                cards = cards[:args.count]

            if not cards:
                result["data"]["error"] = "No cards found matching criteria"
                result["success"] = False
                print(json.dumps(result, ensure_ascii=False, indent=2))
                sys.exit(1)

            log_entry(result["logs"], "info", f"Selected {len(cards)} cards for transfer")

            transfers = []
            for card in cards:
                card_id = card.get("id")
                attempt = 0
                transfer_success = False

                while attempt < MAX_RETRIES_PER_CARD and not transfer_success:
                    attempt += 1
                    if attempt > 1:
                        log_entry(result["logs"], "info",
                                  f"Retrying card {card_id}, attempt {attempt}/{MAX_RETRIES_PER_CARD}")
                        sleep(2)

                    transfer_res = transfer_single_card(
                        seller_bot, buyer_bot, card, args.base_id, result["logs"]
                    )

                    if transfer_res["status"] == "success":
                        transfers.append({
                            "card_id": card_id,
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
                            "card_id": card_id,
                            "base_id": args.base_id,
                            "power": card.get("power"),
                            "status": "lost",
                            "attempts": attempt,
                            "final_stage": transfer_res.get("stage"),
                            "reason": transfer_res.get("reason"),
                            "interferers": transfer_res.get("interferers", [])
                        })

                sleep(0.5)

            # Get final gold amounts
            try:
                final_seller = retry_api_call(lambda: seller_bot.loadPlayer(True), logs=result["logs"])
                final_buyer = retry_api_call(lambda: buyer_bot.loadPlayer(True), logs=result["logs"])
                final_seller_gold = final_seller.get("gold", 0)
                final_buyer_gold = final_buyer.get("gold", 0)
            except Exception as e:
                log_entry(result["logs"], "warning", f"Could not fetch final gold amounts: {e}")
                final_seller_gold = None
                final_buyer_gold = None

            success_count = sum(1 for t in transfers if t["status"] == "success")
            lost_count = len(transfers) - success_count
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

    except Exception as e:
        log_entry(result["logs"], "error", f"Fatal error: {str(e)}")
        result["error"] = str(e)
        result["success"] = False

    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
```

## code form nemone :
``` tsx
'use client';

import { useState } from 'react';
import {
    Search, Key, ArrowRight, Terminal, Shield,
    Users, Trophy, Play, X, Loader2
} from 'lucide-react';
import { formatCompactNumber } from "@/lib/utils";
import Link from "next/link";

// --- انواع داده ---
interface Tribe {
    id: number;
    name: string;
    description: string;
    score: number;
    rank: number;
    member_count: number;
}
type JoinStatusType = 'loading' | 'success' | 'invalid_RestoreKey' | 'undecided_request' | 'already_in_tribe' | 'error';

// --- کامپوننت Modal برای نمایش وضعیت Join ---
const JoinModal = ({
                       isOpen,
                       onClose,
                       status,
                       tribeName,
                       onLeaveTribe // تابعی برای خروج از قبیله (اختیاری، فعلا فقط پیام می‌دهد)
                   }: {
    isOpen: boolean;
    onClose: () => void;
    status: JoinStatusType;
    tribeName?: string;
    onLeaveTribe?: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box text-center">

                {/* 1. Loading */}
                {status === 'loading' && (
                    <>
                        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                        <h3 className="font-bold text-lg text-primary">در حال پردازش...</h3>
                        <p className="py-4">درخواست شما به سرور بازی ارسال شد.</p>
                    </>
                )}

                {/* 2. Success (موفقیت) */}
                {status === 'success' && (
                    <>
                        <div className="text-success mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-success">تبریک!</h3>
                        <p className="py-4">شما عضو قبیله <b>{tribeName}</b> شدید.</p>
                        <div className="modal-action justify-center">
                            <button className="btn btn-success" onClick={onClose}>عالی</button>
                        </div>
                    </>
                )}

                {/* 3. Undecided Request (درخواست معلق) */}
                {status === 'invalid_RestoreKey' && (
                    <>
                        <div className="text-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-warning">کلید بازیابی نامعتبر</h3>
                        <p className="py-4">
                            کلید بازیابی وارد شده نامعتبر است.
                            <br/><span className="text-xs opacity-70">(Invalid Restore Key)</span>
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>متوجه شدم</button>
                            <button className="btn btn-warning" onClick={onClose}>سعی مجدد</button>
                        </div>
                    </>
                )}

                {/* 3. Undecided Request (درخواست معلق) */}
                {status === 'undecided_request' && (
                    <>
                        <div className="text-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-warning">در انتظار تایید</h3>
                        <p className="py-4">
                            شما قبلاً یک درخواست عضویت برای این قبیله فرستاده‌اید که هنوز تایید یا رد نشده است.
                            <br/><span className="text-xs opacity-70">(Undecided Request)</span>
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>متوجه شدم</button>
                            <button className="btn btn-warning" onClick={onClose}>سعی مجدد</button>
                        </div>
                    </>
                )}

                {/* 4. Already In Tribe (قبلا عضو هستید) */}
                {status === 'already_in_tribe' && (
                    <>
                        <div className="text-info mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-info">شما عضو قبیله دیگری هستید</h3>
                        <p className="py-4">
                            شما هم‌اکنون عضو یک قبیله هستید. برای عضویت در <b>{tribeName}</b> باید از قبیله فعلی خارج شوید.
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>لغو</button>
                            {/* اینجا می‌توانید بعداً تابع خروج از قبیله را صدا بزنید */}
                            <button className="btn btn-error" onClick={() => {
                                alert("دکمه خروج از قبیله هنوز پیاده نشده است.");
                                onClose();
                            }}>خروج از قبیله فعلی</button>
                        </div>
                    </>
                )}

                {/* 5. General Error */}
                {status === 'error' && (
                    <>
                        <div className="text-error mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-error">خطا</h3>
                        <p className="py-4">مشکلی در برقراری ارتباط رخ داد.</p>
                        <div className="modal-action justify-center">
                            <button className="btn" onClick={onClose}>بستن</button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default function TribePage() {
    const [step, setStep] = useState(1); // 1: Key, 2: Search, 3: Terminal
    const [restoreKey, setRestoreKey] = useState('');

    // Search States (قبلی)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Tribe[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // ✅ استیت‌های جدید برای Modal Join
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [joinStatus, setJoinStatus] = useState<JoinStatusType>('loading');
    const [selectedTribeName, setSelectedTribeName] = useState('');

    // Terminal States (می‌توانید بگذارید اگر جایی دیگر نیاز شد)
    const [terminalOutput, setTerminalOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);



    // --- Handlers ---

    const handleKeySubmit = () => {
        if (restoreKey.trim()) setStep(2);
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchResults([]);
        setTerminalOutput('');

        try {
            const response = await fetch('/api/tribe/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: restoreKey,
                    mode: 'search',
                    target: searchQuery
                }),
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body?.getReader();
            // console.log(reader)
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    buffer += text;

                    // --- تغییری که اینجا دادم ---
                    const startTag = '---RESULT_START---';
                    const endTag = '---RESULT_END---';
                    //
                    const startIdx = buffer.indexOf(startTag);
                    const endIdx = buffer.indexOf(endTag);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const jsonStr = buffer.substring(startIdx + startTag.length, endIdx).trim();
                        try {
                            const data = JSON.parse(jsonStr);

                            // ✅ اصلاحیه اصلی: چک کردن اینکه آیا data.tribes وجود دارد؟
                            // چون خروجی پایتون { "tribes": [...] } است
                            if (data && Array.isArray(data.tribes)) {
                                setSearchResults(data.tribes);
                            } else if (Array.isArray(data)) {
                                // اگر مستقیما آرایه بود (برای آینده)
                                setSearchResults(data);
                            } else {
                                console.error("Unknown structure:", data);
                                setSearchResults([]);
                            }

                        } catch (e) {
                            console.error('Parse Error', e);
                        }
                        break;
                    }
                }
            }

        } catch (error) {
            console.error('Search failed', error);
            alert('خطا در جستجو. لطفا کلید و اینترنت را چک کنید.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleJoin = async (tribe: Tribe) => {
        setSelectedTribeName(tribe.name);
        setJoinStatus('loading');
        setIsModalOpen(true);

        try {
            const response = await fetch('/api/tribe/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: restoreKey,
                    mode: 'join',
                    target: tribe.id
                }),
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let joinStatusFound = false;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    buffer += text;

                    // 1. چک کردن نتیجه Join
                    const startTag = '---JOIN_RESULT---';
                    const endTag = '---JOIN_END---';

                    const startIdx = buffer.indexOf(startTag);
                    const endIdx = buffer.indexOf(endTag);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const jsonStr = buffer.substring(startIdx + startTag.length, endIdx).trim();
                        try {
                            const result = JSON.parse(jsonStr);

                            if (result.status === 'success') {
                                setJoinStatus('success');
                            } else if (result.status === 'undecided_request') {
                                setJoinStatus('undecided_request');
                            } else if (result.status === 'already_in_tribe') {
                                setJoinStatus('already_in_tribe');
                            } else {
                                setJoinStatus('error');
                            }

                            joinStatusFound = true;
                            break;
                        } catch (e) {
                            console.error('JSON Parse Error in Join', e);
                        }
                    }
                }
            }

            // اگر خروجی تمام شد ولی نتیجه Join پیدا نشد (خطای ناشناخته)
            if (!joinStatusFound) {
                setJoinStatus('error');
            }

        } catch (error) {
            console.error('Network/Script Error', error);
            setJoinStatus('error');
        }
    };

    // --- UI Components ---

    return (
        <div className="items-center justify-center  p-4 font-sans w-full">
            <div className="mx-auto">

                {/* STEP 1: Input Key */}
                {step === 1 && (
                    <div className="card bg-base-100 shadow-xl max-w-md mx-auto mt-10">
                        <div className="card-body items-center text-center">
                            <div className="p-4 bg-primary/10 rounded-full mb-4">
                                <Key className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="card-title text-2xl">احراز هویت</h2>
                            <p className="text-sm text-gray-500 mb-6">کلید بازیابی اکانت خود را وارد کنید</p>

                            <input
                                type="text"
                                name="EX-restoreKey"
                                placeholder="Restore Key (مثال: gold9...)"
                                className="input input-bordered w-full mb-4 font-mono"
                                value={restoreKey}
                                onChange={(e) => setRestoreKey(e.target.value)}
                            />

                            <button
                                className="btn btn-primary w-full"
                                disabled={!restoreKey}
                                onClick={handleKeySubmit}
                            >
                                ورود <ArrowRight className="w-4 h-4 mr-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Search & Select */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="card bg-base-100 shadow-sm p-4 flex justify-between items-center">
                            <span className="font-mono text-sm opacity-70 truncate max-w-[200px]">{restoreKey}</span>
                            <button className="btn btn-ghost btn-xs" onClick={() => setStep(1)}>تغییر کلید</button>
                        </div>

                        {/* Search Bar */}
                        <div className="join w-full shadow-md">
                            <input
                                className="input input-bordered join-item w-full"
                                placeholder="نام قبیله را جستجو کنید..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                className={`btn join-item btn-primary ${isSearching ? 'loading' : ''}`}
                                onClick={handleSearch}
                            >
                                {!isSearching && <Search className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Results Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isSearching && (
                                <div className="col-span-full py-10 text-center">
                                    <Loader2 className="animate-spin mx-auto text-primary mb-2" />
                                    <span className="text-sm opacity-70">در حال جستجو...</span>
                                </div>
                            )}

                            {!isSearching && searchResults.length > 0 && searchResults.map((tribe) => (
                                <div key={tribe.id} className="card bg-base-100 border border-base-200 hover:border-primary transition-all">
                                    <div className="card-body p-4">
                                        <div className="flex justify-between ">
                                            <h3 className="font-bold text-lg">{tribe.name}</h3>
                                            <div className="badge badge-ghost">#{tribe.rank}</div>
                                        </div>
                                        <p className="text-xs text-gray-500 border-base-200 border-b-2 pb-2 truncate">{tribe.description}</p>
                                        <div className="flex gap-6 text-sm shadow-inner p-2 rounded-box max-h-28">
                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-primary mb-1"><Users className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.member_count)}</div>
                                                <div className="text-lg">عضو</div>
                                            </div>


                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-secondary mb-1"><Trophy className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.score)}</div>
                                                <div className="text-lg">امتیاز</div>
                                            </div>

                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-success mb-1"><Trophy className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.score)}</div>
                                                <div className="text-lg">امتیاز</div>
                                            </div>
                                        </div>

                                        <div className="card-actions justify-end border-base-200 border-t-2 pt-3 ">
                                            <button
                                                className="btn btn-sm btn-primary w-full gap-2"
                                                onClick={() => handleJoin(tribe)}
                                            >
                                                <Play className="w-3 h-3" /> عضویت در قبیله
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <div className="col-span-full text-center py-10 opacity-50">
                                    موردی یافت نشد.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Terminal / Running */}
                {step === 3 && (
                    <div className="card bg-[#1e1e1e] text-green-400 shadow-2xl min-h-[400px] flex flex-col font-mono text-sm overflow-hidden">
                        <div className="bg-[#2d2d2d] p-2 flex justify-between items-center border-b border-gray-700">
                            <div className="flex gap-2 items-center">
                                <Terminal className="w-4 h-4" />
                                <span className="text-xs">Drone Script Output</span>
                            </div>
                            {isRunning && <span className="loading loading-spinner loading-xs text-success"></span>}
                        </div>

                        <div className="p-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
                            {terminalOutput}
                            {isRunning && <span className="animate-pulse">_</span>}
                        </div>

                        <div className="p-2 bg-[#2d2d2d] border-t border-gray-700 text-center">
                            <button
                                className="btn btn-sm btn-ghost text-red-400"
                                onClick={() => setStep(2)}
                                disabled={isRunning}
                            >
                                بستن ترمینال
                            </button>
                        </div>
                    </div>
                )}

            </div>
            <JoinModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                status={joinStatus}
                tribeName={selectedTribeName}
            />
            <Link
                type="button"
                href="."
                // onClick={() => router.push('/..')}
                className="w-full btn btn-ghost items-center justify-center gap-3 rounded-box border-2 border-base-100 bg-base-200 px-4 py-3 my-3 text-sm font-medium"
            >
                <ArrowRight className="w-4 h-4 rotate-180" />
                بازگشت
            </Link>
        </div>
    );
}
```