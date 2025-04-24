import psutil
import json

def get_battery_info():
    try:
        battery = psutil.sensors_battery()
        if battery:
            return {
                "status": True,
                "percent": battery.percent,
                "power_plugged": battery.power_plugged
            }
        else:
            return {
                "status": False,
                "error": "No battery found"
            }
    except Exception as e:
        return {
            "status": False,
            "error": str(e)
        }

if __name__ == "__main__":
    print(json.dumps(get_battery_info())) 