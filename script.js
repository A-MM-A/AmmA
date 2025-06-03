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
//                                                     scrolling system + state management
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
    // ─────────────────────────────────────────────────────────────────────────────
    //   Step A: Fetch rawItems from data.json  
    // ─────────────────────────────────────────────────────────────────────────────
    fetch("data.json")
        .then(response => response.json())
        .then(rawItems => {

            // categories.json importing

            let categoryDefs = null;

            fetch("categories.json")
                .then(resp => {
                    if (!resp.ok) throw new Error(`Failed to load categories.json (status ${resp.status})`);
                    return resp.json();
                })
                .then(json => {
                    categoryDefs = json;        // store globally
                    initCategorySystem();       // now that categoryDefs is ready, wire everything
                })
                .catch(err => {
                    console.error("Error loading categories.json:", err);
                    // If you have a loadingStart(0.55) (or similar), call it here:
                    if (typeof loadingStart === "function") {
                        loadingStart(0.55);
                    }
                });

            function initCategorySystem() {
                // 1) Define our three "lookup" helpers (they reference categoryDefs)
                function lookupCategoryLetter(catName) {
                    if (!catName) return null;
                    const lower = catName.toLowerCase();
                    for (const cat of categoryDefs.categories) {
                        if (cat.name.toLowerCase() === lower) {
                            return cat.letter.toLowerCase();
                        }
                    }
                    return null;
                }

                function lookupSubCategoryLetter(subName) {
                    if (!subName) return null;
                    const lower = subName.toLowerCase();
                    for (const cat of categoryDefs.categories) {
                        for (const sub of cat.subCategories) {
                            if (sub.name.toLowerCase() === lower) {
                                return sub.letter.toLowerCase();
                            }
                        }
                    }
                    return null;
                }

                function lookupThirdLetter(thirdName) {
                    if (!thirdName) return null;
                    const lower = thirdName.toLowerCase();
                    for (const cat of categoryDefs.categories) {
                        for (const sub of cat.subCategories) {
                            for (const tg of sub.thirdGroups) {
                                if (tg.name.toLowerCase() === lower) {
                                    return tg.letter.toLowerCase();
                                }
                            }
                        }
                    }
                    return null;
                }

                // 2) Expose them globally so other code can call them:
                window.lookupCategoryLetter = lookupCategoryLetter;
                window.lookupSubCategoryLetter = lookupSubCategoryLetter;
                window.lookupThirdLetter = lookupThirdLetter;

                // 3) Wire up the top-bar "category" pill to open the popup:
                const catSpan = document.getElementById("category-name");
                if (catSpan) {
                    catSpan.style.cursor = "pointer";
                    catSpan.addEventListener("click", () => {
                        // If the pill currently shows a selection (arrow + text), reset home instead of opening:
                        if (catSpan.dataset.selected === "true") {
                            // Clear any category filter:
                            itemsOrdered = recommend(rawItems); // or however you reset to home
                            buildPanels();
                            updateInfo();
                            catSpan.innerText = "Category";
                            catSpan.dataset.selected = "false";
                            // Also remove any left-arrow icon inside the pill (we’ll handle that in showCategoryPopup)
                        } else {
                            // No selection yet → open the popup to choose
                            showCategoryPopup();
                        }
                    });
                }

                // 4) You might also want to “highlight” or disable the Search button until categoryDefs is ready.
                //    For example:
                const searchBtn = document.getElementById("search-btn");
                if (searchBtn) {
                    searchBtn.disabled = false; // or leave enabled if you like
                }

                // 5) If you have any other one-time category-related wiring (e.g. pre-filling a menu), do it here.
            }




            // ─────────────────────────────────────────────────────────────────────────────
            // Step 1: Build flat versionStateByID map
            // ─────────────────────────────────────────────────────────────────────────────
            const versionStateByID = {};
            rawItems.forEach(item => {
                item.versions.forEach(versionObj => {
                    const serial = item.baseSerial + versionObj.versionSerial.padStart(2, "0");
                    versionStateByID[serial] = {
                        liked: false,
                        inCart: false,
                        chosenQuantity: 0,
                        chosenSize: null
                    };
                });
            });
            // ─────────────────────────────────────────────────────────────────────────────
            // Step 2: Load any existing state from localStorage
            // ─────────────────────────────────────────────────────────────────────────────            
            Object.keys(versionStateByID).forEach(serial => {
                const saved = localStorage.getItem(`versionState:${serial}`);
                if (saved) {
                    try {
                        versionStateByID[serial] = JSON.parse(saved);
                    } catch (e) {
                        console.warn(`Could not parse saved state for ${serial}`, e);
                    }
                }
            });

            // ─────────────────────────────────────────────────────────────────────────────
            // Step 3: Define helper to save a single version’s state into localStorage
            // ─────────────────────────────────────────────────────────────────────────────
            function saveVersionState(serial) {
                localStorage.setItem(`versionState:${serial}`, JSON.stringify(versionStateByID[serial]));
            }



            // ─────────────────────────────────────────────────────────────────────────────
            // Step 4: Recommendation algorithm (unchanged, still works on rawItems)
            // ─────────────────────────────────────────────────────────────────────────────
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
                const N = items.length;
                if (N <= 2) return items;
                const main = items.slice(0, N - 2);
                const other = items.slice(N - 2);
                shuffle(other);
                return main.concat(other.slice(0, 2));
            }
            let itemsOrdered = recommend(rawItems);








            // ─────────────────────────────────────────────────────────────────────────────
            // Step 5: Cache container & helper references
            // ─────────────────────────────────────────────────────────────────────────────

            const vContainer = document.getElementById("verticalScroll");
            if (!vContainer) return;
            // const hContainers = document.querySelectorAll(".horizontal-scroll");



            const searchBtn = document.getElementById("search-btn");
            if (!searchBtn) return;

            let searchOverlay = null;

            searchBtn.addEventListener("click", () => {
                // If popup is already open, do nothing:
                if (searchOverlay) return;
                openSearchPopup();
            });





            // ─────────────────────────────────────────────────────────────────────────────
            // Step 6: buildPanels() – now using versionStateByID and dataset.id
            // ─────────────────────────────────────────────────────────────────────────────
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
                    panel.dataset.category = item.category || ""; // for future filtering

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
                        const serial = item.baseSerial + versionObj.versionSerial.padStart(2, "0");
                        vp.dataset.id = serial;


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
                        const formattedPrice = `KES ${versionObj.priceValue.toLocaleString()}`;
                        const fullSerial = `${item.baseSerial}${versionObj.versionSerial.padStart(2, "0")}`;
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
                        vp.dataset.priceValue = versionObj.priceValue;

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
                    makeDraggableScroll(hs, false, 3); // speed=3 by default
                });

                // Wire info and share buttons for each version-panel
                document.querySelectorAll(".version-panel").forEach(vp => {
                    const pIdx = parseInt(vp.dataset.panelIndex, 10);
                    const vIdx = parseInt(vp.dataset.versionIndex, 10);
                    const serial = vp.dataset.id;
                    const versionObj = itemsOrdered[pIdx].versions[vIdx];
                    const state = versionStateByID[serial];

                    // Info button
                    const infoBtn = vp.querySelector(".info-btn");
                    infoBtn.onclick = () => {
                        // // Populate popup fields from item data
                        // const item = itemsOrdered[pIdx];
                        // const versionObj = item.versions[vIdx];

                        document.getElementById("popup-title").innerText = versionObj.title;
                        document.getElementById("popup-description").innerText = versionObj.description;
                        document.getElementById("popup-sizes").innerText = versionObj.sizes.join(", ");
                        document.getElementById("popup-material").innerText = versionObj.material;
                        document.getElementById("popup-weight").innerText = versionObj.weight;
                        document.getElementById("info-popup").classList.remove("hidden");
                    };

                    // Share button
                    // const shareBtn = vp.querySelector(".share-btn");
                    // shareBtn.onclick = () => {
                    //     const url = `${location.href}#item=${pIdx}&ver=${vIdx}`;
                    //     navigator.clipboard.writeText(url);
                    //     shareBtn.querySelector("img").src = "icons/share-forward-fill.svg";
                    //     setTimeout(() => {
                    //         shareBtn.querySelector("img").src = "icons/share-forward-line.svg";
                    //     }, 800);
                    // };

                    // —————————————————————————
                    // Initialize Like/Cart button images based on state
                    // Cart button: custom logic
                    // —————————————————————————

                    // const cartBtn = vp.querySelector(".cart-btn");
                    // cartBtn.onclick = () => {
                    //     // Grab the version‐object and its state flags:
                    //     const item = itemsOrdered[pIdx];
                    //     const versionObj = item.versions[vIdx];
                    //     const state = item.versionsState[vIdx];
                    //     // If this version is out of stock, do nothing but call OutOfStock():
                    //     if (!versionObj.inStock) {
                    //         OutOfStock();
                    //         return;
                    //     }
                    //     const priceValue = versionObj.priceValue; // raw numeric

                    //     if (!state.inCart) {
                    //         // ─────────── Show the “Choose size + quantity” pop‐up ───────────
                    //         showCartPopup(vp.dataset.id, versionObj.sizes, priceValue, chosenQty => {
                    //             // Confirm button pressed inside popup:

                    //             // 1) set state.inCart = true, save chosen quantity & size
                    //             state.inCart = true;
                    //             const chosenSize = document.getElementById("popup-select-size").value;
                    //             versionObj.chosenSize = chosenSize;
                    //             versionObj.chosenQuantity = chosenQty;

                    //             // 2) compute total price
                    //             const totalPrice = priceValue * chosenQty;

                    //             // 3) Print all requested fields to the console for now:
                    //             console.log("🛒 Added to cart:", {
                    //                 title: versionObj.title,
                    //                 serial: vp.dataset.id,
                    //                 quantity: chosenQty,
                    //                 size: chosenSize,
                    //                 totalPrice: totalPrice,
                    //                 basePrice: priceValue
                    //             });

                    //             // 4)code to send to checkout page
                    //             // ... ... ... ... 

                    //             // 5) Still update the badge total if you want:
                    //             addToCartCount(totalPrice);

                    //             // 6) change Cart icon to “filled” immediately:
                    //             const img = cartBtn.querySelector("img");
                    //             img.src = img.dataset.active;
                    //             addToCart();
                    //         });
                    //     } else {
                    //         // ─────────── Remove from cart, no popup ───────────
                    //         // Deduct the amount we previously added
                    //         const prevQty = versionObj.chosenQuantity || 1;
                    //         removeFromCartCount(priceValue * prevQty);
                    //         state.inCart = false;
                    //         // Reset chosenQuantity
                    //         versionObj.chosenQuantity = 0;
                    //         // Toggle cart icon back to “line”
                    //         const img = cartBtn.querySelector("img");
                    //         img.src = img.dataset.default;
                    //     }
                    // };



                    // Finally, update the Like/Cart button visuals per state:

                    const shareBtn = vp.querySelector(".share-btn");
                    shareBtn.onclick = () => {
                        const serial = vp.dataset.id;
                        const url = `${location.origin}${location.pathname}#item=${serial}`;
                        navigator.clipboard.writeText(url);

                        const img = shareBtn.querySelector("img");
                        img.src = "icons/share-forward-fill.svg";
                        setTimeout(() => {
                            img.src = "icons/share-forward-line.svg";
                        }, 800);
                    };


                    const cartBtn = vp.querySelector(".cart-btn");
                    cartBtn.onclick = () => {
                        // const item = itemsOrdered[pIdx];
                        // const versionObj = item.versions[vIdx];
                        // const serial = vp.dataset.id;
                        // const state = versionStateByID[serial];

                        // 1) If out of stock, call OutOfStock() and bail:
                        if (!versionObj.inStock) {
                            OutOfStock();
                            return;
                        }

                        // 2) If not yet inCart, show the pop-up; otherwise remove:
                        if (!state.inCart) {
                            showCartPopup(serial, versionObj.sizes, versionObj.priceValue, chosenQty => {
                                // inside confirm callback:
                                state.inCart = true;
                                const chosenSize = document.getElementById("popup-select-size").value;
                                state.chosenSize = chosenSize;
                                state.chosenQuantity = chosenQty;

                                const totalPrice = versionObj.priceValue * chosenQty;
                                console.log("🛒 Added to cart:", {
                                    title: versionObj.title,
                                    serial: serial,
                                    quantity: chosenQty,
                                    size: chosenSize,
                                    totalPrice: totalPrice,
                                    basePrice: versionObj.priceValue
                                });

                                addToCartCount(totalPrice); // your existing function
                                const img = cartBtn.querySelector("img");
                                img.src = img.dataset.active;

                                // Persist right away:
                                saveVersionState(serial);
                            });
                        } else {
                            // Already in cart → remove:
                            const prevQty = state.chosenQuantity || 1;
                            removeFromCartCount(versionObj.priceValue * prevQty);
                            state.inCart = false;
                            state.chosenQuantity = 0;
                            state.chosenSize = null;
                            const img = cartBtn.querySelector("img");
                            img.src = img.dataset.default;

                            // Persist right away:
                            saveVersionState(serial);
                        }
                    };


                    const sb = vp.querySelector(".side-buttons");
                    updateSideButtons(sb);
                });
            }




            // ─────────────────────────────────────────────────────────────────────────────
            // Step 7: updateSideButtons(sbContainer) uses versionStateByID instead of versionsState
            // ─────────────────────────────────────────────────────────────────────────────

            function updateSideButtons(sbContainer) {
                // Find the version-panel’s serial:
                const vp = sbContainer.closest(".version-panel");
                const serial = vp.dataset.id;
                const state = versionStateByID[serial];

                // Like button:
                const likeImg = sbContainer.querySelector("img[data-active*='heart']");
                if (likeImg) {
                    likeImg.src = state.liked ? likeImg.dataset.active : likeImg.dataset.default;
                }

                // Cart button:
                const cartImg = sbContainer.querySelector("img[data-active*='shopping-cart']");
                if (cartImg) {
                    cartImg.src = state.inCart ? cartImg.dataset.active : cartImg.dataset.default;
                }
            }


            // ─────────────────────────────────────────────────────────────────────────────
            // Step 8: toggleIcon(btn) now uses versionStateByID
            // ─────────────────────────────────────────────────────────────────────────────

            window.toggleIcon = function (btn) {
                // 1) Find which version-panel this button belongs to:
                const vp = btn.closest(".version-panel");
                const serial = vp.dataset.id;
                const state = versionStateByID[serial];

                // 2) Toggle either liked or inCart based on button’s data-default/file names:
                const img = btn.querySelector("img");
                const defaultSrc = img.dataset.default;
                const activeSrc = img.dataset.active;
                const currentSrc = img.getAttribute("src");

                const isHeartIcon = defaultSrc.includes("heart");
                const isCartIcon = defaultSrc.includes("shopping-cart");

                if (currentSrc.endsWith(defaultSrc)) {
                    // went from “outline” → “filled”
                    img.src = activeSrc;

                    if (isHeartIcon) {
                        state.liked = true;

                        // ✅ Heartbeat animation
                        img.classList.add("heartbeat");
                        img.addEventListener("animationend", function handler() {
                            img.classList.remove("heartbeat");
                            img.removeEventListener("animationend", handler);
                        });
                    } else if (isCartIcon) {
                        state.inCart = true;
                    }

                } else {
                    // went from “filled” → “outline”
                    img.src = defaultSrc;

                    if (isHeartIcon) {
                        state.liked = false;
                    } else if (isCartIcon) {
                        state.inCart = false;
                    }
                }

                // 3) Persist immediately:
                saveVersionState(serial);
            };



            // ─────────────────────────────────────────────────────────────────────────────
            // Step 9: updateInfo() – update dots, index display, side‑buttons 
            // ─────────────────────────────────────────────────────────────────────────────

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
                if (sb) updateSideButtons(sb);
            }

            // ─────────────────────────────────────────────────────────────────────────────
            // Step 10: Info popup close button (unchanged)
            // ─────────────────────────────────────────────────────────────────────────────
            const infoPopupBtn = document.querySelector("#info-popup .popup-content button");
            if (infoPopupBtn) {
                infoPopupBtn.onclick = () => {
                    document.getElementById("info-popup").classList.add("hidden");
                };
            }

            // ─────────────────────────────────────────────────────────────────────────────
            // Step 11: Optional recommendSearched(serial)
            // ─────────────────────────────────────────────────────────────────────────────

            function recommendSearched(serial) {
                // 1) Find which item owns that serial:
                let matchedIndex = -1;
                itemsOrdered.forEach((itm, idx) => {
                    const anyMatch = itm.versions.some(v => {
                        const full = itm.baseSerial + v.versionSerial.padStart(2, "0");
                        return full === serial;
                    });
                    if (anyMatch) matchedIndex = idx;
                });
                if (matchedIndex < 0) {
                    loadingWait("Item not found", 1.0, false, 2);
                    return; // serial not found
                }
                // 2) Move that one item to front of itemsOrdered array:
                const [foundItem] = itemsOrdered.splice(matchedIndex, 1);
                itemsOrdered.unshift(foundItem);

                // Later you’ll want to scroll so that inside the first panel, the version matching "serial" is centered horizontally.
                // For now, just rebuild and updateInfo:
                buildPanels();
                updateInfo();
            }



            // ─────────────────────────────────────────────────────────────────────────────
            // Step 11: Popups for cart, search, category
            // ─────────────────────────────────────────────────────────────────────────────

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

            function openSearchPopup() {
                // 1) create overlay
                searchOverlay = document.createElement("div");
                searchOverlay.id = "search-popup-overlay";
                Object.assign(searchOverlay.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.6)",
                    zIndex: "200",
                    display: "flex",
                    alignItems: "flex-start",    // pin to top
                    justifyContent: "center",
                });

                // 2) create popup box container
                const box = document.createElement("div");
                box.id = "search-popup-box";
                Object.assign(box.style, {
                    background: "var(--muted)",
                    color: "var(--fg)",
                    borderRadius: "12px",
                    width: "90%",
                    maxWidth: "360px",
                    marginTop: "10vh",
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem"
                });

                // 3) “X” close button
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
                closeBtn.onclick = closeSearchPopup;
                box.appendChild(closeBtn);

                // 4) Search‐input pill (type="text")
                const input = document.createElement("input");
                input.id = "search-popup-input";
                input.type = "text";
                input.placeholder = "Search for items...";
                Object.assign(input.style, {
                    width: "100%",
                    padding: "0.6rem 1rem",
                    borderRadius: "20px",
                    border: "1px solid var(--gray)",
                    background: "var(--muted)",
                    color: "var(--fg)",
                    fontSize: "1rem"
                });
                box.appendChild(input);

                // 5) Suggestions container (empty for now)
                const suggestions = document.createElement("div");
                suggestions.id = "search-suggestions";
                Object.assign(suggestions.style, {
                    maxHeight: "40vh",
                    overflowY: "auto",
                    background: "var(--muted)",
                    border: "1px solid var(--gray)",
                    borderRadius: "8px",
                    padding: "0.5rem"
                });
                box.appendChild(suggestions);

                // 6) Confirm‐search button
                const confirmBtn = document.createElement("button");
                confirmBtn.id = "search-confirm-btn";
                confirmBtn.innerText = "Search";
                Object.assign(confirmBtn.style, {
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "20px",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontSize: "1rem",
                    cursor: "pointer"
                });
                box.appendChild(confirmBtn);

                // 7) wire up event listeners:
                input.addEventListener("input", handleSearchInput);
                confirmBtn.addEventListener("click", () => {
                    runSearch(input.value.trim());
                    closeSearchPopup();
                });

                // Also submit search if the user presses Enter in the input:
                input.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") {
                        evt.preventDefault();
                        runSearch(input.value.trim());
                        closeSearchPopup();
                    }
                });


                // 8) assemble
                searchOverlay.appendChild(box);
                document.body.appendChild(searchOverlay);

                // 9) autofocus
                input.focus();
            }

            function closeSearchPopup() {
                if (!searchOverlay) return;
                document.body.removeChild(searchOverlay);
                searchOverlay = null;
            }

            function showCategoryPopup() {
                // ─────────────────────────────────────────────────────────────────────
                //  showCategoryPopup(): Open a full‐screen overlay showing categories.
                //    • 2× height of your showCartPopup
                //    • three consecutive screens: categories → subcategories → third groups
                //    • a white‐circle back‐arrow (icons/back.svg) to navigate backward
                //    • a pill‐shaped Confirm button that’s enabled once at least one selection is made
                // ─────────────────────────────────────────────────────────────────────
                // 1) Create overlay container (full‐screen, dark)
                const overlay = document.createElement("div");
                overlay.id = "category-popup-overlay";
                Object.assign(overlay.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: "200"
                });

                // 2) Create the pop‑up box (double height vs. cart popup)
                const box = document.createElement("div");
                box.id = "category-popup-box";
                Object.assign(box.style, {
                    background: "#2c2c2c4e",   // dark overlay style
                    color: "var(--fg)",
                    borderRadius: "12px",
                    width: "80%",
                    maxWidth: "320px",
                    height: "80%",              // 2× height of the ~40%-ish cart pop
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    position: "relative",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    flexDirection: "column"
                });

                // Keep track of current “level”: 0=categories, 1=subcategories, 2=third
                let level = 0;
                let chosenCategory = null;     // string, ex: "Fashion"
                let chosenSub = null;          // ex: "Men"
                let chosenThird = null;        // ex: "Trousers"

                // 3) Create back‐arrow button (white circle + icons/back.svg). Only shown if level>0.
                const backBtn = document.createElement("button");
                backBtn.id = "category-popup-back";
                Object.assign(backBtn.style, {
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "16px",
                    background: "#ffffff",       // white circle
                    border: "none",
                    display: "none",            // start hidden
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                });
                // Set the SVG icon inside:
                const backImg = document.createElement("img");
                backImg.src = "icons/back.svg";
                backImg.alt = "Back";
                Object.assign(backImg.style, {
                    width: "16px",
                    height: "16px"
                });
                backBtn.appendChild(backImg);
                box.appendChild(backBtn);

                // When clicked: go one level up (or close if already at top)
                backBtn.onclick = () => {
                    if (level === 0) {
                        // Should not happen, because it's hidden at level 0
                        document.body.removeChild(overlay);
                    } else if (level === 1) {
                        level = 0;
                        renderCategories();
                    } else if (level === 2) {
                        level = 1;
                        renderSubcategories();
                    }
                };

                // 4) Create a heading area (above the list), showing current selection (e.g. “Fashion” at level 1)
                const heading = document.createElement("h2");
                heading.id = "category-popup-heading";
                Object.assign(heading.style, {
                    color: "var(--fg)",
                    fontSize: "1.25rem",
                    margin: "0 0 1rem 0",
                    textAlign: "center"
                });
                heading.innerText = "Categories";
                box.appendChild(heading);

                // 5) Create a container for whichever list we’re on (categories/subcategories/third)
                const listContainer = document.createElement("div");
                listContainer.id = "category-popup-list";
                Object.assign(listContainer.style, {
                    flex: "1",
                    overflowY: "auto",
                    marginBottom: "1rem"
                });
                box.appendChild(listContainer);

                // 6) Create a Confirm button at the bottom (pill‐shaped), disabled until at least level 1 is chosen
                const confirmBtn = document.createElement("button");
                confirmBtn.id = "category-popup-confirm";
                confirmBtn.innerText = "Confirm";
                Object.assign(confirmBtn.style, {
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "20px",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontSize: "1rem",
                    cursor: "pointer",
                    opacity: "0.5"        // disabled look
                });
                confirmBtn.disabled = true;
                box.appendChild(confirmBtn);

                // Clicking Confirm: if on level 1 (category chosen, no sub), we runCategorySearch(catLetter)
                // If on level 2 (sub chosen, no third), we runCategorySearch(catLetter, subLetter)
                confirmBtn.onclick = () => {
                    if (!chosenCategory) return;
                    const catLetter = lookupCategoryLetter(chosenCategory);
                    if (!chosenSub) {
                        // Tier 1 only
                        runCategorySearch(catLetter);
                    } else if (!chosenThird) {
                        const subLetter = lookupSubCategoryLetter(chosenSub);
                        runCategorySearch(catLetter, subLetter);
                    }
                    closePopup();
                };

                // 7) Assemble overlay
                overlay.appendChild(box);
                document.body.appendChild(overlay);

                // Helper to remove overlay
                function closePopup() {
                    document.body.removeChild(overlay);
                }

                // 8) RENDER FUNCTIONS FOR EACH LEVEL:

                // 8.a) Level 0: show all categories
                function renderCategories() {
                    level = 0;
                    heading.innerText = "Categories";
                    backBtn.style.display = "none";
                    listContainer.innerHTML = "";
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = "0.5";

                    categoryDefs.categories.forEach(cat => {
                        const row = document.createElement("div");
                        row.className = "cat-row";
                        Object.assign(row.style, {
                            padding: "0.6rem",
                            margin: "0.3rem 0",
                            background: "var(--muted)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = cat.name; // e.g. "Fashion"
                        row.addEventListener("click", () => {
                            chosenCategory = cat.name;
                            level = 1;
                            renderSubcategories();
                        });
                        listContainer.appendChild(row);
                    });
                }

                // 8.b) Level 1: show subcategories of chosenCategory
                function renderSubcategories() {
                    level = 1;
                    heading.innerText = chosenCategory;
                    backBtn.style.display = "flex";
                    listContainer.innerHTML = "";
                    confirmBtn.disabled = false;      // at least one category chosen → Confirm now enabled
                    confirmBtn.style.opacity = "1";

                    // Find the category object:
                    const catObj = categoryDefs.categories.find(c => c.name === chosenCategory);
                    if (!catObj) return;

                    catObj.subCategories.forEach(sub => {
                        const row = document.createElement("div");
                        row.className = "sub-row";
                        Object.assign(row.style, {
                            padding: "0.6rem",
                            margin: "0.3rem 0",
                            background: "var(--muted)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = sub.name; // e.g. "Men"
                        row.addEventListener("click", () => {
                            chosenSub = sub.name;
                            level = 2;
                            renderThirdGroups();
                        });
                        listContainer.appendChild(row);
                    });
                }

                // 8.c) Level 2: show third‑level groups of chosenCategory → chosenSub
                function renderThirdGroups() {
                    level = 2;
                    heading.innerText = `${chosenCategory}  >  ${chosenSub}`;
                    backBtn.style.display = "flex";
                    listContainer.innerHTML = "";
                    confirmBtn.disabled = false;
                    confirmBtn.style.opacity = "1";

                    // Find the sub-object:
                    const catObj = categoryDefs.categories.find(c => c.name === chosenCategory);
                    if (!catObj) return;
                    const subObj = catObj.subCategories.find(s => s.name === chosenSub);
                    if (!subObj) return;

                    subObj.thirdGroups.forEach(tg => {
                        const row = document.createElement("div");
                        row.className = "third-row";
                        Object.assign(row.style, {
                            padding: "0.6rem",
                            margin: "0.3rem 0",
                            background: "var(--muted)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = tg.name; // e.g. "Trousers" or "A"
                        row.addEventListener("click", () => {
                            chosenThird = tg.name;
                            // Immediately run the search with category+sub+third and close:
                            const catLetter = lookupCategoryLetter(chosenCategory);
                            const subLetter = lookupSubCategoryLetter(chosenSub);
                            const thirdLetter = lookupThirdLetter(chosenThird);
                            runCategorySearch(catLetter, subLetter, thirdLetter);
                            closePopup();
                        });
                        listContainer.appendChild(row);
                    });
                }

                // 9) INITIAL CALL → show categories
                renderCategories();
            }




            // ─────────────────────────────────────────────────────────────────────────────
            // Step 11: Search system
            // ─────────────────────────────────────────────────────────────────────────────
            // const categoryDefs = /* paste that JSON here */;

            // function lookupCategoryLetter(catName) {
            //     // ───────────────────────────────────────────────────────
            //     //  (A) lookupCategoryLetter(categoryName):
            //     //     returns the first‐letter string (e.g. "F") for that categoryName.
            //     // ───────────────────────────────────────────────────────
            //     if (!catName) return null;
            //     // Make everything lowercase to match your JSON's "name" field.
            //     const lower = catName.toLowerCase();
            //     for (const cat of categoryDefs.categories) {
            //         if (cat.name.toLowerCase() === lower) {
            //             return cat.letter.toLowerCase();  // always use lowercase internally
            //         }
            //     }
            //     return null;
            // }

            // function lookupSubCategoryLetter(subName) {
            //     // ───────────────────────────────────────────────────────
            //     //  (B) lookupSubCategoryLetter(subName):
            //     //     Given a subCategoryName (e.g. "Men"), find its second‐letter under whichever
            //     //     category it belongs to. If two categories have a sub called "Men," this returns
            //     //     for the first matching category it finds. You can adjust if you want unique names.
            //     // ───────────────────────────────────────────────────────
            //     if (!subName) return null;
            //     const lower = subName.toLowerCase();
            //     for (const cat of categoryDefs.categories) {
            //         for (const sub of cat.subCategories) {
            //             if (sub.name.toLowerCase() === lower) {
            //                 return sub.letter.toLowerCase();
            //             }
            //         }
            //     }
            //     return null;
            // }

            // function lookupThirdLetter(thirdName) {

            //     // ───────────────────────────────────────────────────────
            //     //  (C) lookupThirdLetter(thirdName):
            //     //     Finds the third‐letter for a given “third‐level” name (e.g. "Trousers").
            //     //     We search through all categories → subCategories → thirdGroups.
            //     // ───────────────────────────────────────────────────────
            //     if (!thirdName) return null;
            //     const lower = thirdName.toLowerCase();
            //     for (const cat of categoryDefs.categories) {
            //         for (const sub of cat.subCategories) {
            //             for (const tg of sub.thirdGroups) {
            //                 if (tg.name.toLowerCase() === lower) {
            //                     return tg.letter.toLowerCase();
            //                 }
            //             }
            //         }
            //     }
            //     return null;
            // }

            function normalizeQuery(raw) {
                if (!raw || typeof raw !== "string") return "";
                // Replace any non‐letter/non‐number with a space, then collapse spaces, then trim
                const cleaned = raw
                    .toLowerCase()
                    .replace(/[^a-z0-9:]+/g, " ")   // preserve colon if category syntax, but remove everything else
                    .trim()
                    .replace(/\s+/g, " ");          // collapse multiple spaces into one
                return cleaned;
            }

            function handleSearchInput(e) {
                const raw = e.target.value;
                // Normalize: strip punctuation, collapse spaces, lowercase
                const q = normalizeQuery(raw);
                const suggestionsContainer = document.getElementById("search-suggestions");
                suggestionsContainer.innerHTML = "";

                if (!q) return;

                // 1) If query looks like "<CATEGORY>:<SUB>" or "<CATEGORY>:<SUB>:<THIRD>"
                let categoryPart = null, subPart = null, thirdPart = null;

                if (q.includes(":")) {
                    const parts = q.split(":").map(s => s.trim());
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        categoryPart = parts[0];
                        subPart = parts[1];
                        if (parts.length === 3 && parts[2]) thirdPart = parts[2];
                    }
                }

                const suggestions = []; // will collect up to 10 items

                // 2) Loop over each item in itemsOrdered
                for (const item of itemsOrdered) {
                    // item.baseSerial, item.versions[] contain versionObj.title, versionSerial, etc.
                    const base = item.baseSerial.toLowerCase();
                    const third = base.charAt(2).toLowerCase();
                    let matchedItem = false;

                    // If categoryPart/subPart defined → match base[1] and base[2]
                    if (categoryPart && subPart) {
                        const catLetter = lookupCategoryLetter(categoryPart);
                        const subLetter = lookupSubCategoryLetter(subPart);

                        if (catLetter && subLetter && base.charAt(0) === catLetter && base.charAt(1) === subLetter) {
                            matchedItem = true;
                        }

                        // If you want to also consider “CATEGORY:SUB:THIRD” in suggestions:
                        if (!matchedItem && thirdPart) {
                            const thirdLetter = lookupThirdLetter(thirdPart);
                            if (catLetter && subLetter && thirdLetter &&
                                base.charAt(0) === catLetter &&
                                base.charAt(1) === subLetter &&
                                base.charAt(2) === thirdLetter
                            ) {
                                matchedItem = true;
                            }
                        }

                    }


                    // Otherwise, if not a category query, do partial “word‐boundary” matching
                    if (!categoryPart && !matchedItem) {
                        // Check each version’s title or fullSerial for a “whole‐word” match
                        for (const versionObj of item.versions) {
                            // e.g. versionObj.title = "Elegant Top – Black"
                            const titleLower = versionObj.title.toLowerCase();
                            const fullSerial = (item.baseSerial + versionObj.versionSerial).toLowerCase();
                            // (i) full serial EXACT?
                            if (fullSerial === q) {
                                matchedItem = true;
                                break;
                            }
                            // (ii) whole-word match in title?
                            const wordMatches = titleLower.match(new RegExp(`\\b${q}\\b`));
                            if (wordMatches) {
                                matchedItem = true;
                                break;
                            }
                            // (iii) partial substring anywhere:
                            if (titleLower.includes(q) || fullSerial.includes(q)) {
                                matchedItem = true;
                                break;
                            }
                        }
                    }

                    if (matchedItem) {
                        suggestions.push(item);
                        if (suggestions.length >= 10) break;
                    }
                }

                // 3) Render up to 10 suggestions (item‐level):
                suggestions.forEach(item => {
                    // Show displayText = first version’s title + " (#SERIAL)"
                    const firstVer = item.versions[0];
                    const fullSerial = item.baseSerial + firstVer.versionSerial.padStart(2, "0");
                    const displayText = `${firstVer.title}  (#${fullSerial})`;

                    const row = document.createElement("div");
                    row.className = "suggestion-row";
                    Object.assign(row.style, {
                        padding: "0.4rem",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.1)"
                    });
                    row.innerText = displayText;
                    // store item’s baseSerial so clicking uses runSearch on that item
                    row.dataset.baseSerial = item.baseSerial.toLowerCase();
                    row.addEventListener("click", () => {
                        const input = document.getElementById("search-popup-input");
                        input.value = displayText;
                        // If user clicks, you can optionally run search immediately:
                        runSearch(item.baseSerial);
                    });
                    suggestionsContainer.appendChild(row);
                });
            }

            function runSearch(rawQuery) {
                // 0) Normalize query:
                const norm = normalizeQuery(rawQuery);
                if (!norm) {
                    // Empty → revert to original recommended order:
                    itemsOrdered = recommend(itemsOrdered);
                    buildPanels();
                    updateInfo();
                    return;
                }

                // 1) Category syntax?
                let categoryPart = null, subPart = null, thirdPart = null;
                if (norm.includes(":")) {
                    const parts = norm.split(":").map(s => s.trim());
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        categoryPart = parts[0];
                        subPart = parts[1];
                        if (parts.length === 3 && parts[2]) {
                            thirdPart = parts[2];
                        }
                    }
                }

                // 2) Partition items into exactList vs remainder

                const exactList = [];
                const remainder = [];

                itemsOrdered.forEach(item => {
                    const base = item.baseSerial.toLowerCase(); // e.g. "fma001"
                    let isExact = false;


                    if (categoryPart) {
                        // → We expect the user typed something like "Fashion:Men" (but normalized).
                        //    First, dynamically fetch letters:
                        const catLetter = lookupCategoryLetter(categoryPart);
                        const subLetter = lookupSubCategoryLetter(subPart);
                        let desiredThird = null;

                        if (thirdPart) {
                            desiredThird = lookupThirdLetter(thirdPart);
                        }

                        if (catLetter && subLetter) {
                            if (base.charAt(0) === catLetter && base.charAt(1) === subLetter) {
                                if (desiredThird) {
                                    // user explicitly gave a third name, so also require base[2]===desiredThird
                                    if (base.charAt(2) === desiredThird) {
                                        isExact = true;
                                    }
                                } else {
                                    // user only typed “category:sub” without third—this is enough to match
                                    isExact = true;
                                }
                            }
                        }
                    } else {
                        // → No categoryPart syntax: apply your existing fullSerial/title‐word search
                        for (const versionObj of item.versions) {
                            const versionSerial = versionObj.versionSerial.toLowerCase();
                            const fullSerial = (base + versionSerial).toLowerCase();
                            const titleLower = versionObj.title.toLowerCase();

                            // (i) fullSerial EXACT match?
                            if (fullSerial === norm) {
                                isExact = true;
                                break;
                            }
                            // (ii) whole‐word match in title?
                            const words = titleLower.split(/\W+/);
                            if (words.includes(norm)) {
                                isExact = true;
                                break;
                            }
                        }
                    }




                    if (isExact) {
                        exactList.push(item);
                    } else {
                        remainder.push(item);
                    }
                });



                // 3) If no exactList, we also consider partial substring as exact

                if (exactList.length === 0 && !categoryPart) {
                    const newRem = [];

                    remainder.forEach(item => {
                        let matched = false;
                        const baseTwo = item.baseSerial.substr(0, 2).toLowerCase(); // e.g. "fm"
                        const normTwo = norm.substr(0, 2); // if norm="man", normTwo="ma"

                        // Only consider substring matches if first two letters match:
                        if (normTwo === baseTwo) {
                            for (const versionObj of item.versions) {
                                const titleLower = versionObj.title.toLowerCase();
                                const fullSerial = (item.baseSerial + versionObj.versionSerial).toLowerCase();
                                if (
                                    titleLower.includes(norm) || // anywhere in title
                                    fullSerial.includes(norm)   // anywhere in serial
                                ) {
                                    matched = true;
                                    break;
                                }
                            }
                        }

                        if (matched) {
                            exactList.push(item);
                        } else {
                            newRem.push(item);
                        }
                    });

                    // Now “remainder” shrinks to only those truly not matched:
                    remainder.splice(0, remainder.length, ...newRem);
                }

                if (exactList.length === 0 && !categoryPart) {
                    loadingWait("Item Not Found", 0.8, false, 1.7);
                }

                // 4) Now remainder = items not in exactList. Group remainder by third‑letter,
                //    then second‑letter, then random:

                const groupByThird = {};
                remainder.forEach(item => {
                    const letter3 = item.baseSerial.charAt(2).toLowerCase(); // third letter
                    if (!groupByThird[letter3]) groupByThird[letter3] = [];
                    groupByThird[letter3].push(item);
                });


                // 5) We now need a “mainThird” value to order the “same‐third” tier. Use:

                let mainThird = null;
                if (categoryPart) {
                    // In a category:sub search, the "third letter" is dynamic: e.g. if user typed "Fashion:Men",
                    // maybe they also typed a third‐level (rare in runSearch). For now, we’ll just find the third letter
                    // that these matched items share. If you let the user type "Fashion:Men:Trousers", normalize that
                    // and split on ":" into [cat, sub, thirdName], then you could:
                    const parts = norm.split(":").map(s => s.trim());
                    if (parts.length === 3) {
                        // user actually typed category:sub:thirdName
                        const thirdLetter = lookupThirdLetter(parts[2]);
                        if (thirdLetter) mainThird = thirdLetter;
                    } else if (exactList.length) {
                        // fallback: look at the first matched item’s third char
                        mainThird = exactList[0].baseSerial.charAt(2).toLowerCase();
                    }
                } else if (exactList.length) {
                    // free‐text exact match: keep same behavior you had before
                    mainThird = exactList[0].baseSerial.charAt(2).toLowerCase();
                }

                if (categoryPart && thirdPart) {
                    // user explicitly typed a third name, so we can trust lookupThirdLetter(thirdPart)
                    const thirdLetter = lookupThirdLetter(thirdPart);
                    if (thirdLetter) mainThird = thirdLetter;
                } else if (exactList.length) {
                    // fallback: look at the first exact‐matched item’s 3rd char
                    mainThird = exactList[0].baseSerial.charAt(2).toLowerCase();
                }


                // 6) Assemble finalOrder in 5 tiers:
                const finalOrder = [];


                // 6.a) Tier 1: push all exactList (in the order they were found)
                exactList.forEach(it => finalOrder.push(it));


                // 6.b) Tier 2: same third group (if mainThird exists)
                if (mainThird && groupByThird[mainThird]) {
                    const arrSameThird = groupByThird[mainThird];
                    // Dynamically group by second letters inside this third‐bucket
                    const secondsInBucket = Array.from(
                        new Set(arrSameThird.map(it => it.baseSerial.charAt(1).toLowerCase()))
                    );
                    secondsInBucket.forEach(sec => {
                        const subBucket = arrSameThird.filter(
                            it => it.baseSerial.charAt(1).toLowerCase() === sec
                        );
                        shuffle(subBucket);
                        subBucket.forEach(it => finalOrder.push(it));
                    });
                    delete groupByThird[mainThird];
                }


                // 6.c) Tier 3: for each remaining third‐letter group, group by second letter dynamically
                Object.keys(groupByThird).forEach(letter3 => {
                    const bucket = groupByThird[letter3];
                    // Collect the unique second letters in this bucket:
                    const seconds = Array.from(new Set(bucket.map(it => it.baseSerial.charAt(1).toLowerCase())));
                    seconds.forEach(sec => {
                        const subBucket = bucket.filter(it => it.baseSerial.charAt(1).toLowerCase() === sec);
                        shuffle(subBucket);
                        subBucket.forEach(it => finalOrder.push(it));
                    });
                    // Remove after processing
                    delete groupByThird[letter3];
                });


                // 6.d) Tier 4: leftover random (any item not yet in finalOrder)
                // (At this point, groupByThird is empty because we deleted each key above.)
                // If you wanted to consider “same first letter but different third” as its own tier,
                // you could do so. But the above “6.b + 6.c” cover same third and same second. 
                // Next you might want “same first letter across all items.” If so, you can:
                //   1) Partition leftover (none at this point; all groupByThird entries were consumed).
                //   2) If you truly want a separate “same first letter” tier, re-group leftover by first letter here.
                // However, since groupByThird is now empty, we move directly to “random leftover across all categories.”
                // Gather any items not in finalOrder:
                const seen = new Set(finalOrder.map(it => it.baseSerial));
                const trulyLeftover = itemsOrdered.filter(it => !seen.has(it.baseSerial));
                shuffle(trulyLeftover);
                trulyLeftover.forEach(it => finalOrder.push(it));


                // 7) Overwrite itemsOrdered & rebuild panels (each item will show all its versions horizontally)
                itemsOrdered = finalOrder;
                buildPanels();
                vContainer.scrollTop = 0;// Reset scroll to top:
                updateInfo();
            }

            function runCategorySearch(catLetter, subLetter = null, thirdLetter = null) {
                // 0) Normalize to lowercase
                const c = catLetter ? catLetter.toLowerCase() : null;
                const s = subLetter ? subLetter.toLowerCase() : null;
                const t = thirdLetter ? thirdLetter.toLowerCase() : null;

                const exactList = [];
                const remainder = [];

                // 1) Partition itemsOrdered into exactList vs remainder
                itemsOrdered.forEach(item => {
                    const base = item.baseSerial.toLowerCase();

                    let isExact = false;
                    if (t) {
                        // user clicked category+sub+third: require base[0]===c && base[1]===s && base[2]===t
                        if (base.charAt(0) === c && base.charAt(1) === s && base.charAt(2) === t) {
                            isExact = true;
                        }
                    } else if (s) {
                        // user clicked category+sub (no third): require base[0]===c && base[1]===s
                        if (base.charAt(0) === c && base.charAt(1) === s) {
                            isExact = true;
                        }
                    } else {
                        // user clicked only category: require base[0]===c
                        if (base.charAt(0) === c) {
                            isExact = true;
                        }
                    }

                    if (isExact) {
                        exactList.push(item);
                    } else {
                        remainder.push(item);
                    }
                });

                // 2) If nothing matched exactly, show “No items found” and return (optional):
                if (exactList.length === 0) {
                    loadingWait("No items found in this category", 0.8, false, 1.7);
                    return;
                }

                // 3) Group the “remainder” by third letter. Each key is baseSerial.charAt(2).
                const groupByThird = {};
                remainder.forEach(item => {
                    const letter3 = item.baseSerial.charAt(2).toLowerCase();
                    if (!groupByThird[letter3]) groupByThird[letter3] = [];
                    groupByThird[letter3].push(item);
                });

                // 4) Determine “mainThird” if the user clicked a thirdLetter explicitly.
                //    Otherwise, if they only clicked cat+sub, we pick the third char from the first exactList item.
                let mainThird = null;
                if (t) {
                    mainThird = t; // because they explicitly asked for it
                } else if (exactList.length) {
                    mainThird = exactList[0].baseSerial.charAt(2).toLowerCase();
                }

                // 5) Build the final ordered array in 4 steps:
                const finalOrder = [];

                // 5.a) Tier 1: push all exactList items in the order they were matched
                exactList.forEach(it => finalOrder.push(it));

                // 5.b) Tier 2: same third (if mainThird exists)
                if (mainThird && groupByThird[mainThird]) {
                    const arrSameThird = groupByThird[mainThird];
                    const secondsInBucket = Array.from(
                        new Set(arrSameThird.map(it => it.baseSerial.charAt(1).toLowerCase()))
                    );
                    secondsInBucket.forEach(sec => {
                        const subBucket = arrSameThird.filter(it => it.baseSerial.charAt(1).toLowerCase() === sec);
                        shuffle(subBucket);
                        subBucket.forEach(it => finalOrder.push(it));
                    });
                    delete groupByThird[mainThird];
                }

                // 5.c) Tier 3: for each remaining third letter, group dynamically by second letter
                Object.keys(groupByThird).forEach(letter3 => {
                    const bucket = groupByThird[letter3];
                    const seconds = Array.from(new Set(bucket.map(it => it.baseSerial.charAt(1).toLowerCase())));
                    seconds.forEach(sec => {
                        const subBucket = bucket.filter(it => it.baseSerial.charAt(1).toLowerCase() === sec);
                        shuffle(subBucket);
                        subBucket.forEach(it => finalOrder.push(it));
                    });
                    delete groupByThird[letter3];
                });

                // 5.d) Tier 4: leftover random (none left in groupByThird at this point)
                // But to be safe, gather any item not yet in finalOrder:
                const seen = new Set(finalOrder.map(it => it.baseSerial));
                const trulyLeftover = itemsOrdered.filter(it => !seen.has(it.baseSerial));
                shuffle(trulyLeftover);
                trulyLeftover.forEach(it => finalOrder.push(it));

                // 6) Overwrite itemsOrdered & rebuild panels
                itemsOrdered = finalOrder;
                buildPanels();
                vContainer.scrollTop = 0;  // reset scroll to top
                updateInfo();
            }





            // ─────────────────────────────────────────────────────────────────────────────
            // Step 12: Touch / Mouse “dragging” helpers (unchanged from before)
            // ─────────────────────────────────────────────────────────────────────────────
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


            // ─────────────────────────────────────────────────────────────────────────────
            // Step 13: Scroll listener to call updateInfo() after user scrolls
            // ─────────────────────────────────────────────────────────────────────────────
            let to;
            vContainer.addEventListener("scroll", () => {
                clearTimeout(to);
                to = setTimeout(updateInfo, 100);
            });




            function recommendSearched(serialString) {
                runSearch(serialString);
            }

            // ─────────────────────────────────────────────────────────────────────────────
            // Step 14: Initial render
            // ─────────────────────────────────────────────────────────────────────────────
            shuffle(itemsOrdered);
            buildPanels();

            // After buildPanels, immediately traverse all version panels and update icons:
            document.querySelectorAll(".version-panel").forEach(vp => {
                const sb = vp.querySelector(".side-buttons");
                if (sb) updateSideButtons(sb);
            });

            updateInfo();

// runCategorySearch("e","r","s");


        })
        .catch(err => {
            loadingStart(0.55);
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


// // Examples (wired up from your HTML buttons):
// // User clicked “Fashion” button:
// const catLetter = lookupCategoryLetter("Fashion");             // → "F"
// runCategorySearch(catLetter);

// // User clicked “Electronics” then “Television”:
// const catLetter = lookupCategoryLetter("Electronics");         // → "E"
// const subLetter = lookupSubCategoryLetter("Television");       // → "T"
// runCategorySearch(catLetter, subLetter);

// // User clicked “Fashion” → “Men” → “Trousers”:
// const catLetter = lookupCategoryLetter("Fashion");             // → "F"
// const subLetter = lookupSubCategoryLetter("Men");              // → "M"
// const thirdLet  = lookupThirdLetter("Trousers");               // → "T"
// runCategorySearch(catLetter, subLetter, thirdLet);
