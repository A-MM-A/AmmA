// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 cart system
// ---------------------------------------------------------------------------------------------------------------------------------------------- 
// Automatically adds commas like 1,000
function formatNumberWithCommas(number) {
    return number.toLocaleString();
}
// Automatically adds '/=' like 1,000/=
function formatKESAmount(number) {
    return `${number.toLocaleString()} /=`;
}
// update any changes
function updateCartCount(count) {
    const badge = document.querySelector('.cart-badge');

    // Save raw number in data-count for future math
    badge.dataset.count = count;

    if (count <= 0) {
        badge.classList.add('hidden');
        badge.textContent = '';
        badge.dataset.count = '0';
        return;
    }
    badge.classList.remove('hidden');

    // Show if over limit
    const cartlimit = 100000;

    if (count > cartlimit) {
        badge.textContent = `${cartlimit.toLocaleString()}+ /=`;;
    } else {
        badge.textContent = formatKESAmount(count);
    }

}
// adds value to cart
function addToCartCount(amount) {
    const badge = document.querySelector('.cart-badge');

    // Get the current count from data attribute
    let current = parseInt(badge.dataset.count || '0', 10);
    let newCount = current + amount;

    updateCartCount(newCount);
}
// removes value from cart
function removeFromCartCount(amount) {
    const badge = document.querySelector('.cart-badge');

    // Get the current count from data attribute
    let current = parseInt(badge.dataset.count || '0', 10);
    let newCount = current - amount;

    updateCartCount(newCount);
}

//  testing code
// updateCartCount(32000);
// addToCartCount(57482);
// removeFromCartCount(7482);































// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 scrolling system
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

// Track which item panel & which version are centered
let currentPanelIndex = 0;
let currentVersionIndex = 0;

