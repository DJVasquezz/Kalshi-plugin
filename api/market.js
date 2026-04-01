export default async function handler(req, res) {
  const baseUrl = "https://api.elections.kalshi.com/trade-api/v2/markets";
  const MAX_RETRIES = 5;
  const BACKOFF_BASE = 1000;
  const logs = [];

  let allMarkets = [];
  let cursor = "";
  let pageCount = 0;

  while (true) {
    let attempt = 0;
    let success = false;

    // build URL
    let url = `${baseUrl}?limit=100`;
    if (cursor) url += `&cursor=${cursor}`;

    while (!success && attempt < MAX_RETRIES) {
      try {
        logs.push(`Fetching: ${url}`);
        const response = await fetch(url);
        const text = await response.text();

        // handle 429
        if (response.status === 429) {
          attempt++;
          const delay = BACKOFF_BASE * Math.pow(2, attempt);
          logs.push(`429 rate limit on fetch, retry in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = JSON.parse(text);
        if (!Array.isArray(data.markets)) {
          logs.push(`Unexpected format; got ${typeof data}`);
          throw new Error("Unexpected markets format");
        }

        allMarkets.push(...data.markets);
        logs.push(`Fetched ${data.markets.length} markets`);

        // update cursor
        cursor = data.cursor || "";
        success = true;
      } catch (err) {
        attempt++;
        const delay = BACKOFF_BASE * Math.pow(2, attempt);
        logs.push(`Error on cursor ${cursor}, retry ${attempt}, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!success) {
      logs.push(`Failed after retries at cursor: ${cursor}`);
      break;
    }

    pageCount++;
    // if no more cursor, break the while
    if (!cursor) {
      logs.push("No more cursor; done");
      break;
    }
  }

  res.status(200).json({ markets: allMarkets, logs, pages: pageCount });
}