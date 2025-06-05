const pass = 'yourStrongPassword';
const loginBtn = document.getElementById('loginBtn');
loginBtn.onclick = () => {
  if (document.getElementById('adminPass').value === pass) {
    document.getElementById('loginDiv').classList.add('hidden');
    document.getElementById('panelDiv').classList.remove('hidden');
  } else {
    document.getElementById('loginMsg').textContent = 'Wrong password';
  }
};

document.getElementById('addItemBtn').onclick = () => {
  const catName = document.getElementById('newCategory').value;
  const category = data.categories.find(c => c.name === catName) || { name: catName, items: [] };
  if (!data.categories.includes(category)) data.categories.push(category);
  category.items.push({
    name: document.getElementById('newName').value,
    serial: document.getElementById('newSerial').value,
    price: +document.getElementById('newPrice').value,
    variants: document.getElementById('newVariants').value.split(',').map(v => v.trim()),
    currentVar: 0
  });
  alert('Item added');
};



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










// script.js
// (function() {
//   // -------------------------------
//   // Debug helper (prints to console)
//   // -------------------------------
//   function printline(msg) {
//     // console.log("[Loader Debug] " + msg);
//   }

//   // -----------------------------------
//   // The order of your shapes (top→bottom)
//   // -----------------------------------
//   const shapeOrder = [
//     "shape_8", "shape_9", "shape_10", "shape_11", "shape_12", // top wedges
//     "shape_7", "shape_6", "shape_5",                           // green arcs
//     "shape_4", "shape_3", "shape_2", "shape_1"                  // letters
//   ];

//   let overlay = null;
//   let animationInterval = null;

//   // Prevent background scroll/touch
//   function disableScroll() {
//     document.documentElement.style.overflow = 'hidden';
//     document.body.style.overflow = 'hidden';
//   }
//   function enableScroll() {
//     document.documentElement.style.overflow = '';
//     document.body.style.overflow = '';
//   }
//   function preventTouch(e) {
//     e.preventDefault();
//   }

//   // ----------------------------------------------------
//   // Create a full‐screen overlay, fetch & insert the SVG
//   // ----------------------------------------------------
//   function createOverlay(withText, message) {
//     if (overlay) {
//       printline("Overlay already exists; skipping creation.");
//       return;
//     }
//     printline("Creating overlay...");

//     // 1) Create overlay container
//     overlay = document.createElement('div');
//     Object.assign(overlay.style, {
//       position: 'fixed',
//       top: '0',
//       left: '0',
//       width: '100vw',
//       height: '100vh',
//       background: 'rgba(0,0,0,0.2)',
//       display: 'flex',
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: '9999'
//     });
//     overlay.addEventListener('wheel', preventTouch, { passive: false });
//     overlay.addEventListener('touchmove', preventTouch, { passive: false });
//     document.body.appendChild(overlay);
//     disableScroll();

//     // 2) Create inner box (rounded, light background)
//     const box = document.createElement('div');
//     Object.assign(box.style, {
//       background: '#DCD9D7',
//       borderRadius: '20px',
//       padding: '20px',
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       boxShadow: '0 0 20px rgba(0,0,0,0.1)'
//     });
//     overlay.appendChild(box);

//     // 3) Fetch the SVG file and insert it
//     printline("Fetching SVG from logo/logo.svg …");
//     fetch('logo/logo.svg')
//       .then(response => {
//         if (!response.ok) throw new Error("SVG fetch failed with status " + response.status);
//         return response.text();
//       })
//       .then(svgText => {
//         printline("SVG fetched successfully.");

//         // Parse the SVG string into DOM nodes
//         const wrapper = document.createElement('div');
//         wrapper.innerHTML = svgText.trim();
//         const svgElement = wrapper.querySelector('svg');

//         if (!svgElement) {
//           printline("ERROR: <svg> not found in fetched text.");
//           return;
//         }

