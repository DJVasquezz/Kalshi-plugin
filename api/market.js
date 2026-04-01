// /api/market.js
export default async function handler(req, res) {
  try {
    const { q } = req.query; // optional query filter
    let allMarkets = [];
    let cursor = "";
    const baseUrl = "https://api.elections.kalshi.com/trade-api/v2/markets";

    do {
      // Build URL with optional cursor and query filter
      let url = `${baseUrl}?status=open&limit=1000`;
      if (cursor) url += `&cursor=${cursor}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Append markets
      if (data.markets) allMarkets.push(...data.markets);

      // Update cursor for next page
      cursor = data.cursor || "";

    } while (cursor); // loop until no more pages

    // Optional: you can further filter markets locally if needed
    // Example: only markets with description containing "Trump"
    // if (q) allMarkets = allMarkets.filter(m => m.description.includes(q));

    res.status(200).json(allMarkets);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}