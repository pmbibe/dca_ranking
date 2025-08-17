from flask import Flask, render_template, jsonify
from dca_calculator import DCACalculator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
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
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

if __name__ == '__main__':
    logger.info("DCA Ranking App started")
    logger.info("Access http://localhost:8089 for DCA Rankings")
    app.run(debug=True, host='0.0.0.0', port=8089)