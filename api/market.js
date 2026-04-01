// /api/market.js

export default async function handler(req, res) {
  const KALSHI_API = "https://www.kalshi.com/api/v1/markets";
  const MAX_RETRIES = 5;         // maximum retry attempts
  const INITIAL_DELAY = 500;     // initial retry delay in ms

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function fetchMarkets(page = 1, allMarkets = [], attempt = 0, log = []) {
    try {
      console.log(`Fetching page ${page}, attempt ${attempt + 1}...`);
      const response = await fetch(`${KALSHI_API}?page=${page}`);
      const text = await response.text();

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY * Math.pow(2, attempt);
          console.log(`Rate limited on page ${page}, retrying in ${delay}ms`);
          await wait(delay);
          return fetchMarkets(page, allMarkets, attempt + 1, log);
        } else {
          throw new Error(`Max retries exceeded due to rate limiting on page ${page}`);
        }
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error(`Failed to parse JSON on page ${page}:`, text);
        throw new Error(`Invalid JSON response from Kalshi API on page ${page}`);
      }

      if (!Array.isArray(data.markets)) {
        console.error(`Unexpected data format on page ${page}:`, data);
        throw new Error(`Kalshi API returned unexpected format on page ${page}`);
      }

      allMarkets.push(...data.markets);
      log.push({ page, status: "success", marketsFetched: data.markets.length });

      if (data.meta?.hasNextPage) {
        return fetchMarkets(page + 1, allMarkets, 0, log);
      }

      return { allMarkets, log };
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      log.push({ page, status: "error", message: err.message });

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt);
        console.log(`Retrying page ${page} after error in ${delay}ms...`);
        await wait(delay);
        return fetchMarkets(page, allMarkets, attempt + 1, log);
      }

      throw { err, log };
    }
  }

  try {
    const { allMarkets, log } = await fetchMarkets();
    console.log("All pages fetched successfully:", log);
    res.status(200).json({ markets: allMarkets, log });
  } catch ({ err, log }) {
    console.error("Final error loading markets:", err.message);
    console.log("Partial log before failure:", log);
    res.status(500).json({ error: err.message, log });
  }
}