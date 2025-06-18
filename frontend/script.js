// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 database
// ---------------------------------------------------------------------------------------------------------------------------------------------- 
const SUPABASE_URL = "https://woqqydmwfkkrbplxdenr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXF5ZG13ZmtrcmJwbHhkZW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDgyMDksImV4cCI6MjA2NDYyNDIwOX0.YRWVv9VH9WJzXdQQzQTnwDDdp02vsSnMaKL8Nd4ubPU";
const supa = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            // auto‐read the tokens from the URL after OAuth redirects
            detectSessionInUrl: true,
            // keep session in localStorage
            persistSession: true
        }
    }
);

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
            background: 'rgba(255, 255, 255, 0.93)',
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
                        firstLine.style.fontWeight = 'bold';
                        firstLine.style.fontSize = '20px';
                        firstLine.style.lineHeight = '30px';
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


// loading when dat not loaded
window.addEventListener('DOMContentLoaded', () => {
    //   console.log('✅ DOMContentLoaded — attaching loader hooks');

    // 1. Link clicks & form submissions
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (a && a.hostname === location.hostname) {
            //   console.log('➡️ link click, starting loader');
            loadingStart(0.5);
        }
    });
    document.addEventListener('submit', () => {
        // console.log('➡️ form submit, starting loader');
        loadingStart(0.5);
    });

    // 2. Full page load / pageshow stop
    window.addEventListener('load', () => {
        // console.log('🏁 window.load, stopping loader');
        loadingStart(0.5);
    });
    window.addEventListener('pageshow', () => {
        // console.log('🏁 window.pageshow, stopping loader');
        loadingStop();
    });

    // 3. Wrap fetch to auto show/stop loader
    const _fetch = window.fetch;
    window.fetch = (...args) => {
        // console.log('🕸️ fetch start', args);
        loadingStart(0.5);
        return _fetch(...args).finally(() => {
            //   console.log('🕸️ fetch end', args);
            loadingStop();
        });
    };

    // 4. Wrap XHR too
    (function (open) {
        XMLHttpRequest.prototype.open = function (...args) {
            this.addEventListener('loadstart', () => { console.log('XHR loadstart'); loadingStart(); });
            this.addEventListener('loadend', () => { console.log('XHR loadend'); loadingStop(); });
            open.apply(this, args);
        };
    })(XMLHttpRequest.prototype.open);
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
// updateCartCount(32000);
// addToCartCount(57482);
// removeFromCartCount(7482);







