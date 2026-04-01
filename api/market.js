export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.elections.kalshi.com/trade-api/v2/markets?status=open"
    );

    if (!response.ok) {
      throw new Error(`Kalshi API returned ${response.status}`);
    }

    const data = await response.json();
    const markets = data.markets || [];

    const keyword = (req.query.q || "").toLowerCase();

    const filtered = markets
      .filter(m => keyword ? (m.title || "").toLowerCase().includes(keyword) : true)
      .map(m => ({
        title: m.title,
        ticker: m.ticker,
        expiration: m.close_time,
        last_price: m.last_price,
        yes_bid: m.yes_bid,
        yes_ask: m.yes_ask,
        no_bid: m.no_bid,
        no_ask: m.no_ask
      }));

    res.status(200).json(filtered);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}