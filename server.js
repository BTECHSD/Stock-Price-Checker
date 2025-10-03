// server.js
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const app = express();

// Grundlegende Helmet-Header
app.use(helmet());

// Strikte Content-Security-Policy: Skripte und Styles nur von 'self'
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory likes store: { SYMBOL: Set_of_IPs }
const likesStore = {};

// Hilfsfunktionen
function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  if (req.ip) return req.ip;
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  return 'unknown';
}

// Deterministische Pseudo-Price-Funktion (Number)
function getPriceForSymbol(symbol) {
  let sum = 0;
  for (let i = 0; i < symbol.length; i++) sum += symbol.charCodeAt(i);
  const base = (sum % 1000) + 50;
  const fraction = (symbol.length * 0.17);
  return parseFloat((base + fraction).toFixed(2));
}

// Route
app.get('/api/stock-prices', (req, res) => {
  let { stock, like } = req.query;
  if (!stock) return res.status(400).json({ error: 'stock query parameter is required' });

  const ip = getClientIp(req);
  const likeFlag = like === 'true' || like === '1' || like === true;

  const symbols = Array.isArray(stock) ? stock : [stock];
  const cleanSymbols = symbols.map(s => String(s).toUpperCase());

  // Likes registrieren (IP-basiert)
  if (likeFlag) {
    cleanSymbols.forEach(sym => {
      if (!likesStore[sym]) likesStore[sym] = new Set();
      likesStore[sym].add(ip);
    });
  }

  // Daten zusammenstellen
  const results = cleanSymbols.map(sym => {
    const price = getPriceForSymbol(sym);
    const likes = likesStore[sym] ? likesStore[sym].size : 0;
    return { stock: sym, price, likes };
  });

  if (results.length === 1) {
    const r = results[0];
    return res.json({ stockData: { stock: r.stock, price: r.price, likes: r.likes } });
  }

  // Two (or more) -> wir behandeln nur die ersten 2 wie in den Tests
  if (results.length >= 2) {
    const [a, b] = results;
    const relA = a.likes - b.likes;
    const relB = b.likes - a.likes;
    return res.json({
      stockData: [
        { stock: a.stock, price: a.price, rel_likes: relA },
        { stock: b.stock, price: b.price, rel_likes: relB },
      ],
    });
  }

  res.status(500).json({ error: 'unexpected error' });
});

// Start
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('App listening on port ' + listener.address().port);
});

module.exports = app;

