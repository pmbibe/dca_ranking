from binance.client import Client
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import logging
from rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

class DCACalculator:
    def __init__(self):
        # Khởi tạo Binance client (có thể cần API keys cho rate limit cao hơn)
        self.client = Client()
        self.investment_per_hour = 1000
        
    def get_utc_today_start(self):
        """Get 00:00 UTC của ngày hôm nay"""
        now_utc = datetime.now(timezone.utc)
        today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        return today_start
    
    def get_hours_since_start(self):
        """Tính số giờ từ 00:00 UTC đến hiện tại"""
        start_time = self.get_utc_today_start()
        current_time = datetime.now(timezone.utc)
        hours_diff = (current_time - start_time).total_seconds() / 3600
        return int(hours_diff)

    def get_all_usdt_futures(self):
        """Lấy tất cả USDT futures symbols"""
        try:
            exchange_info = self.client.futures_exchange_info()
            symbols = [
                symbol['symbol']
                for symbol in exchange_info['symbols']
                if symbol['marginAsset'] == 'USDT' 
                and symbol['contractType'] == 'PERPETUAL'
                and symbol['status'] == 'TRADING'
            ]
            
            # Giới hạn số lượng để test nhanh hơn
            return sorted(symbols)  # Chỉ lấy 50 symbols đầu để test
            
        except Exception as e:
            logger.error(f"Error fetching futures symbols: {e}")
            return []

    def get_hourly_prices(self, symbol, hours_back):
        """Lấy giá theo từng giờ từ 00:00 UTC đến hiện tại"""
        try:
            rate_limiter.wait_if_needed()
            start_time = self.get_utc_today_start()
            start_timestamp = int(start_time.timestamp() * 1000)
            
            klines = self.client.futures_klines(
                symbol=symbol,
                interval=Client.KLINE_INTERVAL_1HOUR,
                startTime=start_timestamp,
                limit=24
            )
            
            if not klines:
                return []
            
            df = pd.DataFrame(klines, columns=[
                'Open Time', 'Open', 'High', 'Low', 'Close', 'Volume',
                'Close Time', 'Quote Asset Volume', 'Number of Trades',
                'Taker Buy Base Asset Volume', 'Taker Buy Quote Asset Volume', 'Ignore'
            ])
            
            df['Open Time'] = pd.to_datetime(df['Open Time'], unit='ms')
            df['Close'] = pd.to_numeric(df['Close'])
            
            completed_hours = df.head(hours_back)
            
            return completed_hours[['Open Time', 'Close']].to_dict('records')
            
        except Exception as e:
            logger.error(f"Error getting hourly prices for {symbol}: {e}")
            return []
    
    def calculate_symbol_dca_performance(self, symbol):
        """Tính toán hiệu suất DCA cho 1 symbol"""
        try:
            hours_passed = self.get_hours_since_start()
            if hours_passed == 0:
                return None
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("Symbol processing timeout")
            
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(30)  # 30 seconds timeout per symbol            
            hourly_prices = self.get_hourly_prices(symbol, hours_passed)
            if not hourly_prices:
                return None
            
            total_invested = 0
            total_tokens = 0
            buy_prices = []
            winning_buys = 0
            
            # Lấy giá hiện tại
            try:
                current_ticker = self.client.futures_symbol_ticker(symbol=symbol)
                current_price = float(current_ticker['price'])
            except:
                return None
            
            # Tính cho từng lần mua
            for i, price_data in enumerate(hourly_prices):
                buy_price = price_data['Close']
                buy_prices.append(buy_price)
                
                tokens_bought = self.investment_per_hour / buy_price
                total_tokens += tokens_bought
                total_invested += self.investment_per_hour
                
                if current_price > buy_price:
                    winning_buys += 1
            
            if total_invested == 0:
                return None
            
            current_value = total_tokens * current_price
            total_pnl = current_value - total_invested
            pnl_percentage = (total_pnl / total_invested) * 100
            
            win_rate = (winning_buys / len(buy_prices)) * 100 if buy_prices else 0
            avg_hourly_pnl = total_pnl / hours_passed if hours_passed > 0 else 0
            
            # Xác định action
            if pnl_percentage > 2:
                action = "🟢 STRONG BUY"
            elif pnl_percentage > 0:
                action = "🟢 BUY"
            elif pnl_percentage > -2:
                action = "⚠️ HOLD"
            elif pnl_percentage > -5:
                action = "🔴 SELL"
            else:
                action = "🔴 STRONG SELL"
            
            return {
                'symbol': symbol,
                'pnl_percentage': round(pnl_percentage, 2),
                'total_pnl': round(total_pnl, 2),
                'total_invested': total_invested,
                'current_value': round(current_value, 2),
                'total_tokens': round(total_tokens, 6),
                'avg_buy_price': round(total_invested / total_tokens, 6),
                'current_price': current_price,
                'win_rate': round(win_rate, 1),
                'hours_tracked': hours_passed,
                'total_buys': len(buy_prices),
                'winning_buys': winning_buys,
                'avg_hourly_pnl': round(avg_hourly_pnl, 2),
                'action': action,
                'buy_prices': buy_prices
            }
            
        except Exception as e:
            logger.error(f"Error calculating DCA for {symbol}: {e}")
            return None

    def calculate_daily_dca_ranking(self):
        """Tính toán ranking DCA cho tất cả symbols"""
        try:
            start_time = datetime.now()
            hours_passed = self.get_hours_since_start()
            
            if hours_passed == 0:
                return {
                    'rankings': [],
                    'summary': {
                        'message': 'Too early! Please wait until at least 1 hour has passed since 00:00 UTC',
                        'hours_passed': 0,
                        'total_symbols': 0,
                        'total_invested': 0,
                        'total_current_value': 0,
                        'total_pnl': 0,
                        'avg_pnl_percentage': 0,
                        'profitable_rate': 0
                    },
                    'last_update': start_time.isoformat()
                }
            
            logger.info(f"Starting DCA ranking calculation for {hours_passed} hours...")
            
            symbols = self.get_all_usdt_futures()
            logger.info(f"Processing {len(symbols)} symbols...")
            
            rankings = []
            processed = 0
            errors = 0
            
            for symbol in symbols:
                try:
                    result = self.calculate_symbol_dca_performance(symbol)
                    if result:
                        rankings.append(result)
                    processed += 1
                    
                    if processed % 50 == 0:
                        logger.info(f"Processed {processed}/{len(symbols)} symbols...")
                    import time
                    time.sleep(0.1)  # Giới hạn tốc độ để tránh rate limit
                except Exception as e:
                    errors += 1
                    logger.error(f"Error processing {symbol}: {e}")
                    continue
            
            # Sort rankings
            rankings.sort(key=lambda x: x['pnl_percentage'], reverse=True)
            
            # Add rank
            for i, ranking in enumerate(rankings):
                ranking['rank'] = i + 1
            
            # Calculate summary
            total_invested = sum(r['total_invested'] for r in rankings)
            total_current_value = sum(r['current_value'] for r in rankings)
            total_pnl = total_current_value - total_invested
            avg_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0
            
            profitable_count = len([r for r in rankings if r['pnl_percentage'] > 0])
            
            summary = {
                'hours_passed': hours_passed,
                'total_symbols': len(rankings),
                'total_invested': round(total_invested, 2),
                'total_current_value': round(total_current_value, 2),
                'total_pnl': round(total_pnl, 2),
                'avg_pnl_percentage': round(avg_pnl_pct, 2),
                'profitable_symbols': profitable_count,
                'profitable_rate': round((profitable_count / len(rankings) * 100), 1) if rankings else 0,
                'processing_time': round((datetime.now() - start_time).total_seconds(), 2),
                'errors': errors
            }
            
            logger.info(f"DCA ranking completed: {len(rankings)} symbols, {profitable_count} profitable")
            
            return {
                'rankings': rankings,
                'summary': summary,
                'last_update': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in DCA ranking calculation: {e}")
            raise   

    def get_symbol_dca_details(self, symbol):
        """Lấy chi tiết DCA cho symbol cụ thể"""
        try:
            result = self.calculate_symbol_dca_performance(symbol)
            if not result:
                return None
            
            hourly_details = []
            
            for i, buy_price in enumerate(result['buy_prices']):
                hour = i + 1
                tokens_bought = self.investment_per_hour / buy_price
                current_value_of_buy = tokens_bought * result['current_price']
                pnl_of_buy = current_value_of_buy - self.investment_per_hour
                pnl_pct_of_buy = (pnl_of_buy / self.investment_per_hour) * 100
                
                hourly_details.append({
                    'hour': hour,
                    'buy_price': round(buy_price, 6),
                    'tokens_bought': round(tokens_bought, 6),
                    'investment': self.investment_per_hour,
                    'current_value': round(current_value_of_buy, 2),
                    'pnl': round(pnl_of_buy, 2),
                    'pnl_percentage': round(pnl_pct_of_buy, 2),
                    'is_winning': pnl_of_buy > 0
                })
            
            result['hourly_details'] = hourly_details
            return result
            
        except Exception as e:
            logger.error(f"Error getting symbol details for {symbol}: {e}")
            return None