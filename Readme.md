# Stock AI Bot - README

## Work in Progress..

## Overview
This Stock AI Bot gathers stock market data, analyzes trends using RSI & MACD indicators, and fetches insider trading activity from OpenInsider. The goal is to identify undervalued stocks based on multiple indicators and AI analysis.

## Features
- Fetches historical stock price data for multiple timeframes (1 week, 1 month, 6 months, 1 year, 5 years) using Yahoo Finance.
- Calculates Relative Strength Index (RSI) to measure stock momentum.
- Computes Moving Average Convergence Divergence (MACD) for trend identification.
- Retrieves insider trading activity from OpenInsider.

## Requirements
- Python 3.x
- Required libraries:
  - `requests`
  - `yfinance`
  - `pandas`
  - `numpy`

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/Abhinav-ranish/AI-Stock-Algorithm
   cd AI-Stock-Algorithm
   ```
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```

## Usage
1. Modify `ticker` in `stockbot_gui`.py` to the stock symbol of your choice.
2. Run the script:
   ```sh
   python stock_ai_bot.py
   ```
3. The script will output RSI, MACD, and insider trading information.

## Next Steps
- Implement news sentiment analysis to determine reasons for stock price drops.
- Improve parsing of OpenInsider data for better trade signal accuracy.
- Integrate AI-based prediction for potential stock growth.

## License
This project is licensed under the MIT License.

