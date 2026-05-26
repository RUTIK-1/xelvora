const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("threadhaus-cart") || "[]"),
  category: "All",
  query: ""
};

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

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();

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
  const response = await fetch("/api/products");
  const data = await response.json();
  state.products = data.products;
  renderProducts();
  renderCart();
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

loadProducts().catch(() => {
  productGrid.innerHTML = `<p class="empty-cart">Products could not be loaded.</p>`;
});
