from flask import Flask, render_template, jsonify
from dca_calculator import DCACalculator
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Activity tracking system
app_activity = {
    'status': 'idle',
    'current_operation': 'System ready',
    'last_activity': None,
    'start_time': datetime.now(),
    'progress': {
        'current_symbol': None,
        'processed': 0,
        'total': 0,
        'percentage': 0,
        'eta': None,
        'errors': 0
    },
    'stats': {
        'total_requests': 0,
        'successful_calculations': 0,
        'api_calls': 0,
        'uptime': '0m'
    }
}

def update_activity(status, operation, symbol=None, processed=0, total=0):
    """Update activity status"""
    app_activity['status'] = status
    app_activity['current_operation'] = operation
    app_activity['last_activity'] = datetime.now().isoformat()
    
    if symbol:
        app_activity['progress']['current_symbol'] = symbol
    
    if total > 0:
        app_activity['progress']['processed'] = processed
        app_activity['progress']['total'] = total
        app_activity['progress']['percentage'] = round((processed / total) * 100, 1)

# Initialize calculator
dca_calculator = DCACalculator()

@app.route('/')
def dca_index():
    """DCA Ranking main page"""
    return render_template('dca_ranking.html')

@app.route('/api/activity-status')
def get_activity_status():
    """API endpoint for activity status"""
    try:
        # Update uptime
        uptime_seconds = (datetime.now() - app_activity['start_time']).total_seconds()
        if uptime_seconds < 60:
            app_activity['stats']['uptime'] = f"{int(uptime_seconds)}s"
        elif uptime_seconds < 3600:
            app_activity['stats']['uptime'] = f"{int(uptime_seconds//60)}m"
        else:
            hours = int(uptime_seconds // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            app_activity['stats']['uptime'] = f"{hours}h {minutes}m"
        
        return jsonify(app_activity)
    except Exception as e:
        logger.error(f"Error getting activity status: {e}")
        return jsonify({
            'status': 'error',
            'current_operation': f'Error: {str(e)}',
            'stats': app_activity['stats'],
            'progress': {'errors': 1}
        })

@app.route('/api/dca-ranking')
def get_dca_ranking():
    """API endpoint for DCA ranking data"""
    try:
        update_activity("calculating", "Starting DCA ranking calculation...")
        app_activity['stats']['total_requests'] += 1
        # ✅ THÊM: Reset progress cho scan mới
        app_activity['progress'] = {
            'current_symbol': None,
            'processed': 0,
            'total': 0,
            'percentage': 0,
            'eta': None,
            'errors': 0
        }        
        ranking_data = dca_calculator.calculate_daily_dca_ranking()
        
        update_activity("completed", "DCA ranking calculation completed")
        app_activity['stats']['successful_calculations'] += 1
        
        return jsonify({
            'status': 'success',
            'data': ranking_data['rankings'],
            'summary': ranking_data['summary'],
            'last_update': ranking_data['last_update']
        })
    except Exception as e:
        logger.error(f"Error getting DCA ranking: {e}")
        update_activity("error", f"Error: {str(e)}")
        app_activity['progress']['errors'] += 1
        return jsonify({
            'status': 'error',
            'message': str(e)
        })
@app.route('/api/logs')
def get_logs():
    """Get system logs"""
    return jsonify({
        'status': 'success',
        'logs': app_activity.get('logs', [])
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
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

if __name__ == '__main__':
    logger.info("DCA Ranking App started")
    logger.info("Access http://localhost:8089 for DCA Rankings")
    app.run(debug=True, host='0.0.0.0', port=8089)