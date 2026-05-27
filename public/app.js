const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("threadhaus-cart") || "[]"),
  category: "All",
  query: ""
};

const fallbackProducts = [
  {
    id: "linen-overshirt",
    name: "Linen Overshirt",
    category: "Women",
    collection: "New Season",
    price: 2499,
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
    badge: "Premium",
    description: "Fluid satin shirt and wide-leg trouser set made for dressy comfort.",
    colors: ["Champagne", "Emerald", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80"
  }
];

const productGrid = document.querySelector("#productGrid");
const cartButton = document.querySelector("#cartButton");
const closeCart = document.querySelector("#closeCart");
const cartDrawer = document.querySelector("#cartDrawer");
const overlay = document.querySelector("#overlay");
const cartCount = document.querySelector("#cartCount");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const checkoutForm = document.querySelector("#checkoutForm");
const formMessage = document.querySelector("#formMessage");
const searchInput = document.querySelector("#searchInput");
const filters = document.querySelectorAll(".filter");
const productStat = document.querySelector("#productStat");
const menuToggle = document.querySelector("#menuToggle");
const primaryNav = document.querySelector("#primaryNav");

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function saveCart() {
  localStorage.setItem("threadhaus-cart", JSON.stringify(state.cart));
}

function renderProducts() {
  const products = state.products.filter((product) => {
    const matchesCategory = state.category === "All" || product.category === state.category;
    const matchesQuery = `${product.name} ${product.description}`.toLowerCase().includes(state.query);
    return matchesCategory && matchesQuery;
  });

  if (!products.length) {
    productGrid.innerHTML = `<p class="empty-cart">No products match your search.</p>`;
    return;
  }

  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <span class="badge">${product.badge}</span>
      </div>
      <div class="product-content">
        <div class="product-topline">
          <div>
            <h3>${product.name}</h3>
            <div class="product-meta">${product.category} / ${product.collection}</div>
          </div>
          <strong>${money.format(product.price)}</strong>
        </div>
        <p class="product-description">${product.description}</p>
        <div class="selectors">
          <select aria-label="Choose size for ${product.name}" data-field="size-${product.id}">
            ${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("")}
          </select>
          <select aria-label="Choose color for ${product.name}" data-field="color-${product.id}">
            ${product.colors.map((color) => `<option value="${color}">${color}</option>`).join("")}
          </select>
        </div>
        <button class="add-button" type="button" data-add="${product.id}">Add to cart</button>
      </div>
    </article>
  `).join("");
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money.format(total);

  if (!state.cart.length) {
    cartItems.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    return;
  }

  cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-line">
        <div>
          <h3>${item.name}</h3>
          <div class="product-meta">${item.size} / ${item.color} / Qty ${item.quantity}</div>
        </div>
        <strong>${money.format(item.price * item.quantity)}</strong>
      </div>
      <button type="button" data-remove="${index}">Remove</button>
    </div>
  `).join("");
}

function openCartDrawer() {
  cartDrawer.classList.add("open");
  overlay.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  overlay.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function addToCart(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  const size = document.querySelector(`[data-field="size-${productId}"]`).value;
  const color = document.querySelector(`[data-field="color-${productId}"]`).value;
  const existing = state.cart.find((item) => item.productId === productId && item.size === size && item.color === color);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, 10);
  } else {
    state.cart.push({
      productId,
      name: product.name,
      price: product.price,
      size,
      color,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  openCartDrawer();
}

async function submitOrder(event) {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.classList.remove("error");

  if (!state.cart.length) {
    formMessage.textContent = "Add at least one item before checkout.";
    formMessage.classList.add("error");
    return;
  }

  const form = new FormData(checkoutForm);
  const payload = {
    customer: {
      name: form.get("name"),
      email: form.get("email"),
      address: form.get("address")
    },
    items: state.cart.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity }))
  };

  let response;
  let result;

  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    result = await response.json();
  } catch {
    formMessage.textContent = "Checkout needs the backend API. Please deploy this as a Node web service.";
    formMessage.classList.add("error");
    return;
  }

  if (!response.ok) {
    formMessage.textContent = result.errors?.join(" ") || "Order failed.";
    formMessage.classList.add("error");
    return;
  }

  state.cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();
  formMessage.textContent = `Order ${result.order.id.slice(0, 8)} received.`;
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Products API unavailable");
    const data = await response.json();
    state.products = data.products;
  } catch {
    state.products = fallbackProducts;
  }

  renderProducts();
  renderCart();
  if (productStat) productStat.textContent = state.products.length;
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.cart.splice(Number(button.dataset.remove), 1);
  saveCart();
  renderCart();
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("active"));
    button.classList.add("active");
    state.category = button.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim().toLowerCase();
  renderProducts();
});

cartButton.addEventListener("click", openCartDrawer);
closeCart.addEventListener("click", closeCartDrawer);
overlay.addEventListener("click", closeCartDrawer);
checkoutForm.addEventListener("submit", submitOrder);

menuToggle.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("open");
  menuToggle.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

primaryNav.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  primaryNav.classList.remove("open");
  menuToggle.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
});

loadProducts();
