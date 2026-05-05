
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const readline = require("readline");

const client = new Anthropic();

// Portfolio simulator with investment tracking and analysis
class PortfolioSimulator {
  constructor() {
    this.portfolio = {
      cash: 100000,
      stocks: {},
      history: [],
      transactions: [],
    };
    this.conversationHistory = [];
  }

  addStock(symbol, shares, price) {
    if (!this.portfolio.stocks[symbol]) {
      this.portfolio.stocks[symbol] = { shares: 0, averagePrice: 0, history: [] };
    }
    const stock = this.portfolio.stocks[symbol];
    const totalCost = shares * price;

    if (this.portfolio.cash < totalCost) {
      return { success: false, message: "Insufficient funds" };
    }

    const newAveragePrice =
      (stock.shares * stock.averagePrice + shares * price) /
      (stock.shares + shares);
    stock.averagePrice = newAveragePrice;
    stock.shares += shares;
    this.portfolio.cash -= totalCost;

    this.portfolio.transactions.push({
      type: "buy",
      symbol,
      shares,
      price,
      date: new Date().toISOString(),
      total: totalCost,
    });

    return {
      success: true,
      message: `Bought ${shares} shares of ${symbol} at $${price}`,
    };
  }

  sellStock(symbol, shares, price) {
    if (!this.portfolio.stocks[symbol] || this.portfolio.stocks[symbol].shares < shares) {
      return { success: false, message: "Insufficient shares" };
    }

    const stock = this.portfolio.stocks[symbol];
    const totalProceeds = shares * price;
    stock.shares -= shares;
    this.portfolio.cash += totalProceeds;

    if (stock.shares === 0) {
      delete this.portfolio.stocks[symbol];
    }

    this.portfolio.transactions.push({
      type: "sell",
      symbol,
      shares,
      price,
      date: new Date().toISOString(),
      total: totalProceeds,
    });

    return {
      success: true,
      message: `Sold ${shares} shares of ${symbol} at $${price}`,
    };
  }

  getPortfolioValue(currentPrices) {
    let stockValue = 0;
    for (const [symbol, stock] of Object.entries(this.portfolio.stocks)) {
      if (currentPrices[symbol]) {
        stockValue += stock.shares * currentPrices[symbol];
      }
    }
    return this.portfolio.cash + stockValue;
  }

  getPortfolioStatus(currentPrices) {
    let totalStockValue = 0;
    const holdings = [];

    for (const [symbol, stock] of Object.entries(this.portfolio.stocks)) {
      const currentPrice = currentPrices[symbol] || stock.averagePrice;
      const value = stock.shares * currentPrice;
      const gain = (currentPrice - stock.averagePrice) * stock.shares;
      const gainPercent =
        ((currentPrice - stock.averagePrice) / stock.averagePrice) * 100;

      totalStockValue += value;
      holdings.push({
        symbol,
        shares: stock.shares,
        averagePrice: stock.averagePrice.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        value: value.toFixed(2),
        gain: gain.toFixed(2),
        gainPercent: gainPercent.toFixed(2),
      });
    }

    const totalValue = this.getPortfolioValue(currentPrices);
    const cashPercent = ((this.portfolio.cash / totalValue) * 100).toFixed(2);
    const stockPercent = ((totalStockValue / totalValue) * 100).toFixed(2);

    return {
      cash: this.portfolio.cash.toFixed(2),
      totalStockValue: totalStockValue.toFixed(2),
      totalValue: totalValue.toFixed(2),
      cashPercent,
      stockPercent,
      holdings,
    };
  }

  generateTextChart(data, title) {
    let chart = `\n${title}\n`;
    chart += "=".repeat(50) + "\n";

    const maxValue = Math.max(...data.values);
    const scale = 40 / maxValue;

    for (let i = 0; i < data.labels.length; i++) {
      const barLength = Math.round(data.values[i] * scale);
      const bar = "█".repeat(barLength);
      chart += `${data.labels[i].padEnd(10)} │ ${bar} ${data.values[i].toFixed(2)}\n`;
    }

    return chart;
  }

  simulatePerformance(months = 12) {
    const performance = [];
    const currentPrices = {
      AAPL: 150,
      GOOGL: 140,
      MSFT: 380,
      AMZN: 180,
      TSLA: 250,
    };

    for (let month = 0; month <= months; month++) {
      // Simulate price changes (random walk)
      for (const symbol in currentPrices) {
        const change = (Math.random() - 0.5) * 20;
        currentPrices[symbol] = Math.max(50, currentPrices[symbol] + change);
      }

      const value = this.getPortfolioValue(currentPrices);
      performance.push({
        month,
        value: parseFloat(value.toFixed(2)),
        cash: parseFloat(this.portfolio.cash.toFixed(2)),
      });
    }

    return performance;
  }
}

async function chat(userMessage, simulator) {
  simulator