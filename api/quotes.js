
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = JSON.parse(req.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];

    async function yahooQuote(symbol, exchange) {
      let ysym = symbol;
      if (exchange.toUpperCase() === "TASE") ysym += ".TA";
      else if (exchange.toUpperCase() === "FOREX") ysym = "USDILS=X";

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ysym}`;
      const resp = await fetch(url);
      const data = await resp.json();
      const meta = data.chart?.result?.[0]?.meta || {};
      const current = meta.regularMarketPrice || 0;
      const prev = meta.regularMarketPreviousClose || current;
      const currency = exchange === "TASE" ? "ILS" : "USD";

      if (!current) return { ok: false, symbol, exchange, error: "No price" };

      return { ok: true, symbol, exchange, currentPrice: current, previousClose: prev, currency };
    }

    const results = await Promise.all(items.map(item => yahooQuote(item.symbol, item.exchange)));

    let fx;
    try {
      fx = await yahooQuote("USDILS", "FOREX");
    } catch (e) {
      fx = { error: e.message };
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.status(200).json({ results, fx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
