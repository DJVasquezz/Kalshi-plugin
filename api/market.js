// /api/market.js
import fetch from "node-fetch";

// Helper function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  const KALSHI_API = "https://www.kalshi.com/api/v1/markets";
  const MAX_PAGES = 5; // adjust as needed
  const PAGE_SIZE = 50; // if API supports limit
  const MAX_RETRIES = 5; // max retries for 429 errors
  let allMarkets = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      let attempt = 0;
      let success = false;
      let response, text, data;

      while (!success && attempt < MAX_RETRIES) {
        try {
          const url = `${KALSHI_API}?page=${page}&limit=${PAGE_SIZE}`;
          response = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              // Add API key if required
              // "Authorization": `Bearer ${process.env.KALSHI_API_KEY}`
            },
          });

          text = await response.text();
          console.log(`Raw response page ${page}, attempt ${attempt + 1}:`, text.substring(0, 500));

          if (response.status === 429) {
            attempt++;
            const waitTime = 500 * attempt * attempt; // exponential backoff (ms)
            console.warn(`429 Too Many Requests. Retrying in ${waitTime}ms (attempt ${attempt})`);
            await delay(waitTime);
            continue;
          }

          data = JSON.parse(text);

          if (!Array.isArray(data.markets)) {
            console.error("Markets array not found in API response:", data);
            return res.status(500).json({ error: "Markets array not found", raw: data });
          }

          allMarkets.push(...data.markets);
          success = true; // exit retry loop

          // Stop fetching more pages if fewer markets than page size
          if (data.markets.length < PAGE_SIZE) page = MAX_PAGES + 1; // break outer loop
        } catch (err) {
          attempt++;
          console.error(`Error on page ${page}, attempt ${attempt}:`, err);
          await delay(500 * attempt); // wait before retrying
        }
      }

      if (!success) {
        console.error(`Failed to fetch page ${page} after ${MAX_RETRIES} attempts`);
        return res.status(500).json({ error: `Failed to fetch page ${page} after ${MAX_RETRIES} attempts`, raw: text });
      }

      // Short delay between successful pages to avoid hitting rate limits
      await delay(200);
    }

    res.status(200).json({ markets: allMarkets });
  } catch (error) {
    console.error("Unexpected error fetching markets:", error);
    res.status(500).json({ error: error.message });
  }
}