// check online status
document.addEventListener('DOMContentLoaded', function () {
    // find the user icon by its alt text
    var userImg = document.querySelector('img[alt="Account"]');
    if (!userImg) return; // bail if not on this page

    // make the button container a positioning context
    var btn = userImg.parentElement;
    btn.style.position = 'relative';

    // create the 5px circle
    var statusDot = document.createElement('div');
    Object.assign(statusDot.style, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',   // default offline
        position: 'absolute',
        top: '3px',                // tweak as needed
        right: '5px'               // tweak as needed
    });
    btn.appendChild(statusDot);

    // expose global functions to toggle status
    window.LoggedInstatus = function () {
        statusDot.style.backgroundColor = 'green';
    };
    window.Loggedoffstatus = function () {
        statusDot.style.backgroundColor = 'red';
    };

    async function checkSession() {
        const { data: { session } } = await supa.auth.getSession();
        if (session) {
            LoggedInstatus()
        }
        else {
            Loggedoffstatus()
        }
    }
    checkSession()

});



























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
    fetch(`${CONFIG.API_BASE_URL}/products`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch products from backend");
            return response.json();
        })
        .then(json => {
            const rawItems = json.data || [];


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
                const catText = document.getElementById("category-name-text");
                const catBackBtn = document.getElementById("category-back-btn");

                if (catSpan && catText && catBackBtn) {
                    // 1) Initially: no category selected
                    catText.innerText = "Category";
                    catSpan.dataset.selected = "false"; // string "false"
                    catBackBtn.style.display = "none";

                    // 2) Clicking anywhere on the text (not the back arrow):
                    catText.style.cursor = "pointer";
                    catText.addEventListener("click", () => {
                        if (catSpan.dataset.selected === "true") {

                        }
                        showCategoryPopup();
                    });

                    // 3) Clicking the back arrow inside the pill:
                    catBackBtn.addEventListener("click", () => {
                        // Only acts if a selection exists
                        if (catSpan.dataset.selected === "true") {
                            // Clear selection → go home
                            itemsOrdered = recommend(rawItems);
                            buildPanels();
                            updateInfo();
                            catText.innerText = "Category";
                            catSpan.dataset.selected = "false";
                            catBackBtn.style.display = "none";
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
                    const serial = item.baseserial
                        + String(versionObj.versionserial).padStart(2, "0");
                    versionStateByID[serial] = {
                        liked: false,
                        inCart: false,
                        chosenQuantity: 0,
                        chosenSize: null,
                        cartRowId: null    // will hold the `carts.id` once fetched
                    };
                });
            });

            // ─────────────────────────────────────────────────────────────────────────────
            // Step 2: Load any existing state from localStorage or database
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

            // // — Hydrate from Supabase if signed in —
            // const { data: { session } } = await supaClient.auth.getSession();
            // if (session) {
            //     const token = session.access_token;
            //     const uId = session.user.id;

            //     // 1) Fetch liked version IDs
            //     const likesRes = await fetch(`${CONFIG.API_BASE_URL}/like/${uId}`, {
            //         headers: { Authorization: `Bearer ${token}` }
            //     });
            //     const { data: likedIds } = await likesRes.json();

            //     // 2) Fetch cart rows
            //     const cartRes = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
            //         headers: { Authorization: `Bearer ${token}` }
            //     });
            //     const { data: cartRows } = await cartRes.json();

            //     // 3) Apply to versionStateByID
            //     likedIds.forEach(vId => {
            //         for (const [serial, st] of Object.entries(versionStateByID)) {
            //             if (st.versionId === vId) st.liked = true;
            //         }
            //     });
            //     cartRows.forEach(row => {
            //         for (const [serial, st] of Object.entries(versionStateByID)) {
            //             if (st.versionId === row.product_version_id) {
            //                 st.inCart = true;
            //                 st.chosenQuantity = row.quantity;
            //                 st.chosenSize = row.size;
            //                 st.cartRowId = row.id;
            //             }
            //         }
            //     });
            // }




            // ─────────────────────────────────────────────────────────────────────────────
            // Step 3: Define helper to save a single version’s state into localStorage
            // ─────────────────────────────────────────────────────────────────────────────
            // function saveVersionState(serial) {
            //     localStorage.setItem(`versionState:${serial}`, JSON.stringify(versionStateByID[serial]));
            // }



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
                  <button onclick="toggleIcon(this)" class="like-btn">
                    <img class="svg"
                         src="icons/heart-line.svg"
                         data-default="icons/heart-line.svg"
                         data-active="icons/heart-fill.svg"
                         alt="Like">
                  </button>
                  <button class="cart-btn">
                    <img class="svg"
                         src="icons/shopping-cart-add.svg"
                         data-default="icons/shopping-cart-add.svg"
                         data-active="icons/shopping-cart-added.svg"
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
                const vContainer = document.getElementById("verticalScroll");
                if (!vContainer) {
                    console.log("v container not found")
                    return;
                }

                vContainer.innerHTML = "";


                itemsOrdered.forEach((item, pIdx) => {
                    const panel = document.createElement("div");
                    panel.className = "item-panel";

                    panel.dataset.category = item.category?.code || ""; // for future filtering
                    // panel.dataset.category = ""; // category codes are not returned; strip out

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


                        // DEBUG: dump entire fetched data
                        // console.log("ITEM OBJECT:", item,

                        //     "\n\n", "\t\tItem Level\n", {
                        //     Base_Serial: item.baseSerial,
                        //     CAT_id: item.CAT,
                        //     SUB_id: item.SUB,
                        //     THIRD_id: item.THIRD,
                        //     Description: item.description,
                        //     Versions: item.versions
                        // },

                        //     "\n\n\n\n", "VERSION OBJECT:", versionObj,

                        //     "\n\n", "\t\tVersion Level\n", {
                        //     Version_Number: versionObj.versionSerial,
                        //     Full_Serial: versionObj.fullSerial,
                        //     Title: versionObj.title,
                        //     Price: versionObj.priceValue,
                        //     Image_Key: versionObj.imageKey,
                        //     Sizes: versionObj.sizes,
                        //     Material: versionObj.material,
                        //     Weight: versionObj.weight,
                        //     Other_Attr: versionObj.otherAttrs,
                        //     InStock: versionObj.inStock,
                        //     Profit_Margin: versionObj.Profit,
                        //     SellerId: versionObj.Seller,
                        //     Time: versionObj.timeAdded,
                        //     Available: versionObj.available
                        // },

                        //     "\n\n"

                        // );



                        // version panel (bg+img)
                        const vp = document.createElement("div");
                        vp.className = "version-panel";
                        vp.dataset.panelIndex = pIdx;
                        vp.dataset.versionIndex = vIdx;

                        // console.log("Building version", versionObj);




                        const serial = versionObj.fullSerial;
                        vp.dataset.id = serial;



                        let imgSuffix;
                        if (versionObj.imageKey === 1) {
                            imgSuffix = ".jpg";
                        } else if (versionObj.imageKey === 2) {
                            imgSuffix = ".png";
                        }


                        // 1) blur background using versionObj.img
                        // const imageUrl = `${CONFIG.R2_PUBLIC_URL}/${serial}.jpg`;
                        const imageUrl = `${CONFIG.R2_PUBLIC_URL}/${serial}${imgSuffix}`;
                        // console.log(imageUrl);

                        vp.style.setProperty("--bgUrl", `url("${imageUrl}")`);


                        // 2) image insertion
                        const imgEl = document.createElement("img");
                        imgEl.src = imageUrl;
                        imgEl.onerror = () => {
                            console.warn("Image failed to load:", imageUrl);
                            imgEl.src = "assets/!fallback.jpg"; // optional fallback
                        };
                        vp.appendChild(imgEl);


                        // 3) side‑buttons (unchanged)
                        vp.insertAdjacentHTML("beforeend", sideButtonsHTML());


                        // 4) panel‑title: use versionObj.title, versionSerial, and formatted price
                        const price = versionObj.priceValue;
                        const profit_rate = versionObj.Profit;
                        const final_price = price * profit_rate;
                        const formattedPrice = `KES ${(final_price ?? 0).toLocaleString()}`;

                        vp.insertAdjacentHTML("beforeend", `
                          <div class="panel-title">
                            <div class="panel-title-text">${versionObj.title}</div>
                            <div class="panel-serial-text">#${serial}</div>
                            <div class="panel-price-text">${formattedPrice}</div>
                          </div>
                        `);





                        // 5) panel-extra: “date added” + “In Stock/Out of Stock” pill
                        const inStockSVG = versionObj.inStock
                            ? 'icons/In-Stock-fill.svg'
                            : 'icons/In-Stock-line.svg';
                        const stockText = versionObj.inStock ? 'In Stock' : 'Out of Stock';
                        const formattedDate = versionObj.timeAdded
                            ? new Date(versionObj.timeAdded).toLocaleDateString() : "MM-DD-YYYY";
                        vp.insertAdjacentHTML("beforeend", `
                          <div class="panel-extra">
                            <div class="date-text">${formattedDate}</div>
                            <div class="stock-row">
                              <img src="${inStockSVG}" class="stock-icon" alt="${stockText}">
                              <span class="stock-text">${stockText}</span>
                            </div>
                          </div>
                        `);


                        // 6) Store raw priceValue in a data attribute for cart math later:
                        vp.dataset.pricevalue = versionObj.priceValue;

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


                    // side buttons

                    const likeBtn = vp.querySelector(".like-btn");                   
                    likeBtn.onclick = async () => {
                        console.log("liked");

                        // 🔍 Debug: did we even hit the handler?
                        console.log("LIKE CLICKED for serial", vp.dataset.id);


                        const { data: { session } } = await supa.auth.getSession();
                        if (!session) {
                            console.log("not logged in");
                            return
                        };

                        const serial = vp.dataset.id;

                        // const state = versionStateByID[serial];
                        // Ensure we have a state object for this serial
                        const state = versionStateByID[serial] ||= { liked: false };


                        // 🔍 Build & log payload for the like API
                        const payload = { full_serial: versionObj.fullSerial };
                        console.log("POST /api/like payload: [payload is ]", payload);



                        // Persist toggle to Supabase
                        const res = await fetch(`${CONFIG.API_BASE_URL}/like`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify(payload)
                        });

                        // 🔍 Debug: server response
                        console.log("url:", `${CONFIG.API_BASE_URL}/like`);
                        console.log("=> /api/like response:", res.status, await res.text());



                        if (res.ok) {
                            // Only update UI on success
                            state.liked = !state.liked;
                            const img = likeBtn.querySelector("img");
                            img.src = state.liked ? img.dataset.active : img.dataset.default;
                        } else {
                            console.error("Failed to toggle like:", await res.text());
                        }




                        // Heartbeat animation
                        const img = likeBtn.querySelector("img");
                        if (state.liked && img.dataset.default.includes("heart")) {
                            img.classList.add("heartbeat");
                            img.addEventListener("animationend", function h() {
                                img.classList.remove("heartbeat");
                                img.removeEventListener("animationend", h);
                            });
                        }
                    };



                    const cartBtn = vp.querySelector(".cart-btn");
                    cartBtn.onclick = async () => {
                        // const item = itemsOrdered[pIdx];
                        // const versionObj = item.versions[vIdx];
                        const serial = vp.dataset.id;
                        const state = versionStateByID[serial]||= { inCart: false };

                        // 1) If out of stock, call OutOfStock() and bail:
                        if (!versionObj.inStock) {
                            OutOfStock();
                            return;
                        }

                        // 2) If not yet inCart, show the pop-up; otherwise remove:
                        if (!state.inCart) {
                            console.log("cart button clicked, it was not in cart before");

                            showCartPopup(serial,
                                Array.isArray(versionObj.sizes)
                                    ? versionObj.sizes
                                    : [versionObj.sizes],
                                versionObj.pricevalue,
                                // chosenQty => {
                                async (chosenQty, chosenSize) => {
                                    console.log("CART CLICKED for serial", vp.dataset.id, "versionObj.id=", versionObj.id);
                                    console.log("Called showcartpopup with :", { serial: serial }, { sizes: versionObj.sizes }, { price: versionObj.pricevalue }, { quantity: chosenQty });

                                    const { data: { session } } = await supa.auth.getSession();
                                    if (!session) return showLoginPopup();

                                    // 🔍 Debug: ensure the <select> exists
                                    // const selectEl = document.getElementById("popup-select-size");
                                    // console.log("popup-select-size element:", selectEl);
                                    // if (!selectEl) { console.error("❌ popup-select-size not found!"); }

                                    // const chosenSize = selectEl?.value;
                                    console.log("Selected size:", chosenSize);

                                    // const totalPrice = versionObj.pricevalue * chosenQty;
                                    // console.log("🛒 Added to cart:", {
                                    //     title: versionObj.title,
                                    //     serial: serial,
                                    //     size: chosenSize,
                                    //     totalQuantity: chosenQty,
                                    //     totalPrice: totalPrice,
                                    //     basePrice: versionObj.pricevalue
                                    // });

                                    console.log("now starting fetch and post");

                                    // 🔍 Debug: payload for cart POST
                                    const price = versionObj.priceValue;
                                    const profit_rate = versionObj.Profit;
                                    const final_price = price * profit_rate;

                                    const totalPrice = final_price * chosenQty;
                                
                                    // 🔍 Build & log payload for the cart API
                                    const payload = {
                                        full_serial: serial,
                                        title: versionObj.title,
                                        size: chosenSize,
                                        quantity: chosenQty,
                                        unit_price: versionObj.priceValue,
                                        seller_id: versionObj.Seller
                                    };
                                    console.log("POST /api/cart payload:", payload);


                                    // Create cart row on server
                                    const resp = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${session.access_token}`
                                        },
                                        body: JSON.stringify(payload)
                                    });

                                    // if (resp.ok) {
                                    //     const { data: newRow } = await resp.json();
                                    //     state.cartRowId = newRow.id;
                                    // } else {
                                    //     console.error("Cart POST failed:", await resp.text());
                                    // }

                                    if (resp.ok) {
                                        const { data } = await resp.json();
                                        // store the new row’s ID so we can delete later
                                        state.cartRowId = data.id;
                                        state.inCart     = true;
                                        const img = cartBtn.querySelector("img");
                                        img.src = img.dataset.active;
                                    } else {
                                        console.error("Cart POST failed:", await resp.text());
                                    }

                                    // UI updates 
                                    state.inCart = true;
                                    state.chosenSize = chosenSize;
                                    state.chosenQuantity = chosenQty;



                                    // … existing add‐to‐cart UI update …
                                    addToCartCount(totalPrice);
                                    const img = cartBtn.querySelector("img");
                                    img.src = img.dataset.active;
                                    addToCart();


                                });
                        } else {
                            console.log("cart button clicked, it was in cart before");

                            // Already in cart → remove (persist to DB):
                            const { data: { session } } = await supa.auth.getSession();
                            if (!session) return showLoginPopup();

                            // Delete on server
                            await fetch(`${CONFIG.API_BASE_URL}/cart/${state.cartRowId}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${session.access_token}` }
                            });

                            // Update UI & state
                            const prevQty = state.chosenQuantity || 1;
                            removeFromCartCount(versionObj.pricevalue * prevQty);
                            state.inCart = false;
                            state.chosenQuantity = 0;
                            state.chosenSize = null;
                            state.cartRowId = null;
                            const img = cartBtn.querySelector("img");
                            img.src = img.dataset.default;


                            // updateSideButtons(sb);
                            // updateCartCount();

                            // updateSideButtons(sb);
                            // removeFromCartCount(versionObj.pricevalue);
                            // console.log("removed", versionObj.pricevalue);
                            updateSideButtons(sb);
                            // recalc total from versionStateByID
                            const newCount = Object.values(versionStateByID)
                                .filter(s => s.inCart)
                                .reduce((sum, s) => sum + (s.chosenQuantity * s.base_price), 0);
                            updateCartCount(newCount);
                        }
                    };



                    const infoBtn = vp.querySelector(".info-btn");
                    infoBtn.onclick = () => {
                        const serial = vp.dataset.id;
                        const item = itemsOrdered[pIdx];
                        const [base, ver] = [item.baseserial, versionObj.versionserial];

                        const sizesDisplay = Array.isArray(versionObj.sizes)
                            ? versionObj.sizes.join(", ")  // incase its an array
                            : versionObj.sizes;

                        document.getElementById("popup-title").innerText = versionObj.title || "N/A";
                        document.getElementById("popup-description").innerText = item.description || "N/A";

                        document.getElementById("popup-sizes").innerText = sizesDisplay || "--";
                        document.getElementById("popup-material").innerText = versionObj.material || "--";
                        document.getElementById("popup-weight").innerText = versionObj.weight || "--";
                        document.getElementById("popup-seller").innerText = versionObj.Seller || "00";
                        document.getElementById("popup-other").innerText = versionObj.otherAttrs || "---";

                        document.getElementById("info-popup").classList.remove("hidden");
                    };


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
                const state = versionStateByID[serial] || {};

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


            // itemsOrdered.forEach((item, pIdx) => {
            //     item.versions.forEach((versionObj, vIdx) => {
            //         console.log(versionObj.pricevalue);

            //     });
            // });

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

                // console.log("received", {
                //     id : id,
                //     size_array: sizesArray, 
                //     price : unitPrice, 
                //     call_back: callback

                // });

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
                    // Pass both qty and selected size to caller
                    callback(currentQty, select.value);
                    document.body.removeChild(overlay);
                };

                box.appendChild(confirmBtn);

                // 8) Assemble and show
                overlay.appendChild(box);
                document.body.appendChild(overlay);
            }

            function getCartPopupHeight() {
                const cartBox = document.getElementById("cart-popup-box");
                if (cartBox) {
                    return cartBox.offsetHeight;
                }
                // Fallback: default pixel value if cart-popup-box not yet in DOM
                return window.innerHeight * 0.4; // e.g. 40% of viewport
            }

            function openSearchPopup() {
                // 1) Create overlay
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
                    alignItems: "flex-start",
                    justifyContent: "center"
                });

                // 2) Determine dynamic box height = cart popup height
                const cartHeight = getCartPopupHeight();
                const boxHeight = cartHeight * 1.3; // exactly equal

                // 3) Create popup box container
                const box = document.createElement("div");
                box.id = "search-popup-box";
                Object.assign(box.style, {
                    background: "#2c2c2c4e",   // semi-transparent like category/cart
                    color: "var(--fg)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "12px",
                    width: "90%",
                    maxWidth: "360px",
                    height: `${boxHeight}px`,
                    marginTop: "10vh",
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                });

                // 4) Back arrow (top-left)
                const backBtn = document.createElement("button");
                backBtn.id = "search-popup-back";
                Object.assign(backBtn.style, {
                    position: "absolute",
                    top: "34px",
                    left: "18px",
                    width: "35px",
                    height: "35px",
                    borderRadius: "16px",
                    background: "#ffffff",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                });
                const backImg2 = document.createElement("img");
                backImg2.src = "icons/back.svg";
                backImg2.alt = "Back";
                Object.assign(backImg2.style, {
                    width: "25px",
                    height: "25px"
                });
                backBtn.appendChild(backImg2);
                box.appendChild(backBtn);

                backBtn.onclick = () => {
                    closeSearchPopup();
                };

                // 5) Search‐input pill (slightly shorter for room)
                const input = document.createElement("input");
                input.id = "search-popup-input";
                input.type = "text";
                input.placeholder = "Search for items...";
                Object.assign(input.style, {
                    width: "82%",
                    marginLeft: "50px",
                    padding: "0.4rem 0.8rem", // slightly smaller
                    borderRadius: "20px",
                    border: "1px solid var(--gray)",
                    background: "#1e1e1e",  // darker inside
                    color: "var(--fg)",
                    fontSize: "1rem",
                    marginTop: "1.2rem"      // push below back arrow
                });
                box.appendChild(input);

                // 6) Suggestions container (fills remaining space, scrollable)
                const suggestions = document.createElement("div");
                suggestions.id = "search-suggestions";
                Object.assign(suggestions.style, {
                    flex: "1",
                    overflowY: "auto",
                    background: "var(--muted)",
                    border: "1px solid var(--gray)",
                    borderRadius: "8px",
                    padding: "0.5rem"
                });
                box.appendChild(suggestions);

                // 7) Confirm‐search button at bottom
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
                    cursor: "pointer",
                    marginTop: "0.5rem"
                });
                box.appendChild(confirmBtn);

                // 8) Wire up events:
                let isTyping = false;

                // On focus (initially) show history
                renderSearchHistory();

                input.addEventListener("input", (evt) => {
                    const raw = evt.target.value;
                    if (raw.trim() === "") {
                        // Show history again if field emptied
                        isTyping = false;
                        renderSearchHistory();
                    } else {
                        // Switch to predictive suggestions
                        isTyping = true;
                        suggestions.innerHTML = "";
                        handleSearchInput(evt);
                    }
                });

                confirmBtn.addEventListener("click", async () => {
                    const val = input.value.trim();
                    if (!val) return;

                    // === START: NEW “Admin” INTERCEPT LOGIC ===
                    // 1. Fetch the salt + adminHash from secret.json
                    try {
                        const response = await fetch("secret.json", { cache: "no-store" });
                        const { salt, adminHash } = await response.json();
                        // 2. Compute SHA-256 of user input + salt
                        const encoder = new TextEncoder();
                        const data = encoder.encode(val + salt);
                        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                        // Convert buffer to hex string
                        const hashArray = Array.from(new Uint8Array(hashBuffer));
                        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                        // 3. Compare to stored adminHash
                        if (hashHex === adminHash.toLowerCase()) {
                            // Redirect to admin.html, skip history and normal search
                            window.location.href = "admin.html";
                            return;
                        }
                    } catch (err) {
                        console.error("Error fetching or computing admin hash:", err);
                        // If anything goes wrong, just fall back to normal search below
                    }
                    // === END: NEW “Admin” INTERCEPT LOGIC ===

                    // 4. Normal behavior: Save to history, runSearch, close popup
                    saveSearchHistory(val);
                    runSearch(val);
                    closeSearchPopup();
                });

                input.addEventListener("keydown", async (evt) => {
                    if (evt.key === "Enter") {
                        evt.preventDefault();
                        const val = input.value.trim();
                        if (!val) return;

                        // === REPEAT Admin Intercept on Enter key ===
                        try {
                            const response = await fetch("secret.json", { cache: "no-store" });
                            const { salt, adminHash } = await response.json();
                            const encoder = new TextEncoder();
                            const data = encoder.encode(val + salt);
                            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                            const hashArray = Array.from(new Uint8Array(hashBuffer));
                            const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
                            if (hashHex === adminHash.toLowerCase()) {
                                window.location.href = "admin.html";
                                return;
                            }
                        } catch (err) {
                            console.error("Error fetching or computing admin hash:", err);
                        }
                        // === END Admin Intercept ===

                        saveSearchHistory(val);
                        runSearch(val);
                        closeSearchPopup();
                    }
                });


                // 9) Assemble & focus
                searchOverlay.appendChild(box);
                document.body.appendChild(searchOverlay);
                input.focus();

                // 10) Render search history when input is empty
                function renderSearchHistory() {
                    suggestions.innerHTML = "";
                    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
                    if (history.length === 0) {
                        return;
                    }
                    history.forEach(q => {
                        const row = document.createElement("div");
                        row.className = "history-row";
                        Object.assign(row.style, {
                            padding: "0.4rem",
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(255,255,255,0.1)"
                        });
                        row.innerText = q;
                        row.addEventListener("click", () => {
                            // Auto-search this history entry
                            input.value = q;
                            saveSearchHistory(q);
                            runSearch(q);
                            closeSearchPopup();
                        });
                        suggestions.appendChild(row);
                    });
                }

                // 11) Save new search to localStorage
                function saveSearchHistory(query) {
                    if (!query) return;
                    let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
                    // Remove if existing
                    history = history.filter(item => item !== query);
                    // Prepend
                    history.unshift(query);
                    if (history.length > 10) history.pop();
                    localStorage.setItem("searchHistory", JSON.stringify(history));
                }

            }

            function closeSearchPopup() {
                if (!searchOverlay) return;
                document.body.removeChild(searchOverlay);
                searchOverlay = null;
            }

            function showCategoryPopup() {
                // 1) Create overlay
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

                // 2) Compute dynamic max‐height (1.5 × cart popup)
                const cartHeight = getCartPopupHeight();
                const maxBoxHeight = cartHeight * 2;

                // 3) Create the pop-up box
                const box = document.createElement("div");
                box.id = "category-popup-box";
                Object.assign(box.style, {
                    background: "#2c2c2c4e",
                    color: "var(--fg)",
                    borderRadius: "12px",
                    width: "80%",
                    maxWidth: "320px",
                    height: "auto",               // auto to fit content
                    maxHeight: `${maxBoxHeight}px`,
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(255, 255, 255, 0.36)",
                    position: "relative",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    flexDirection: "column"
                });

                let level = 0;
                let chosenCategory = null;
                let chosenSub = null;
                let chosenThird = null;

                // 4) Create BACK arrow button (always visible, even at level 0)
                const backBtn = document.createElement("button");
                backBtn.id = "category-popup-back";
                Object.assign(backBtn.style, {
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "16px",
                    background: "#ffffff",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                });
                const backImg = document.createElement("img");
                backImg.src = "icons/back.svg";
                backImg.alt = "Back";
                Object.assign(backImg.style, {
                    width: "25px",
                    height: "25px"
                });
                backBtn.appendChild(backImg);
                box.appendChild(backBtn);

                backBtn.onclick = () => {
                    if (level === 0) {
                        document.body.removeChild(overlay);
                    } else if (level === 1) {
                        level = 0;
                        renderCategories();
                    } else if (level === 2) {
                        level = 1;
                        renderSubcategories();
                    }
                };

                // 5) Heading
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

                // 6) List container (scrolls if needed)
                const listContainer = document.createElement("div");
                listContainer.id = "category-popup-list";
                Object.assign(listContainer.style, {
                    flex: "1",
                    overflowY: "auto",
                    marginBottom: "1rem"
                });
                box.appendChild(listContainer);

                // 7) Confirm button (disabled until level ≥1)
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
                    opacity: "0.5"
                });
                confirmBtn.disabled = true;
                box.appendChild(confirmBtn);

                confirmBtn.onclick = () => {
                    if (!chosenCategory) return;
                    const catLetter = lookupCategoryLetter(chosenCategory);

                    if (!chosenSub) {
                        runCategorySearch(catLetter);
                        // Update top-bar pill:
                        const catSpan = document.getElementById("category-name");
                        const catText = document.getElementById("category-name-text");
                        const catBackBtn = document.getElementById("category-back-btn");
                        catText.innerText = chosenCategory;
                        catSpan.dataset.selected = "true";
                        catBackBtn.style.display = "inline-flex";
                        document.body.removeChild(overlay);
                        return;
                    }

                    if (!chosenThird) {
                        const subLetter = lookupSubCategoryLetter(chosenSub);
                        runCategorySearch(catLetter, subLetter);
                        const catSpan = document.getElementById("category-name");
                        const catText = document.getElementById("category-name-text");
                        const catBackBtn = document.getElementById("category-back-btn");
                        catText.innerText = `${chosenSub}`;
                        catSpan.dataset.selected = "true";
                        catBackBtn.style.display = "inline-flex";
                        document.body.removeChild(overlay);
                        return;
                    }
                };

                // 8) Assemble overlay
                overlay.appendChild(box);
                document.body.appendChild(overlay);

                // 9) Render functions

                function renderCategories() {
                    level = 0;
                    chosenCategory = chosenSub = chosenThird = null;

                    heading.innerText = "Categories";
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = "0.5";
                    listContainer.innerHTML = "";

                    categoryDefs.categories.forEach(cat => {
                        const row = document.createElement("div");
                        row.className = "cat-row";
                        Object.assign(row.style, {
                            padding: "0.6rem",
                            margin: "0.3rem 0",
                            background: "rgba(109, 105, 105, 0.56)",
                            borderRadius: "15px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = cat.name;
                        row.addEventListener("click", () => {
                            chosenCategory = cat.name;
                            level = 1;
                            renderSubcategories();
                        });
                        listContainer.appendChild(row);
                    });
                }

                function renderSubcategories() {
                    level = 1;
                    chosenSub = chosenThird = null;

                    heading.innerText = chosenCategory;
                    confirmBtn.disabled = false;
                    confirmBtn.style.opacity = "1";
                    listContainer.innerHTML = "";

                    const catObj = categoryDefs.categories.find(c => c.name === chosenCategory);
                    if (!catObj) return;

                    catObj.subCategories.forEach(sub => {
                        const row = document.createElement("div");
                        row.className = "sub-row";
                        Object.assign(row.style, {
                            padding: "0.6rem",
                            margin: "0.3rem 0",
                            background: "rgba(109, 105, 105, 0.56)",
                            borderRadius: "15px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = sub.name;
                        row.addEventListener("click", () => {
                            chosenSub = sub.name;
                            level = 2;
                            renderThirdGroups();
                        });
                        listContainer.appendChild(row);
                    });
                }

                function renderThirdGroups() {
                    level = 2;
                    chosenThird = null;

                    heading.innerText = `${chosenCategory} > ${chosenSub}`;
                    confirmBtn.disabled = false;
                    confirmBtn.style.opacity = "1";
                    listContainer.innerHTML = "";

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
                            background: "rgba(109, 105, 105, 0.56)",
                            borderRadius: "15px",
                            cursor: "pointer",
                            color: "var(--fg)",
                            textAlign: "center"
                        });
                        row.innerText = tg.name;
                        row.addEventListener("click", () => {
                            chosenThird = tg.name;
                            const catLetter = lookupCategoryLetter(chosenCategory);
                            const subLetter = lookupSubCategoryLetter(chosenSub);
                            const thirdLetter = lookupThirdLetter(chosenThird);
                            runCategorySearch(catLetter, subLetter, thirdLetter);

                            const catSpan = document.getElementById("category-name");
                            const catText = document.getElementById("category-name-text");
                            const catBackBtn = document.getElementById("category-back-btn");
                            catText.innerText = `${chosenThird}`;
                            catSpan.dataset.selected = "true";
                            catBackBtn.style.display = "inline-flex";
                            document.body.removeChild(overlay);
                        });
                        listContainer.appendChild(row);
                    });
                }

                // 10) Initial render
                renderCategories();
            }





            // ─────────────────────────────────────────────────────────────────────────────
            // Step 11: Search system
            // ─────────────────────────────────────────────────────────────────────────────

            function normalizeQuery(raw) {
                if (!raw || typeof raw !== "string") return "";
                // Replace any non‐letter/non‐number with a space, then collapse spaces, then trim
                const cleaned = raw
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "")   // preserve colon if category syntax, but remove everything else
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

                if (!raw.trim()) return;

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
                    const displayText = `${firstVer.title}`;

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
                        closeSearchPopup();
                    });
                    suggestionsContainer.appendChild(row);
                });
            }


            function runSearch(rawQuery) {
                const norm = normalizeQuery(rawQuery);
                if (!norm) {
                    itemsOrdered = recommend(itemsOrdered);
                    buildPanels();
                    updateInfo();
                    return;
                }

                // 1) If no colon but norm is exactly a valid category name:
                let categoryOnlyPart = null;
                if (!norm.includes(":")) {
                    const catLetter = lookupCategoryLetter(norm);
                    if (catLetter) {
                        categoryOnlyPart = norm;
                    }
                }

                // 2) Detect "category:sub[:third]" if present
                let categoryPart = null, subPart = null, thirdPart = null;
                if (categoryOnlyPart) {
                    categoryPart = categoryOnlyPart;
                } else if (norm.includes(":")) {
                    const parts = norm.split(":").map(s => s.trim());
                    if (parts.length >= 2 && parts[0] && parts[1]) {
                        categoryPart = parts[0];
                        subPart = parts[1];
                        if (parts.length === 3 && parts[2]) {
                            thirdPart = parts[2];
                        }
                    }
                }

                // 3) Tier 1: EXACT match logic
                const exactList = [];
                const remainder = [];

                itemsOrdered.forEach(item => {
                    const base = item.baseSerial.toLowerCase();
                    let isExact = false;

                    if (categoryPart) {
                        // DYNAMIC lookups
                        const catLetter = lookupCategoryLetter(categoryPart);
                        const subLetter = subPart ? lookupSubCategoryLetter(subPart) : null;
                        const thirdLetter = thirdPart ? lookupThirdLetter(thirdPart) : null;

                        if (catLetter && (!subLetter)) {
                            // Category-only: match base[0] === catLetter
                            if (base.charAt(0) === catLetter) isExact = true;
                        } else if (catLetter && subLetter && (!thirdLetter)) {
                            // Category + Sub: match base[0]==cat && base[1]==sub
                            if (base.charAt(0) === catLetter && base.charAt(1) === subLetter) {
                                isExact = true;
                            }
                        } else if (catLetter && subLetter && thirdLetter) {
                            // Category + Sub + Third: match base[0..2] exactly
                            if (
                                base.charAt(0) === catLetter &&
                                base.charAt(1) === subLetter &&
                                base.charAt(2) === thirdLetter
                            ) {
                                isExact = true;
                            }
                        }
                    } else {
                        // No category syntax: check fullSerial exact or whole-word title exact
                        for (const versionObj of item.versions) {
                            const versionSerial = versionObj.versionSerial.toLowerCase();
                            const fullSerial = (base + versionSerial).toLowerCase();
                            const titleLower = versionObj.title.toLowerCase();

                            // (i) If user typed substring that matches a title prefix EXACT
                            //     E.g. if they typed "tanned", match "tanned table"
                            //     so we treat that as exact tier 1.
                            if (titleLower.startsWith(norm + " ")) {
                                isExact = true;
                                break;
                            }

                            if (fullSerial === norm) {
                                isExact = true;
                                break;
                            }
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

                // 4) If Tier 1 is still empty (no exactList) AND no category syntax,
                //    attempt substring fallback by matching title or serial, picking one random seed:
                if (exactList.length === 0 && !categoryPart) {
                    // Find all items whose title or fullSerial contains norm
                    const substringMatches = [];
                    itemsOrdered.forEach(item => {
                        for (const versionObj of item.versions) {
                            const titleLower = versionObj.title.toLowerCase();
                            const fullSerial = (item.baseSerial + versionObj.versionSerial).toLowerCase();
                            if (titleLower.includes(norm) || fullSerial.includes(norm)) {
                                substringMatches.push(item);
                                break;
                            }
                        }
                    });
                    if (substringMatches.length > 0) {
                        // Pick one at random as the Tier 1 seed
                        const seedIndex = Math.floor(Math.random() * substringMatches.length);
                        exactList.push(substringMatches[seedIndex]);
                        // Remove it from remainder
                        const seedBase = substringMatches[seedIndex].baseSerial;
                        remainder.splice(
                            remainder.findIndex(it => it.baseSerial === seedBase),
                            1
                        );
                    }
                }

                // 4.a) If still no exactList and not category-based, show Item Not Found
                if (exactList.length === 0 && !categoryPart) {
                    loadingWait("Item Not Found", 0.8, false, 3);
                }

                // 5) Now build Tier 2, 3, 4, 5 with strict prefix logic

                // Determine the prefix letters from Tier 1:
                //   firstLetter = base[0], secondLetter = base[1], thirdLetter = base[2]
                let firstPrefix = null, secondPrefix = null, thirdPrefix = null;
                if (exactList.length) {
                    const seedBase = exactList[0].baseSerial.toLowerCase();
                    firstPrefix = seedBase.charAt(0);
                    secondPrefix = seedBase.charAt(1);
                    thirdPrefix = seedBase.charAt(2);
                } else if (categoryPart) {
                    // If category syntax (but no exactList?), use those parts:
                    firstPrefix = lookupCategoryLetter(categoryPart);
                    if (subPart) secondPrefix = lookupSubCategoryLetter(subPart);
                    if (thirdPart) thirdPrefix = lookupThirdLetter(thirdPart);
                }

                // Group the remainder for Tier 2–4
                const tier2 = []; // same third, with prefix dependency
                const tier3 = []; // same second, with prefix dependency
                const tier4 = []; // same first, with prefix dependency
                const tier5 = []; // everything else

                remainder.forEach(item => {
                    const base = item.baseSerial.toLowerCase();
                    if (thirdPrefix && base.charAt(2) === thirdPrefix && base.charAt(0) === firstPrefix && base.charAt(1) === secondPrefix) {
                        // Tier 2 candidate
                        tier2.push(item);
                    } else if (secondPrefix && base.charAt(1) === secondPrefix && base.charAt(0) === firstPrefix) {
                        // Tier 3 candidate
                        tier3.push(item);
                    } else if (firstPrefix && base.charAt(0) === firstPrefix) {
                        // Tier 4 candidate
                        tier4.push(item);
                    } else {
                        // Tier 5 candidate
                        tier5.push(item);
                    }
                });

                // Shuffle within each tier (except exactList)
                shuffle(tier2);
                shuffle(tier3);
                shuffle(tier4);
                shuffle(tier5);

                // Build finalOrder
                const finalOrder = [];
                exactList.forEach(it => finalOrder.push(it));
                tier2.forEach(it => finalOrder.push(it));
                tier3.forEach(it => finalOrder.push(it));
                tier4.forEach(it => finalOrder.push(it));
                tier5.forEach(it => finalOrder.push(it));

                // Sanity check: if we lost any items, append them to the end
                const seenBases = new Set(finalOrder.map(it => it.baseSerial));
                itemsOrdered.forEach(item => {
                    if (!seenBases.has(item.baseSerial)) {
                        finalOrder.push(item);
                    }
                });

                // After building finalOrder but before setting itemsOrdered = finalOrder
                if (finalOrder.length < itemsOrdered.length) {
                    console.warn("runSearch/runCategorySearch: finalOrder length < original itemsOrdered length. Missing items:",
                        itemsOrdered.filter(it => !finalOrder.find(f => f.baseSerial === it.baseSerial)).map(it => it.baseSerial)
                    );
                    // Append any truly missing items at the end in random order:
                    const missing = itemsOrdered.filter(it => !finalOrder.find(f => f.baseSerial === it.baseSerial));
                    shuffle(missing);
                    missing.forEach(it => finalOrder.push(it));
                }
                itemsOrdered = finalOrder;
                buildPanels();
                vContainer.scrollTop = 0;
                updateInfo();
            }

            function runCategorySearch(catLetter, subLetter = null, thirdLetter = null) {
                const c = catLetter ? catLetter.toLowerCase() : null;
                const s = subLetter ? subLetter.toLowerCase() : null;
                const t = thirdLetter ? thirdLetter.toLowerCase() : null;

                const exactList = [];
                const remainder = [];

                itemsOrdered.forEach(item => {
                    const base = item.baseSerial.toLowerCase();
                    let isExact = false;

                    if (t) {
                        if (base.charAt(0) === c && base.charAt(1) === s && base.charAt(2) === t) {
                            isExact = true;
                        }
                    } else if (s) {
                        if (base.charAt(0) === c && base.charAt(1) === s) {
                            isExact = true;
                        }
                    } else {
                        if (base.charAt(0) === c) {
                            isExact = true;
                        }
                    }

                    if (isExact) exactList.push(item);
                    else remainder.push(item);
                });

                if (exactList.length === 0) {
                    loadingWait("No items found in this category", 0.8, false, 1.7);
                    return;
                }

                // Tier 2–5: same prefix logic as runSearch
                let firstPrefix = c;
                let secondPrefix = s;
                let thirdPrefix = t;
                if (!t && exactList.length) {
                    // If only category or category+sub, derive missing prefix from the first exactList item
                    const seedBase = exactList[0].baseSerial.toLowerCase();
                    if (!s) secondPrefix = seedBase.charAt(1);
                    if (!t) thirdPrefix = seedBase.charAt(2);
                }

                const tier2 = [];
                const tier3 = [];
                const tier4 = [];
                const tier5 = [];

                remainder.forEach(item => {
                    const base = item.baseSerial.toLowerCase();
                    if (thirdPrefix && base.charAt(2) === thirdPrefix && base.charAt(0) === firstPrefix && base.charAt(1) === secondPrefix) {
                        tier2.push(item);
                    } else if (secondPrefix && base.charAt(1) === secondPrefix && base.charAt(0) === firstPrefix) {
                        tier3.push(item);
                    } else if (firstPrefix && base.charAt(0) === firstPrefix) {
                        tier4.push(item);
                    } else {
                        tier5.push(item);
                    }
                });

                shuffle(tier2);
                shuffle(tier3);
                shuffle(tier4);
                shuffle(tier5);

                const finalOrder = [];
                exactList.forEach(it => finalOrder.push(it));
                tier2.forEach(it => finalOrder.push(it));
                tier3.forEach(it => finalOrder.push(it));
                tier4.forEach(it => finalOrder.push(it));
                tier5.forEach(it => finalOrder.push(it));

                // Sanity check
                const seenBases = new Set(finalOrder.map(it => it.baseSerial));
                itemsOrdered.forEach(item => {
                    if (!seenBases.has(item.baseSerial)) {
                        finalOrder.push(item);
                    }
                });

                // After building finalOrder but before setting itemsOrdered = finalOrder
                if (finalOrder.length < itemsOrdered.length) {
                    console.warn("runSearch/runCategorySearch: finalOrder length < original itemsOrdered length. Missing items:",
                        itemsOrdered.filter(it => !finalOrder.find(f => f.baseSerial === it.baseSerial)).map(it => it.baseSerial)
                    );
                    // Append any truly missing items at the end in random order:
                    const missing = itemsOrdered.filter(it => !finalOrder.find(f => f.baseSerial === it.baseSerial));
                    shuffle(missing);
                    missing.forEach(it => finalOrder.push(it));
                }
                itemsOrdered = finalOrder;
                buildPanels();
                vContainer.scrollTop = 0;
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
            console.error("Failed to load products", err);
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



