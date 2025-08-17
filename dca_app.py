from flask import Flask, render_template, jsonify
from dca_calculator import DCACalculator
import logging
import threading
import time
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global activity tracking
app_activity = {
    "status": "idle",
    "last_activity": None,
    "current_operation": "",
    "progress": {
        "current_symbol": "",
        "processed": 0,
        "total": 0,
        "errors": 0,
        "start_time": None
    },
    "stats": {
        "total_requests": 0,
        "successful_calculations": 0,
        "api_calls": 0,
        "uptime_start": datetime.now()
    }
}

def update_activity(status, operation="", symbol="", processed=0, total=0):
    """Update activity status"""
    app_activity["status"] = status
    app_activity["last_activity"] = datetime.now()
    app_activity["current_operation"] = operation
    app_activity["progress"]["current_symbol"] = symbol
    app_activity["progress"]["processed"] = processed
    app_activity["progress"]["total"] = total
    
    if status == "calculating" and not app_activity["progress"]["start_time"]:
        app_activity["progress"]["start_time"] = datetime.now()
    elif status in ["idle", "completed", "error"]:
        app_activity["progress"]["start_time"] = None

def format_uptime(seconds):
    """Format uptime in human readable format"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"

def format_time(seconds):
    """Format time in human readable format"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"

# Initialize DCA Calculator after defining helper functions
dca_calculator = DCACalculator()

@app.route('/')
def dca_index():
    """DCA Ranking main page"""
    return render_template('dca_ranking.html')

@app.route('/api/dca-ranking')
def get_dca_ranking():
    """API endpoint for DCA ranking data"""
    try:
        ranking_data = dca_calculator.calculate_daily_dca_ranking()
        return jsonify({
            'status': 'success',
            'data': ranking_data['rankings'],
            'summary': ranking_data['summary'],
            'last_update': ranking_data['last_update']
        })
    except Exception as e:
        logger.error(f"Error getting DCA ranking: {e}")
        update_activity("error", f"DCA ranking failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

@app.route('/api/dca-symbol/<symbol>')
def get_symbol_details(symbol):
    """Get detailed DCA data for specific symbol"""
    try:
        details = dca_calculator.get_symbol_dca_details(symbol)
        return jsonify({
            'status': 'success',
            'data': details
        })
    except Exception as e:
        logger.error(f"Error getting symbol details: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

@app.route('/api/activity-status')
def get_activity_status():
    """Get current activity status"""
    current_time = datetime.now()
    
    # Calculate uptime
    uptime_seconds = (current_time - app_activity["stats"]["uptime_start"]).total_seconds()
    uptime_formatted = format_uptime(uptime_seconds)
    
    # Calculate progress percentage
    progress_pct = 0
    if app_activity["progress"]["total"] > 0:
        progress_pct = round((app_activity["progress"]["processed"] / app_activity["progress"]["total"]) * 100, 1)
    
    # Calculate ETA
    eta_formatted = "Calculating..."
    if app_activity["progress"]["start_time"] and app_activity["progress"]["processed"] > 0:
        elapsed = (current_time - app_activity["progress"]["start_time"]).total_seconds()
        if elapsed > 0:
            speed = app_activity["progress"]["processed"] / elapsed
            if speed > 0:
                remaining = app_activity["progress"]["total"] - app_activity["progress"]["processed"]
                eta_seconds = remaining / speed
                eta_formatted = format_time(eta_seconds)
    
    return jsonify({
        "status": app_activity["status"],
        "last_activity": app_activity["last_activity"].isoformat() if app_activity["last_activity"] else None,
        "current_operation": app_activity["current_operation"],
        "progress": {
            "current_symbol": app_activity["progress"]["current_symbol"],
            "processed": app_activity["progress"]["processed"],
            "total": app_activity["progress"]["total"],
            "percentage": progress_pct,
            "errors": app_activity["progress"]["errors"],
            "eta": eta_formatted
        },
        "stats": {
            "total_requests": app_activity["stats"]["total_requests"],
            "successful_calculations": app_activity["stats"]["successful_calculations"],
            "api_calls": app_activity["stats"]["api_calls"],
            "uptime": uptime_formatted,
            "uptime_seconds": int(uptime_seconds)
        },
        "timestamp": current_time.isoformat()
    })

def heartbeat():
    """Background thread to keep activity alive"""
    while True:
        time.sleep(30)  # Update every 30 seconds
        if app_activity["status"] == "idle":
            app_activity["last_activity"] = datetime.now()

# Start heartbeat thread
heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
heartbeat_thread.start()

if __name__ == '__main__':
    logger.info("DCA Ranking App started")
    logger.info("Access http://localhost:8089 for DCA Rankings")
    app.run(debug=True, host='0.0.0.0', port=8089)