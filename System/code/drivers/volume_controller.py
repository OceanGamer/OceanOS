import sys
import json
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

def get_volume_interface():
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    return cast(interface, POINTER(IAudioEndpointVolume))

def get_volume():
    vol = get_volume_interface()
    level = int(vol.GetMasterVolumeLevelScalar() * 100)
    muted = bool(vol.GetMute())
    return {"level": level, "muted": muted}

def set_volume(value):
    vol = get_volume_interface()
    vol.SetMasterVolumeLevelScalar(min(max(float(value) / 100, 0), 1), None)

def toggle_mute():
    vol = get_volume_interface()
    current = vol.GetMute()
    vol.SetMute(not current, None)

def main():
    try:
        action = sys.argv[1] if len(sys.argv) > 1 else 'get'
        if action == 'get':
            print(json.dumps(get_volume()))
        elif action == 'set':
            level = int(sys.argv[2])
            set_volume(level)
            print(json.dumps(get_volume()))
        elif action == 'toggle':
            toggle_mute()
            print(json.dumps(get_volume()))
        else:
            print(json.dumps({"error": "Unknown command"}))
    except Exception as e:
        # Devuelve error en JSON
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
