import time
from functools import wraps

class RateLimiter:
    def __init__(self, max_calls_per_minute=1200):  # Binance limit ~1200/min
        self.max_calls = max_calls_per_minute
        self.calls = []
    
    def wait_if_needed(self):
        now = time.time()
        # Remove calls older than 1 minute
        self.calls = [call_time for call_time in self.calls if now - call_time < 60]
        
        if len(self.calls) >= self.max_calls:
            sleep_time = 60 - (now - self.calls[0])
            if sleep_time > 0:
                print(f"Rate limit reached. Sleeping for {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
        
        self.calls.append(now)

# Global rate limiter
rate_limiter = RateLimiter()