// document.addEventListener("DOMContentLoaded", () => {
//   // Utility: pad numbers (e.g. 1 → "01")
//   function zeroPad(num, length = 2) {
//     return String(num).padStart(length, "0");
//   }

//   

//   let currentItemIndex = 0;
//   let currentVersionIndex = 0;

//   // Cache elements
//   const itemContainer = document.getElementById("item-container");
//   const itemTitle     = document.getElementById("item-title");
//   const itemSerial    = document.getElementById("item-serial");
//   const itemPrice     = document.getElementById("item-price");
//   const popup         = document.getElementById("info-popup");
//   const popupDesc     = document.getElementById("popup-description");

//   // Render current item + version
//   function renderItem() {
//     const item    = items[currentItemIndex];
//     const version = item.versions[currentVersionIndex];
//     const versionCode = zeroPad(currentVersionIndex + 1);
//     const fullSerial  = item.baseSerial + versionCode;       // e.g. "FT01" + "01"
//     const imgPath     = `assets/${fullSerial}.jpg`;

//     // Inject blurred bg + fg image
//     itemContainer.innerHTML = `
//       <div class="item-view">
//         <div class="bg" style="background-image:url('${imgPath}')"></div>
//         <img class="fg" src="${imgPath}"
//              alt="${item.title} — ${version}"
//              onerror="this.onerror=null;this.src='assets/placeholder.png';"/>
//       </div>`;

//     itemTitle.innerText  = item.title;
//     itemSerial.innerText = "#" + fullSerial;
//     itemPrice.innerText  = item.price;
//   }

//   

//   // Swipe handling (shared for touch & mouse)
//   let startX = 0, startY = 0, isMouseDown = false;

//   function handleStart(x, y) {
//     startX = x; startY = y;
//   }

//   function handleEnd(x, y) {
//     const dx = x - startX, dy = y - startY;
//     if (Math.abs(dy) > Math.abs(dx)) {
//       // Vertical swipe → change item
//       if (dy < -30) {
//         currentItemIndex = (currentItemIndex + 1) % items.length;
//         currentVersionIndex = 0;
//       } else if (dy > 30) {
//         currentItemIndex = (currentItemIndex - 1 + items.length) % items.length;
//         currentVersionIndex = 0;
//       }
//     } else {
//       // Horizontal swipe → change version
//       const vCount = items[currentItemIndex].versions.length;
//       if (dx < -30) {
//         currentVersionIndex = (currentVersionIndex + 1) % vCount;
//       } else if (dx > 30) {
//         currentVersionIndex = (currentVersionIndex - 1 + vCount) % vCount;
//       }
//     }
//     renderItem();
//   }

//   // Touch events
//   itemContainer.addEventListener("touchstart", e =>
//     handleStart(e.touches[0].clientX, e.touches[0].clientY)
//   );
//   itemContainer.addEventListener("touchend", e =>
//     handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
//   );

//   // Mouse events
//   itemContainer.addEventListener("mousedown", e => {
//     isMouseDown = true;
//     handleStart(e.clientX, e.clientY);
//   });
//   window.addEventListener("mouseup", e => {
//     if (!isMouseDown) return;
//     isMouseDown = false;
//     handleEnd(e.clientX, e.clientY);
//   });

//   // First draw
//   renderItem();
// });








// Track the centered item & version
let currentPanelIndex = 0;
let currentVersionIndex = 0;



