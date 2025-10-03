'use strict';

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Fake-Datenbank für Likes (pro Symbol ein Set von IPs)
let likesDB = {};

router.get('/stock-prices', async function (req, res) {
  try {
    let stocks = req.query.stock;
    let like = req.query.like === 'true';

    if (!stocks) {
      return res.json({ error: 'Stock symbol required' });
    }

    // Stelle sicher, dass stocks ein Array ist
    if (!Array.isArray(stocks)) {
      stocks = [stocks];
    }

    // Preise abrufen
    const stockDataArr = await Promise.all(
      stocks.map(async (symbol) => {
        const response = await fetch(
          `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
        );
        const data = await response.json();

        // IP anonymisieren (z.B. letzte Ziffer auf 0 setzen)
        const ip = req.ip.replace(/\d+$/, '0');
        likesDB[symbol] = likesDB[symbol] || new Set();

        if (like) {
          likesDB[symbol].add(ip);
        }

        return {
          stock: data.symbol,
          price: data.latestPrice,
          likes: likesDB[symbol].size,
        };
      })
    );

    // Wenn 2 Aktien → rel_likes berechnen
    if (stockDataArr.length === 2) {
      const [stock1, stock2] = stockDataArr;
      const relLikes1 = stock1.likes - stock2.likes;
      const relLikes2 = stock2.likes - stock1.likes;

      return res.json({
        stockData: [
          { stock: stock1.stock, price: stock1.price, rel_likes: relLikes1 },
          { stock: stock2.stock, price: stock2.price, rel_likes: relLikes2 },
        ],
      });
    }

    // Nur eine Aktie
    return res.json({ stockData: stockDataArr[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
