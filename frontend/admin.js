// frontend/admin.js

// 1) Initialize Supabase client (so we can log in admin)
const SUPABASE_URL = "https://woqqydmwfkkrbplxdenr.supabase.co";  
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXF5ZG13ZmtrcmJwbHhkZW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDgyMDksImV4cCI6MjA2NDYyNDIwOX0.YRWVv9VH9WJzXdQQzQTnwDDdp02vsSnMaKL8Nd4ubPU";
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) Grab DOM elements
const loginSection = document.getElementById("login-section");
const adminActions = document.getElementById("admin-actions");

const loginBtn = document.getElementById("admin-login-btn");
const loginMsg = document.getElementById("login-msg");

const createItemBtn = document.getElementById("create-item-btn");
const listItemsBtn = document.getElementById("list-items-btn");
const updateItemBtn = document.getElementById("update-item-btn");
const deleteItemBtn = document.getElementById("delete-item-btn");

const createVersionBtn = document.getElementById("create-version-btn");
const listVersionsBtn = document.getElementById("list-versions-btn");
const updateVersionBtn = document.getElementById("update-version-btn");
const deleteVersionBtn = document.getElementById("delete-version-btn");

const createCategoryBtn = document.getElementById("create-category-btn");
const listCategoriesBtn = document.getElementById("list-categories-btn");
const updateCategoryBtn = document.getElementById("update-category-btn");
const deleteCategoryBtn = document.getElementById("delete-category-btn");

let currentSession = null;

// 3) Check if already logged in
(async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    currentSession = session;
    showAdminActions();
  }
})();

// 4) Handle admin login
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  if (!email || !password) {
    loginMsg.textContent = "Email & password required.";
    return;
  }
  loginMsg.textContent = "Logging in…";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    loginMsg.textContent = `Login failed: ${error.message}`;
    return;
  }
  currentSession = data.session;
  loginMsg.textContent = "";
  showAdminActions();
});

// 5) Show CRUD buttons once logged in
function showAdminActions() {
  loginSection.style.display = "none";
  adminActions.style.display = "block";
}