// Helper to shuffle an array
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.random() * (i + 1) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // —————————————————————————
    //   Raw product data from data.json   
    // —————————————————————————
    fetch("data.json")
        .then(response => response.json())
        .then(rawItems => {
            // Once JSON is loaded, add per-version state:
            // Serial: [Cat][Gender][XXX][VV], e.g. "FMA00101.jpg"
            rawItems.forEach(item => {
                item.versionsState = item.versions.map(() => ({
                    liked: false,
                    inCart: false
                }));
            });


            // —————————————————————————
            //   Recommendation algorithm
            // —————————————————————————            
            function computeScore(meta) {
                const WEIGHTS = { browse: 1, like: 3, cart: 5 };
                return (meta.browseCount || 0) * WEIGHTS.browse
                    + (meta.liked ? 1 : 0) * WEIGHTS.like
                    + (meta.inCart ? 1 : 0) * WEIGHTS.cart;
            }
            function recommend(items) {
                //    Scores items by browse, like, cart; sorts descending
                //    Then appends 2 random others for diversification
                // Attach dummy metadata if missing
                items.forEach(it => {
                    it.meta = it.meta || { browseCount: 0, liked: false, inCart: false };
                    it.score = computeScore(it.meta);
                });
                // Sort by score descending
                items.sort((a, b) => b.score - a.score);

                // Diversify: take top N-2, then 2 random from the rest
                const N = items.length;
                const main = items.slice(0, N - 2);
                const other = items.slice(N - 2);
                // shuffle 'other'
                for (let i = other.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [other[i], other[j]] = [other[j], other[i]];
                }
                return main.concat(other.slice(0, 2));
            }
            let itemsOrdered = recommend(rawItems);








            // —————————————————————————
            //   Cache bottom‐info elements
            // —————————————————————————
            const vContainer = document.getElementById("verticalScroll");
            // const hContainers = document.querySelectorAll(".horizontal-scroll");

            // const titleEl = document.getElementById("item-title");
            // const serialEl = document.getElementById("item-serial");
            // const priceEl = document.getElementById("item-price");






            // —————————————————————————
            //     build panels
            // —————————————————————————
            function sideButtonsHTML() {
                return `
                <div class="side-buttons">
                  <button onclick="toggleIcon(this)">
                    <img class="svg"
                         src="icons/heart-line.svg"
                         data-default="icons/heart-line.svg"
                         data-active="icons/heart-fill.svg"
                         alt="Like">
                  </button>
                  <button class="cart-btn">
                    <img class="svg"
                         src="icons/shopping-cart-line.svg"
                         data-default="icons/shopping-cart-line.svg"
                         data-active="icons/shopping-cart-fill.svg"
                         alt="Add to Cart">
                  </button>
                  <button class="info-btn">
                    <img class="svg"
                         src="icons/list-view.svg"
                         alt="Info">
                  </button>
                  <button class="share-btn">
                    <img class="svg"
                         src="icons/share-forward-line.svg"
                         alt="Share">
                  </button>
                </div>`;
            }

            function buildPanels() {
                vContainer.innerHTML = "";

                itemsOrdered.forEach((item, pIdx) => {
                    const panel = document.createElement("div");
                    panel.className = "item-panel";

                    // Horizontal scroll
                    const hScroll = document.createElement("div");
                    hScroll.className = "horizontal-scroll";

                    // Pagination 
                    const pagination = document.createElement("div");
                    pagination.className = "pagination";

                    // index display
                    const idxDisp = document.createElement("div");
                    idxDisp.className = "index-display";
                    idxDisp.style.opacity = 0;


                    item.versions.forEach((versionObj, vIdx) => {
                        // version panel (bg+img)
                        const vp = document.createElement("div");
                        vp.className = "version-panel";
                        vp.dataset.panelIndex = pIdx;
                        vp.dataset.versionIndex = vIdx;
                        // Give each version‑panel a unique ID (its full serial):
                        const SerialNo = `${item.baseSerial}${versionObj.versionSerial.padStart(2, "0")}`;
                        vp.dataset.id = SerialNo;


                        // 1) blur background using versionObj.img
                        vp.style.setProperty("--bgUrl", `url("assets/${versionObj.img}")`);


                        // 2) image insertion
                        const imgEl = document.createElement("img");
                        imgEl.src = `assets/${versionObj.img}`;
                        imgEl.onerror = () => imgEl.src = "assets/placeholder.png";
                        vp.appendChild(imgEl);


                        // 3) side‑buttons (unchanged)
                        vp.insertAdjacentHTML("beforeend", sideButtonsHTML());


                        // 4) panel‑title: use versionObj.title, versionSerial, and formatted price
                        const rawPrice = versionObj.priceValue; // e.g. 1500
                        const formattedPrice = `KES ${rawPrice.toLocaleString()}`; //display "KES 3,000"
                        const serialCode = versionObj.versionSerial.padStart(2, "0");
                        const fullSerial = `${item.baseSerial}${serialCode}`; // e.g. "FMA00101"

                        vp.insertAdjacentHTML("beforeend", `
                          <div class="panel-title">
                            <div class="panel-title-text">${versionObj.title}</div>
                            <div class="panel-serial-text">#${fullSerial}</div>
                            <div class="panel-price-text">${formattedPrice}</div>
                          </div>
                        `);

                        // 5) panel-extra: “date added” + “In Stock/Out of Stock” pill
                        const inStockSVG = versionObj.inStock
                            ? 'icons/In-Stock-fill.svg'
                            : 'icons/In-Stock-line.svg';
                        const stockText = versionObj.inStock ? 'In Stock' : 'Out of Stock';
                        vp.insertAdjacentHTML("beforeend", `
                          <div class="panel-extra">
                            <div class="date-text">${versionObj.dateAdded}</div>
                            <div class="stock-row">
                              <img src="${inStockSVG}" class="stock-icon" alt="${stockText}">
                              <span class="stock-text">${stockText}</span>
                            </div>
                          </div>
                        `);

                        // 6) Store raw priceValue in a data attribute for cart math later:
                        vp.dataset.priceValue = rawPrice; // so later cart code can read `vp.dataset.priceValue`

                        hScroll.appendChild(vp);

                        // 7) Create pagination dot
                        const dot = document.createElement("span");
                        dot.className = "dot";
                        if (vIdx === 0) dot.classList.add("active");
                        pagination.appendChild(dot);
                    });



                    idxDisp.innerText = `1/${item.versions.length}`;


                    // Assemble panel
                    panel.append(hScroll, pagination, idxDisp);
                    vContainer.appendChild(panel);
                });

                // Attach horizontal scroll + draggable
                document.querySelectorAll(".horizontal-scroll").forEach(hs => {
                    hs.removeEventListener("scroll", updateInfo);
                    hs.addEventListener("scroll", updateInfo);
                    makeDraggableScroll(hs, false, 3);
                });

                // Wire info and share buttons for each version-panel
                document.querySelectorAll(".version-panel").forEach(vp => {
                    const pIdx = parseInt(vp.dataset.panelIndex, 10);
                    const vIdx = parseInt(vp.dataset.versionIndex, 10);

                    // Info button
                    const infoBtn = vp.querySelector(".info-btn");
                    infoBtn.onclick = () => {
                        // Populate popup fields from item data
                        const item = itemsOrdered[pIdx];
                        const versionObj = item.versions[vIdx];

                        document.getElementById("popup-title").innerText = versionObj.title;
                        document.getElementById("popup-description").innerText = versionObj.description;
                        document.getElementById("popup-sizes").innerText = versionObj.sizes.join(", ");
                        document.getElementById("popup-material").innerText = versionObj.material;
                        document.getElementById("popup-weight").innerText = versionObj.weight;
                        document.getElementById("info-popup").classList.remove("hidden");
                    };

                    // Share button
                    const shareBtn = vp.querySelector(".share-btn");
                    shareBtn.onclick = () => {
                        const url = `${location.href}#item=${pIdx}&ver=${vIdx}`;
                        navigator.clipboard.writeText(url);
                        shareBtn.querySelector("img").src = "icons/share-forward-fill.svg";
                        setTimeout(() => {
                            shareBtn.querySelector("img").src = "icons/share-forward-line.svg";
                        }, 800);
                    };

                    // —————————————————————————
                    // Initialize Like/Cart button images based on state
                    // Cart button: custom logic
                    // —————————————————————————

                    const cartBtn = vp.querySelector(".cart-btn");
                    cartBtn.onclick = () => {
                        // Grab the version‐object and its state flags:
                        const item = itemsOrdered[pIdx];
                        const versionObj = item.versions[vIdx];
                        const state = item.versionsState[vIdx];
                        // If this version is out of stock, do nothing but call OutOfStock():
                        if (!versionObj.inStock) {
                            OutOfStock();
                            return;
                        }
                        const priceValue = versionObj.priceValue; // raw numeric

                        if (!state.inCart) {
                            // ─────────── Show the “Choose size + quantity” pop‐up ───────────
                            showCartPopup(vp.dataset.id, versionObj.sizes, priceValue, chosenQty => {
                                // Confirm button pressed inside popup:

                                // 1) set state.inCart = true, save chosen quantity & size
                                state.inCart = true;
                                const chosenSize = document.getElementById("popup-select-size").value;
                                versionObj.chosenSize = chosenSize;
                                versionObj.chosenQuantity = chosenQty;

                                // 2) compute total price
                                const totalPrice = priceValue * chosenQty;

                                // 3) Print all requested fields to the console for now:
                                console.log("🛒 Added to cart:", {
                                    title: versionObj.title,
                                    serial: vp.dataset.id,
                                    quantity: chosenQty,
                                    size: chosenSize,
                                    totalPrice: totalPrice,
                                    basePrice: priceValue
                                });

                                // 4)code to send to checkout page
                                // ... ... ... ... 

                                // 5) Still update the badge total if you want:
                                addToCartCount(totalPrice);

                                // 6) change Cart icon to “filled” immediately:
                                const img = cartBtn.querySelector("img");
                                img.src = img.dataset.active;
                                addToCart();
                            });
                        } else {
                            // ─────────── Remove from cart, no popup ───────────
                            // Deduct the amount we previously added
                            const prevQty = versionObj.chosenQuantity || 1;
                            removeFromCartCount(priceValue * prevQty);
                            state.inCart = false;
                            // Reset chosenQuantity
                            versionObj.chosenQuantity = 0;
                            // Toggle cart icon back to “line”
                            const img = cartBtn.querySelector("img");
                            img.src = img.dataset.default;
                        }
                    };
                    // Finally, update the Like/Cart button visuals per state:
                    const sb = vp.querySelector(".side-buttons");
                    updateSideButtons(sb, pIdx, vIdx);
                });
            }









            // —————————————————————————
            //     updateInfo()
            // —————————————————————————

            function updateSideButtons(sbContainer, pIdx, vIdx) {
                const state = itemsOrdered[pIdx].versionsState[vIdx];

                // Like button image
                const likeImg = sbContainer.querySelector(".like-btn img");
                if (likeImg) {
                    likeImg.src = state.liked ? likeImg.dataset.active : likeImg.dataset.default;
                }

                // Cart button image
                const cartImg = sbContainer.querySelector(".cart-btn img");
                if (cartImg) {
                    cartImg.src = state.inCart ? cartImg.dataset.active : cartImg.dataset.default;
                }
            }

            // window.toggleIcon = function (btn) {
            //     const img = btn.querySelector("img");
            //     const defaultSrc = img.dataset.default;
            //     const activeSrc = img.dataset.active;
            //     const currentSrc = img.getAttribute("src");

            //     // Determine panelIdx & versionIdx
            //     const vp = btn.closest(".version-panel");
            //     const pIdx = parseInt(vp.dataset.panelIndex, 10);
            //     const vIdx = parseInt(vp.dataset.versionIndex, 10);
            //     const state = itemsOrdered[pIdx].versionsState[vIdx];

            //     if (currentSrc.endsWith(defaultSrc)) {
            //         // Switch to active
            //         img.src = activeSrc;
            //         if (defaultSrc.includes("heart")) {
            //             state.liked = true;
            //             img.style.transform = "scale(1.3)";
            //             setTimeout(() => img.style.transform = "scale(1)", 200);
            //         } else if (defaultSrc.includes("shopping-cart")) {
            //             state.inCart = true;
            //         }
            //     } else {
            //         // Switch back to default
            //         img.src = defaultSrc;
            //         if (defaultSrc.includes("heart")) {
            //             state.liked = false;
            //             img.style.transform = "scale(0.5)";
            //             setTimeout(() => img.style.transform = "scale(1)", 200);
            //         } else if (defaultSrc.includes("shopping-cart")) {
            //             state.inCart = false;
            //         }
            //     }
            // };

            window.toggleIcon = function (btn) {
                const img = btn.querySelector("img");
                const defaultSrc = img.dataset.default;
                const activeSrc = img.dataset.active;
                const currentSrc = img.getAttribute("src");

                const vp = btn.closest(".version-panel");
                const pIdx = parseInt(vp.dataset.panelIndex, 10);
                const vIdx = parseInt(vp.dataset.versionIndex, 10);
                const state = itemsOrdered[pIdx].versionsState[vIdx];

                const isHeartIcon = defaultSrc.includes("heart");
                const isCartIcon = defaultSrc.includes("shopping-cart");

                const isActive = !currentSrc.endsWith(defaultSrc);

                img.src = isActive ? defaultSrc : activeSrc;

                if (isHeartIcon) {
                    state.liked = !isActive;

                    // Heartbeat animation
                    img.classList.add("heartbeat");
                    img.addEventListener("animationend", function handler() {
                        img.classList.remove("heartbeat");
                        img.removeEventListener("animationend", handler);
                    });
                } else if (isCartIcon) {
                    state.inCart = !isActive;
                }
            };

            function updateInfo() {
                const panels = Array.from(document.querySelectorAll(".item-panel"));
                const midY = window.innerHeight / 2;
                let pIdx = 0;
                panels.forEach((p, i) => {
                    const r = p.getBoundingClientRect();
                    if (r.top <= midY && r.bottom >= midY) pIdx = i;
                });

                const vPanels = panels[pIdx].querySelectorAll(".version-panel");
                const midX = window.innerWidth / 2;
                let vIdx = 0;
                vPanels.forEach((vp, i) => {
                    const r = vp.getBoundingClientRect();
                    if (r.left <= midX && r.right >= midX) vIdx = i;
                });

                currentPanelIndex = pIdx;
                currentVersionIndex = vIdx;

                const item = itemsOrdered[pIdx];

                // const versionObj = itemsOrdered[pIdx].versions[vIdx];
                // const fullSerial = `${versionObj.baseSerial}${versionObj.versionSerial.padStart(2, "0")}`;

                // titleEl.innerText = versionObj.title;
                // serialEl.innerText = `#${fullSerial}`;
                // priceEl.innerText = `KES ${versionObj.priceValue.toLocaleString()}`;

                // update dots
                const dots = panels[pIdx].querySelectorAll(".dot");
                dots.forEach((d, i) => d.classList.toggle("active", i === vIdx));

                // show & fade index display
                const idTimeout = 2;  // time in seconds
                const idxEl = panels[pIdx].querySelector(".index-display");
                if (idxEl) {
                    idxEl.innerText = `${vIdx + 1}/${item.versions.length}`;
                    idxEl.style.opacity = 1;
                    clearTimeout(idxEl._timeout);
                    idxEl._timeout = setTimeout(() => { idxEl.style.opacity = 0; }, idTimeout * 1000);
                }
                // Update side buttons for this version
                const sb = vPanels[vIdx].querySelector(".side-buttons");
                if (sb) updateSideButtons(sb, pIdx, vIdx);
            }

            function showCartPopup(id, sizesArray, unitPrice, callback) {
                /**
             * showCartPopup(id, sizesArray, unitPrice, callback)
             *  • id: the unique serial for this version (e.g. "FMA00101")
             *  • sizesArray: array of strings (e.g. ["S","M","L"])
             *  • unitPrice: raw number (e.g. 1500)
             *  • callback(qty) is called when user hits “Confirm”
             */

                // 1) Create overlay container
                const overlay = document.createElement("div");
                overlay.id = "cart-popup-overlay";
                overlay.style.position = "fixed";
                overlay.style.top = "0";
                overlay.style.left = "0";
                overlay.style.width = "100vw";
                overlay.style.height = "100vh";
                overlay.style.background = "rgba(0,0,0,0.6)";
                overlay.style.display = "flex";
                overlay.style.alignItems = "center";
                overlay.style.justifyContent = "center";
                overlay.style.zIndex = "200";

                // 2) Create the pop‑up box (dark background, rounded)
                const box = document.createElement("div");
                box.id = "cart-popup-box";
                box.style.background = "var(--muted)";   // your dark‐mode container color
                box.style.color = "var(--fg)";
                box.style.borderRadius = "12px";
                box.style.width = "80%";
                box.style.maxWidth = "320px";
                box.style.padding = "1rem";
                box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                box.style.position = "relative";

                // 3) “X” close button (top‐right corner)
                const closeBtn = document.createElement("button");
                closeBtn.innerText = "✕";
                closeBtn.style.position = "absolute";
                closeBtn.style.top = "8px";
                closeBtn.style.right = "12px";
                closeBtn.style.background = "none";
                closeBtn.style.border = "none";
                closeBtn.style.color = "var(--fg)";
                closeBtn.style.fontSize = "1.2rem";
                closeBtn.style.cursor = "pointer";
                closeBtn.onclick = () => {
                    document.body.removeChild(overlay);
                };
                box.appendChild(closeBtn);

                // 4) Size <select> input

                const sizeLabel = document.createElement("label");
                sizeLabel.innerText = "Choose size:";
                sizeLabel.style.display = "block";
                sizeLabel.style.marginBottom = "0.5rem";
                sizeLabel.htmlFor = "popup-select-size";
                box.appendChild(sizeLabel);

                const select = document.createElement("select");
                select.id = "popup-select-size";
                select.style.width = "100%";
                select.style.padding = "0.5rem";
                select.style.marginBottom = "1rem";
                select.style.borderRadius = "6px";
                select.style.border = "1px solid var(--gray)";
                select.style.background = "var(--muted)";
                select.style.color = "var(--fg)";

                sizesArray.forEach(sz => {
                    const opt = document.createElement("option");
                    opt.value = sz;
                    opt.text = "Size : " + sz;
                    select.appendChild(opt);
                });

                box.appendChild(select);

                // 5) Quantity pill: “– [n] +”
                const qtyContainer = document.createElement("div");
                qtyContainer.style.display = "flex";
                qtyContainer.style.alignItems = "center";
                qtyContainer.style.justifyContent = "center";
                qtyContainer.style.gap = "1rem";
                qtyContainer.style.marginBottom = "1rem";

                const minusBtn = document.createElement("button");
                minusBtn.innerText = "–";
                minusBtn.style.width = "32px";
                minusBtn.style.height = "32px";
                minusBtn.style.borderRadius = "16px";
                minusBtn.style.border = "none";
                minusBtn.style.background = "var(--gray)";
                minusBtn.style.color = "var(--fg)";
                minusBtn.style.fontSize = "1.2rem";
                minusBtn.style.cursor = "pointer";

                const qtyDisplay = document.createElement("span");
                qtyDisplay.innerText = "1";
                qtyDisplay.style.minWidth = "24px";
                qtyDisplay.style.textAlign = "center";
                qtyDisplay.style.transition = "all 0.2s ease";
                qtyDisplay.style.transform = "scale(1)";

                const plusBtn = document.createElement("button");
                plusBtn.innerText = "+";
                plusBtn.style.width = "32px";
                plusBtn.style.height = "32px";
                plusBtn.style.borderRadius = "16px";
                plusBtn.style.border = "none";
                plusBtn.style.background = "var(--gray)";
                plusBtn.style.color = "var(--fg)";
                plusBtn.style.fontSize = "1.2rem";
                plusBtn.style.cursor = "pointer";

                qtyContainer.append(minusBtn, qtyDisplay, plusBtn);
                box.appendChild(qtyContainer);

                // Initial quantity = 1
                let currentQty = 1;
                minusBtn.onclick = () => {
                    if (currentQty > 1) {
                        currentQty--;
                        qtyDisplay.innerText = currentQty;
                        qtyDisplay.style.transform = "scale(1.1)";
                        setTimeout(() => qtyDisplay.style.transform = "scale(1)", 100);
                        updateTotal();
                    }
                };
                plusBtn.onclick = () => {
                    currentQty++;
                    qtyDisplay.innerText = currentQty;
                    qtyDisplay.style.transform = "scale(1.1)";
                    setTimeout(() => qtyDisplay.style.transform = "scale(1)", 100);
                    updateTotal();
                };

                // 6) Total line (“Total: KES X,XXX”)
                const totalLine = document.createElement("div");
                totalLine.id = "popup-total-line";
                totalLine.style.fontSize = "1rem";
                totalLine.style.marginBottom = "1rem";
                totalLine.style.textAlign = "center";
                // Helper to update total
                function updateTotal() {
                    const total = unitPrice * currentQty;
                    totalLine.innerText = `Total: KES ${total.toLocaleString()}`;
                }
                updateTotal();
                box.appendChild(totalLine);

                // 7) Confirm button
                const confirmBtn = document.createElement("button");
                confirmBtn.innerText = "Confirm";
                confirmBtn.style.width = "100%";
                confirmBtn.style.padding = "0.5rem";
                confirmBtn.style.border = "none";
                confirmBtn.style.borderRadius = "6px";
                confirmBtn.style.background = "var(--accent)";
                confirmBtn.style.color = "var(--bg)";
                confirmBtn.style.fontSize = "1rem";
                confirmBtn.style.cursor = "pointer";
                confirmBtn.onclick = () => {
                    // Pass the final quantity back to caller
                    callback(currentQty);
                    document.body.removeChild(overlay);
                };
                box.appendChild(confirmBtn);

                // 8) Assemble and show
                overlay.appendChild(box);
                document.body.appendChild(overlay);
            }






            // —————————————————————————
            //    Info popup wiring
            // —————————————————————————

            document.querySelector("#info-popup .popup-content button").onclick = () => {
                document.getElementById("info-popup").classList.add("hidden");
            };




            // ──────────────────────────────────────────────────
            //   Update Info on scroll end (only vertical)
            // ──────────────────────────────────────────────────
            // let scrollTimeout;
            // vContainer.addEventListener("scroll", () => {
            //     clearTimeout(scrollTimeout);
            //     scrollTimeout = setTimeout(updateInfo, 100);
            // });



            // —————————————————————————
            // 8) Touch / Mouse control
            // —————————————————————————

            // const TOUCH_THRESHOLD = 80;  // TOUCH_THRESHOLD: Minimum swipe distance (px) to move one slide. best Setting ~50–80 
            // const MOUSE_SPEED = 3;  // MOUSE_SPEED: Multiplier for click‑and‑drag movement (horizontal & vertical). Lower = slower drag; higher = faster drag. Typical: 2–4.
            // const WHEEL_SENSITIVITY = 1.0;  // WHEEL_SENSITIVITY: Multiplier for wheel scrolling. Lower = finer control. Typical range: 0.5–2.

            // // function getPanelHeight() {
            // //     // assume every .item-panel is 100% of vContainer's height
            // //     return vContainer.clientHeight;
            // // }
            // // function getPanelWidth(hScroll) {
            // //     // assume each .version-panel is 100% of hScroll's width
            // //     return hScroll.clientWidth;
            // // }


            // // touch control

            // (function () {
            //     // Vertical container swipe
            //     let vTouchStartY = null;
            //     let vTouchStartX = null;
            //     let vStartScrollTop = 0;

            //     vContainer.addEventListener("touchstart", e => {
            //         if (e.touches.length !== 1) return;
            //         const t = e.touches[0];
            //         vTouchStartY = t.clientY;
            //         vTouchStartX = t.clientX;
            //         vStartScrollTop = vContainer.scrollTop;
            //     }, { passive: true });

            //     vContainer.addEventListener("touchend", e => {
            //         if (vTouchStartY === null) return;

            //         const t = e.changedTouches[0];
            //         const dy = t.clientY - vTouchStartY;
            //         const dx = t.clientX - vTouchStartX;
            //         const absY = Math.abs(dy);
            //         const absX = Math.abs(dx);
            //         const panelHeight = vContainer.clientHeight;

            //         // Vertical‑dominant swipe → snap one panel
            //         if (absY > absX && absY > TOUCH_THRESHOLD) {
            //             if (dy < 0) {
            //                 // Swipe up → next panel
            //                 const newScroll = Math.min(
            //                     vContainer.scrollTop + panelHeight,
            //                     vContainer.scrollHeight - panelHeight
            //                 );
            //                 vContainer.scrollTo({ top: newScroll, behavior: "smooth" });
            //             } else {
            //                 // Swipe down → previous panel
            //                 const newScroll = Math.max(vContainer.scrollTop - panelHeight, 0);
            //                 vContainer.scrollTo({ top: newScroll, behavior: "smooth" });
            //             }
            //         } else {
            //             // If not a large enough swipe, snap to the nearest panel boundary
            //             // Compute current index = Math.round(scrollTop / panelHeight)
            //             const idx = Math.round(vContainer.scrollTop / panelHeight);
            //             vContainer.scrollTo({ top: idx * panelHeight, behavior: "smooth" });

            //         }
            //         vTouchStartY = null;
            //         vTouchStartX = null;
            //     }, { passive: true });



            //     // Horizontal container swipe
            //     hContainers.forEach(hScroll => {
            //         let hTouchStartX = null;
            //         let hTouchStartY = null;

            //         hScroll.addEventListener("touchstart", e => {
            //             if (e.touches.length !== 1) return;
            //             const t = e.touches[0];
            //             hTouchStartX = t.clientX;
            //             hTouchStartY = t.clientY;
            //         }, { passive: true });

            //         hScroll.addEventListener("touchend", e => {
            //             if (hTouchStartX === null) return;
            //             const t = e.changedTouches[0];
            //             const dx = t.clientX - hTouchStartX;
            //             const dy = t.clientY - hTouchStartY;
            //             const absX = Math.abs(dx);
            //             const absY = Math.abs(dy);
            //             const panelWidth = hScroll.clientWidth;

            //             // Horizontal‑dominant swipe → snap one version
            //             if (absX > absY && absX > TOUCH_THRESHOLD) {
            //                 if (dx < 0) {
            //                     // Swipe left → next version
            //                     const newScroll = Math.min(
            //                         hScroll.scrollLeft + panelWidth,
            //                         hScroll.scrollWidth - panelWidth
            //                     );
            //                     hScroll.scrollTo({ left: newScroll, behavior: "smooth" });
            //                 } else {
            //                     // Swipe right → previous version
            //                     const newScroll = Math.max(hScroll.scrollLeft - panelWidth, 0);
            //                     hScroll.scrollTo({ left: newScroll, behavior: "smooth" });
            //                 }
            //             }
            //             hTouchStartX = null;
            //             hTouchStartY = null;
            //         }, { passive: true });
            //     });
            // })();


            // // mouse direction
            // function makeDraggableScroll(container, isVertical) {
            //     let down = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;

            //     container.addEventListener("mousedown", e => {
            //         down = true;
            //         container.classList.add("dragging");
            //         startX = e.pageX;
            //         startY = e.pageY;
            //         scrollLeft = container.scrollLeft;
            //         scrollTop = container.scrollTop;
            //         e.preventDefault();
            //     });

            //     window.addEventListener("mouseup", () => {
            //         if (!down) return;
            //         down = false;
            //         container.classList.remove("dragging");
            //     });

            //     container.addEventListener("mousemove", e => {
            //         if (!down) return;
            //         const dx = e.pageX - startX;
            //         const dy = e.pageY - startY;

            //         if (isVertical) {
            //             // Vertical drag: move vContainer.scrollTop
            //             container.scrollTop = scrollTop - (dy * MOUSE_SPEED);
            //         } else {
            //             // Horizontal drag: move container.scrollLeft
            //             container.scrollLeft = scrollLeft - (dx * MOUSE_SPEED);
            //         }
            //         e.preventDefault();
            //     });

            //     container.addEventListener("dragstart", e => e.preventDefault());
            // }
            // makeDraggableScroll(vContainer, true); // Attach to vertical
            // document.querySelectorAll(".horizontal-scroll") // Attach to each horizontal
            //     .forEach(hs => makeDraggableScroll(hs, false));


            // // MOUSE WHEEL SCROLLING (Vertical only)
            // vContainer.addEventListener("wheel", e => {
            //     e.preventDefault();
            //     // Multiply deltaY by sensitivity; then let scroll‑snap do the rest
            //     vContainer.scrollBy({
            //         top: e.deltaY * WHEEL_SENSITIVITY,
            //         left: 0,
            //         behavior: "auto"
            //     });
            //     // Debounce updating Info
            //     clearTimeout(vContainer._wheelTO);
            //     vContainer._wheelTO = setTimeout(updateInfo, 100);
            // }, { passive: false });


            function makeDraggableScroll(container, isVertical, speed = 2) {
                let down = false, startX, startY, sL, sT;
                container.addEventListener("mousedown", e => {
                    down = true; container.classList.add("dragging");
                    startX = e.pageX; startY = e.pageY;
                    sL = container.scrollLeft; sT = container.scrollTop;
                    e.preventDefault();
                });
                window.addEventListener("mouseup", () => {
                    if (!down) return; down = false;
                    container.classList.remove("dragging");
                });
                container.addEventListener("mousemove", e => {
                    if (!down) return;
                    const dx = e.pageX - startX, dy = e.pageY - startY;
                    if (isVertical) container.scrollTop = sT - dy * speed;
                    else container.scrollLeft = sL - dx * speed;
                    e.preventDefault();
                });
                container.addEventListener("dragstart", e => e.preventDefault());
            }
            makeDraggableScroll(vContainer, true, 3);
            document.querySelectorAll(".horizontal-scroll")
                .forEach(hs => makeDraggableScroll(hs, false, 3));

            let to;
            vContainer.addEventListener("scroll", () => {
                clearTimeout(to);
                to = setTimeout(updateInfo, 100);
            });


            // —————————————————————————
            // 9) Initial render & random
            // —————————————————————————
            shuffle(itemsOrdered);
            buildPanels();
            updateInfo();






        })
        .catch(err => {
            console.error("Failed to load data.json:", err);
        });

});

















// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 saved and outOfStock
// ---------------------------------------------------------------------------------------------------------------------------------------------- 
const miniPopUptime = 1.0; // seconds
function Saved() {

    if (document.getElementById('saved-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'saved-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#222'; // Dark mode
    popup.style.color = '#fff';
    popup.style.padding = '15px';
    popup.style.borderRadius = '12px';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.justifyContent = 'center';
    popup.style.width = '100px';
    popup.style.height = '100px';
    popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    popup.style.fontFamily = 'sans-serif';
    popup.style.fontSize = '14px';
    popup.style.zIndex = '9999';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s ease';

    // Circle container for tick image
    const circle = document.createElement('div');
    circle.style.width = '40px';
    circle.style.height = '40px';
    circle.style.borderRadius = '50%';
    circle.style.background = '#fff';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';
    circle.style.marginBottom = '10px';

    // Tick image
    const img = document.createElement('img');
    img.src = 'icons/tick.svg'; // Make sure path is correct
    img.alt = 'tick';
    img.style.width = '20px';
    img.style.height = '20px';

    // Text
    const text = document.createElement('span');
    text.textContent = 'Saved';

    // Build the popup
    circle.appendChild(img);
    popup.appendChild(circle);
    popup.appendChild(text);
    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
    }, (miniPopUptime * 1000));
}

