const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ORDERS_FILE = path.join(ROOT, "data", "orders.json");

const products = [
  {
    id: "linen-overshirt",
    name: "Linen Overshirt",
    category: "Women",
    collection: "New Season",
    price: 2499,
    rating: 4.8,
    badge: "New",
    description: "A breathable linen blend layer with clean tailoring and relaxed sleeves.",
    colors: ["Ivory", "Sage", "Ink"],
    sizes: ["XS", "S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "tailored-cargo",
    name: "Tailored Cargo Trouser",
    category: "Men",
    collection: "Essentials",
    price: 3199,
    rating: 4.7,
    badge: "Best Seller",
    description: "Structured cotton cargos with tapered legs, deep pockets, and refined hardware.",
    colors: ["Olive", "Charcoal", "Stone"],
    sizes: ["28", "30", "32", "34", "36"],
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "rib-knit-dress",
    name: "Rib Knit Midi Dress",
    category: "Women",
    collection: "Evening",
    price: 2799,
    rating: 4.9,
    badge: "Limited",
    description: "Soft stretch rib with a close fit, side slit, and a square neckline.",
    colors: ["Black", "Cocoa", "Wine"],
    sizes: ["XS", "S", "M", "L"],
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "boxy-denim-jacket",
    name: "Boxy Denim Jacket",
    category: "Unisex",
    collection: "Street",
    price: 3499,
    rating: 4.6,
    badge: "Trending",
    description: "Vintage-wash denim jacket cut wide through the body for easy layering.",
    colors: ["Light Blue", "Washed Black"],
    sizes: ["S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "organic-tee-pack",
    name: "Organic Tee Pack",
    category: "Unisex",
    collection: "Essentials",
    price: 1899,
    rating: 4.5,
    badge: "Value",
    description: "Three heavyweight organic cotton tees with a polished everyday fit.",
    colors: ["White", "Black", "Grey"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "satin-coord-set",
    name: "Satin Co-ord Set",
    category: "Women",
    collection: "Evening",
    price: 4299,
    rating: 4.8,
    badge: "Premium",
    description: "Fluid satin shirt and wide-leg trouser set made for dressy comfort.",
    colors: ["Champagne", "Emerald", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80"
  }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function validateOrder(order) {
  const errors = [];
  if (!order.customer?.name || order.customer.name.trim().length < 2) errors.push("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer?.email || "")) errors.push("Valid email is required.");
  if (!order.customer?.address || order.customer.address.trim().length < 8) errors.push("Delivery address is required.");
  if (!Array.isArray(order.items) || order.items.length === 0) errors.push("Cart is empty.");

  const items = [];
  let total = 0;

  for (const item of order.items || []) {
    const product = products.find((entry) => entry.id === item.productId);
    const quantity = Number(item.quantity);

    if (!product) {
      errors.push("Product not found.");
      continue;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      errors.push(`Invalid quantity for ${product.name}.`);
      continue;
    }

    if (!product.sizes.includes(item.size)) errors.push(`Invalid size for ${product.name}.`);
    if (!product.colors.includes(item.color)) errors.push(`Invalid color for ${product.name}.`);

    total += product.price * quantity;
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size: item.size,
      color: item.color
    });
  }

  return { errors, items, total };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "clothing-store", timestamp: new Date().toISOString() });
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const category = url.searchParams.get("category");
    const collection = url.searchParams.get("collection");
    const query = (url.searchParams.get("q") || "").toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory = !category || category === "All" || product.category === category;
      const matchesCollection = !collection || collection === "All" || product.collection === collection;
      const matchesQuery = !query || `${product.name} ${product.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesCollection && matchesQuery;
    });

    return sendJson(res, 200, { products: filtered });
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    try {
      const body = await readBody(req);
      const validation = validateOrder(body);
      if (validation.errors.length) return sendJson(res, 400, { errors: validation.errors });

      const order = {
        id: crypto.randomUUID(),
        status: "received",
        total: validation.total,
        items: validation.items,
        customer: {
          name: body.customer.name.trim(),
          email: body.customer.email.trim().toLowerCase(),
          address: body.customer.address.trim()
        },
        createdAt: new Date().toISOString()
      };

      await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
      const existing = await fs.readFile(ORDERS_FILE, "utf8").then(JSON.parse).catch(() => []);
      existing.push(order);
      await fs.writeFile(ORDERS_FILE, JSON.stringify(existing, null, 2));

      return sendJson(res, 201, { order });
    } catch (error) {
      return sendJson(res, 400, { errors: ["Could not process this order."] });
    }
  }

  return sendJson(res, 404, { errors: ["API route not found."] });
}

async function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(file);
  } catch {
    const fallback = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fallback);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Clothing store running at http://localhost:${PORT}`);
});
