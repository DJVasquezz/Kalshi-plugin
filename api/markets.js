export default async function handler(req, res) {
  try {
    const keyword = (req.query.q || "mention").toLowerCase();
    const minPrice = parseFloat(req.query.min_price) || 0;
    const maxPrice = parseFloat(req.query.max_price) || Infinity;
    const minHits = parseInt(req.query.min_hits) || 0;
    const maxMisses = parseInt(req.query.max_misses) || Infinity;

    const response = await fetch(
      "https://api.elections.kalshi.com/trade-api/v2/markets?status=open"
    );

    const data = await response.json();

    const filtered = data.markets
      .filter(m =>
        m.title.toLowerCase().includes(keyword) ||
        m.title.toLowerCase().includes("say")
      )
      .map(m => {
        const hits = m.last_speech_hits || 0;
        const total = 5; // assume last 5 speeches
        const misses = total - hits;

        const strikes = (m.strikes || []).map(s => ({
          name: s.name,
          price: s.last_price,
          bid: s.best_bid,
          ask: s.best_ask
        })).filter(s =>
          s.price >= minPrice && s.price <= maxPrice
        );

        if (hits < minHits || misses > maxMisses) return null;

        return {
          title: m.title,
          ticker: m.ticker,
          expiration: m.close_time,
          hits,
          misses,
          strikes
        };
      })
      .filter(Boolean);

    res.status(200).json(filtered);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}