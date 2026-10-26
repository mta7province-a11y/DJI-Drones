/**
 * AirL - Backend Server
 * High-performance, zero-dependency Node.js server
 * Provides REST API & Static File Serving for AirL Aerial Cinematography
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Ensure data directory and JSON stores exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initJsonFile(filename, defaultContent) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

initJsonFile('orders.json', []);
initJsonFile('subscribers.json', []);
initJsonFile('tickets.json', []);
initJsonFile('downloads.json', []);
initJsonFile('products.json', [
  {
    id: "airl-7-standard",
    name: "AirL—7 Standard",
    category: "drones",
    price: 1099,
    weight: 249,
    flightTime: 46,
    stock: 45
  },
  {
    id: "airl-7-flymore",
    name: "AirL—7 Fly More Combo",
    category: "drones",
    price: 1649,
    weight: 249,
    flightTime: 138,
    stock: 120,
    isPopular: true
  },
  {
    id: "airl-7-cinepro",
    name: "AirL—7 Cine Pro",
    category: "drones",
    price: 2199,
    weight: 249,
    flightTime: 138,
    stock: 28,
    isPro: true
  },
  {
    id: "nano-go",
    name: "AirL Nano Go",
    category: "drones",
    price: 699,
    weight: 199,
    flightTime: 34,
    stock: 60
  },
  {
    id: "voyager-x",
    name: "AirL Voyager X",
    category: "drones",
    price: 2499,
    weight: 790,
    flightTime: 52,
    stock: 15
  },
  {
    id: "nd-kit",
    name: "AirL Cinema ND Filter Kit",
    category: "accessories",
    price: 99,
    stock: 250
  },
  {
    id: "battery-100w",
    name: "AirL Flight Battery 100W",
    category: "accessories",
    price: 159,
    stock: 180
  },
  {
    id: "controller-pro",
    name: "AirL Horizon 2000-nit RC",
    category: "accessories",
    price: 599,
    stock: 40
  },
  {
    id: "bag-ip67",
    name: "Tactical Expedition Bag IP67",
    category: "accessories",
    price: 129,
    stock: 95
  }
]);

// Helper to read and write JSON data
function readJson(filename) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip'
};

// Request Body Parser helper
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2e6) { // 2MB safety limit
        req.connection.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// JSON API Response Helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Localized Backend Messages (English & Ukrainian)
function getMsg(lang, key) {
  const msgs = {
    preorder_ok: {
      en: "Pre-order registered successfully. Ships October 2026.",
      ua: "Передзамовлення успішно зареєстровано. Відправка у жовтні 2026."
    },
    checkout_ok: {
      en: "Order placed successfully! Free worldwide delivery confirmed.",
      ua: "Замовлення успішно оформлено! Безкоштовну міжнародну доставку підтверджено."
    },
    subscribe_ok: {
      en: "Welcome to the AirL Expedition Club! Welcome email sent.",
      ua: "Ласкаво просимо до клубу мандрівників AirL! Лист підтвердження надіслано."
    },
    support_ok: {
      en: "Concierge ticket created. Drone engineer assigned.",
      ua: "Звернення до консьєрж-сервісу зареєстровано. Інженера призначено."
    },
    luts_ok: {
      en: "LUTs pack download initialized.",
      ua: "Завантаження пакета LUTs ініціалізовано."
    }
  };
  const str = String(lang || 'en').toLowerCase();
  const l = (str.includes('ua') || str.includes('uk')) ? 'ua' : 'en';
  return (msgs[key] && msgs[key][l]) || key;
}

// Main HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS & Chromium Private Network Access Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Private-Network': 'true'
    });
    return res.end();
  }

  // ==========================================
  // REST API ROUTING (/api/...)
  // ==========================================

  // 1. Health & Server Status
  if (pathname === '/api/status' && req.method === 'GET') {
    const orders = readJson('orders.json');
    const subscribers = readJson('subscribers.json');
    return sendJson(res, 200, {
      status: "online",
      server: "AirL Cloud API v2.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      stats: {
        totalOrders: orders.length,
        subscribers: subscribers.length
      }
    });
  }

  // 2. Products Catalog
  if (pathname === '/api/products' && req.method === 'GET') {
    const products = readJson('products.json');
    return sendJson(res, 200, {
      success: true,
      count: products.length,
      products
    });
  }

  // 2b. Admin Full Database Overview
  if (pathname === '/api/admin/all' && req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      orders: readJson('orders.json'),
      subscribers: readJson('subscribers.json'),
      tickets: readJson('tickets.json'),
      products: readJson('products.json')
    });
  }

  // 3. Pre-order Endpoint
  if (pathname === '/api/preorder' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const orders = readJson('orders.json');

      const orderId = `AIRL-PRE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const newOrder = {
        orderId,
        type: 'preorder',
        date: new Date().toISOString(),
        customer: {
          fullName: body.fullName || 'Travel Explorer',
          email: body.email || 'explorer@airl.com',
          phone: body.phone || '',
          country: body.country || 'Global'
        },
        kit: body.kit || 'AirL—7 Fly More Combo',
        finish: body.finish || 'Graphite',
        amount: body.amount || 1649,
        paymentType: body.paymentType || 'outright',
        status: 'confirmed_october_2026'
      };

      orders.push(newOrder);
      writeJson('orders.json', orders);

      console.log(`[API] New Pre-Order received: ${orderId} by ${newOrder.customer.email}`);

      const lang = body.lang || req.headers['accept-language'] || 'en';
      return sendJson(res, 201, {
        success: true,
        orderId,
        message: getMsg(lang, 'preorder_ok'),
        order: newOrder
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 4. Cart Checkout Endpoint
  if (pathname === '/api/checkout' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const orders = readJson('orders.json');

      const orderId = `AIRL-ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const newOrder = {
        orderId,
        type: 'direct_checkout',
        date: new Date().toISOString(),
        items: body.items || [],
        total: body.total || 0,
        currency: body.currency || 'USD',
        customer: body.customer || { name: 'Customer' },
        shipping: {
          type: 'Express Worldwide Courier',
          cost: 0,
          status: 'processing'
        }
      };

      orders.push(newOrder);
      writeJson('orders.json', orders);

      console.log(`[API] New Order checkout: ${orderId}, Total: $${newOrder.total}`);

      const lang = body.lang || req.headers['accept-language'] || 'en';
      return sendJson(res, 201, {
        success: true,
        orderId,
        message: getMsg(lang, 'checkout_ok'),
        receipt: newOrder
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 5. Expedition Club Newsletter Subscription
  if (pathname === '/api/subscribe' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();

      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { success: false, message: "Valid email is required" });
      }

      const subs = readJson('subscribers.json');
      const exists = subs.find(s => s.email === email);

      if (!exists) {
        subs.push({
          email,
          date: new Date().toISOString(),
          source: body.source || 'footer'
        });
        writeJson('subscribers.json', subs);
        console.log(`[API] New Subscriber: ${email}`);
      }

      const lang = body.lang || req.headers['accept-language'] || 'en';
      return sendJson(res, 200, {
        success: true,
        message: getMsg(lang, 'subscribe_ok')
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 6. Free LUTs Download Token
  if (pathname === '/api/luts' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const downloads = readJson('downloads.json');

      const downloadToken = `LUT-${Date.now().toString(36).toUpperCase()}`;
      downloads.push({
        token: downloadToken,
        email: body.email || 'traveler@creative.com',
        software: body.software || 'DaVinci Resolve / Premiere',
        date: new Date().toISOString()
      });
      writeJson('downloads.json', downloads);

      const lang = body.lang || req.headers['accept-language'] || 'en';
      return sendJson(res, 200, {
        success: true,
        downloadToken,
        packName: "AirL Cinematic Travel LUTs (10 .cube profiles)",
        message: getMsg(lang, 'luts_ok')
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 7. Support Concierge Ticket
  if (pathname === '/api/support' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const tickets = readJson('tickets.json');

      const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;
      const newTicket = {
        ticketId,
        name: body.name || 'Traveler',
        email: body.email || 'guest@airl.com',
        country: body.country || 'International',
        category: body.category || 'Flight regulations & Care',
        message: body.message || 'Assistance requested',
        priority: 'high',
        date: new Date().toISOString(),
        status: 'open'
      };

      tickets.push(newTicket);
      writeJson('tickets.json', tickets);

      const lang = body.lang || req.headers['accept-language'] || 'en';
      return sendJson(res, 201, {
        success: true,
        ticketId,
        estimatedResponseMinutes: 15,
        message: getMsg(lang, 'support_ok')
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(ROOT_DIR, safePath);

  // Check if file exists without extension, or directory
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>404 - Page Not Found | AirL</title>
          <link rel="stylesheet" href="/css/style.css">
        </head>
        <body style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
          <div class="container">
            <h1 class="font-display" style="font-size:4rem; color:var(--c-neon-lime);">404</h1>
            <p style="font-size:1.2rem; color:#fff; margin:16px 0;">Waypoint not found in flight plan.</p>
            <a href="/" class="btn-preorder-nav" style="display:inline-block; margin-top:20px;">Return to AirL Home</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const isCodeFile = ['.html', '.css', '.js', '.json'].includes(ext);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isCodeFile ? 'no-cache, no-store, must-revalidate, max-age=0' : 'public, max-age=86400',
      'Pragma': isCodeFile ? 'no-cache' : 'public',
      'Expires': isCodeFile ? '0' : undefined
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`  AIRL AERIAL CINEMATOGRAPHY — BACKEND SERVER`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  API Status: http://localhost:${PORT}/api/status`);
  console.log(`  Products:   http://localhost:${PORT}/api/products`);
  console.log('====================================================');
});
