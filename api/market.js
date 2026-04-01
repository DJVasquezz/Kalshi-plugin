// market.js

// Function to fetch all markets from the API with pagination support
async function fetchAllMarkets() {
  let allMarkets = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const res = await fetch(`/api/markets?page=${page}`);
      const data = await res.json();

      let markets = [];
      if (Array.isArray(data)) {
        markets = data;
      } else if (data.markets && Array.isArray(data.markets)) {
        markets = data.markets;
        totalPages = data.total_pages || 1;
      } else {
        console.warn("Unexpected API response:", data);
        break;
      }

      allMarkets = allMarkets.concat(markets);
      page++;

    } while (page <= totalPages);

    return allMarkets;

  } catch (err) {
    console.error("Error fetching markets:", err);
    return [];
  }
}

// Function to display markets on the page
async function displayMarkets() {
  const container = document.getElementById("market-container");
  container.innerHTML = "Loading markets...";

  const markets = await fetchAllMarkets();

  if (markets.length === 0) {
    container.innerHTML = "No markets found.";
    return;
  }

  container.innerHTML = "";
  markets.forEach(market => {
    const div = document.createElement("div");
    div.className = "market-item";
    div.textContent = market.title || "Untitled Market";
    container.appendChild(div);
  });
}

// Run on page load
window.addEventListener("DOMContentLoaded", displayMarkets);