import robin_stocks.robinhood as rh
import json
import time

# Load credentials from a secure file
with open("credentials.json", "r") as file:
    credentials = json.load(file)

def login():
    """Log in to Robinhood."""
    rh.login(credentials["username"], credentials["password"], store_session=True)

def place_order(ticker, quantity, order_type="buy", price=None):
    """Place a market or limit order."""
    if order_type == "buy":
        if price:
            return rh.orders.order_buy_limit(ticker, quantity, price)
        else:
            return rh.orders.order_buy_market(ticker, quantity)
    elif order_type == "sell":
        if price:
            return rh.orders.order_sell_limit(ticker, quantity, price)
        else:
            return rh.orders.order_sell_market(ticker, quantity)

def check_position(ticker):
    """Check if we hold a position in the stock."""
    positions = rh.account.build_holdings()
    return ticker in positions

def execute_trade(stock_picks):
    """Loop through approved stock picks and execute trades."""
    login()
    for stock in stock_picks:
        ticker = stock["ticker"]
        quantity = stock["quantity"]
        order_type = stock.get("order_type", "buy")
        price = stock.get("price")
        
        if order_type == "buy" and not check_position(ticker):
            response = place_order(ticker, quantity, order_type, price)
            print(f"Bought {quantity} of {ticker}: {response}")
        elif order_type == "sell" and check_position(ticker):
            response = place_order(ticker, quantity, order_type, price)
            print(f"Sold {quantity} of {ticker}: {response}")
    
    rh.logout()

if __name__ == "__main__":
    # Example stock picks from AI bot
    stock_picks = [
        {"ticker": "AAPL", "quantity": 1, "order_type": "buy"},
        {"ticker": "TSLA", "quantity": 2, "order_type": "buy", "price": 180.00}
    ]
    execute_trade(stock_picks)
