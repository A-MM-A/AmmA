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
            if (!vContainer) return;
            const hContainers = document.querySelectorAll(".horizontal-scroll");

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
                box.style.background = "#2c2c2c4e";   // your dark‐mode container color
                box.style.color = "var(--fg)";
                box.style.borderRadius = "12px";
                box.style.width = "80%";
                box.style.maxWidth = "320px";
                box.style.padding = "1rem";
                box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                box.style.position = "relative";
                box.style.backdropFilter = "blur(10px)";

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
            const infoPopupBtn = document.querySelector("#info-popup .popup-content button");
            if (infoPopupBtn) {
                infoPopupBtn.onclick = () => {
                    document.getElementById("info-popup").classList.add("hidden");
                };
            }





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
            // loadingStart(0.55);
            // loadingWait('Loading',1);
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



// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 loading popup
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

(function () {
    // -------------------------------
    // Debug helper (prints to console)
    // -------------------------------
    function printline(msg) {
        // console.log("[Loader Debug] " + msg);
    }

    // -----------------------------------
    // The order of your shapes (top→bottom)
    // -----------------------------------
    const shapeOrder = [
        "shape_8", "shape_9", "shape_10", "shape_11", "shape_12", // top wedges
        "shape_7", "shape_6", "shape_5",                           // green arcs
        "shape_4", "shape_3", "shape_2", "shape_1"                  // letters
    ];

    let overlay = null;
    let animationInterval = null;
    let autoCloseTimer = null;

    // Prevent background scroll/touch
    function disableScroll() {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
    function enableScroll() {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
    function preventTouch(e) {
        e.preventDefault();
    }

    // ----------------------------------------------------
    // Create a full‐screen overlay, fetch & insert the SVG
    // ----------------------------------------------------
    function createOverlay(withText, message, scale, isBlocking, timeoutSec) {
        if (overlay) {
            printline("Overlay already exists; skipping creation.");
            return;
        }
        printline("Creating overlay...");

        // 1) Create overlay container
        overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999'
        });
        // If not blocking, allow clicks through and remove dimming
        if (!isBlocking) {
            overlay.style.pointerEvents = 'none';
            overlay.style.background = 'transparent';
        }

        overlay.addEventListener('wheel', preventTouch, { passive: false });
        overlay.addEventListener('touchmove', preventTouch, { passive: false });
        document.body.appendChild(overlay);

        if (isBlocking) {
            disableScroll();
        }

        // 2) Create inner box (rounded, light background)
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: 'rgba(255, 255, 255, 0.62)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 0 20px rgba(0,0,0,0.1)',
            transformOrigin: 'center',
            transform: `scale(${scale})`
        });
        overlay.appendChild(box);

        // 3) Fetch the SVG file and insert it first
        printline("Fetching SVG from logo/logo.svg …");
        fetch('logo/logo.svg')
            .then(response => {
                if (!response.ok) throw new Error("SVG fetch failed with status " + response.status);
                return response.text();
            })
            .then(svgText => {
                printline("SVG fetched successfully.");

                // Parse the SVG string into DOM nodes
                const wrapper = document.createElement('div');
                wrapper.innerHTML = svgText.trim();
                const svgElement = wrapper.querySelector('svg');

                if (!svgElement) {
                    printline("ERROR: <svg> not found in fetched text.");
                    return;
                }

                // Add a viewBox so the entire 1080×959 canvas scales down
                svgElement.setAttribute('viewBox', '0 0 1080 959');
                // Then set a small display size (200×200)
                svgElement.setAttribute('width', '200');
                svgElement.setAttribute('height', '200');
                // Ensure CSS transform origin is center (for smooth animations)
                svgElement.style.transformOrigin = '50% 50%';

                // Append SVG (animation) at the top
                box.appendChild(wrapper);
                // 4) If withText = true, add a message panel below the SVG
                if (withText) {
                    const msgDiv = document.createElement('div');
                    Object.assign(msgDiv.style, {
                        background: 'rgba(138, 134, 134, 0.35)',
                        color: '#3C3835',
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        maxWidth: '240px'
                    });
                    // Split the incoming message by “\n”
                    const lines = message.split('\n');
                    if (lines.length > 0) {
                        // First line in bold:
                        const firstLine = document.createElement('div');
                        firstLine.style.fontWeight = 'bold';
                        firstLine.textContent = lines[0];
                        msgDiv.appendChild(firstLine);

                        // Remaining lines normal:
                        for (let i = 1; i < lines.length; i++) {
                            const normalLine = document.createElement('div');
                            normalLine.textContent = lines[i];
                            msgDiv.appendChild(normalLine);
                        }
                    }

                    box.appendChild(msgDiv);
                }

                // After SVG is in DOM, validate IDs and start animation
                let allFound = true;
                shapeOrder.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) {
                        printline(`WARNING: Element with ID "${id}" not found.`);
                        allFound = false;
                    }
                });
                if (allFound) {
                    printline("All shape IDs detected—starting animation.");
                } else {
                    printline("Some shape IDs are missing; animation may be incomplete.");
                }
                startAnimation();

                if (typeof timeoutSec === 'number' && timeoutSec > 0) {
                    printline("Will auto‐close in " + timeoutSec + "s");
                    setTimeout(() => {
                        printline("Auto‐closing loader after " + timeoutSec + "s");
                        removeOverlay();
                    }, timeoutSec * 1000);
                }
            })
            .catch(err => {
                printline("ERROR loading SVG: " + err);
            });


    }

    // --------------------------------------------------------
    // Animate: disassemble (top→bottom) then reassemble (reverse)
    // --------------------------------------------------------
    function startAnimation() {
        const duration = 500;    // each shape’s animation duration (ms)
        const delayStep = 100;   // delay between shapes (ms)
        const moveDist = 50;     // pixels downward/upward

        function disassemble() {
            shapeOrder.forEach((id, idx) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.animate([
                    { transform: 'translateY(0px)', opacity: 1 },
                    { transform: `translateY(${moveDist}px)`, opacity: 0 }
                ], {
                    duration: duration,
                    delay: idx * delayStep,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                });
            });
        }

        function reassemble() {
            shapeOrder.slice().reverse().forEach((id, idx) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.animate([
                    { transform: `translateY(${moveDist}px)`, opacity: 0 },
                    { transform: 'translateY(0px)', opacity: 1 }
                ], {
                    duration: duration,
                    delay: idx * delayStep,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                });
            });
        }

        function cycle() {
            printline("Animation cycle: disassemble → reassemble");
            disassemble();
            setTimeout(() => {
                reassemble();
            }, shapeOrder.length * delayStep + duration);
        }

        cycle();
        animationInterval = setInterval(cycle, (shapeOrder.length * delayStep + duration) * 2);
    }

    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
            printline("Animation interval cleared.");
        }
    }

    // Remove overlay, stop animation, re‐enable scroll
    function removeOverlay() {
        if (autoCloseTimer !== null) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
        if (!overlay) {
            printline("Overlay does not exist; nothing to remove.");
            return;
        }
        printline("Removing overlay and stopping animation.");
        stopAnimation();
        overlay.removeEventListener('wheel', preventTouch);
        overlay.removeEventListener('touchmove', preventTouch);
        document.body.removeChild(overlay);
        overlay = null;
        enableScroll();
    }

    // ---------------------------------
    // Expose global functions to window
    // ---------------------------------
    window.loadingStart = function (scale = 1.0, isBlocking = true) {
        printline("loadingStart() called with scale: " + scale, "blocking:", isBlocking);
        createOverlay(false, "", scale, isBlocking);
    };
    window.loadingWait = function (message, scale = 1.0, isBlocking = true, timeoutSec) {
        printline("loadingWait() called with scale:", scale, "blocking:", isBlocking, "timeoutSec:", timeoutSec);
        createOverlay(true, message, scale, isBlocking, timeoutSec);
    };

    window.loadingStop = function () {
        printline("loadingStop() called.");
        removeOverlay();
    };
    window.loadingWaitStop = function () {
        printline("loadingWaitStop() called.");
        removeOverlay();
    };
})();
