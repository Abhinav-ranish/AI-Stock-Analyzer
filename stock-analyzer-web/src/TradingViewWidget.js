import React, { useEffect } from "react";

const TradingViewWidget = ({ ticker }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          container_id: "tradingview_widget",
          width: "100%",
          height: 600,
          symbol: ticker,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          studies: ["RSI@tv-basicstudies"],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
        });
      }
    };
    const widgetContainer = document.getElementById("tradingview_widget");
    if (widgetContainer) {
      widgetContainer.innerHTML = "";
      widgetContainer.appendChild(script);
    }
  }, [ticker]);

  return <div id="tradingview_widget" style={{ height: "600px" }} />;
};

export default TradingViewWidget;
