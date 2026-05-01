#!/usr/bin/env python3
import argparse
import json
import os
import signal
import sys
import traceback
from time import sleep

from fruitbot import Client
from fruitbot.utils import Utils
from fruitbot.exceptions import (
    UnknownError, InvalidRestoreKey, AccountBlocked,
    ServerMaintenance, OnlineOnAnotherDevice
)

running = True

def signal_handler(sig, frame):
    global running
    running = False
    stream_output({"type": "info", "message": "Shutdown signal received, stopping..."})
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def stream_output(data):
    try:
        print("---STREAM---", flush=True)
        print(json.dumps(data, ensure_ascii=False), flush=True)
        print("---STREAM_END---", flush=True)
    except Exception as e:
        print(f"---STREAM---\n{{\"type\":\"error\",\"message\":\"Stream error: {e}\"}}\n---STREAM_END---", flush=True)

class Drone:
    def __init__(self, restore_key):
        self.KEY = restore_key
        session_dir = os.path.join(os.path.dirname(__file__), '..', 'config', 'sessions')
        os.makedirs(session_dir, exist_ok=True)
        self.session = os.path.join(session_dir, self.KEY)
        self.bot = Client(restore_key=self.KEY, session_name=self.session)
        self.bot.getConstants()
        self.player_data = self.bot.loadPlayer(True)
        self.all_cards = self.bot.getAllCardsInfo()

def get_mining_params(player_data, constants):
    if not player_data.get('gold_building_assigned_cards'):
        return 0, 0
    mine_level = player_data.get('gold_building_level', 1)
    storage_limit = constants['gold_building_capacity_list'][mine_level]
    gold_rate = Utils.calculateGoldMiningPerHour(player_data['gold_building_assigned_cards'])
    overflow_sec = Utils.getMineOverflowDuration(gold_rate, storage_limit)
    return overflow_sec, gold_rate

def collect_gold(bot):
    for _ in range(6):
        try:
            return bot.collectMinedGold()
        except UnknownError:
            continue
        except Exception as e:
            return {"error": str(e)}
    return {"error": "Gold collection failed after 6 retries"}

def do_task(bot, player_gold, task_number, all_cards, player_data):
    result = {"action": task_number, "gold_used": 0, "message": "", "error": None}
    try:
        if task_number == 1 and player_gold >= 100:
            if not player_data.get('tribe'):
                result["error"] = "Not in a tribe"
                result["message"] = "Cannot donate: you are not in a tribe"
                return result
            resp = bot.donateTribe(player_data['tribe']['id'], player_gold)
            result["gold_used"] = player_gold
            result["message"] = f"Donated {player_gold} gold. Tribe gold: {resp['tribe_gold']}"
        elif task_number == 2:
            resp = bot.depositToBank(player_gold)
            result["gold_used"] = resp.get('added_balance', 0)
            result["message"] = f"Deposited {resp['added_balance']} gold. Bank balance: {resp['bank_account_balance']}"
        elif task_number == 3 and player_gold >= 3_000_000:
            resp = bot.buyCardPack(25)
            card = all_cards.get(str(resp['cards'][0]['base_card_id']), {})
            result["gold_used"] = 3_000_000
            result["message"] = f"Bought Crystal pack: {card.get('name', 'Unknown card')}"
        elif task_number == 4 and player_gold >= 2_500_000:
            resp = bot.buyCardPack(16)
            card = all_cards.get(str(resp['cards'][0]['base_card_id']), {})
            result["gold_used"] = 2_500_000
            result["message"] = f"Bought Monster pack: {card.get('name', 'Unknown card')}"
        elif task_number == 5:
            result["message"] = "Action: Nothing (kept gold)"
        else:
            result["message"] = f"Insufficient gold for action {task_number} (need > {player_gold})"
    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Error: {e}"
    return result

def main():
    parser = argparse.ArgumentParser(description="Continuous mining automation")
    parser.add_argument('--key', required=True, help='Restore key')
    parser.add_argument('--action', type=int, required=True, choices=range(1,6),
                        help='1=donate,2=deposit,3=buy crystal,4=buy monster,5=nothing')
    parser.add_argument('--continuous', action='store_true', help='Run continuously')
    args = parser.parse_args()

    stream_output({"type": "info", "message": f"Initializing bot with key: {args.key[:4]}..."})

    try:
        drone = Drone(args.key)
        player_data = drone.player_data
        all_cards = drone.all_cards
        constants = drone.bot.getConstants()
    except InvalidRestoreKey as e:
        stream_output({"type": "error", "subtype": "invalid_key", "message": f"Invalid restore key: {e}"})
        sys.exit(1)
    except AccountBlocked as e:
        stream_output({"type": "error", "subtype": "account_blocked", "message": f"Account blocked: {e}"})
        sys.exit(1)
    except ServerMaintenance as e:
        stream_output({"type": "error", "subtype": "server_maintenance", "message": f"Server maintenance: {e}"})
        sys.exit(1)
    except OnlineOnAnotherDevice as e:
        stream_output({"type": "error", "subtype": "online_another_device", "message": f"Online on another device: {e}"})
        sys.exit(1)
    except Exception as e:
        stream_output({"type": "error", "subtype": "unknown", "message": f"Initialization failed: {type(e).__name__}: {e}\n{traceback.format_exc()}"})
        sys.exit(1)

    overflow_time, rate = get_mining_params(player_data, constants)
    if overflow_time == 0:
        stream_output({"type": "error", "subtype": "no_mine_cards", "message": "No cards assigned to the gold mine. Please assign at least one card in the game."})
        sys.exit(1)

    cycle = 0
    while running:
        cycle += 1
        stream_output({"type": "cycle_start", "cycle": cycle})

        collect_response = collect_gold(drone.bot)
        if "error" in collect_response:
            stream_output({"type": "error", "subtype": "collection_failed", "message": f"Gold collection error: {collect_response['error']}"})
            break

        player_gold = collect_response.get("player_gold", 0)
        collected = collect_response.get("collected_gold", 0)

        action_result = do_task(drone.bot, player_gold, args.action, all_cards, player_data)

        stream_output({
            "type": "cycle_result",
            "cycle": cycle,
            "collected_gold": collected,
            "player_gold": player_gold,
            "mining_rate_per_hour": rate,
            "overflow_seconds": overflow_time,
            "action": action_result
        })

        if not args.continuous:
            break

        if overflow_time > 0 and running:
            for remaining in range(overflow_time, 0, -1):
                if not running:
                    break
                stream_output({"type": "wait_tick", "seconds_left": remaining})
                sleep(1)

    stream_output({"type": "end", "message": "Mining stopped"})

if __name__ == "__main__":
    main()