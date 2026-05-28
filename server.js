const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ORDERS_FILE = path.join(ROOT, "data", "orders.json");
const PRODUCTS_FILE = path.join(ROOT, "data", "products.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash("sha256").update(ADMIN_PASSWORD).digest("hex");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const seedProducts = [
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

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store"
  });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = decodeURIComponent(valueParts.join("="));
  }

  return cookies;
}

function signSession(payload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function createSessionToken() {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${signSession(payload)}`;
}

function hasAdminSession(req) {
  const token = parseCookies(req).admin_session;
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = signSession(payload);
  const provided = parts[2];

  if (expected.length !== provided.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return false;
  return parts[0] === "admin" && Number(parts[1]) > Date.now();
}

function setAdminSession(res) {
  const cookie = [
    `admin_session=${encodeURIComponent(createSessionToken())}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ];
  res.setHeader("Set-Cookie", cookie.join("; "));
}

function clearAdminSession(res) {
  res.setHeader("Set-Cookie", "admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function readProducts() {
  await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });

  try {
    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, "utf8"));
    if (Array.isArray(products)) return products;
  } catch {
    await writeProducts(seedProducts);
  }

  return seedProducts;
}

async function writeProducts(products) {
  await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function readOrders() {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  return fs.readFile(ORDERS_FILE, "utf8").then(JSON.parse).catch(() => []);
}

function requireAdmin(req, res) {
  if (hasAdminSession(req)) return true;
  sendJson(res, 401, { errors: ["Admin login is required."] });
  return false;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateProduct(input, existingProducts, currentId = "") {
  const errors = [];
  const name = String(input.name || "").trim();
  const id = slugify(input.id || name);
  const category = String(input.category || "").trim();
  const collection = String(input.collection || "").trim();
  const price = Number(input.price);
  const rating = Number(input.rating || 4.5);
  const badge = String(input.badge || "New").trim();
  const description = String(input.description || "").trim();
  const image = String(input.image || "").trim();
  const colors = normalizeList(input.colors);
  const sizes = normalizeList(input.sizes);

  if (!name) errors.push("Product name is required.");
  if (!id) errors.push("Product ID is required.");
  if (existingProducts.some((product) => product.id === id && product.id !== currentId)) errors.push("Product ID already exists.");
  if (!category) errors.push("Category is required.");
  if (!collection) errors.push("Collection is required.");
  if (!Number.isFinite(price) || price < 1) errors.push("Price must be greater than zero.");
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.push("Rating must be between 0 and 5.");
  if (!description) errors.push("Description is required.");
  if (!image) errors.push("Image URL is required.");
  if (!colors.length) errors.push("Add at least one color.");
  if (!sizes.length) errors.push("Add at least one size.");

  return {
    errors,
    product: { id, name, category, collection, price, rating, badge, description, colors, sizes, image }
  };
}

async function validateOrder(order) {
  const errors = [];
  if (!order.customer?.name || order.customer.name.trim().length < 2) errors.push("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer?.email || "")) errors.push("Valid email is required.");
  if (!order.customer?.address || order.customer.address.trim().length < 8) errors.push("Delivery address is required.");
  if (!Array.isArray(order.items) || order.items.length === 0) errors.push("Cart is empty.");

  const items = [];
  let total = 0;
  const products = await readProducts();

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
    return sendJson(res, 200, { ok: true, service: "xelvora", timestamp: new Date().toISOString() });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/session") {
    return sendJson(res, 200, { authenticated: hasAdminSession(req) });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    try {
      const body = await readBody(req);
      if (String(body.password || "") !== ADMIN_PASSWORD) {
        return sendJson(res, 401, { errors: ["Incorrect admin password."] });
      }

      setAdminSession(res);
      return sendJson(res, 200, { authenticated: true });
    } catch {
      return sendJson(res, 400, { errors: ["Could not log in."] });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    clearAdminSession(res);
    return sendJson(res, 200, { authenticated: false });
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const products = await readProducts();
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

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    if (!requireAdmin(req, res)) return;
    const orders = await readOrders();
    return sendJson(res, 200, { orders: orders.slice().reverse() });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/products") {
    if (!requireAdmin(req, res)) return;

    try {
      const body = await readBody(req);
      const products = await readProducts();
      const validation = validateProduct(body, products);
      if (validation.errors.length) return sendJson(res, 400, { errors: validation.errors });

      products.push(validation.product);
      await writeProducts(products);
      return sendJson(res, 201, { product: validation.product, products });
    } catch {
      return sendJson(res, 400, { errors: ["Could not create product."] });
    }
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/admin/products/")) {
    if (!requireAdmin(req, res)) return;

    try {
      const currentId = decodeURIComponent(url.pathname.split("/").pop());
      const body = await readBody(req);
      const products = await readProducts();
      const index = products.findIndex((product) => product.id === currentId);
      if (index === -1) return sendJson(res, 404, { errors: ["Product not found."] });

      const validation = validateProduct({ ...products[index], ...body }, products, currentId);
      if (validation.errors.length) return sendJson(res, 400, { errors: validation.errors });

      products[index] = validation.product;
      await writeProducts(products);
      return sendJson(res, 200, { product: validation.product, products });
    } catch {
      return sendJson(res, 400, { errors: ["Could not update product."] });
    }
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/products/")) {
    if (!requireAdmin(req, res)) return;

    const currentId = decodeURIComponent(url.pathname.split("/").pop());
    const products = await readProducts();
    const nextProducts = products.filter((product) => product.id !== currentId);
    if (nextProducts.length === products.length) return sendJson(res, 404, { errors: ["Product not found."] });

    await writeProducts(nextProducts);
    return sendJson(res, 200, { products: nextProducts });
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    try {
      const body = await readBody(req);
      const validation = await validateOrder(body);
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
      const existing = await readOrders();
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

  if (requestedPath === "/admin.html" && !hasAdminSession(req)) {
    return redirect(res, "/admin-login.html");
  }

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
      "Cache-Control": [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=3600"
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