//         // Add a viewBox so the entire 1080×959 canvas scales down
//         svgElement.setAttribute('viewBox', '0 0 1080 959');
//         // Then set a small display size (200×200)
//         svgElement.setAttribute('width', '200');
//         svgElement.setAttribute('height', '200');
//         // Ensure CSS transform origin is center (for smooth animations)
//         svgElement.style.transformOrigin = '50% 50%';

//         box.appendChild(wrapper);

//         // Validate that all shape IDs are present
//         let allFound = true;
//         shapeOrder.forEach(id => {
//           const el = document.getElementById(id);
//           if (!el) {
//             printline(`WARNING: Element with ID "${id}" not found.`);
//             allFound = false;
//           }
//         });
//         if (allFound) {
//           printline("All shape IDs detected—starting animation.");
//         } else {
//           printline("Some shape IDs are missing; animation may be incomplete.");
//         }

//         // Start the disassemble/reassemble loop
//         startAnimation();
//       })
//       .catch(err => {
//         printline("ERROR loading SVG: " + err);
//       });

//     // 4) If withText = true, add a message panel below the SVG
//     if (withText) {
//       const msgDiv = document.createElement('div');
//       Object.assign(msgDiv.style, {
//         background: '#BFBAB6',
//         color: '#3C3835',
//         marginTop: '10px',
//         padding: '10px',
//         borderRadius: '10px',
//         fontSize: '14px',
//         textAlign: 'center',
//         whiteSpace: 'pre-wrap',
//         maxWidth: '240px'
//       });
//       msgDiv.textContent = message;
//       box.appendChild(msgDiv);
//     }
//   }

//   // --------------------------------------------------------
//   // Animate: disassemble (top→bottom) then reassemble (reverse)
//   // --------------------------------------------------------
//   function startAnimation() {
//     const duration = 500;    // each shape’s animation duration (ms)
//     const delayStep = 100;   // delay between shapes (ms)
//     const moveDist = 50;     // pixels downward/upward

//     function disassemble() {
//       shapeOrder.forEach((id, idx) => {
//         const el = document.getElementById(id);
//         if (!el) return;
//         el.animate([
//           { transform: 'translateY(0px)', opacity: 1 },
//           { transform: `translateY(${moveDist}px)`, opacity: 0 }
//         ], {
//           duration: duration,
//           delay: idx * delayStep,
//           easing: 'ease-in-out',
//           fill: 'forwards'
//         });
//       });
//     }

//     function reassemble() {
//       shapeOrder.slice().reverse().forEach((id, idx) => {
//         const el = document.getElementById(id);
//         if (!el) return;
//         el.animate([
//           { transform: `translateY(${moveDist}px)`, opacity: 0 },
//           { transform: 'translateY(0px)', opacity: 1 }
//         ], {
//           duration: duration,
//           delay: idx * delayStep,
//           easing: 'ease-in-out',
//           fill: 'forwards'
//         });
//       });
//     }

//     function cycle() {
//       printline("Animation cycle: disassemble → reassemble");
//       disassemble();
//       setTimeout(() => {
//         reassemble();
//       }, shapeOrder.length * delayStep + duration);
//     }

//     cycle();
//     animationInterval = setInterval(cycle, (shapeOrder.length * delayStep + duration) * 2);
//   }

//   function stopAnimation() {
//     if (animationInterval) {
//       clearInterval(animationInterval);
//       animationInterval = null;
//       printline("Animation interval cleared.");
//     }
//   }

//   // Remove overlay, stop animation, re‐enable scroll
//   function removeOverlay() {
//     if (!overlay) {
//       printline("Overlay does not exist; nothing to remove.");
//       return;
//     }
//     printline("Removing overlay and stopping animation.");
//     stopAnimation();
//     overlay.removeEventListener('wheel', preventTouch);
//     overlay.removeEventListener('touchmove', preventTouch);
//     document.body.removeChild(overlay);
//     overlay = null;
//     enableScroll();
//   }

