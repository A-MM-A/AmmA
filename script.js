
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
    // 1) Raw product data (unsorted)
    //    Serial: [Cat][Gender][XXX][VV], e.g. "FMA00101.jpg"
    // —————————————————————————
    // const rawItems = [
    //     {
    //         title: "Men's Jacket",
    //         baseSerial: "FMA001",
    //         price: "KES 1500",
    //         description: "Slim-fit classic jacket for cold.",
    //         versions: ["FMA00101.jpg", "FMA00102.jpg"]
    //     },
    //     {
    //         title: "Jeans",
    //         baseSerial: "FMA002",
    //         price: "KES 800",
    //         description: "Stylish blue jeans for men.",
    //         versions: ["FMA00201.jpg", "FMA00202.jpg", "FMA00203.jpg"]
    //     },
    //     {
    //         title: "Elegant Top",
    //         baseSerial: "FMA003",
    //         price: "KES 3000",
    //         description: "Perfect for parties and formal events.",
    //         versions: ["FMA00301.jpg", "FMA00302.jpg", "FMA00303.jpg"]
    //     },
    //     {
    //         title: "Trend Jacket Pants",
    //         baseSerial: "FMA004",
    //         price: "KES 2000",
    //         description: "Spring/fall zipper pants.",
    //         versions: ["FMA00401.jpg", "FMA00402.jpg", "FMA00403.jpg", "FMA00404.jpg", "FMA00405.jpg"]
    //     },
    //     {
    //         title: "M",
    //         baseSerial: "FMA005",
    //         price: "KES 3000",
    //         description: "Perfect for parties and formal events.",
    //         versions: ["FMA00501.jpg", "FMA00502.jpg", "FMA00503.jpg"]
    //     },
    //     {
    //         title: "Elegant Top",
    //         baseSerial: "FMA006",
    //         price: "KES 3000",
    //         description: "Perfect for parties and formal events.",
    //         versions: ["FMA00601.jpg", "FMA00602.jpg", "FMA00603.jpg"]
    //     },
    //     {
    //         title: "Elegant Top",
    //         baseSerial: "FFA001",
    //         price: "KES 3000",
    //         description: "Perfect for parties and formal events.",
    //         versions: ["FFA00101.jpg", "FFA00102.jpg", "FFA00103.jpg"]
    //     },
    //     {
    //         title: "Elegant Top",
    //         baseSerial: "FFA002",
    //         price: "KES 3000",
    //         description: "Perfect for parties and formal events.",
    //         versions: ["FFA00201.jpg", "FFA00202.jpg", "FFA00203.jpg"]
    //     }
    // ];
    const rawItems = [
        {
            title: "Men's Jacket",
            baseSerial: "FMA001",
            price: "KES 1500",
            description: "Slim-fit classic jacket with zip closure and side pockets.",
            versions: ["FMA00101.jpg", "FMA00102.jpg"],
            versionsState: [],         // will fill below
            sizes: ["S", "M", "L", "XL"],
            material: "100% Cotton",
            weight: "450g"
        },
        {
            title: "Jeans",
            baseSerial: "FMA002",
            price: "KES 800",
            description: "Dark-wash straight-leg jeans with five-pocket styling.",
            versions: ["FMA00201.jpg", "FMA00202.jpg", "FMA00203.jpg"],
            versionsState: [],
            sizes: ["30", "32", "34", "36"],
            material: "Denim (98% Cotton, 2% Spandex)",
            weight: "600g"
        },
        {
            title: "Elegant Top",
            baseSerial: "FMA003",
            price: "KES 3000",
            description: "Silk blend top with pleated neckline and cap sleeves.",
            versions: ["FMA00301.jpg", "FMA00302.jpg", "FMA00303.jpg"],
            versionsState: [],
            sizes: ["XS", "S", "M", "L"],
            material: "Silk Blend",
            weight: "200g"
        },
        {
            title: "Trend Pants",
            baseSerial: "FMA004",
            price: "KES 2000",
            description: "Zippered jogger pants with elastic cuffs and cargo pockets.",
            versions: ["FMA00401.jpg", "FMA00402.jpg", "FMA00403.jpg", "FMA00404.jpg", "FMA00405.jpg"],
            versionsState: [],
            sizes: ["S", "M", "L", "XL"],
            material: "Polyester Blend",
            weight: "550g"
        }
    ];

    // Add per-version state to each item
    rawItems.forEach(item => {
        item.versionsState = item.versions.map(() => ({
            liked: false,
            inCart: false
        }));
    });

    // —————————————————————————
    // 2) Recommendation algorithm
    //    Scores items by browse, like, cart; sorts descending
    //    Then appends 2 random others for diversification
    // —————————————————————————
    function computeScore(meta) {
        const WEIGHTS = { browse: 1, like: 3, cart: 5 };
        return (meta.browseCount || 0) * WEIGHTS.browse
            + (meta.liked ? 1 : 0) * WEIGHTS.like
            + (meta.inCart ? 1 : 0) * WEIGHTS.cart;
    }
    function recommend(items) {
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
    // 3) Cache bottom‐info elements
    // —————————————————————————
    const vContainer = document.getElementById("verticalScroll");
    const titleEl = document.getElementById("item-title");
    const serialEl = document.getElementById("item-serial");
    const priceEl = document.getElementById("item-price");


    // —————————————————————————
    // 4) build panels + buttons
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
        <button onclick="toggleIcon(this)">
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

            // For each version
            item.versions.forEach((imgF, vIdx) => {
                // version panel (bg+img)
                const vp = document.createElement("div");
                vp.className = "version-panel";
                vp.dataset.panelIndex = pIdx;
                vp.dataset.versionIndex = vIdx;

                // blur background
                vp.style.setProperty("--bgUrl", `url("assets/${imgF}")`);

                // image insertion
                const img = document.createElement("img");
                img.src = `assets/${imgF}`;
                img.onerror = () => img.src = "assets/placeholder.png";
                vp.appendChild(img);

                // Inject side‑buttons inside vp
                vp.insertAdjacentHTML("beforeend", sideButtonsHTML());

                // append to horizontal scroll
                hScroll.appendChild(vp);

                // Dot
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
                document.getElementById("popup-title").innerText = item.title;
                document.getElementById("popup-description").innerText = item.description;
                document.getElementById("popup-sizes").innerText = item.sizes.join(", ");
                document.getElementById("popup-material").innerText = item.material;
                document.getElementById("popup-weight").innerText = item.weight;
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

            // Initialize Like/Cart button images based on state
            const sb = vp.querySelector(".side-buttons");
            updateSideButtons(sb, pIdx, vIdx);
        });
    }




    // —————————————————————————
    // 5) updateInfo(): center detection + UI + dots + index display + buttons
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

        // Determine panelIdx & versionIdx
        const vp = btn.closest(".version-panel");
        const pIdx = parseInt(vp.dataset.panelIndex, 10);
        const vIdx = parseInt(vp.dataset.versionIndex, 10);
        const state = itemsOrdered[pIdx].versionsState[vIdx];

        if (currentSrc.endsWith(defaultSrc)) {
            // Switch to active
            img.src = activeSrc;
            if (defaultSrc.includes("heart")) {
                state.liked = true;
            } else if (defaultSrc.includes("shopping-cart")) {
                state.inCart = true;
            }
        } else {
            // Switch back to default
            img.src = defaultSrc;
            if (defaultSrc.includes("heart")) {
                state.liked = false;
            } else if (defaultSrc.includes("shopping-cart")) {
                state.inCart = false;
            }
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

        // bottom info
        const item = itemsOrdered[pIdx];
        const verNum = String(vIdx + 1).padStart(2, "0");
        titleEl.innerText = item.title;
        serialEl.innerText = `#${item.baseSerial}${verNum}`;
        priceEl.innerText = item.price;

        // update dots
        const dots = panels[pIdx].querySelectorAll(".dot");
        dots.forEach((d, i) => d.classList.toggle("active", i === vIdx));

        // show & fade index display
        const idTimeout = 2;  // time in seconds
        const idxEl = panels[pIdx].querySelector(".index-display");
        idxEl.innerText = `${vIdx + 1}/${item.versions.length}`;
        idxEl.style.opacity = 1;
        clearTimeout(idxEl._timeout);
        idxEl._timeout = setTimeout(() => idxEl.style.opacity = 0, (idTimeout * 1000));

        // Update side buttons for this version
        const sb = vPanels[vIdx].querySelector(".side-buttons");
        if (sb) updateSideButtons(sb, pIdx, vIdx);
    }


    // —————————————————————————
    // 6) Info popup wiring
    // —————————————————————————
    document.querySelector("#info-popup .popup-content button").onclick = () => {
        document.getElementById("info-popup").classList.add("hidden");
    };

    // —————————————————————————
    // 7) Scroll listeners (debounced)
    // —————————————————————————
    let scrollTimeout;
    vContainer.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateInfo, 100);
    });


    // —————————————————————————
    // 8) Draggable scroll helper (mouse & touch support)
    // —————————————————————————
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


    // —————————————————————————
    // 10) Re-Loading animation
    // —————————————————————————










});


















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
updateCartCount(32000);
addToCartCount(57482);
removeFromCartCount(7482);