function OutOfStock() {

    if (document.getElementById('saved-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'saved-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#222'; // Dark mode
    popup.style.color = '#fff';
    popup.style.padding = '10px';
    popup.style.borderRadius = '12px';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.justifyContent = 'center';
    popup.style.width = '100px';
    popup.style.height = '100px';
    popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    popup.style.fontFamily = 'sans-serif';
    popup.style.fontSize = '12px';
    popup.style.zIndex = '10';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s ease';

    // Circle container image
    const circle = document.createElement('div');
    circle.style.width = '30px';
    circle.style.height = '30px';
    circle.style.borderRadius = '15px';
    circle.style.background = '#fff';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';
    circle.style.marginBottom = '10px';

    // Tick image
    const img = document.createElement('img');
    img.src = 'icons/In-Stock-line.svg'; // Make sure path is correct
    img.alt = 'tick';
    img.style.width = '20px';
    img.style.height = '20px';

    // Text
    const text = document.createElement('span');
    text.textContent = 'Out of Stock';

    // Build the popup
    circle.appendChild(img);
    popup.appendChild(circle);
    popup.appendChild(text);
    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
    }, (miniPopUptime * 1000));
}

function addToCart() {

    if (document.getElementById('saved-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'saved-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#222'; // Dark mode
    popup.style.color = '#fff';
    popup.style.padding = '10px';
    popup.style.borderRadius = '12px';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.justifyContent = 'center';
    popup.style.width = '100px';
    popup.style.height = '100px';
    popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    popup.style.fontFamily = 'sans-serif';
    popup.style.fontSize = '12px';
    popup.style.zIndex = '10';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s ease';

    // Circle container image
    const circle = document.createElement('div');
    circle.style.width = '30px';
    circle.style.height = '30px';
    circle.style.borderRadius = '15px';
    circle.style.background = '#fff';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';
    circle.style.marginBottom = '10px';

    // Tick image
    const img = document.createElement('img');
    img.src = 'icons/shopping-cart-green.svg'; // Make sure path is correct
    img.alt = 'tick';
    img.style.width = '20px';
    img.style.height = '20px';

    // Text
    const text = document.createElement('span');
    text.textContent = 'Added to Cart';

    // Build the popup
    circle.appendChild(img);
    popup.appendChild(circle);
    popup.appendChild(text);
    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
    }, (miniPopUptime * 1000));
}

// OutOfStock();
// addToCart();
// Saved();