//   // ---------------------------------
//   // Expose global functions to window
//   // ---------------------------------
//   window.loadingStart = function() {
//     printline("loadingStart() called.");
//     createOverlay(false, "");
//   };
//   window.loadingStop = function() {
//     printline("loadingStop() called.");
//     removeOverlay();
//   };
//   window.loadingWait = function(message) {
//     printline("loadingWait() called with message:\n" + message);
//     createOverlay(true, message);
//   };
//   window.loadingWaitStop = function() {
//     printline("loadingWaitStop() called.");
//     removeOverlay();
//   };
// })();


// script.js
// (function() {
//   // -------------------------------
//   // Debug helper (prints to console)
//   // -------------------------------
//   function printline(msg) {
//     // console.log("[Loader Debug] " + msg);
//   }

//   // -------------------------------
//   // Tweakable scale factor (default = 1.0)
//   // -------------------------------
//   const loaderScale = 0.5; // change this to resize the entire loader box

//   // -----------------------------------
//   // The order of your shapes (top→bottom)
//   // -----------------------------------
//   const shapeOrder = [
//     "shape_8", "shape_9", "shape_10", "shape_11", "shape_12", // top wedges
//     "shape_7", "shape_6", "shape_5",                           // green arcs
//     "shape_4", "shape_3", "shape_2", "shape_1"                  // letters
//   ];

//   let overlay = null;
//   let animationInterval = null;

//   // Prevent background scroll/touch
//   function disableScroll() {
//     document.documentElement.style.overflow = 'hidden';
//     document.body.style.overflow = 'hidden';
//   }
//   function enableScroll() {
//     document.documentElement.style.overflow = '';
//     document.body.style.overflow = '';
//   }
//   function preventTouch(e) {
//     e.preventDefault();
//   }

//   // ----------------------------------------------------
//   // Create a full‐screen overlay, fetch & insert the SVG
//   // ----------------------------------------------------
//   function createOverlay(withText, message) {
//     if (overlay) {
//       printline("Overlay already exists; skipping creation.");
//       return;
//     }
//     printline("Creating overlay...");

//     // 1) Create overlay container
//     overlay = document.createElement('div');
//     Object.assign(overlay.style, {
//       position: 'fixed',
//       top: '0',
//       left: '0',
//       width: '100vw',
//       height: '100vh',
//       background: 'rgba(0,0,0,0.2)',
//       display: 'flex',
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: '9999'
//     });
//     overlay.addEventListener('wheel', preventTouch, { passive: false });
//     overlay.addEventListener('touchmove', preventTouch, { passive: false });
//     document.body.appendChild(overlay);
//     disableScroll();

//     // 2) Create inner box (rounded, light background)
//     const box = document.createElement('div');
//     Object.assign(box.style, {
//       background: '#DCD9D7',
//       borderRadius: '20px',
//       padding: '20px',
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       boxShadow: '0 0 20px rgba(0,0,0,0.1)',
//       transformOrigin: 'center',
//       transform: `scale(${loaderScale})`
//     });
//     overlay.appendChild(box);

//     // 3) Fetch the SVG file and insert it
//     printline("Fetching SVG from logo/logo.svg …");
//     fetch('logo/logo.svg')
//       .then(response => {
//         if (!response.ok) throw new Error("SVG fetch failed with status " + response.status);
//         return response.text();
//       })
//       .then(svgText => {
//         printline("SVG fetched successfully.");

//         // Parse the SVG string into DOM nodes
//         const wrapper = document.createElement('div');
//         wrapper.innerHTML = svgText.trim();
//         const svgElement = wrapper.querySelector('svg');

//         if (!svgElement) {
//           printline("ERROR: <svg> not found in fetched text.");
//           return;
//         }

//         // Add a viewBox so the entire 1080×959 canvas scales down
//         svgElement.setAttribute('viewBox', '0 0 1080 959');
//         // Then set a small display size (200×200)
//         svgElement.setAttribute('width', '200');
//         svgElement.setAttribute('height', '200');
//         // Ensure CSS transform origin is center (for smooth animations)
//         svgElement.style.transformOrigin = '50% 50%';

//         box.appendChild(wrapper);