// 6) Helper: call backend with admin JWT
async function apiRequest(path, method = "GET", body = null) {
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

// 7) Item CRUD

// 7a) Create new item
createItemBtn.addEventListener("click", async () => {
  const baseSerial = prompt("Enter baseSerial (e.g. FMA001):").trim();
  const category = prompt("Enter category (e.g. Fashion):").trim();
  const subCategory = prompt("Enter subCategory (e.g. Men):").trim();
  if (!baseSerial || !category || !subCategory) {
    alert("All fields are required.");
    return;
  }
  try {
    await apiRequest("/admin/items", "POST", {
      baseSerial,
      category,
      subCategory,
    });
    alert("Item created successfully.");
  } catch (err) {
    alert("Error creating item: " + err.message);
  }
});

// 7b) List all items
listItemsBtn.addEventListener("click", async () => {
  try {
    const { data } = await apiRequest("/admin/items", "GET");
    console.table(data); // opens a console table of items
    alert("Check console for item list (or modify this to display in the DOM)");
  } catch (err) {
    alert("Error listing items: " + err.message);
  }
});

// 7c) Update an item
updateItemBtn.addEventListener("click", async () => {
  const id = prompt("Enter item ID to update (numeric):").trim();
  if (!id) return alert("ID is required.");
  const updates = {};
  const newBase = prompt("New baseSerial (leave blank to skip):").trim();
  if (newBase) updates.baseSerial = newBase;
  const newCat = prompt("New category (leave blank to skip):").trim();
  if (newCat) updates.category = newCat;
  const newSub = prompt("New subCategory (leave blank to skip):").trim();
  if (newSub) updates.subCategory = newSub;
  if (Object.keys(updates).length === 0) {
    return alert("No fields to update.");
  }
  try {
    await apiRequest(`/admin/items/${id}`, "PUT", updates);
    alert("Item updated successfully.");
  } catch (err) {
    alert("Error updating item: " + err.message);
  }
});

// 7d) Delete an item
deleteItemBtn.addEventListener("click", async () => {
  const id = prompt("Enter item ID to delete:").trim();
  if (!id) return alert("ID is required.");
  if (!confirm("Really delete item ID " + id + "?")) return;
  try {
    await apiRequest(`/admin/items/${id}`, "DELETE");
    alert("Item deleted successfully.");
  } catch (err) {
    alert("Error deleting item: " + err.message);
  }
});

// 8) Version CRUD

// 8a) Create new version
createVersionBtn.addEventListener("click", async () => {
  const product_id = prompt("Enter parent item ID:").trim();
  if (!product_id) return alert("Item ID is required.");
  // Prompt for version fields:
  const versionSerial = prompt("versionSerial (e.g. 01):").trim();
  const title = prompt("Title:").trim();
  const priceValue = parseInt(prompt("Price (integer):").trim());
  const sizesRaw = prompt("Sizes (comma-separated, e.g. S,M,L):").trim();
  const sizes = sizesRaw.split(",").map((s) => s.trim());
  const imageKey = prompt(
    "Image key (R2 filename, e.g. FMA00101.jpg):"
  ).trim();
  const description = prompt("Description (optional):").trim();
  const inStock = confirm("In stock? OK = yes, Cancel = no");
  if (!versionSerial || !title || isNaN(priceValue) || sizes.length === 0 || !imageKey) {
    return alert("Missing required version fields.");
  }

  try {
    await apiRequest("/admin/versions", "POST", {
      product_id: parseInt(product_id),
      versionSerial,
      title,
      priceValue,
      sizes,
      imageKey,
      description,
      inStock,
    });
    alert("Version created successfully.");
  } catch (err) {
    alert("Error creating version: " + err.message);
  }
});

// 8b) List versions for a product
listVersionsBtn.addEventListener("click", async () => {
  const product_id = prompt("Enter item ID to list versions:").trim();
  if (!product_id) return alert("Item ID is required.");
  try {
    const { data } = await apiRequest(`/admin/items/${product_id}/versions`, "GET");
    console.table(data);
    alert("Check console for version list (or modify this to display in DOM).");
  } catch (err) {
    alert("Error listing versions: " + err.message);
  }
});

// 8c) Update a version
updateVersionBtn.addEventListener("click", async () => {
  const id = prompt("Enter version ID to update:").trim();
  if (!id) return alert("Version ID is required.");
  const updates = {};
  const newTitle = prompt("New title (leave blank to skip):").trim();
  if (newTitle) updates.title = newTitle;
  const newPrice = prompt("New price (integer, leave blank to skip):").trim();
  if (newPrice) updates.priceValue = parseInt(newPrice);
  const newSizesRaw = prompt(
    "New sizes (comma-separated, leave blank to skip):"
  ).trim();
  if (newSizesRaw) updates.sizes = newSizesRaw.split(",").map((s) => s.trim());
  const newImageKey = prompt(
    "New imageKey (R2 key, leave blank to skip):"
  ).trim();
  if (newImageKey) updates.imageKey = newImageKey;
  const newInStock = prompt(
    "Set inStock? (yes/no/leave blank to skip):"
  ).trim().toLowerCase();
  if (newInStock === "yes") updates.inStock = true;
  else if (newInStock === "no") updates.inStock = false;

  if (Object.keys(updates).length === 0) {
    return alert("No fields to update.");
  }
  try {
    await apiRequest(`/admin/versions/${id}`, "PUT", updates);
    alert("Version updated successfully.");
  } catch (err) {
    alert("Error updating version: " + err.message);
  }
});

// 8d) Delete a version
deleteVersionBtn.addEventListener("click", async () => {
  const id = prompt("Enter version ID to delete:").trim();
  if (!id) return alert("Version ID is required.");
  if (!confirm("Really delete version ID " + id + "?")) return;
  try {
    await apiRequest(`/admin/versions/${id}`, "DELETE");
    alert("Version deleted successfully.");
  } catch (err) {
    alert("Error deleting version: " + err.message);
  }
});

// 9) Category CRUD

// 9a) Create new category
createCategoryBtn.addEventListener("click", async () => {
  const name = prompt("Enter category name (e.g. Fashion):").trim();
  const letter = prompt("Enter category letter (e.g. F):").trim();
  if (!name || !letter) return alert("Both fields are required.");
  try {
    await apiRequest("/admin/categories", "POST", { name, letter });
    alert("Category created.");
  } catch (err) {
    alert("Error creating category: " + err.message);
  }
});

// 9b) List categories
listCategoriesBtn.addEventListener("click", async () => {
  try {
    const { data } = await apiRequest("/admin/categories", "GET");
    console.table(data);
    alert("Check console for category list.");
  } catch (err) {
    alert("Error listing categories: " + err.message);
  }
});

// 9c) Update category
updateCategoryBtn.addEventListener("click", async () => {
  const id = prompt("Enter category ID to update:").trim();
  if (!id) return alert("ID is required.");
  const updates = {};
  const newName = prompt("New name (leave blank to skip):").trim();
  if (newName) updates.name = newName;
  const newLetter = prompt("New letter (leave blank to skip):").trim();
  if (newLetter) updates.letter = newLetter;
  if (Object.keys(updates).length === 0) {
    return alert("No fields to update.");
  }
  try {
    await apiRequest(`/admin/categories/${id}`, "PUT", updates);
    alert("Category updated.");
  } catch (err) {
    alert("Error updating category: " + err.message);
  }
});

// 9d) Delete category
deleteCategoryBtn.addEventListener("click", async () => {
  const id = prompt("Enter category ID to delete:").trim();
  if (!id) return alert("ID is required.");
  if (!confirm("Delete category ID " + id + "?")) return;
  try {
    await apiRequest(`/admin/categories/${id}`, "DELETE");
    alert("Category deleted.");
  } catch (err) {
    alert("Error deleting category: " + err.message);
  }
});











async function showSecretKeyGeneratorPopup() {
  // 1) Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "secret-generator-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999"
  });

  // 2) Create the pop-up box
  const box = document.createElement("div");
  box.id = "secret-generator-box";
  Object.assign(box.style, {
    background: "#2c2c2c4e",
    color: "var(--fg)",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "400px",
    padding: "1.5rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    position: "relative",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  });

  // 3) Close (“✕”) button (top-right)
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "12px",
    background: "none",
    border: "none",
    color: "var(--fg)",
    fontSize: "1.2rem",
    cursor: "pointer"
  });
  closeBtn.onclick = () => document.body.removeChild(overlay);
  box.appendChild(closeBtn);

  // 4) Heading
  const heading = document.createElement("h2");
  heading.innerText = "Generate New Secret-Key JSON";
  Object.assign(heading.style, {
    margin: "0 0 0.5rem 0",
    fontSize: "1.25rem",
    textAlign: "center",
    color: "var(--fg)"
  });
  box.appendChild(heading);

  // 5) Input field (for new secret phrase)
  const inputLabel = document.createElement("label");
  inputLabel.innerText = "Enter new secret phrase (case-sensitive):";
  Object.assign(inputLabel.style, {
    fontSize: "1rem",
    marginBottom: "0.25rem",
    color: "var(--fg)"
  });
  box.appendChild(inputLabel);

  const input = document.createElement("input");
  input.id = "secret-generator-input";
  input.type = "text";
  input.placeholder = "e.g. Login as Admin";
  Object.assign(input.style, {
    width: "100%",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid var(--gray)",
    background: "var(--muted)",
    color: "var(--fg)",
    fontSize: "1rem"
  });
  box.appendChild(input);

  // 6) “Generate” button
  const generateBtn = document.createElement("button");
  generateBtn.id = "secret-generator-generate";
  generateBtn.innerText = "Generate";
  Object.assign(generateBtn.style, {
    width: "100%",
    padding: "0.8rem",
    borderRadius: "8px",
    border: "none",
    background: "var(--accent)",
    color: "var(--bg)",
    fontSize: "1rem",
    cursor: "pointer"
  });
  box.appendChild(generateBtn);

  // 7) Info / instructions line
  const info = document.createElement("div");
  info.innerText = "Open the console (F12) to copy the resulting JSON.";
  Object.assign(info.style, {
    fontSize: "0.85rem",
    color: "var(--fg)",
    textAlign: "center",
    marginTop: "0.5rem"
  });
  box.appendChild(info);

  // 8) Assemble and show
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  input.focus();

  // 9) When “Generate” is clicked → compute and log JSON
  generateBtn.addEventListener("click", async () => {
    const phrase = input.value.trim();
    if (!phrase) {
      console.warn("Please enter a nonempty secret phrase.");
      return;
    }

    // 9.a) Generate a random 8-byte salt → 16 hex chars
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(8));
    const saltHex = Array.from(saltBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // 9.b) Compute SHA-256 of (phrase + saltHex)
    const encoder = new TextEncoder();
    const data = encoder.encode(phrase + saltHex);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");

    // 9.c) Build the JSON string
    const outputObj = {
      salt: saltHex,
      adminHash: hashHex
    };
    const jsonString = JSON.stringify(outputObj, null, 4);

    console.log("──── New secret.json contents ────");
    console.log(jsonString);
    console.log("──── Copy & paste the above into your secret.json ────");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Attach showSecretKeyGeneratorPopup() to your admin button:
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("security-word-login-generator");
  if (btn) {
    btn.addEventListener("click", showSecretKeyGeneratorPopup);
  }
});


