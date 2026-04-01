import fetch from 'node-fetch';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  const KALSHI_API = 'https://www.kalshi.com/api/markets';
  const MAX_RETRIES = 5;
  const DELAY_BETWEEN_RETRIES = 2000; // 2 seconds base backoff
  const DELAY_BETWEEN_PAGES = 2000;   // 2 seconds between pages
  const RATE_LIMIT_BACKOFF = 10000;    // 10 seconds initial for 429

  let allMarkets = [];
  let page = 1;
  let keepFetching = true;
  let logs = [];

  while (keepFetching) {
    let retries = 0;
    let success = false;

    while (!success && retries < MAX_RETRIES) {
      try {
        logs.push(`Fetching page ${page}...`);
        const response = await fetch(`${KALSHI_API}?page=${page}`);
        const text = await response.text();

        if (response.status === 429) {
          retries++;
          const delay = RATE_LIMIT_BACKOFF * retries; // longer wait for 429
          logs.push(`Rate limit hit (429) on page ${page}, retry ${retries}. Waiting ${delay}ms.`);
          await wait(delay);
          continue; // retry this page
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          throw new Error(`Invalid JSON on page ${page}: ${text}`);
        }

        if (!Array.isArray(data)) {
          throw new Error(`Expected array but got ${typeof data} on page ${page}`);
        }

        if (data.length === 0) {
          keepFetching = false;
          logs.push(`No markets returned on page ${page}. Stopping fetch.`);
          break;
        }

        allMarkets = allMarkets.concat(data);
        logs.push(`Page ${page} loaded successfully with ${data.length} markets.`);
        success = true;

      } catch (err) {
        retries++;
        const delay = DELAY_BETWEEN_RETRIES * retries;
        logs.push(`Error on page ${page}, retry ${retries}: ${err.message}. Waiting ${delay}ms before retry.`);
        await wait(delay);
      }
    }

    if (!success) {
      logs.push(`Max retries exceeded on page ${page}. Stopping fetch.`);
      break;
    }

    page++;
    await wait(DELAY_BETWEEN_PAGES);
  }

  res.status(200).json({ markets: allMarkets, logs });
}