document.addEventListener("DOMContentLoaded", () => {
    const items = [
        {
            title: "Men's Jacket", baseSerial: "FT01", price: "KES 1500",
            description: "Slim-fit classic jacket for cold.",
            versions: ["FT0101.jpg", "FT0102.jpg"]
        },
        {
            title: "Jeans", baseSerial: "FT02", price: "KES 800",
            description: "Stylish blue jeans for men.",
            versions: ["FT0201.jpg", "FT0202.jpg", "FT0203.jpg"]
        },
        {
            title: "Elegant Top", baseSerial: "FT03", price: "KES 3000",
            description: "Perfect for parties and formal events.",
            versions: ["FT0301.jpg", "FT0302.jpg", "FT0303.jpg"]
        }
    ];

    const vContainer = document.getElementById("verticalScroll");

    // Build the panels
    items.forEach((item, i) => {
        const panel = document.createElement("div");
        panel.className = "item-panel";

        // Nested horizontal
        const h = document.createElement("div");
        h.className = "horizontal-scroll";
        // inject versions
        item.versions.forEach((imgFile, vi) => {
            const vp = document.createElement("div");
            vp.className = "version-panel";


            // 1) set the CSS variable for the blurred bg
            const imgSrc = `assets/${imgFile}`;
            vp.style.setProperty('--bgUrl', `url("${imgSrc}")`);

            // 2) create the <img>
            const img = document.createElement("img");
            img.src = imgSrc;
            img.onerror = () => img.src = "assets/placeholder.png";


            vp.appendChild(img);
            h.appendChild(vp);
        });

        panel.appendChild(h);
        vContainer.appendChild(panel);
    });

    // Helper to update bottom info
    const titleEl = document.getElementById("item-title");
    const serialEl = document.getElementById("item-serial");
    const priceEl = document.getElementById("item-price");

    function updateInfo() {
        const panels = Array.from(document.querySelectorAll(".item-panel"));
        const midY = window.innerHeight / 2;
        let currentIdx = 0;

        panels.forEach((panel, idx) => {
            const rect = panel.getBoundingClientRect();
            if (rect.top <= midY && rect.bottom >= midY) {
                currentIdx = idx;
            }
        });

        // within that panel, find center version
        const versionPanels = panels[currentIdx].querySelectorAll(".version-panel");
        const hScroll = panels[currentIdx].querySelector(".horizontal-scroll");
        const midX = window.innerWidth / 2;
        let verIdx = 0;

        versionPanels.forEach((vp, i) => {
            const r = vp.getBoundingClientRect();
            if (r.left <= midX && r.right >= midX) {
                verIdx = i;
            }
        });

        // Save the indices for showInfo()
        currentPanelIndex = currentIdx;
        currentVersionIndex = verIdx;

        // Update UI text
        const item = items[currentIdx];
        const vnum = String(verIdx + 1).padStart(2, "0");
        document.getElementById("item-title").innerText = item.title;
        document.getElementById("item-serial").innerText = `#${item.baseSerial}${vnum}`;
        document.getElementById("item-price").innerText = item.price;
    }

    // Grab the Info button and wire it
    const infoBtn = document.getElementById("info-btn");
    infoBtn.addEventListener("click", () => {
        // Get the description for the current panel
        const desc = items[currentPanelIndex].description;
        document.getElementById("popup-description").innerText = desc;
        document.getElementById("info-popup").classList.remove("hidden");
    });

    // And wire the Close button
    document.querySelector("#info-popup .popup-content button")
        .addEventListener("click", () => {
            document.getElementById("info-popup").classList.add("hidden");
        });


    // Listen to scroll end (debounced)
    let timeout;
    vContainer.addEventListener("scroll", () => {
        clearTimeout(timeout);
        timeout = setTimeout(updateInfo, 100);
    });
    // Also listen on each horizontal
    document.querySelectorAll(".horizontal-scroll").forEach(hs => {
        hs.addEventListener("scroll", () => {
            clearTimeout(timeout);
            timeout = setTimeout(updateInfo, 100);
        });
    });
    // Helper: make a scroll container draggable with mouse
    /**
  * Enable click‑and‑drag to scroll, with adjustable sensitivity.
  * @param {HTMLElement} container ‑ the scrollable element
  * @param {boolean} isVertical ‑ true for vertical‑only, false for horizontal
  * @param {number} speedFactor ‑ how much to multiply the drag distance
  */
    function makeDraggableScroll(container, isVertical, speedFactor = 2) {
        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener("mousedown", e => {
            isDown = true;
            container.classList.add("dragging");
            startX = e.pageX;
            startY = e.pageY;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
            e.preventDefault();
        });

        window.addEventListener("mouseup", () => {
            if (!isDown) return;
            isDown = false;
            container.classList.remove("dragging");
        });

        container.addEventListener("mousemove", e => {
            if (!isDown) return;
            const dx = e.pageX - startX;
            const dy = e.pageY - startY;
            if (isVertical) {
                // amplify the vertical drag
                container.scrollTop = scrollTop - dy * speedFactor;
            } else {
                // amplify the horizontal drag
                container.scrollLeft = scrollLeft - dx * speedFactor;
            }
            e.preventDefault();
        });

        // Prevent native image dragging
        container.addEventListener("dragstart", e => e.preventDefault());
    }

    // Usage: after your scroll setup
    // 2× speed on vertical scroll:
    makeDraggableScroll(vContainer, true, 3);
    // 3× speed on each horizontal:
    document.querySelectorAll(".horizontal-scroll").forEach(hs => {
        makeDraggableScroll(hs, false, 3);
    });

    updateInfo();  // initial
    // Info popup functions
    window.showInfo = () => {
        const desc = items[currentPanelIndex].description;
        document.getElementById("popup-description").innerText = desc;
        document.getElementById("info-popup").classList.remove("hidden");
    };

    window.closeInfo = () => {
        document.getElementById("info-popup").classList.add("hidden");
    };

});

