import sys
import json
from fruitbot import Client
from fruitbot.network.network import Network
from fruitbot.exceptions import UnknownError

key = sys.argv[1] if len(sys.argv) > 1 else "there90837591"
session_dir = "../config/sessions"
session_path = f"{session_dir}/{key}"

bot = Client(restore_key=key, session_name=session_path)

# Monkey-patch the network layer to print raw response
original_send = Network.sendRequest

def debug_send(self, path, input_data, method='POST', max_attempts=5):
    print(f"---DEBUG: calling {path} with {input_data}", flush=True)
    try:
        response = original_send(self, path, input_data, method, max_attempts)
        print(f"---DEBUG: response = {response}", flush=True)
        return response
    except Exception as e:
        print(f"---DEBUG: exception = {e}", flush=True)
        raise

Network.sendRequest = debug_send

try:
    constants = bot.getConstants()
    print("getConstants succeeded")
    player_data = bot.loadPlayer(True)
    print("loadPlayer succeeded")
    print(f"Player gold: {player_data.get('gold', '?')}")
except Exception as e:
    print(f"Fatal error: {e}")
    sys.exit(1)