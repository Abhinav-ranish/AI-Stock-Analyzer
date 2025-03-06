# **Stock AI Bot - README**

## ⚠️ **Disclaimer – Use at Your Own Risk**  
This AI-powered stock analysis tool is for **informational and educational purposes only**. It does **not constitute financial advice** and should **not** be relied upon for making investment decisions.  

- **No Guarantees:** Stock market investments are inherently risky. The AI-generated insights, predictions, and recommendations may be inaccurate or outdated.  
- **Not a Financial Advisor:** This tool is not a registered financial advisor, brokerage, or investment service.  
- **Your Responsibility:** You are solely responsible for your own financial decisions. **The developers and contributors assume no liability for any financial losses or damages incurred from using this tool.**  

🚨 **Always conduct your own research, consult with a qualified financial advisor, and make investment decisions at your own discretion.**  

## **Overview**
Stock AI Bot is a **Retrieval-Augmented Generation (RAG) powered AI system** that analyzes **stock market data, trends, insider trading activity, and news sentiment** to provide smart investment insights. It leverages **Yahoo Finance, OpenInsider, FAISS vector database, and AI analysis (Ollama LLM)** to identify **undervalued stocks** and provide **buy/sell recommendations**.

The system comes with a **modern web interface** built with **React**, allowing users to input stock tickers and get AI-powered analysis **directly in their browser**.

---

## **Features**
✅ **Retrieves Historical Stock Data** – Fetches stock price history for **7 days, 1 month, 3 months, 6 months, 1 year, and 5 years** via **Yahoo Finance**.  
✅ **Calculates Technical Indicators** – Uses **RSI (Relative Strength Index), MACD (Moving Average Convergence Divergence), and SMA (Simple Moving Averages)** to analyze stock trends.  
✅ **Fetches Insider Trading Data** – Scrapes **OpenInsider** to track insider buying/selling trends.  
✅ **News Sentiment Analysis** – Analyzes the **latest news sentiment** to detect **bullish or bearish** trends.  
✅ **RAG-Based AI Predictions** – Uses **FAISS vector search** to **retrieve similar stocks** and **Ollama LLM** to provide structured insights:  
   - **Prediction:** Uptrend / Downtrend / Neutral  
   - **Confidence Score**  
   - **Key Insights** (RSI, MACD, Insider Trading, Sentiment)  
   - **Investment Decision** (Buy/Sell/Hold)  
✅ **Web-Based Interface** – View stock analysis **via a React-based frontend** served at `localhost:3000`.  

---

## **Requirements**
- **Python 3.x**
- Required Python libraries:
  - `requests`
  - `yfinance`
  - `pandas`
  - `numpy`
  - `flask`
  - `faiss-cpu`
  - `sentence-transformers`
  - `bs4`
  - `ollama`
  - `textblob`
  - `scikit-learn`
  - `python-dotenv`
- **Node.js** for the **React Web Interface**
  - `react`
  - `recharts`
  - `axios`
  - `flask-cors`

---

## **Installation**
1. **Clone the repository**:
   ```sh
   git clone https://github.com/Abhinav-ranish/AI-Stock-Algorithm
   cd AI-Stock-Algorithm
   ```

2. **Install Backend Dependencies**:
   ```sh
   pip install -r requirements.txt
   ```

3. **Set up API keys**:
   - Create a `.env` file in the project root.
   - Add your **NewsAPI key** to enable **news sentiment analysis**:
     ```
     NEWSAPI_KEY=your_api_key_here
     ```

4. **Install Frontend Dependencies**:
   ```sh
   cd stock-analyzer-web
   npm install
   ```

---

## **Usage**
### **Run the Backend Server**
1. **Start the Flask backend**:
   ```sh
   python stock_ai_bot.py
   ```
   The backend will be available at:
   ```
   http://127.0.0.1:5000/
   ```

### **Run the Frontend**
2. **Start the React web interface**:
   ```sh
   cd stock-analyzer-web
   npm start
   ```
   The frontend will be available at:
   ```
   http://127.0.0.1:3000
   ```

---

## **How It Works**
1. **Enter a stock ticker** in the web app (e.g., `AAPL`, `TSLA`, `NVDA`).
2. **Retrieve Data** – The backend fetches:
   - **Yahoo Finance** stock history
   - **RSI, MACD, SMA indicators**
   - **Insider trading from OpenInsider**
   - **News sentiment from NewsAPI**
   - **Retrieves similar stocks via FAISS vector search**
3. **AI-Generated Analysis** – The system uses **Ollama LLM** to predict:
   - **Trend Prediction** (Uptrend, Downtrend, Neutral)
   - **Confidence Score**
   - **Investment Decision** (Buy/Sell/Hold)
4. **View AI Analysis on the Web Interface**.

---

## **Example AI Output**
```
**Stock:** TSLA
**Prediction:** Uptrend  
**Confidence:** 82%  
**Key Insights:** Insider buying increased + Positive News Sentiment  
**Investment Decision:** BUY  
```

---

## **Next Steps**
🔹 **Enhance AI models** to include **deep learning-based price forecasting**.  
🔹 **Implement live stock alerts** using **WebSockets**.  
🔹 **Add Options & Technical Pattern Detection** to enhance decision-making.  

---

## **License**
📜 This project is licensed under the **MIT License**.  

---

🚀 **AI-powered stock analyzer is smarter, retrieves real-time data, and gives AI-based investment decisions – all via a web interface!** 🚀