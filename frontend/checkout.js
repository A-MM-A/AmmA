// frontend/checkout.js

const notLoggedMsg2 = document.getElementById("not-logged-in-msg-2");
const cartloginBtnTop = document.getElementById("cart-login-btn-top");

(async function () {


  // 2) Ensure user is logged in
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    document.getElementById("not-logged-in-msg-cart").style.display = "block";
    document.getElementById("cart-login-btn-top").style.display = "block";
    document.getElementById("checkout-main-page").style.display = "none";

    // loadingWait("Guest Account\n Please login to view cart information", 0.8, false);
    return;
  } else {
    document.getElementById("not-logged-in-msg-cart").style.display = "none";
    document.getElementById("cart-login-btn-top").style.display = "none";
    document.getElementById("checkout-main-page").style.display = "block";

  }



  

  document.addEventListener("DOMContentLoaded", function () {
    
  });


  const userId = session.user.id;

  // 3) Fetch cart items from backend
  let cartItems = [];
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to load cart");
    const json = await res.json();
    cartItems = json.data; // array of { id, user_id, product_version_id, quantity, size, added_at }
  } catch (err) {
    console.error(err);
    document.getElementById("cart-container").innerHTML =
      "<p style='color:red;'>Unable to load cart.</p>";
    return;
  }

  // 4) For each cart item, fetch version & product details
  const detailedItems = await Promise.all(
    cartItems.map(async (c) => {
      // Fetch version details
      const vRes = await fetch(
        `${CONFIG.API_BASE_URL}/versions/${c.product_version_id}`
      );
      const vJson = await vRes.json();
      const version = vJson.data; // { id, product_id, versionSerial, title, priceValue, sizes[], imageKey, … }

      // Fetch product details to get baseSerial/category
      const pRes = await fetch(
        `${CONFIG.API_BASE_URL}/products/${version.baseSerial}`
      );
      const pJson = await pRes.json();
      const product = pJson.data; // product object
      return { cart: c, version, product };
    })
  );

  // renderCart(detailedItems, session.access_token);
})();

// 5) Render cart items into DOM with quantity controls
function renderCart(items, token) {
  const container = document.getElementById("cart-container");
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  items.forEach((entry) => {
    // Destructure
    const {
      cart: { id: cartId, quantity, size },
      version,
      product,
    } = entry;

    const itemCard = document.createElement("div");
    itemCard.classList.add("cart-item-card");

    // Product image
    const img = document.createElement("img");
    img.src = `${CONFIG.R2_PUBLIC_URL}/${version.imageKey}`;
    img.alt = version.title;
    img.classList.add("cart-image");
    itemCard.appendChild(img);

    // Title/Serial
    const title = document.createElement("h3");
    title.textContent = `${product.baseSerial} – ${version.title}`;
    itemCard.appendChild(title);

    // Price
    const price = document.createElement("p");
    price.textContent = `Price: KES ${version.priceValue}`;
    itemCard.appendChild(price);

    // Size & Quantity
    const sizeP = document.createElement("p");
    sizeP.textContent = `Size: ${size}`;
    itemCard.appendChild(sizeP);

    const qtyLabel = document.createElement("label");
    qtyLabel.textContent = "Qty: ";
    qtyLabel.setAttribute("for", `qty-${cartId}`);
    itemCard.appendChild(qtyLabel);

    const qtyInput = document.createElement("input");
    qtyInput.setAttribute("type", "number");
    qtyInput.setAttribute("id", `qty-${cartId}`);
    qtyInput.setAttribute("min", "1");
    qtyInput.value = quantity;
    qtyInput.addEventListener("change", () => {
      updateCartQuantity(cartId, qtyInput.value, token);
    });
    itemCard.appendChild(qtyInput);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      deleteCartItem(cartId, token);
    });
    itemCard.appendChild(removeBtn);

    container.appendChild(itemCard);
  });
}

// 6) Update cart quantity
async function updateCartQuantity(cartId, newQty, token) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/cart/${cartId}`, {
      method: "PUT", // backend must support PUT /cart/:cartId
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity: parseInt(newQty) }),
    });
    if (!res.ok) throw new Error("Failed to update cart");
    alert("Quantity updated.");
  } catch (err) {
    console.error(err);
    alert("Error updating cart: " + err.message);
    window.location.reload();
  }
}

// 7) Delete cart item
async function deleteCartItem(cartId, token) {
  if (!confirm("Remove this item from cart?")) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/cart/${cartId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to remove item");
    alert("Item removed.");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Error removing item: " + err.message);
  }
}