//         // Validate that all shape IDs are present
//         let allFound = true;
//         shapeOrder.forEach(id => {
//           const el = document.getElementById(id);
//           if (!el) {
//             printline(`WARNING: Element with ID "${id}" not found.`);
//             allFound = false;
//           }
//         });
//         if (allFound) {
//           printline("All shape IDs detected—starting animation.");
//         } else {
//           printline("Some shape IDs are missing; animation may be incomplete.");
//         }

//         // Start the disassemble/reassemble loop
//         startAnimation();
//       })
//       .catch(err => {
//         printline("ERROR loading SVG: " + err);
//       });

//     // 4) If withText = true, add a message panel below the SVG
//     if (withText) {
//       const msgDiv = document.createElement('div');
//       Object.assign(msgDiv.style, {
//         background: '#BFBAB6',
//         color: '#3C3835',
//         marginTop: '10px',
//         padding: '10px',
//         borderRadius: '10px',
//         fontSize: '14px',
//         textAlign: 'center',
//         whiteSpace: 'pre-wrap',
//         maxWidth: '240px'
//       });
//       msgDiv.textContent = message;
//       box.appendChild(msgDiv);
//     }
//   }

//   // --------------------------------------------------------
//   // Animate: disassemble (top→bottom) then reassemble (reverse)
//   // --------------------------------------------------------
//   function startAnimation() {
//     const duration = 500;    // each shape’s animation duration (ms)
//     const delayStep = 100;   // delay between shapes (ms)
//     const moveDist = 50;     // pixels downward/upward

//     function disassemble() {
//       shapeOrder.forEach((id, idx) => {
//         const el = document.getElementById(id);
//         if (!el) return;
//         el.animate([
//           { transform: 'translateY(0px)', opacity: 1 },
//           { transform: `translateY(${moveDist}px)`, opacity: 0 }
//         ], {
//           duration: duration,
//           delay: idx * delayStep,
//           easing: 'ease-in-out',
//           fill: 'forwards'
//         });
//       });
//     }

//     function reassemble() {
//       shapeOrder.slice().reverse().forEach((id, idx) => {
//         const el = document.getElementById(id);
//         if (!el) return;
//         el.animate([
//           { transform: `translateY(${moveDist}px)`, opacity: 0 },
//           { transform: 'translateY(0px)', opacity: 1 }
//         ], {
//           duration: duration,
//           delay: idx * delayStep,
//           easing: 'ease-in-out',
//           fill: 'forwards'
//         });
//       });
//     }

//     function cycle() {
//       printline("Animation cycle: disassemble → reassemble");
//       disassemble();
//       setTimeout(() => {
//         reassemble();
//       }, shapeOrder.length * delayStep + duration);
//     }

//     cycle();
//     animationInterval = setInterval(cycle, (shapeOrder.length * delayStep + duration) * 2);
//   }

//   function stopAnimation() {
//     if (animationInterval) {
//       clearInterval(animationInterval);
//       animationInterval = null;
//       printline("Animation interval cleared.");
//     }
//   }

//   // Remove overlay, stop animation, re‐enable scroll
//   function removeOverlay() {
//     if (!overlay) {
//       printline("Overlay does not exist; nothing to remove.");
//       return;
//     }
//     printline("Removing overlay and stopping animation.");
//     stopAnimation();
//     overlay.removeEventListener('wheel', preventTouch);
//     overlay.removeEventListener('touchmove', preventTouch);
//     document.body.removeChild(overlay);
//     overlay = null;
//     enableScroll();
//   }

//   // ---------------------------------
//   // Expose global functions to window
//   // ---------------------------------
//   window.loadingStart = function() {
//     printline("loadingStart() called.");
//     createOverlay(false, "");
//   };
//   window.loadingStop = function() {
//     printline("loadingStop() called.");
//     removeOverlay();
//   };
//   window.loadingWait = function(message) {
//     printline("loadingWait() called with message:\n" + message);
//     createOverlay(true, message);
//   };
//   window.loadingWaitStop = function() {
//     printline("loadingWaitStop() called.");
//     removeOverlay();
//   };
// })();

// script.js

