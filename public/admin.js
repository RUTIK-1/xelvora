const form = document.querySelector("#productForm");
const formTitle = document.querySelector("#formTitle");
const currentId = document.querySelector("#currentId");
const message = document.querySelector("#adminMessage");
const productList = document.querySelector("#adminProductList");
const productCount = document.querySelector("#productCount");
const resetFormButton = document.querySelector("#resetForm");
const logoutButton = document.querySelector("#logoutButton");
const topMessage = document.querySelector("#adminTopMessage");

let products = [];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  topMessage.textContent = text;
  topMessage.classList.toggle("error", isError);
}

function productFromForm() {
  const data = new FormData(form);
  return {
    name: data.get("name"),
    category: data.get("category"),
    collection: data.get("collection"),
    price: Number(data.get("price")),
    badge: data.get("badge"),
    image: data.get("image"),
    description: data.get("description"),
    sizes: data.get("sizes"),
    colors: data.get("colors")
  };
}

function fillForm(product) {
  currentId.value = product.id;
  formTitle.textContent = "Edit product";
  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  form.elements.collection.value = product.collection;
  form.elements.price.value = product.price;
  form.elements.badge.value = product.badge;
  form.elements.image.value = product.image;
  form.elements.description.value = product.description;
  form.elements.sizes.value = product.sizes.join(", ");
  form.elements.colors.value = product.colors.join(", ");
  showMessage(`Editing ${product.name}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  currentId.value = "";
  formTitle.textContent = "Add product";
  showMessage("");
}

function renderProducts() {
  productCount.textContent = `${products.length} ${products.length === 1 ? "item" : "items"}`;

  if (!products.length) {
    productList.innerHTML = `<p class="empty-cart">No products yet.</p>`;
    return;
  }

  productList.innerHTML = products.map((product) => `
    <article class="admin-product">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <div class="product-topline">
          <div>
            <h3>${product.name}</h3>
            <p>${product.category} / ${product.collection}</p>
          </div>
          <strong>${money.format(product.price)}</strong>
        </div>
        <p>${product.description}</p>
        <div class="admin-actions">
          <button class="secondary-button" type="button" data-edit="${product.id}">Edit</button>
          <button class="danger-button" type="button" data-delete="${product.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function loadProducts() {
  const session = await fetch("/api/admin/session").then((response) => response.json());
  if (!session.authenticated) {
    window.location.href = "/admin-login.html";
    return;
  }

  const response = await fetch("/api/products");
  const data = await response.json();
  products = data.products || [];
  renderProducts();
}

async function saveProduct(event) {
  event.preventDefault();
  showMessage("Saving...");

  const editingId = currentId.value;
  const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
    method: editingId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productFromForm())
  });
  const result = await response.json();

  if (response.status === 401) {
    window.location.href = "/admin-login.html";
    return;
  }

  if (!response.ok) {
    showMessage(result.errors?.join(" ") || "Could not save product.", true);
    return;
  }

  products = result.products;
  renderProducts();
  resetForm();
  showMessage("Product saved. Refresh Xelvora to see it live.");
}

async function deleteProduct(productId) {
  const product = products.find((entry) => entry.id === productId);
  if (!product) return;
  if (!confirm(`Delete ${product.name}?`)) return;

  const response = await fetch(`/api/admin/products/${productId}`, {
    method: "DELETE"
  });
  const result = await response.json();

  if (response.status === 401) {
    window.location.href = "/admin-login.html";
    return;
  }

  if (!response.ok) {
    showMessage(result.errors?.join(" ") || "Could not delete product.", true);
    return;
  }

  products = result.products;
  renderProducts();
  resetForm();
  showMessage("Product deleted.");
}

productList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const product = products.find((entry) => entry.id === editButton.dataset.edit);
    if (product) fillForm(product);
  }

  if (deleteButton) deleteProduct(deleteButton.dataset.delete);
});

form.addEventListener("submit", saveProduct);
resetFormButton.addEventListener("click", resetForm);
logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});
loadProducts().catch(() => showMessage("Backend API is not running. Deploy this as a Node web service.", true));
