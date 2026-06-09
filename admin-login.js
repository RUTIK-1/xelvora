const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");

async function checkSession() {
  const response = await fetch("/api/admin/session");
  const data = await response.json();
  if (data.authenticated) window.location.href = "/admin.html";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Checking...";
  loginMessage.classList.remove("error");

  const form = new FormData(loginForm);
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: form.get("password") })
  });
  const data = await response.json();

  if (!response.ok) {
    loginMessage.textContent = data.errors?.join(" ") || "Login failed.";
    loginMessage.classList.add("error");
    return;
  }

  window.location.href = "/admin.html";
});

checkSession().catch(() => {
  loginMessage.textContent = "Backend API is not running.";
  loginMessage.classList.add("error");
});
