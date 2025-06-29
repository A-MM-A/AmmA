// frontend/admin.js


// 2) Grab DOM elements
const loginSection = document.getElementById("loginDiv");
const adminActions = document.getElementById("AdminPanelDiv");

const loginMsg = document.getElementById("login-msg");

let currentSession = null;

// 3) Check if already logged in
(async () => {
    const {
        data: { session },
    } = await supa.auth.getSession();
    if (session) {
        currentSession = session;
        showAdminActions();
    }
})();


//  Handle admin login
const loginBtn = document.getElementById("admin-login-btn");
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("admin-email").value.trim();
        const password = document.getElementById("admin-password").value.trim();
        if (!email || !password) {
            loginMsg.textContent = "Email & password required.";
            return;
        }
        loginMsg.textContent = "Logging in…";

        const { data, error } = await supa.auth.signInWithPassword({
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
}

// Show buttons once fully authenticated
function showAdminActions() {
    loginSection.style.display = "none";
    adminActions.style.display = "block";
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 helper functions
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

// Utility: create the base overlay + popup box
function createPopup(titleText, onBack) {
    // overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    // box
    const box = document.createElement('div');
    box.className = 'popup-box';

    // back button
    const back = document.createElement('button');
    back.className = 'popup-back-btn';
    back.innerHTML = '<img src="icons/back.svg" alt="Back">';

    // close popup function
    function closePopup() {
        document.body.removeChild(overlay);
        if (typeof onBack === 'function') onBack();
    }

    back.onclick = closePopup;

    // close when clicking outside the box
    // overlay.addEventListener('click', (e) => {
    //     if (e.target === overlay) {
    //         closePopup();
    //     }
    // });


    // title
    const title = document.createElement('h2');
    title.textContent = titleText;

    // content container
    const content = document.createElement('div');
    content.className = 'popup-content';

    box.append(back, title, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    return { overlay, box, title, content };
}

// compress image
/**
 * Compress an image by resizing it to at most maxDim × maxDim
 * and then re-encoding at given quality.
 *
 * @param {File} file           original image file
 * @param {number} maxDim       max width or height in px (e.g. 1080)
 * @param {number} quality      JPEG quality between 0 and 1 (e.g. 0.2)
 * @returns {Promise<File>}     compressed File
 */
function compressImage(file, maxDim = 1080, quality = 0.2) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                // compute new size
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = width > height ? maxDim / width : maxDim / height;
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // draw onto canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // toBlob at desired quality
                canvas.toBlob(blob => {
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.\w+$/, '.jpg'), // ensure .jpg extension
                        { type: 'image/jpeg' }
                    );
                    resolve(compressed);
                }, 'image/jpeg', quality);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// compress video
/**
 * Compress an arbitrary video File by re-recording it at low resolution & bitrate.
 * @param {File} file         The original video file
 * @param {number} width      Target width in px (e.g. 640)
 * @param {number} fps        Frames per second to record (e.g. 15)
 * @param {number} bitrate    Video bits per second (e.g. 250_000 for 250kbps)
 * @returns {Promise<File>}   A new, smaller WebM File
 */
async function compressVideo(file, width = 640, fps = 15, bitrate = 250_000) {
    // 1) Create video element to play the original
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    await video.play().catch(() => { }); // some browsers need this to be user-initiated

    // 2) Compute height to keep aspect ratio
    const aspect = video.videoHeight / video.videoWidth;
    const height = Math.round(width * aspect);

    // 3) Set up an off-screen canvas and draw at reduced resolution
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 4) Capture the canvas stream
    const stream = canvas.captureStream(fps);

    // 5) Set up MediaRecorder on that stream
    const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp8',
        videoBitsPerSecond: bitrate
    });

    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);

    // 6) Start recording, and paint frames on each requestAnimationFrame
    recorder.start();
    let painting = true;
    (function drawFrame() {
        if (!painting) return;
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
    })();

    // 7) Stop when the source video ends (or you decide)
    await new Promise(resolve => {
        video.onended = resolve;
        // or setTimeout(resolve, someDuration) to limit length
    });
    painting = false;
    recorder.stop();

    // 8) Wait for recorder to finish
    await new Promise(resolve => recorder.onstop = resolve);
    video.pause();
    URL.revokeObjectURL(url);

    // 9) Build a new File from the recorded chunks
    const blob = new Blob(chunks, { type: 'video/webm' });
    return new File([blob], file.name.replace(/\.\w+$/, '.webm'), { type: blob.type });
}



// show message
function showMessage(msg) {
    const messageBox = document.createElement('div');
    messageBox.innerHTML = `
    <span style="
    color:rgb(197, 33, 33);
    margin-bottom: 10px;
    ">------ERROR------</span>
    <br>${msg}`;

    messageBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 10px;
        color: rgb(41, 41, 41);
        font-size: 17px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 9999;
    `;

    document.body.appendChild(messageBox);

    setTimeout(() => {
        document.body.removeChild(messageBox);
    }, 3000);
}




// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 ITEMS
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showItemConfigPopup() {
    const { overlay, title, content } = createPopup('Item Configuration');

    // sub‑pills
    const actions = [
        { label: 'Add Version', fn: showAddVersionPopup },
        { label: 'Edit Version', fn: showEditVersionPopup },
        { label: 'Add Item', fn: showAddItemPopup },
        { label: 'Edit Item', fn: showEditItemPopup },
        { label: 'Bulk Import', fn: showBulkImportPopup },
        { label: 'Add Image', fn: showAddImagePopup },
        { label: 'Delete', fn: showDeletePopup },
    ];

    actions.forEach(({ label, fn }) => {
        const btn = document.createElement('button');
        btn.className = 'popup-subpill';
        btn.textContent = label;
        btn.onclick = () => {
            document.body.removeChild(overlay);
            fn();
        };
        content.appendChild(btn);
    });
}


// -----1----- Add Version popup
function showAddVersionPopup() {
    const { overlay, title, content } = createPopup('Add Version', showItemConfigPopup);

    const confirmBtn = document.createElement('button');


    // ROW 1: Media boxes + inputs below with external labels
    const row1 = document.createElement('div');
    row1.style = `
    display: flex;
    flex-direction : column;
    gap : 12px;
    margin-bottom : 16px;
    `;

    // Subrow 1: Image and Video squares
    const subrow1 = document.createElement('div');
    subrow1.style.display = 'flex';
    subrow1.style.gap = '8px';

    const selectedFiles = {
        Image: null,
        Video: null
    };

    ['Image', 'Video'].forEach(type => {
        const box = document.createElement('div');
        const label = document.createElement('div');
        label.textContent = type.toUpperCase();
        label.style = `
          position: absolute;
          color: #666;
          font-size: 20px;
        `;
        box.appendChild(label);

        box.style = `
          position: relative;
          flex: 1;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9f9f9;
          border: 1px solid #ccc;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
        `;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'Image' ? 'image/*' : 'video/*';
        input.capture = 'environment';
        input.style = 'opacity:0;position:absolute;top:0;left:0;width:100%;height:100%;cursor:pointer;';


        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const finalFile = file;

            const reader = new FileReader();
            reader.onload = () => {
                if (label) label.remove();

                box.style = `
                 position: relative;
                 flex: 1;
                 aspect-ratio: 1 / 1;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 border-radius: 12px;
                 overflow: hidden;
                 cursor: pointer;
                 background: rgba(0, 0, 0, 0);
                `;
                const existingMedia = box.querySelector('img, video');
                if (existingMedia) existingMedia.remove();

                let media;
                if (type === 'Image') {
                    media = document.createElement('img');
                } else {
                    media = document.createElement('video');
                    media.autoplay = true;
                    media.loop = true;
                    media.muted = true;
                    media.playsInline = true;
                }

                media.src = reader.result;
                media.style.width = '100%';
                media.style.height = '100%';
                media.style.objectFit = 'contain';

                box.appendChild(media);
                box._file = finalFile;
                selectedFiles[type] = finalFile;

                // For testing
                console.log('Final file:', finalFile);
            };

            reader.readAsDataURL(finalFile);
        };





        box.appendChild(input);
        subrow1.appendChild(box);
    });
    row1.appendChild(subrow1);

    // Subrow 2: File Name + Image Key, with external labels and no overflow
    const subrow2 = document.createElement('div');
    subrow2.style.display = 'flex';
    subrow2.style.flexWrap = 'wrap';
    subrow2.style.gap = '8px';
    subrow2.style.width = '100%';

    // File Name container
    const fileNameContainer = document.createElement('div');
    fileNameContainer.style.flex = '1';
    fileNameContainer.style.minWidth = '0';
    const fileNameLabel = document.createElement('label');
    fileNameLabel.textContent = 'File Name';
    fileNameLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const fileNameInput = document.createElement('input');
    fileNameInput.placeholder = 'E.g   FMA00101';
    fileNameInput.maxLength = 8;
    fileNameInput.classList.add("rounded-input");
    fileNameInput.style = `
      text-transform: uppercase;
    `;

    fileNameInput.addEventListener('input', () => {
        fileNameInput.value = fileNameInput.value.toUpperCase();
    });
    fileNameInput.addEventListener('input', () => {
        if (fileNameInput.value.length > 8) {
            fileNameInput.value = fileNameInput.value.slice(0, 8);
        }
    });
    fileNameInput.addEventListener('input', () => {
        if (fileNameInput.value.trim() !== '') {
            fileNameInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            fileNameInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });


    fileNameContainer.appendChild(fileNameLabel);
    fileNameContainer.appendChild(fileNameInput);

    // Image Key container
    const keyContainer = document.createElement('div');
    keyContainer.style.flex = '1';
    keyContainer.style.minWidth = '0';
    const keyLabel = document.createElement('label');
    keyLabel.textContent = 'Image Key';
    keyLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const keyInput = document.createElement('input');
    keyInput.type = 'number';
    keyInput.placeholder = 'E.g   1 = .jpg';
    keyInput.value = '1';
    keyInput.maxLength = 1;
    keyInput.classList.add("rounded-input");
    keyInput.style = `
  background-color: rgba(193, 239, 183, 0.43);
`;

    keyInput.addEventListener('input', () => {
        if (keyInput.value.length > 1) {
            keyInput.value = keyInput.value.slice(0, 1);
        }
    });
    keyInput.addEventListener('input', () => {
        if (keyInput.value.trim() !== '') {
            keyInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            keyInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    keyContainer.appendChild(keyLabel);
    keyContainer.appendChild(keyInput);

    // Append both containers
    subrow2.appendChild(fileNameContainer);
    subrow2.appendChild(keyContainer);
    row1.appendChild(subrow2);

    // Add the row to popup content
    content.appendChild(row1);



    // ROW 2: Item Id (input + select) with external labels and width ratio 1:2
    const row2 = document.createElement('div');
    row2.style.display = 'flex';
    row2.style.gap = '8px';
    row2.style.width = '100%';
    row2.style.marginBottom = '12px';

    // Input container (1 part)
    const itemIdContainer = document.createElement('div');
    itemIdContainer.style.flex = '1';
    itemIdContainer.style.minWidth = '0';

    const itemIdLabel = document.createElement('label');
    itemIdLabel.textContent = 'Item Id';
    itemIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const itemIdInput = document.createElement('input');
    itemIdInput.type = 'number';
    itemIdInput.placeholder = 'E.g  1';
    itemIdInput.maxLength = 6;
    itemIdInput.classList.add("rounded-input");


    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.length > 6) {
            itemIdInput.value = itemIdInput.value.slice(0, 6);
        }
    });

    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.trim() !== '') {
            itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    itemIdContainer.appendChild(itemIdLabel);
    itemIdContainer.appendChild(itemIdInput);

    // Selector container (2 parts)
    const itemSelectContainer = document.createElement('div');
    itemSelectContainer.style.flex = '3';
    itemSelectContainer.style.minWidth = '0';

    const itemSelectLabel = document.createElement('label');
    itemSelectLabel.textContent = 'Item Selector';
    itemSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const itemSelect = document.createElement('select');
    itemSelect.classList.add("rounded-input");

    itemSelect.addEventListener('change', () => {
        if (itemSelect.value !== '') {
            itemSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            itemSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    itemSelectContainer.appendChild(itemSelectLabel);
    itemSelectContainer.appendChild(itemSelect);




    // Fetching Options from DB

    let itemMap = {};       // id → serial
    let serialToId = {};    // serial → id
    let options;
    let fetched = false;
    let Item_base_serial = "";

    async function loadBaseItems() {
        // visuals when fetching items
        itemSelect.disabled = true;
        itemIdInput.disabled = true;
        itemSelect.innerHTML = '<option>Loading items…</option>';

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/base-items`
            );
            const json = await resp.json();
            if (resp.ok) {
                fetched = true;

                // fill maps
                itemMap = {};
                serialToId = {};
                json.items.forEach(({ id, base_serial, description }) => {
                    const label = `${base_serial} : ${description}`;      // ← new
                    itemMap[String(id)] = label;                       // store combined label
                    serialToId[label] = String(id);                    // reverse lookup if needed
                });
                // console.log(itemMap);


                // build <option> list
                options = `
                <option value="" selected>Select Item…</option>
                    ${Object.entries(itemMap)
                        .map(([id, label]) => `<option value="${id}">${label}</option>`)
                        .join('')}
                    `;

                itemSelect.innerHTML = options;

                // visuals when items fetched
                itemSelect.disabled = false;
                itemIdInput.disabled = false;
                loadUsedVersions();


            } else {
                console.error('Failed to load Items:', json.error);
                throw new Error(json.error);
            }


        } catch (err) {
            console.error('Failed to load items:', err);
            itemSelect.innerHTML = `<option value="">Error loading items</option>`;
        }
    }

    // call on init
    loadBaseItems();

    // 3) two-way binding logic

    // when user types an ID
    itemIdInput.addEventListener('input', () => {
        loadUsedVersions();
        const id = itemIdInput.value.trim();
        if (id) {
            // disable select
            itemSelect.disabled = true;
            itemSelect.style.opacity = '0.8';
            itemSelect.style.backgroundColor = '';

            // show matching serial (or fallback)
            const serial = itemMap[id] || 'No Item Found';
            itemSelect.innerHTML = `<option value="">${serial}</option>`;
            Item_base_serial = serial;  // this gets the base-serial to be used for file name
        } else {
            // reset select
            itemSelect.disabled = false;
            itemSelect.style.opacity = '1';
            itemSelect.innerHTML = options;  // repopulate full list
        }
    });

    // when user picks from the selector
    itemSelect.addEventListener('change', () => {
        const selId = itemSelect.value;       // this is the <option value="id">
        if (selId) {
            // disable input
            itemIdInput.readOnly = true;
            itemIdInput.style.opacity = '0.5';
            itemIdInput.style.backgroundColor = '';

            // set input to the corresponding ID
            itemIdInput.value = selId;
            Item_base_serial = itemMap[selId];  // this gets the base-serial to be used for file name
        } else {
            // reset input
            itemIdInput.readOnly = false;
            itemIdInput.style.opacity = '1';
            itemIdInput.value = '';
        }
        loadUsedVersions();
    });


    // Prefill itemIdInput if stored
    const savedItemId = localStorage.getItem('lastItemId');
    async function initItemField() {
        // 1a) First, load the items from the server
        await loadBaseItems();

        // 1b) Now that itemMap & the selector are ready, prefill from localStorage
        if (savedItemId && fetched) {
            // set the input
            itemIdInput.value = savedItemId;
            itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

            // dispatch the 'input' event so your listener locks & updates the selector
            itemIdInput.dispatchEvent(new Event('input'));

        }
    }

    initItemField();

    function isItemSelectionValid() {
        const id = itemIdInput.value.trim();
        const sel = itemSelect.value;

        // If they typed an ID, it must be one of the fetched keys
        if (id !== '') {
            return Object.prototype.hasOwnProperty.call(itemMap, id);
        }
        // If they used the dropdown, it must be a non-placeholder value
        if (sel !== '') {
            return true;
        }
        return false;
    }




    // Append containers to row

    row2.appendChild(itemIdContainer);
    row2.appendChild(itemSelectContainer);
    content.appendChild(row2);





    // ROW 3: Unique Item ID input + availability indicator
    let usedVersionId = [];   // array containing all versions for the 

    // fetching versions
    async function loadUsedVersions() {
        // console.log("called");

        // visuals when fetching loading values
        uniqueIdLabel.innerHTML = `<p> Unique Version ID : <span style="color : rgb(114, 236, 136);">Loading...</span></p>`;
        statusIndicator.style.backgroundColor = 'blue';
        uniqueIdInput.disabled = true;

        if (!isItemSelectionValid()) {
            uniqueIdInput.style.backgroundColor = '';
            uniqueIdInput.value = '';
            statusIndicator.style.backgroundColor = 'gray';
            return;
        }


        const baseId = Number(itemIdInput.value);
        if (!baseId) return;

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/versions/base/${baseId}`
            );
            const json = await resp.json();
            if (resp.ok) {
                usedVersionId = json.versions;         // e.g. [1,2,3]
                // console.log('Used version IDs:', usedVersionId);


                // assigning the next value
                let nextId = 1;
                while (usedVersionId.includes(nextId)) {
                    nextId++;
                }
                uniqueIdInput.value = nextId;

                // reset unique id input and indicator
                uniqueIdInput.dispatchEvent(new Event('input'));

                // visuals when loading values are fetched
                uniqueIdLabel.textContent = 'Unique Version ID';
                uniqueIdInput.disabled = false;
            } else {
                console.error('Failed to load versions:', json.error);
                uniqueIdLabel.innerHTML = `<p> Unique Version ID : <span style="color : rgb(218, 137, 31);">Failed ...</span></p>`;
            }
        } catch (err) {
            console.error('Error loading versions:', err);
        }
    }


    // actual row 3 ui
    const row3 = document.createElement('div');
    row3.style.display = 'flex';
    row3.style.gap = '8px';
    row3.style.width = '100%';
    row3.style.marginBottom = '12px';

    // Input container (70%)
    const uniqueIdContainer = document.createElement('div');
    uniqueIdContainer.style.flex = '7';
    uniqueIdContainer.style.minWidth = '0';

    const uniqueIdLabel = document.createElement('label');
    uniqueIdLabel.textContent = 'Unique Version ID';
    uniqueIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const uniqueIdInput = document.createElement('input');
    uniqueIdInput.type = 'number';
    uniqueIdInput.placeholder = 'E.g   01';
    uniqueIdInput.min = 0;
    uniqueIdInput.max = 99;
    uniqueIdInput.maxLength = 2;

    uniqueIdInput.classList.add("rounded-input");

    uniqueIdInput.addEventListener('input', () => {
        if (uniqueIdInput.value.length > 2) {
            uniqueIdInput.value = uniqueIdInput.value.slice(0, 2);
        }
    });

    // filling up file name automatically
    uniqueIdInput.addEventListener('input', () => {
        const filename = `${Item_base_serial.substring(0, 6)}${uniqueIdInput.value.padStart(2, '0')}`;
        // console.log(filename);
        fileNameInput.value = filename;
        fileNameInput.dispatchEvent(new Event('input'));
    });



    uniqueIdInput.addEventListener('input', () => {
        if (uniqueIdInput.value.trim() !== '') {
            uniqueIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            uniqueIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });
    // Prefill if stored
    const savedUniqueId = localStorage.getItem('lastUniqueId');
    if (savedUniqueId) {
        uniqueIdInput.placeholder = `E.g   ${savedUniqueId}`;
    }

    uniqueIdContainer.appendChild(uniqueIdLabel);
    uniqueIdContainer.appendChild(uniqueIdInput);

    // Indicator container (30%)
    const statusContainer = document.createElement('div');
    statusContainer.style.flex = '3';
    statusContainer.style.display = 'flex';
    statusContainer.style.alignItems = 'flex-end'; // align with input
    statusContainer.style.justifyContent = 'center';

    const statusIndicator = document.createElement('div');
    statusIndicator.style = `
      width: 20px;
      height: 20px;
      margin: 9px;
      border-radius: 50%;
      background-color: gray; /* will be updated based on availability */
      border: 2px solid #fff;
    `;


    uniqueIdInput.addEventListener('input', () => {
        const inputValue = Number(uniqueIdInput.value);

        if (uniqueIdInput.value === "") {
            statusIndicator.style.backgroundColor = 'gray';
        } else if (usedVersionId.includes(inputValue) || inputValue === savedUniqueId) {
            statusIndicator.style.backgroundColor = 'rgb(255, 0, 0)'; // red for used ID
        } else {
            statusIndicator.style.backgroundColor = 'rgb(0, 255, 0)'; // green for available ID
        }
    });

    function isVersionValid() {
        const v = Number(uniqueIdInput.value);

        // must be non-empty, numeric, and not in usedVersionId
        return uniqueIdInput.value.trim() !== '' && !usedVersionId.includes(v);
    }

    // incase the base item id has not been fetched
    if (!fetched) {
        uniqueIdInput.disabled = true;
    }

    statusContainer.appendChild(statusIndicator);

    // Append to Row 3
    row3.appendChild(uniqueIdContainer);
    row3.appendChild(statusContainer);
    content.appendChild(row3);




    // ROW 4: Item Title
    const row4 = document.createElement('div');
    row4.style.width = '100%';
    row4.style.marginBottom = '12px';

    // Label
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Item Title';
    titleLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const titleInput = document.createElement('input');
    titleInput.placeholder = 'E.g   Men Shoes';
    titleInput.classList.add("rounded-input");

    titleInput.addEventListener('input', () => {
        if (titleInput.value.trim() !== '') {
            titleInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            titleInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });
    // Prefill if stored
    const savedTitle = localStorage.getItem('lastTitle');
    if (savedTitle) {
        titleInput.placeholder = `E.g   ${savedTitle}`;
    }

    // Append to row
    row4.appendChild(titleLabel);
    row4.appendChild(titleInput);
    content.appendChild(row4);





    // ROW 5: Price
    const row5 = document.createElement('div');
    row5.style.width = '100%';
    row5.style.marginBottom = '12px';

    // Label
    const priceLabel = document.createElement('label');
    priceLabel.textContent = 'Price';
    priceLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const priceInput = document.createElement('input');
    priceInput.placeholder = 'E.g   1500';
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.classList.add("rounded-input");


    priceInput.addEventListener('input', () => {
        if (priceInput.value.trim() !== '') {
            priceInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            priceInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });
    // Prefill if stored
    const savedPrice = localStorage.getItem('lastPrice');
    if (savedPrice) {
        priceInput.placeholder = `E.g   ${savedPrice}`;
    }

    // Append to row
    row5.appendChild(priceLabel);
    row5.appendChild(priceInput);
    content.appendChild(row5);





    // ROW 6: Size input (comma-separated => array)
    const row6 = document.createElement('div');
    row6.style.width = '100%';
    row6.style.marginBottom = '12px';

    // Label
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Size';
    sizeLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const sizeInput = document.createElement('input');
    sizeInput.placeholder = 'E.g   Small, Medium, Large';
    sizeInput.classList.add("rounded-input");

    sizeInput.addEventListener('input', () => {
        if (sizeInput.value.trim() !== '') {
            sizeInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            sizeInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // Prefill if stored
    const savedSize = localStorage.getItem('lastSize');
    if (savedSize) {
        sizeInput.value = savedSize;
        sizeInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            sizeInput.dispatchEvent(new Event('input'));
        });
    }

    // On input: convert comma-separated string to array and log
    sizeInput.addEventListener('input', () => {
        const raw = sizeInput.value;
        const array = raw
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        // console.log('Size Array:', array);
    });

    // Append to row
    row6.appendChild(sizeLabel);
    row6.appendChild(sizeInput);
    content.appendChild(row6);




    // ROW 7: Material and Weight (side-by-side)
    const row7 = document.createElement('div');
    row7.style.display = 'flex';
    row7.style.gap = '8px';
    row7.style.width = '100%';
    row7.style.marginBottom = '12px';

    // Material container
    const materialContainer = document.createElement('div');
    materialContainer.style.flex = '1';
    const materialLabel = document.createElement('label');
    materialLabel.textContent = 'Material';
    materialLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const materialInput = document.createElement('input');
    materialInput.placeholder = 'E.g   Cotton';
    materialInput.classList.add("rounded-input");

    materialInput.addEventListener('input', () => {
        if (materialInput.value.trim() !== '') {
            materialInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            materialInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // Prefill if stored
    const savedMaterial = localStorage.getItem('lastMaterial');
    if (savedMaterial) {
        materialInput.value = savedMaterial;
        materialInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            materialInput.dispatchEvent(new Event('input'));
        });
    }

    materialContainer.appendChild(materialLabel);
    materialContainer.appendChild(materialInput);

    // Weight container
    const weightContainer = document.createElement('div');
    weightContainer.style.flex = '1';
    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Weight';
    weightLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const weightInput = document.createElement('input');
    weightInput.placeholder = 'E.g   1.2kg';
    weightInput.classList.add("rounded-input");

    weightInput.addEventListener('input', () => {
        if (weightInput.value.trim() !== '') {
            weightInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            weightInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });
    // Prefill if stored
    const savedWeight = localStorage.getItem('lastWeight');
    if (savedWeight) {
        weightInput.value = savedWeight;
        weightInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            weightInput.dispatchEvent(new Event('input'));
        });
    }

    weightContainer.appendChild(weightLabel);
    weightContainer.appendChild(weightInput);

    // Append both to row
    row7.appendChild(materialContainer);
    row7.appendChild(weightContainer);
    content.appendChild(row7);





    // ROW 8: Profit Margin (input) + In Stock (true/false selector)
    const row8 = document.createElement('div');
    row8.style.display = 'flex';
    row8.style.gap = '8px';
    row8.style.width = '100%';
    row8.style.marginBottom = '12px';

    // Profit Margin container
    const marginContainer = document.createElement('div');
    marginContainer.style.flex = '1';
    const marginLabel = document.createElement('label');
    marginLabel.textContent = 'Profit Margin';
    marginLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const marginInput = document.createElement('input');
    marginInput.type = 'number';
    marginInput.placeholder = 'E.g   1.5';
    marginInput.value = '1.5';
    marginInput.classList.add("rounded-input");
    marginInput.style = `
  background-color: rgba(193, 239, 183, 0.43);
`;

    function rounding(value) {
        return Math.ceil(value / 10) * 10;
    }


    marginInput.addEventListener('input', () => {
        const totalPrice = rounding(marginInput.value * priceInput.value);
        if (marginInput.value.trim() !== '') {
            marginInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

            // update the live calculator after profit label
            if (priceInput.value) {
                marginLabel.textContent = `Profit Margin : ${totalPrice}`;
            } else {
                marginLabel.textContent = `Profit Margin `;
            }
        } else {
            marginInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // update the live calculator after profit label
    priceInput.addEventListener('input', () => {
        const totalPrice = rounding(marginInput.value * priceInput.value);
        if (priceInput.value) {
            marginLabel.textContent = `Profit Margin : ${totalPrice}`;
        } else {
            marginLabel.textContent = `Profit Margin `;
        }
    });

    // Prefill if stored
    const savedProfit = localStorage.getItem('lastProfit');
    if (savedProfit) {
        marginInput.value = savedProfit;
        marginInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            marginInput.dispatchEvent(new Event('input'));
        });
    }

    marginContainer.appendChild(marginLabel);
    marginContainer.appendChild(marginInput);

    // In Stock container
    const stockContainer = document.createElement('div');
    stockContainer.style.flex = '1';
    const stockLabel = document.createElement('label');
    stockLabel.textContent = 'In Stock';
    stockLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const stockSelect = document.createElement('select');
    stockSelect.classList.add("rounded-input");
    stockSelect.style = `
  background-color : rgba(193, 239, 183, 0.43);
`;
    stockSelect.innerHTML = `
  <option value="true" selected>TRUE</option>
  <option value="false">FALSE</option>
`;

    stockSelect.addEventListener('change', () => {
        if (stockSelect.value === 'false') {
            stockSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        } else {
            stockSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        }
    });

    stockContainer.appendChild(stockLabel);
    stockContainer.appendChild(stockSelect);

    // Append both to row
    row8.appendChild(marginContainer);
    row8.appendChild(stockContainer);
    content.appendChild(row8);



    // ROW 9: Seller ID input + selector (same logic as Item ID)
    const row9 = document.createElement('div');
    row9.style.display = 'flex';
    row9.style.gap = '8px';
    row9.style.width = '100%';
    row9.style.marginBottom = '12px';

    // Seller ID input container (1 part)
    const sellerIdContainer = document.createElement('div');
    sellerIdContainer.style.flex = '1';
    sellerIdContainer.style.minWidth = '0';

    const sellerIdLabel = document.createElement('label');
    sellerIdLabel.textContent = 'Seller ID';
    sellerIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const sellerIdInput = document.createElement('input');
    sellerIdInput.placeholder = 'E.g   1';
    sellerIdInput.type = 'number';
    sellerIdInput.classList.add("rounded-input");



    sellerIdInput.addEventListener('input', () => {
        if (sellerIdInput.value.trim() !== '') {
            sellerIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            sellerIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });


    sellerIdContainer.appendChild(sellerIdLabel);
    sellerIdContainer.appendChild(sellerIdInput);

    // Seller select container (2 parts)
    const sellerSelectContainer = document.createElement('div');
    sellerSelectContainer.style.flex = '2';
    sellerSelectContainer.style.minWidth = '0';

    const sellerSelectLabel = document.createElement('label');
    sellerSelectLabel.textContent = 'Seller Selector';
    sellerSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const sellerSelect = document.createElement('select');
    sellerSelect.classList.add("rounded-input");

    sellerSelect.addEventListener('change', () => {
        if (sellerSelect.value !== '') {
            sellerSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            sellerSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    sellerSelectContainer.appendChild(sellerSelectLabel);
    sellerSelectContainer.appendChild(sellerSelect);


    // populate from DB

    // --- dynamic data + maps ---
    let sellerMap = {};      // id → name
    let sellerToIdMap = {};  // name → id
    let SellersHTML;    // the <option> list


    async function loadSellers() {
        // visuals when fetching items
        sellerSelect.disabled = true;
        sellerIdInput.disabled = true;
        sellerSelect.innerHTML = '<option>Loading Sellers…</option>';

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/sellers`
            );
            const json = await resp.json();
            if (resp.ok) {
                // build maps
                sellerMap = {};
                sellerToIdMap = {};
                json.sellers.forEach(({ id, name }) => {
                    sellerMap[String(id)] = name;
                    sellerToIdMap[name] = String(id);
                });
                // console.log(itemMap);


                // build options HTML
                SellersHTML = `
                <option value="" selected>Select Seller…</option>
                    ${Object.entries(sellerMap)
                        .map(([id, name]) => `<option value="${id}">${name}</option>`)
                        .join('')}
                    `;

                sellerSelect.innerHTML = SellersHTML;

                // visuals when fetching items
                sellerSelect.disabled = false;
                sellerIdInput.disabled = false;



            } else {
                console.error('Failed to load Sellers:', json.error);
                throw new Error(json.error);
            }


        } catch (err) {
            console.error('Error loading sellers:', err);
            sellerSelect.innerHTML = `<option value="">Error loading sellers</option>`;
        }
    }

    // call on init
    loadSellers();


    // --- two‐way binding logic
    // when typing an ID
    sellerIdInput.addEventListener('input', () => {
        const id = sellerIdInput.value.trim();
        if (id !== '') {
            // disable select
            sellerSelect.disabled = true;
            sellerSelect.style.opacity = '0.5';
            sellerSelect.style.backgroundColor = '';

            // show matching serial (or fallback)
            const name = sellerMap[id] || 'No Seller Found';
            sellerSelect.innerHTML = `<option value="">${name}</option>`;
        } else {
            // reset select
            sellerSelect.disabled = false;
            sellerSelect.style.opacity = '1';
            sellerSelect.innerHTML = SellersHTML;
        }
    });

    // when picking from selector
    sellerSelect.addEventListener('change', () => {
        const selId = sellerSelect.value;
        if (selId !== '') {
            // disable input
            sellerIdInput.readOnly = true;
            sellerIdInput.style.opacity = '0.5';
            sellerIdInput.style.backgroundColor = '';

            // set input to the corresponding ID
            sellerIdInput.value = selId;
        } else {
            // reset input
            sellerIdInput.readOnly = false;
            sellerIdInput.style.opacity = '1';
            sellerIdInput.value = '';
        }
    });


    // Prefill sellerId if stored
    async function initSellerField() {
        // 1a) First, load the sellers from the server
        await loadSellers();

        // 1b) Now that itemMap & the selector are ready, prefill from localStorage
        const savedSellerId = localStorage.getItem('lastSellerId');
        if (savedSellerId) {
            // set the input
            sellerIdInput.value = savedSellerId;
            sellerIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
            // dispatch the 'input' event so it locks & updates the selector
            sellerIdInput.dispatchEvent(new Event('input'));
        }
    }
    initSellerField()


    function isSellerSelectionValid() {
        const id = sellerIdInput.value.trim();
        const sel = sellerSelect.value;

        // If they typed an ID, it must be one of the fetched keys
        if (id !== '') {
            return Object.prototype.hasOwnProperty.call(sellerMap, id);
        }
        // If they used the dropdown, it must be a non-placeholder value
        if (sel !== '') {
            return true;
        }
        return false;
    }



    // Append both to row
    row9.appendChild(sellerIdContainer);
    row9.appendChild(sellerSelectContainer);
    content.appendChild(row9);



    // ROW 10: Item Attributes textarea
    const row10 = document.createElement('div');
    row10.style.width = '100%';
    row10.style.marginBottom = '12px';

    // Label
    const attrLabel = document.createElement('label');
    attrLabel.textContent = 'Item Attributes';
    attrLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Textarea
    const attrTextarea = document.createElement('textarea');
    attrTextarea.placeholder = 'Enter any important information';
    attrTextarea.style = `
  width: 100%;
  height: 80px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  overflow-y: auto;
`;

    attrTextarea.addEventListener('input', () => {
        if (attrTextarea.value.trim() !== '') {
            attrTextarea.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            attrTextarea.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // Prefill if stored
    const savedAttrs = localStorage.getItem('lastAttrs');
    if (savedAttrs) {
        attrTextarea.value = savedAttrs;
        attrTextarea.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            attrTextarea.dispatchEvent(new Event('input'));
        });
    }


    // Append to row
    row10.appendChild(attrLabel);
    row10.appendChild(attrTextarea);
    content.appendChild(row10);




    // ROW 11: Confirm button
    const row11 = document.createElement('div');

    // Button
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'popup-confirm';



    // Click logic
    confirmBtn.addEventListener('click', async () => {
        if (!keyInput.value) {
            showMessage("Empty Image Key");
            return;
        }
        if (!isItemSelectionValid()) {
            showMessage("Invalid Item Id");
            return;
        }
        if (!isVersionValid()) {
            showMessage("Invalid Version Id");
            return;
        }
        if (!titleInput.value) {
            showMessage("Empty Title");
            return;
        }
        if (!priceInput.value) {
            showMessage("Empty Price");
            return;
        }
        if (!sizeInput.value) {
            showMessage("Empty Size");
            return;
        }
        if (!materialInput.value) {
            showMessage("Empty Material");
            return;
        }
        if (!weightInput.value) {
            showMessage("Empty Weight");
            return;
        }
        if (!marginInput.value) {
            showMessage("Empty Profit Margin");
            return;
        }
        if (!isSellerSelectionValid()) {
            showMessage("Invalid Seller Id");
            return;
        }
        if (!attrTextarea.value) {
            showMessage("Empty Text Area");
            return;
        }



        loadingStart(0.5);

        const customName = fileNameInput.value.trim();

        for (const type of ['Image', 'Video']) {
            let file = selectedFiles[type];
            if (!file) {
                // console.log(`${type}: No file selected.`);
                continue;
            }

            const ext = file.name.split('.').pop();
            let renamedFile;
            if (customName) {
                renamedFile = new File([file], `${customName}.${ext}`, { type: file.type })
            } else {
                renamedFile = file;
            }
            selectedFiles[type] = renamedFile;
            file = renamedFile;

            let uploadFile;
            if (type === 'Image') {
                // front-end compression + resize
                uploadFile = await compressImage(renamedFile, 1080, 0.2);
            } else {
                // compressVideo 
                uploadFile = await compressVideo(renamedFile, 640, 15, 250_000);
            }

            // console.log(`${type}: Compressed File`, compressedFile);

            // upload to r2
            async function uploadToR2(file) {
                const formData = new FormData();
                formData.append('file', file, file.name);

                const res = await fetch(`${CONFIG.API_BASE_URL}/upload`, {
                    method: 'POST',
                    // NO Authorization header needed
                    body: formData
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Upload failed');
                }

                const { publicUrl } = await res.json();
                return publicUrl;
            }

            try {
                // ── UPLOAD TO R2 ──
                const publicUrl = await uploadToR2(uploadFile);
                console.log(`Image uploaded`);
                // console.log(`${type} uploaded to:`, publicUrl);
                // TODO: use `publicUrl` in your UI or product payload
            } catch (err) {
                console.error(`${type} upload error:`, err);
                continue;  // skip download/test for this file if upload fails
            }


            // For now, download the compressed file locally to test
            const link = document.createElement('a');
            link.href = URL.createObjectURL(uploadFile);
            link.download = uploadFile.name;
            link.click();
        }



        const payload = {
            base_item_id: itemIdInput.value,
            version_number: uniqueIdInput.value.padStart(2, '0'),
            title: titleInput.value,
            price: priceInput.value,
            image_key: keyInput.value,
            sizes: sizeInput.value.split(',').map(s => s.trim()),
            material: materialInput.value,
            weight: weightInput.value,
            other_attrs: attrTextarea.value,
            in_stock: stockSelect.options[stockSelect.selectedIndex].text,
            profit_margin: marginInput.value,
            seller_id: sellerIdInput.value,

        };
        console.log('Payload ready:', payload);

        // the posting mechanism to the table : the content will be the payload

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/products/versions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });


            const result = await response.json();

            if (!response.ok) {
                console.error("❌ Failed to add version:", result.error || result);
                alert("Failed to add item version: " + (result.error || "Unknown error"));
                return;
            }

            console.log("✅ Version added successfully:", result.data);
        } catch (err) {
            console.error("❌ Error posting version:", err);
            alert("Error sending request. Please try again.");
        }



        // store history
        localStorage.setItem('lastItemId', itemIdInput.value);
        localStorage.setItem('lastSellerId', sellerIdInput.value);
        localStorage.setItem('lastSize', sizeInput.value);
        localStorage.setItem('lastMaterial', materialInput.value);
        localStorage.setItem('lastWeight', weightInput.value);
        localStorage.setItem('lastAttrs', attrTextarea.value);
        localStorage.setItem('lastProfit', marginInput.value);
        localStorage.setItem('lastUniqueId', uniqueIdInput.value);
        localStorage.setItem('lastTitle', titleInput.value);
        localStorage.setItem('lastPrice', priceInput.value);


        loadingStop();
        overlay.remove();
        Saved();
    });

    // Append button
    row11.appendChild(confirmBtn);
    content.appendChild(row11);




}


// -----2----- Edit Version popup (step 1: ask for ID)
function showEditVersionPopup() {
    // open base popup with back => Item Configuration
    const { overlay, title, content } = createPopup('Edit Version', showItemConfigPopup);


    // 1) Input for item ID
    const itemIdContainer = document.createElement('div');
    itemIdContainer.style.flex = '1';
    const itemIdLabel = document.createElement('label');
    itemIdLabel.textContent = 'Enter Full Serial';
    itemIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const itemIdInput = document.createElement('input');
    itemIdInput.placeholder = 'E.g. FMA00101';
    itemIdInput.maxLength = 8;
    itemIdInput.classList.add("rounded-input");
    itemIdInput.style = `text-transform: uppercase; margin-bottom: 5%;`;

    itemIdInput.addEventListener('input', () => {
        itemIdInput.value = itemIdInput.value.toUpperCase();
    });

    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.length > 8) {
            itemIdInput.value = itemIdInput.value.slice(0, 8);
        }
    });
    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.trim() !== '') {
            itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    const errorMsgP = document.createElement('label');
    errorMsgP.innerHTML = `
        <br> 
        <li> Fields Can not be empty </li>
        <li> A Full Serial Contains 8 Characters </li>
        <br>
    `;
    errorMsgP.style = `
    display: none;
    font-size: 17px; 
    margin-bottom: 4px; 
    color: rgb(167, 9, 9);
    `;


    itemIdContainer.appendChild(itemIdLabel);
    itemIdContainer.appendChild(itemIdInput);
    itemIdContainer.appendChild(errorMsgP);
    content.appendChild(itemIdContainer);

    // 2) Edit button
    const editBtn = document.createElement('button');
    editBtn.type = 'submit';
    editBtn.textContent = 'Edit';
    editBtn.className = 'popup-confirm';
    content.appendChild(editBtn);


    itemIdInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            editBtn.click();
        }
    });


    // 3) On click, build dummy payload and open second popup
    editBtn.onclick = async () => {
        loadingStart(0.5);

        const serial = itemIdInput.value.trim();

        if (serial !== "" && itemIdInput.value.length >= 8) {

            // fetching functionallity
            try {
                const resp = await fetch(
                    `${CONFIG.API_BASE_URL}/products/versions/serial/${serial}`
                );
                const json = await resp.json();

                if (!resp.ok) {
                    loadingStop();
                    console.error('Not found:', json.error);
                    showMessage("Version Not found");
                    return;
                }

                const version = json.version;
                const payload = {
                    full_serial: version.full_serial,
                    title: version.title,
                    price: version.price,
                    sizes: version.sizes,
                    material: version.material,
                    weight: version.weight,
                    other_attrs: version.other_attrs,
                    in_stock: version.in_stock,
                    profit_margin: version.profit_margin,
                    seller_id: version.seller_id,
                    available: version.available
                };

                loadingStop();
                document.body.removeChild(overlay);
                showEditVersion2Popup(payload);

            } catch (err) {
                loadingStop();
                showMessage("Error fetching version");
                console.error('Fetch error:', err);
            }

        } else {
            errorMsgP.style.display = 'block';
            loadingStop();
            return;
        }

    };
}

// -----2.1---- Edit Version popup (step 2: show fields)
function showEditVersion2Popup(payload) {
    // open popup with back => ID prompt popup
    const { overlay, title, content } = createPopup('Edit Version', showItemConfigPopup);

    // 1) Destructure payload into variables
    const {
        full_serial: payloadSerial,
        title: payloadTitle,
        price: payloadPrice,
        sizes: payloadSizes,
        material: payloadMaterial,
        weight: payloadWeight,
        other_attrs: payloadOther,
        in_stock: payloadStock,
        profit_margin: payloadProfit,
        seller_id: payloadSeller,
        available: payloadAvailable
    } = payload;

    // console.log("Payload Values Received\n", {
    //     Serial: payloadSerial,
    //     Title: payloadTitle,
    //     Price: payloadPrice,
    //     Sizes: payloadSizes,
    //     Material: payloadMaterial,
    //     Weight: payloadWeight,
    //     Other_attrs: payloadOther,
    //     In_stock: payloadStock,
    //     Profit: payloadProfit,
    //     Seller: payloadSeller,
    //     Available: payloadAvailable
    // });



    // 2) Create inputs for each variable

    // Show serial
    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.gap = '8px';
    row1.style.width = '100%';
    row1.style.marginBottom = '12px';

    // Label container
    const row1Label = document.createElement('div');
    row1Label.style.flex = '2';
    row1Label.style.minWidth = '0';

    const serialLabel = document.createElement('label');
    serialLabel.innerHTML = `
    <p>Version Serial :</p>
    `;
    serialLabel.style = `
    display: block; 
    font-size: 15px; 
    padding-top: 7px; 
    padding-bottom: 10px; 
    color: rgb(204, 200, 200);
    `;


    // showing the current serial.
    const row1Input = document.createElement('div');
    row1Input.style.flex = '3';
    row1Input.style.minWidth = '0';

    const serialInput = document.createElement('input');
    serialInput.value = payloadSerial;
    serialInput.classList.add("rounded-input");
    serialInput.readOnly = true;
    serialInput.style.opacity = 0.5;

    // Append to row
    row1Label.appendChild(serialLabel);
    row1Input.appendChild(serialInput);

    row1.appendChild(row1Label);
    row1.appendChild(row1Input);
    content.appendChild(row1);



    // In Stock & Available
    const row8 = document.createElement('div');
    row8.style.display = 'flex';
    row8.style.gap = '8px';
    row8.style.width = '100%';
    row8.style.marginBottom = '12px';

    // In Stock container
    const stockContainer = document.createElement('div');
    stockContainer.style.flex = '1';
    const stockLabel = document.createElement('label');
    stockLabel.textContent = 'In Stock';
    stockLabel.style = `
    display: block; 
    font-size: 13px; 
    margin-bottom: 4px; 
    color: rgb(161, 156, 156);
    `;
    const newstockSelect = document.createElement('select');
    newstockSelect.classList.add("rounded-input");
    newstockSelect.style = `
  background-color : rgba(193, 239, 183, 0.43);
`;
    newstockSelect.innerHTML = `
  <option value="TRUE">TRUE</option>
  <option value="FALSE">FALSE</option>
`;
    let stockstatus;
    if (payloadStock) {
        stockstatus = 'TRUE';
    } else {
        stockstatus = 'FALSE';
    }

    newstockSelect.value = stockstatus;

    newstockSelect.addEventListener('change', () => {
        if (newstockSelect.value == stockstatus) {
            newstockSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newstockSelect.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    // Available container
    const AvailableContainer = document.createElement('div');
    AvailableContainer.style.flex = '1';
    const AvailableLabel = document.createElement('label');
    AvailableLabel.textContent = 'Available';
    AvailableLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const newavailable = document.createElement('select');
    newavailable.classList.add("rounded-input");
    newavailable.style = `
  background-color : rgba(193, 239, 183, 0.43);
`;
    newavailable.innerHTML = `
  <option value="TRUE">TRUE</option>
  <option value="FALSE">FALSE</option>
`;

    let availablestatus;
    if (payloadAvailable) {
        availablestatus = 'TRUE';
    } else {
        availablestatus = 'FALSE';
    }

    newavailable.value = availablestatus;

    newavailable.addEventListener('change', () => {
        if (newavailable.value == availablestatus) {
            newavailable.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newavailable.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    stockContainer.appendChild(stockLabel);
    stockContainer.appendChild(newstockSelect);

    AvailableContainer.appendChild(AvailableLabel);
    AvailableContainer.appendChild(newavailable);

    // Append both to row
    row8.appendChild(stockContainer);
    row8.appendChild(AvailableContainer);
    content.appendChild(row8);



    // ROW 4: Item Title
    const row4 = document.createElement('div');
    row4.style.width = '100%';
    row4.style.marginBottom = '12px';

    // Label
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Item Title';
    titleLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const newtitleInput = document.createElement('input');
    newtitleInput.placeholder = `E.g   ${payloadTitle}`;
    newtitleInput.classList.add("rounded-input");
    newtitleInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newtitleInput.value = payloadTitle;


    newtitleInput.addEventListener('input', () => {
        if (newtitleInput.value == payloadTitle) {
            newtitleInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newtitleInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    // Append to row
    row4.appendChild(titleLabel);
    row4.appendChild(newtitleInput);
    content.appendChild(row4);





    // ROW 5: Price
    const row5 = document.createElement('div');
    row5.style.width = '100%';
    row5.style.marginBottom = '12px';

    // Label
    const priceLabel = document.createElement('label');
    priceLabel.textContent = 'Price';
    priceLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const newpriceInput = document.createElement('input');
    newpriceInput.placeholder = `E.g   ${payloadPrice}`;
    newpriceInput.type = 'number';
    newpriceInput.min = '0';
    newpriceInput.classList.add("rounded-input");
    newpriceInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newpriceInput.value = payloadPrice;


    newpriceInput.addEventListener('input', () => {
        if (newpriceInput.value == payloadPrice) {
            newpriceInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newpriceInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });


    // Append to row
    row5.appendChild(priceLabel);
    row5.appendChild(newpriceInput);
    content.appendChild(row5);





    // ROW 6: Size input (comma-separated => array)
    const row6 = document.createElement('div');
    row6.style.width = '100%';
    row6.style.marginBottom = '12px';

    // Label
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Size';
    sizeLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Input
    const newsizeInput = document.createElement('input');
    newsizeInput.placeholder = `E.g   ${payloadSizes}`;
    newsizeInput.classList.add("rounded-input");
    newsizeInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newsizeInput.value = payloadSizes;

    newsizeInput.addEventListener('input', () => {
        if (newsizeInput.value == payloadSizes) {
            newsizeInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newsizeInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    // On input: convert comma-separated string to array and log
    newsizeInput.addEventListener('input', () => {
        const raw = newsizeInput.value;
        const array = raw
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        // console.log('Size Array:', array);
    });

    // Append to row
    row6.appendChild(sizeLabel);
    row6.appendChild(newsizeInput);
    content.appendChild(row6);



    // ROW 7: Material and Weight (side-by-side)
    const row7 = document.createElement('div');
    row7.style.display = 'flex';
    row7.style.gap = '8px';
    row7.style.width = '100%';
    row7.style.marginBottom = '12px';

    // Material container
    const materialContainer = document.createElement('div');
    materialContainer.style.flex = '1';
    const materialLabel = document.createElement('label');
    materialLabel.textContent = 'Material';
    materialLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const newmaterialInput = document.createElement('input');
    newmaterialInput.placeholder = 'E.g   Cotton';
    newmaterialInput.classList.add("rounded-input");
    newmaterialInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newmaterialInput.value = payloadMaterial;

    newmaterialInput.addEventListener('input', () => {
        if (newmaterialInput.value == payloadMaterial) {
            newmaterialInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newmaterialInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    materialContainer.appendChild(materialLabel);
    materialContainer.appendChild(newmaterialInput);

    // Weight container
    const weightContainer = document.createElement('div');
    weightContainer.style.flex = '1';
    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Weight';
    weightLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const newweightInput = document.createElement('input');
    newweightInput.placeholder = 'E.g   1.2kg';
    newweightInput.classList.add("rounded-input");
    newweightInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newweightInput.value = payloadWeight;

    newweightInput.addEventListener('input', () => {
        if (newweightInput.value == payloadWeight) {
            newweightInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newweightInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    weightContainer.appendChild(weightLabel);
    weightContainer.appendChild(newweightInput);

    // Append both to row
    row7.appendChild(materialContainer);
    row7.appendChild(weightContainer);
    content.appendChild(row7);




    // ROW 9: Seller ID input + selector (same logic as Item ID)
    const row9 = document.createElement('div');
    row9.style.display = 'flex';
    row9.style.gap = '8px';
    row9.style.width = '100%';
    row9.style.marginBottom = '12px';

    // Seller ID input container (1 part)
    const sellerIdContainer = document.createElement('div');
    sellerIdContainer.style.flex = '1';
    sellerIdContainer.style.minWidth = '0';

    const sellerIdLabel = document.createElement('label');
    sellerIdLabel.textContent = 'Seller ID';
    sellerIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const newsellerIdInput = document.createElement('input');
    newsellerIdInput.placeholder = 'E.g   1';
    newsellerIdInput.type = 'number';
    newsellerIdInput.classList.add("rounded-input");
    newsellerIdInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;

    newsellerIdInput.value = payloadSeller;


    newsellerIdInput.addEventListener('input', () => {
        if (newsellerIdInput.value == payloadSeller) {
            newsellerIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newsellerIdInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });


    sellerIdContainer.appendChild(sellerIdLabel);
    sellerIdContainer.appendChild(newsellerIdInput);


    // Profit Margin container
    const marginContainer = document.createElement('div');
    marginContainer.style.flex = '1';
    const marginLabel = document.createElement('label');
    marginLabel.textContent = 'Profit Margin';
    marginLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const newmarginInput = document.createElement('input');
    newmarginInput.placeholder = 'E.g   1.5';
    newmarginInput.classList.add("rounded-input");
    newmarginInput.style = `
    background-color: rgba(193, 239, 183, 0.43);
`;
    newmarginInput.value = payloadProfit;

    newmarginInput.addEventListener('input', () => {
        if (newmarginInput.value == payloadProfit) {
            newmarginInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            newmarginInput.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });

    marginContainer.appendChild(marginLabel);
    marginContainer.appendChild(newmarginInput);

    // Append both to row
    row9.appendChild(sellerIdContainer);
    row9.appendChild(marginContainer);
    content.appendChild(row9);




    //  Item Attributes textarea
    const row10 = document.createElement('div');
    row10.style.width = '100%';
    row10.style.marginBottom = '12px';

    // Label
    const attrLabel = document.createElement('label');
    attrLabel.textContent = 'Item Attributes';
    attrLabel.style = `
    display: block; 
    font-size: 13px; 
    margin-bottom: 4px; 
    color: rgb(161, 156, 156);`;

    // Textarea
    const newattrTextarea = document.createElement('textarea');
    newattrTextarea.value = payloadOther;
    newattrTextarea.style = `
  width: 100%;
  height: 80px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  overflow-y: auto;
  background-Color: rgba(193, 239, 183, 0.43);
`;

    newattrTextarea.addEventListener('input', () => {
        if (newattrTextarea.value == payloadOther) {
            newattrTextarea.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';


        } else {
            newattrTextarea.style.backgroundColor = 'rgba(154, 175, 236, 0.46)';
        }
    });


    // Append to row
    row10.appendChild(attrLabel);
    row10.appendChild(newattrTextarea);
    content.appendChild(row10);






    // 3) Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm Changes';
    confirmBtn.className = 'popup-confirm';
    content.appendChild(confirmBtn);

    confirmBtn.onclick = async () => {



        if (!newtitleInput.value) {
            showMessage("Empty Title");
            return;
        }
        if (!newpriceInput.value) {
            showMessage("Empty Price");
            return;
        }
        if (!newsizeInput.value) {
            showMessage("Empty Size");
            return;
        }
        if (!newmaterialInput.value) {
            showMessage("Empty Material");
            return;
        }
        if (!newweightInput.value) {
            showMessage("Empty Weight");
            return;
        }
        if (!newmarginInput.value) {
            showMessage("Empty Profit Margin");
            return;
        }
        if (!newsellerIdInput.value) {
            showMessage("Invalid Seller Id");
            return;
        }
        if (!newattrTextarea.value) {
            showMessage("Empty Text Area");
            return;
        }

        loadingStart(0.5);
        // Gather updated values 

        const serial = payloadSerial;
        const updatedPayload = {
            full_serial: serial,
            title: newtitleInput.value,
            price: Number(newpriceInput.value),
            sizes: newsizeInput.value.split(',').map(s => s.trim()),
            material: newmaterialInput.value,
            weight: newweightInput.value,
            other_attrs: newattrTextarea.value,
            in_stock: (newstockSelect.value === 'TRUE'),
            profit_margin: Number(newmarginInput.value),
            seller_id: Number(newsellerIdInput.value),
            available: (newavailable.value === 'TRUE')
        };


        function deepEqual(obj1, obj2) {
            return JSON.stringify(Object.entries(obj1).sort()) === JSON.stringify(Object.entries(obj2).sort());
        }

        // console.log('Payload', payload, '\nUpdated version:',  updatedPayload);


        if (!deepEqual(payload, updatedPayload)) {


            // TODO: send updatedPayload to backend
            // the posting mechanism to the table : the content will be the payload
            try {
                const resp = await fetch(
                    `${CONFIG.API_BASE_URL}/products/versions/serial/${serial}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedPayload)
                    }
                );
                const json = await resp.json();
                if (!resp.ok) {
                    loadingStop();
                    showMessage("Failed To Update");
                    // console.error('Update failed:', json.error);
                    return;
                }
                loadingStop();
                overlay.remove();
                Saved();

            } catch (err) {
                loadingStop();
                console.error('Update error:', err);
                showMessage("Error saving changes");
            }

        } else {

            loadingStop();
            showMessage("No Changes Detected");

        }




    };
}



// -----3----- Add Item popup
function showAddItemPopup() {
    const { overlay, title, content } = createPopup('Add Item', showItemConfigPopup);

    // ROW 1: Category selection
    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.gap = '8px';
    row1.style.width = '100%';
    row1.style.marginBottom = '12px';

    // Input container (1 part)
    const CATIdContainer = document.createElement('div');
    CATIdContainer.style.flex = '1';
    CATIdContainer.style.minWidth = '0';

    const CATIdLabel = document.createElement('label');
    CATIdLabel.textContent = 'CAT Id';
    CATIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const CATIdInput = document.createElement('input');
    CATIdInput.type = 'number';
    CATIdInput.placeholder = 'E.g  1';
    CATIdInput.maxLength = 2;
    CATIdInput.classList.add("rounded-input");


    CATIdInput.addEventListener('input', () => {
        if (CATIdInput.value.length > 2) {
            CATIdInput.value = CATIdInput.value.slice(0, 2);
        }
    });

    CATIdInput.addEventListener('input', () => {
        if (CATIdInput.value.trim() !== '') {
            CATIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            CATIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    CATIdContainer.appendChild(CATIdLabel);
    CATIdContainer.appendChild(CATIdInput);

    // Selector container (2 parts)
    const CATSelectContainer = document.createElement('div');
    CATSelectContainer.style.flex = '3';
    CATSelectContainer.style.minWidth = '0';

    const CATSelectLabel = document.createElement('label');
    CATSelectLabel.textContent = 'Category Selector';
    CATSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const CATSelect = document.createElement('select');
    CATSelect.classList.add("rounded-input");

    CATSelect.addEventListener('change', () => {
        if (CATSelect.value !== '') {
            CATSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            CATSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    CATSelectContainer.appendChild(CATSelectLabel);
    CATSelectContainer.appendChild(CATSelect);




    // Fetching Options from DB

    let CATMap = {};       // id → serial
    let CATserialToId = {};    // serial → id
    let CAToptions;
    let fetchedCAT = false;    // to block future inputs incase of error    
    let item_cat = "";

    async function loadCAT() {
        // visuals when fetching items
        CATSelect.disabled = true;
        CATIdInput.disabled = true;
        CATSelect.innerHTML = '<option>Loading Categories…</option>';

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/categories`
            );
            const json = await resp.json();
            if (resp.ok) {
                fetchedCAT = true;

                // fill maps
                CATMap = {};
                CATserialToId = {};
                json.items.forEach(({ id, code, name }) => {
                    const label = `${code} : ${name}`;
                    CATMap[String(id)] = label;          // store combined label
                    CATserialToId[label] = String(id);          // reverse lookup if needed
                });
                // console.log(CATMap);


                // build <option> list
                CAToptions = `
                <option value="" selected>Select Item…</option>
                    ${Object.entries(CATMap)
                        .map(([id, label]) => `<option value="${id}">${label}</option>`)
                        .join('')}
                    `;

                CATSelect.innerHTML = CAToptions;

                // visuals when items fetched
                CATSelect.disabled = false;
                CATIdInput.disabled = false;
                SUBinit();
                Thirdinit();


            } else {
                console.error('Failed to load Items:', json.error);
                throw new Error(json.error);
            }


        } catch (err) {
            console.error('Failed to load items:', err);
            CATSelect.innerHTML = `<option value="">Error loading Categories</option>`;
        }
    }


    // two-way binding logic

    // 1) when user types an ID
    CATIdInput.addEventListener('input', () => {
        SUBinit();
        Thirdinit();
        loadSUB();
        const id = CATIdInput.value.trim();
        if (id) {
            // disable select
            CATSelect.disabled = true;
            CATSelect.style.opacity = '0.8';
            CATSelect.style.backgroundColor = '';

            // show matching serial (or fallback)
            const serial = CATMap[id] || 'No Category Found';
            CATSelect.innerHTML = `<option value="">${serial}</option>`;
            item_cat = serial;
        } else {
            // reset select
            CATSelect.disabled = false;
            CATSelect.style.opacity = '1';
            CATSelect.innerHTML = CAToptions;  // repopulate full list
        }
    });

    // 2) when user picks from the selector
    CATSelect.addEventListener('change', () => {
        const selId = CATSelect.value;       // this is the <option value="id">
        if (selId) {
            // disable input
            CATIdInput.readOnly = true;
            CATIdInput.style.opacity = '0.5';
            CATIdInput.style.backgroundColor = '';

            // set input to the corresponding ID
            CATIdInput.value = selId;
            item_cat = CATMap[selId];
        } else {
            // reset input
            CATIdInput.readOnly = false;
            CATIdInput.style.opacity = '1';
            CATIdInput.value = '';
        }
        SUBinit();
        Thirdinit();
        loadSUB();
    });



    // Prefill CATIdInput if stored
    const savedCATId = localStorage.getItem('lastCATId');
    async function initCATField() {
        console.log('called cat init');
        // 1a) First, load the items from the server
        // await loadCAT();

        // 1b) Now that itemMap & the selector are ready, prefill from localStorage
        if (savedCATId && fetchedCAT) {
            // set the input
            CATIdInput.value = savedCATId;
            CATIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

            // dispatch the 'input' event so your listener locks & updates the selector
            CATIdInput.dispatchEvent(new Event('input'));

        }
    }





    function isCATSelectionValid() {
        const id = CATIdInput.value.trim();
        const sel = CATSelect.value;

        // If they typed an ID, it must be one of the fetched keys
        if (id !== '') {
            return Object.prototype.hasOwnProperty.call(CATMap, id);
        }
        // If they used the dropdown, it must be a non-placeholder value
        if (sel !== '') {
            return true;
        }
        return false;
    }



    // Append containers to row

    row1.appendChild(CATIdContainer);
    row1.appendChild(CATSelectContainer);
    content.appendChild(row1);



    async function SUBinit() {
        // console.log("called");

        if (!isCATSelectionValid()) {
            SUBIdInput.disabled = true;
            SUBSelect.disabled = true;
            SUBIdInput.value = '';
            SUBSelect.innerHTML = `<option value="">Choose Category</option>`;
            SUBIdInput.style.backgroundColor = '';
            SUBSelect.style.backgroundColor = '';
            // console.log("not");
            return;
        } else {
            SUBIdInput.disabled = false;
            SUBSelect.disabled = false;
            SUBSelect.innerHTML = SUBoptions;
            SUBIdInput.value = '';
            return;
        }

    }



    // ROW 2: Sub Category selection
    const row2 = document.createElement('div');
    row2.style.display = 'flex';
    row2.style.gap = '8px';
    row2.style.width = '100%';
    row2.style.marginBottom = '12px';

    // Input container (1 part)
    const SUBIdContainer = document.createElement('div');
    SUBIdContainer.style.flex = '1';
    SUBIdContainer.style.minWidth = '0';

    const SUBIdLabel = document.createElement('label');
    SUBIdLabel.textContent = 'SUB Id';
    SUBIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const SUBIdInput = document.createElement('input');
    SUBIdInput.type = 'number';
    SUBIdInput.placeholder = 'E.g  1';
    SUBIdInput.min = 0;
    SUBIdInput.maxLength = 3;
    SUBIdInput.classList.add("rounded-input");


    SUBIdInput.addEventListener('input', () => {
        if (SUBIdInput.value.length > 3) {
            SUBIdInput.value = SUBIdInput.value.slice(0, 3);
        }
    });

    SUBIdInput.addEventListener('input', () => {
        if (SUBIdInput.value.trim() !== '') {
            SUBIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            SUBIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    SUBIdContainer.appendChild(SUBIdLabel);
    SUBIdContainer.appendChild(SUBIdInput);

    // Selector container (2 parts)
    const SUBSelectContainer = document.createElement('div');
    SUBSelectContainer.style.flex = '3';
    SUBSelectContainer.style.minWidth = '0';

    const SUBSelectLabel = document.createElement('label');
    SUBSelectLabel.textContent = 'Sub Category Selector';
    SUBSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const SUBSelect = document.createElement('select');
    SUBSelect.classList.add("rounded-input");

    SUBSelect.addEventListener('change', () => {
        if (SUBSelect.value !== '') {
            SUBSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            SUBSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    SUBSelectContainer.appendChild(SUBSelectLabel);
    SUBSelectContainer.appendChild(SUBSelect);




    // Fetching Options from DB

    let SUBMap = {};       // id → serial
    let SUBserialToId = {};    // serial → id
    let SUBoptions;
    let fetchedSUB = false;    // to block future inputs incase of error    
    let item_sub = "";

    async function loadSUB() {
        // visuals when fetching items
        SUBSelect.disabled = true;
        SUBIdInput.disabled = true;
        SUBSelect.innerHTML = '<option>Loading Sub Categories…</option>';

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/sub_categories`
            );
            const json = await resp.json();
            if (resp.ok) {
                fetchedSUB = true;

                // // fill maps
                // SUBMap = {};
                // SUBserialToId = {};
                // json.items.forEach(({ id, category_id, code, name }) => {
                //     const label = `${code} : ${name}`;
                //     SUBMap[String(id)] = label;          // store combined label
                //     SUBserialToId[label] = String(id);          // reverse lookup if needed

                //     CAT = Number(CATIdInput.value);
                //     console.log('[', 'category chosen ',CAT, ']', id, '[', 'category available ',category_id, ']', code, name);

                // });
                // console.log(SUBMap);
                // console.log(SUBserialToId);

                // fill maps — only for the selected category

                const chosenCat = Number(CATIdInput.value);
                SUBMap = {};
                SUBserialToId = {};

                json.items
                    .filter(item => item.category_id === chosenCat)
                    .forEach(({ id, code, name }) => {
                        const label = `${code} : ${name}`;
                        SUBMap[String(id)] = label;
                        SUBserialToId[label] = String(id);
                    });

                console.log('Filtered SUBMap:', SUBMap);


                // build <option> list
                SUBoptions = `
                <option value="" selected>Select Item…</option>
                    ${Object.entries(SUBMap)
                        .map(([id, label]) => `<option value="${id}">${label}</option>`)
                        .join('')}
                    `;

                SUBSelect.innerHTML = SUBoptions;

                // visuals when items fetched
                SUBSelect.disabled = false;
                SUBIdInput.disabled = false;
                Thirdinit();


            } else {
                console.error('Failed to load Items:', json.error);
                throw new Error(json.error);
            }


        } catch (err) {
            console.error('Failed to load items:', err);
            SUBSelect.innerHTML = `<option value="">Error loading Sub Categories</option>`;
        }
    }



    // two-way binding logic

    // 1) when user types an ID
    SUBIdInput.addEventListener('input', () => {
        Thirdinit();
        loadTHIRD();
        const id = SUBIdInput.value.trim();
        if (id) {
            // disable select
            SUBSelect.disabled = true;
            SUBSelect.style.opacity = '0.8';
            SUBSelect.style.backgroundColor = '';

            // show matching serial (or fallback)
            const serial = SUBMap[id] || 'No Sub Category Found';
            SUBSelect.innerHTML = `<option value="">${serial}</option>`;
            item_sub = serial;
        } else {
            // reset select
            SUBSelect.disabled = false;
            SUBSelect.style.opacity = '1';
            SUBSelect.innerHTML = SUBoptions;  // repopulate full list
        }
    });
    
    // 2) when user picks from the selector
    SUBSelect.addEventListener('change', () => {
        const selId = SUBSelect.value;       // this is the <option value="id">
        if (selId) {
            // disable input
            SUBIdInput.readOnly = true;
            SUBIdInput.style.opacity = '0.5';
            SUBIdInput.style.backgroundColor = '';
            
            // set input to the corresponding ID
            SUBIdInput.value = selId;
            item_sub = SUBMap[selId];
        } else {
            // reset input
            SUBIdInput.readOnly = false;
            SUBIdInput.style.opacity = '1';
            SUBIdInput.value = '';
        }
        Thirdinit();
        loadTHIRD();
    });



    // Prefill SUBIdInput if stored
    const savedSUBId = localStorage.getItem('lastSUBId');
    async function initSUBField() {
        console.log('called sub init');
        // 1a) First, load the items from the server
        await initCATField();
        await loadSUB();

        // 1b) Now that itemMap & the selector are ready, prefill from localStorage
        if (savedSUBId && fetchedSUB) {
            // set the input
            SUBIdInput.value = savedSUBId;
            SUBIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

            // dispatch the 'input' event so your listener locks & updates the selector
            SUBIdInput.dispatchEvent(new Event('input'));

        }
    }





    function isSUBSelectionValid() {
        const id = SUBIdInput.value.trim();
        const sel = SUBSelect.value;

        // If they typed an ID, it must be one of the fetched keys
        if (id !== '') {
            return Object.prototype.hasOwnProperty.call(SUBMap, id);
        }
        // If they used the dropdown, it must be a non-placeholder value
        if (sel !== '') {
            return true;
        }
        return false;
    }


    if (!fetchedCAT) {
        SUBIdInput.disabled = true;
        SUBSelect.disabled = true;
    }

    // Append containers to row
    row2.appendChild(SUBIdContainer);
    row2.appendChild(SUBSelectContainer);
    content.appendChild(row2);




    async function Thirdinit() {
        // console.log("called");

        if (!isSUBSelectionValid()) {
            THIRDIdInput.disabled = true;
            THIRDSelect.disabled = true;
            THIRDIdInput.value = '';
            THIRDSelect.innerHTML = `<option value="">Choose Sub Category</option>`;
            THIRDIdInput.style.backgroundColor = '';
            THIRDSelect.style.backgroundColor = '';
            // console.log("not");
            return;
            // } else if(!isSUBSelectionValid()) {

        } else {
            THIRDIdInput.disabled = false;
            THIRDSelect.disabled = false;
            THIRDSelect.innerHTML = THIRDoptions;
            THIRDIdInput.value = '';
            return;
        }



    }



    // ROW 2: THIRD Category selection
    const row3 = document.createElement('div');
    row3.style.display = 'flex';
    row3.style.gap = '8px';
    row3.style.width = '100%';
    row3.style.marginBottom = '12px';

    // Input container (1 part)
    const THIRDIdContainer = document.createElement('div');
    THIRDIdContainer.style.flex = '1';
    THIRDIdContainer.style.minWidth = '0';

    const THIRDIdLabel = document.createElement('label');
    THIRDIdLabel.textContent = 'THIRD Id';
    THIRDIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const THIRDIdInput = document.createElement('input');
    THIRDIdInput.type = 'number';
    THIRDIdInput.placeholder = 'E.g  1';
    THIRDIdInput.maxLength = 3;
    THIRDIdInput.classList.add("rounded-input");


    THIRDIdInput.addEventListener('input', () => {
        if (THIRDIdInput.value.length > 3) {
            THIRDIdInput.value = THIRDIdInput.value.slice(0, 3);
        }
    });

    THIRDIdInput.addEventListener('input', () => {
        if (THIRDIdInput.value.trim() !== '') {
            THIRDIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            THIRDIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    THIRDIdContainer.appendChild(THIRDIdLabel);
    THIRDIdContainer.appendChild(THIRDIdInput);

    // Selector container (2 parts)
    const THIRDSelectContainer = document.createElement('div');
    THIRDSelectContainer.style.flex = '3';
    THIRDSelectContainer.style.minWidth = '0';

    const THIRDSelectLabel = document.createElement('label');
    THIRDSelectLabel.textContent = 'THIRD Category Selector';
    THIRDSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const THIRDSelect = document.createElement('select');
    THIRDSelect.classList.add("rounded-input");

    THIRDSelect.addEventListener('change', () => {
        if (THIRDSelect.value !== '') {
            THIRDSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            THIRDSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    THIRDSelectContainer.appendChild(THIRDSelectLabel);
    THIRDSelectContainer.appendChild(THIRDSelect);




    // Fetching Options from DB

    let THIRDMap = {};       // id → serial
    let THIRDserialToId = {};    // serial → id
    let THIRDoptions;
    let fetchedTHIRD = false;    // to block future inputs incase of error    
    let item_third = "";

    async function loadTHIRD() {
        // visuals when fetching items
        THIRDSelect.disabled = true;
        THIRDIdInput.disabled = true;
        THIRDSelect.innerHTML = '<option>Loading THIRD Categories…</option>';

        try {
            const resp = await fetch(
                `${CONFIG.API_BASE_URL}/products/third_letters`
            );
            const json = await resp.json();
            if (resp.ok) {
                fetchedTHIRD = true;

                // // fill maps
                // const chosenCat = Number(CATIdInput.value);
                // const chosenSub = Number(SUBIdInput.value);

                // THIRDMap = {};
                // THIRDserialToId = {};
                // json.items.forEach(({ id, category_id, sub_category_id, code, name }) => {
                //     const label = `${code} : ${name}`;
                //     THIRDMap[String(id)] = label;          // store combined label
                //     THIRDserialToId[label] = String(id);          // reverse lookup if needed
                // });
                // console.log(THIRDMap);


                // fill maps — only third‑letters matching both selected category & sub‑category
                const chosenCat = Number(CATIdInput.value);
                const chosenSub = Number(SUBIdInput.value);

                THIRDMap = {};
                THIRDserialToId = {};

                json.items
                    .filter(item =>
                        item.category_id === chosenCat &&
                        item.sub_category_id === chosenSub
                    )
                    .forEach(({ id, code, name }) => {
                        const label = `${code} : ${name}`;
                        THIRDMap[String(id)] = label;
                        THIRDserialToId[label] = String(id);
                    });

                console.log('Filtered THIRDMap:', THIRDMap);

                // build <option> list
                THIRDoptions = `
                <option value="" selected>Select Item…</option>
                    ${Object.entries(THIRDMap)
                        .map(([id, label]) => `<option value="${id}">${label}</option>`)
                        .join('')}
                    `;

                THIRDSelect.innerHTML = THIRDoptions;

                // visuals when items fetched
                THIRDSelect.disabled = false;
                THIRDIdInput.disabled = false;
                loadUsedCode();


            } else {
                console.error('Failed to load Items:', json.error);
                throw new Error(json.error);
            }


        } catch (err) {
            console.error('Failed to load items:', err);
            THIRDSelect.innerHTML = `<option value="">Error loading THIRD Categories</option>`;
        }
    }



    // two-way binding logic

    // 1) when user types an ID
    THIRDIdInput.addEventListener('input', () => {
        loadUsedCode();
        const id = THIRDIdInput.value.trim();
        if (id) {
            // disable select
            THIRDSelect.disabled = true;
            THIRDSelect.style.opacity = '0.8';
            THIRDSelect.style.backgroundColor = '';

            // show matching serial (or fallback)
            const serial = THIRDMap[id] || 'No THIRD Category Found';
            THIRDSelect.innerHTML = `<option value="">${serial}</option>`;
            item_third = serial;
        } else {
            // reset select
            THIRDSelect.disabled = false;
            THIRDSelect.style.opacity = '1';
            THIRDSelect.innerHTML = THIRDoptions;  // repopulate full list
        }
    });

    // 2) when user picks from the selector
    THIRDSelect.addEventListener('change', () => {
        const selId = THIRDSelect.value;       // this is the <option value="id">
        if (selId) {
            // disable input
            THIRDIdInput.readOnly = true;
            THIRDIdInput.style.opacity = '0.5';
            THIRDIdInput.style.backgroundColor = '';

            // set input to the corresponding ID
            THIRDIdInput.value = selId;
            item_third = THIRDMap[selId];
        } else {
            // reset input
            THIRDIdInput.readOnly = false;
            THIRDIdInput.style.opacity = '1';
            THIRDIdInput.value = '';
        }
        loadUsedCode();
    });



    // Prefill THIRDIdInput if stored
    const savedTHIRDId = localStorage.getItem('lastTHIRDId');
    async function initTHIRDField() {
        console.log('called third init');

        // 1a) First, load the items from the server
        await initSUBField();
        await loadTHIRD();

        // 1b) Now that itemMap & the selector are ready, prefill from localStorage
        if (savedTHIRDId && fetchedTHIRD) {
            // set the input
            THIRDIdInput.value = savedTHIRDId;
            THIRDIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

            // dispatch the 'input' event so your listener locks & updates the selector
            THIRDIdInput.dispatchEvent(new Event('input'));

        }
    }





    function isTHIRDSelectionValid() {
        const id = THIRDIdInput.value.trim();
        const sel = THIRDSelect.value;

        // If they typed an ID, it must be one of the fetched keys
        if (id !== '') {
            return Object.prototype.hasOwnProperty.call(THIRDMap, id);
        }
        // If they used the dropdown, it must be a non-placeholder value
        if (sel !== '') {
            return true;
        }
        return false;
    }


    if (!fetchedCAT) {
        SUBIdInput.disabled = true;
        SUBSelect.disabled = true;
    }
    if (!fetchedSUB) {
        THIRDIdInput.disabled = true;
        THIRDSelect.disabled = true;
    }

    // Append containers to row
    row3.appendChild(THIRDIdContainer);
    row3.appendChild(THIRDSelectContainer);
    content.appendChild(row3);


    let usedCodeId = [];   // array containing all codes

    async function loadUsedCode() {

        // visuals when fetching loading values
        baseSerialInput.value = `Loading...`;
        statusIndicator.style.backgroundColor = 'blue';
        codeInput.disabled = true;

        if (!isTHIRDSelectionValid()) {
            codeInput.style.backgroundColor = '';
            codeInput.value = '';
            statusIndicator.style.backgroundColor = 'gray';
            return;
        }

        const Cat_id = Number(CATIdInput.value);
        const Sub_id = Number(SUBIdInput.value);
        const Third_id = Number(THIRDIdInput.value);
        if (!Cat_id || !Sub_id || !Third_id) return;

        codeInput.disabled = false;
        console.log(Cat_id, Sub_id, Third_id);


        /** below is the functionality where we send category id and sub category id 
         *      and third letter id, to the backend, which will then go to my table 
         *      and search in the correct columns and return all the values in code
         *      column as an array. [for the values, cat,sub and third are same i.e
         *      the same type but different item. ]
         * **/


        // dummy example
        // try {
        //     const resp = await fetch(
        //         `${CONFIG.API_BASE_URL}/products/....`
        //     );
        //     const json = await resp.json();
        //     if (resp.ok) {
        //         usedCodeId = json.versions;         // e.g. [1,2,3]
        //         // console.log('Used code IDs:', usedCodeId);


        //         // assigning the next value
        //         let nextId = 1;
        //         while (usedCodeId.includes(nextId)) {
        //             nextId++;
        //         }
        //         codeInput.value = nextId;

        //         // reset unique id input and indicator
        //         codeInput.dispatchEvent(new Event('input'));

        //         // visuals when loading values are fetched
        //         baseSerialLabel.textContent = 'Base Serial :';
        //         codeInput.disabled = false;
        //     } else {
        //         console.error('Failed to load codes:', json.error);
        //         baseSerialInput.value = `Failed ...`;
        //     }
        // } catch (err) {
        //     console.error('Error loading codes:', err);
        // }

    }



    // ROW 4 code and base serial 
    const row4 = document.createElement('div');
    row4.style.display = 'flex';
    row4.style.gap = '8px';
    row4.style.width = '100%';
    row4.style.marginBottom = '12px';

    // code container
    const codeContainer = document.createElement('div');
    codeContainer.style.flex = '3';
    const codeLabel = document.createElement('label');
    codeLabel.textContent = 'Unique Code';
    codeLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const codeInput = document.createElement('input');
    codeInput.type = 'number';
    codeInput.placeholder = 'E.g 001';
    codeInput.classList.add("rounded-input");

    codeInput.maxLength = 3;

    codeInput.addEventListener('input', () => {
        if (codeInput.value.length > 3) {
            codeInput.value = codeInput.value.slice(0, 3);
        }
    });

    codeInput.addEventListener('input', () => {
        if (codeInput.value.trim() !== '') {
            codeInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            codeInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // Prefill if stored
    const savedcode = localStorage.getItem('lastitemcode');
    if (savedcode) {
        codeInput.placeholder = `E.g. ${savedcode}`;
    }

    codeContainer.appendChild(codeLabel);
    codeContainer.appendChild(codeInput);

    // serial container
    const baseSerialContainer = document.createElement('div');
    baseSerialContainer.style.flex = '3';
    const baseSerialLabel = document.createElement('label');
    baseSerialLabel.textContent = 'Base Serial :';
    baseSerialLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const baseSerialInput = document.createElement('input');
    baseSerialInput.classList.add("rounded-input");

    baseSerialInput.readOnly = true;
    baseSerialInput.style.opacity = 0.5;
    baseSerialInput.placeholder = 'Loading ...';


    // visual for base serial
    codeInput.addEventListener('input', () => {
        if (codeInput.value.trim() !== '') {
            const cat = item_cat.substring(0, 1);
            const sub = item_sub.substring(0, 1);
            const third = item_third.substring(0, 1);
            const code = codeInput.value.padStart(3, '0');
            const serial = cat + sub + third + code;
            baseSerialInput.value = serial;
        } else {
            baseSerialInput.value = '';
        }
    });

    baseSerialContainer.appendChild(baseSerialLabel);
    baseSerialContainer.appendChild(baseSerialInput);

    // Indicator container (30%)
    const statusContainer = document.createElement('div');
    statusContainer.style.flex = '1';
    statusContainer.style.display = 'flex';
    statusContainer.style.alignItems = 'flex-end'; // align with input
    statusContainer.style.justifyContent = 'center';

    const statusIndicator = document.createElement('div');
    statusIndicator.style = `
      width: 20px;
      height: 20px;
      margin: 9px;
      border-radius: 50%;
      background-color: gray; /* will be updated based on availability */
      border: 2px solid #fff;
      `;

    codeInput.addEventListener('input', () => {
        const inputValue = Number(codeInput.value);

        if (codeInput.value === "") {
            statusIndicator.style.backgroundColor = 'gray';
        } else if (usedCodeId.includes(inputValue)) {
            statusIndicator.style.backgroundColor = 'rgb(255, 0, 0)'; // red for used ID
        } else {
            statusIndicator.style.backgroundColor = 'rgb(0, 255, 0)'; // green for available ID
        }
    });

    // function isCodeValid() {
    //     const v = Number(uniqueIdInput.value);

    //     // must be non-empty, numeric, and not in usedVersionId
    //     return uniqueIdInput.value.trim() !== '' && !usedVersionId.includes(v);
    // }





    statusContainer.appendChild(statusIndicator);

    // Append both to row
    row4.appendChild(codeContainer);
    row4.appendChild(baseSerialContainer);
    row4.appendChild(statusContainer);
    content.appendChild(row4);




    // ROW 10: Item Attributes textarea
    const row5 = document.createElement('div');
    row5.style.width = '100%';
    row5.style.marginBottom = '12px';

    // Label
    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description';
    descriptionLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    // Textarea
    const descriptionTextarea = document.createElement('textarea');
    descriptionTextarea.placeholder = 'Enter any important information';
    descriptionTextarea.style = `
  width: 100%;
  height: 80px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  overflow-y: auto;
`;

    descriptionTextarea.addEventListener('input', () => {
        if (descriptionTextarea.value.trim() !== '') {
            descriptionTextarea.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            descriptionTextarea.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // Prefill if stored
    const savedDescription = localStorage.getItem('lastItemDesc');
    if (savedDescription) {
        descriptionTextarea.value = savedDescription;
        descriptionTextarea.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            descriptionTextarea.dispatchEvent(new Event('input'));
        });
    }


    // Append to row
    row5.appendChild(descriptionLabel);
    row5.appendChild(descriptionTextarea);
    content.appendChild(row5);


    // call on init for row 1,2,3
    Initload();


    async function Initload() {
        // if there is no history.
        await loadTHIRD();
        await loadSUB();
        await loadCAT();

        // if there is history.
        if (localStorage.lastCATId) initCATField();
        if (localStorage.lastSUBId) initSUBField();
        if (localStorage.lastTHIRDId) initTHIRDField();
    }




    // ROW 11: Confirm button
    const row6 = document.createElement('div');

    // Button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'popup-confirm';


    // Click logic
    confirmBtn.addEventListener('click', async () => {
        // if (!isCATSelectionValid()) {
        //     showMessage("Invalid Category Id");
        //     return;
        // }
        // if (!isSUBSelectionValid()) {
        //     showMessage("Invalid Sub-Cat Id");
        //     return;
        // }
        // if (!isTHIRDSelectionValid()) {
        //     showMessage("Invalid Third Id");
        //     return;
        // }
        // // if (!isVersionValid()) {
        // //     showMessage("Invalid Version Id");
        // //     return;
        // // }
        // if (!descriptionTextarea.value) {
        //     showMessage("Empty Description");
        //     return;
        // }



        // loadingStart(0.5);



        const payload = {
            category_id: CATIdInput.value,
            sub_category_id: SUBIdInput.value,
            // third_letter_id: titleInput.value || 3,
            // code_number: priceInput.value || 3,
            description: descriptionTextarea.value
        };
        console.log('Payload ready:', payload);


        // the posting mechanism to the table : the content will be the payload

        // try {
        //     const response = await fetch(`${CONFIG.API_BASE_URL}/products/versions`, {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json"
        //         },
        //         body: JSON.stringify(payload)
        //     });


        //     const result = await response.json();

        //     if (!response.ok) {
        //         console.error("❌ Failed to add version:", result.error || result);
        //         alert("Failed to add item version: " + (result.error || "Unknown error"));
        //         return;
        //     }

        //     console.log("✅ Version added successfully:", result.data);
        // } catch (err) {
        //     console.error("❌ Error posting version:", err);
        //     alert("Error sending request. Please try again.");
        // }



        // store history
        localStorage.setItem('lastCATId', CATIdInput.value);
        localStorage.setItem('lastSUBId', SUBIdInput.value);
        localStorage.setItem('lastTHIRDId', THIRDIdInput.value);
        localStorage.setItem('lastItemDesc', descriptionTextarea.value);


        location.reload();
        // loadingStop();
        // overlay.remove();
        // Saved();
    });

    // Append button
    row6.appendChild(confirmBtn);
    content.appendChild(row6);


}
showAddItemPopup();

// -----4----- Edit Item popup
function showEditItemPopup() {
    createPopup('Edit Item', showItemConfigPopup);

}


// -----5----- Bulk Import popup
function showBulkImportPopup() {
    createPopup('Bulk Import', showItemConfigPopup);

}


// -----6----- Add Image popup
function showAddImagePopup() {
    const { overlay, title, content } = createPopup('Add Image', showItemConfigPopup);

    const mediaUnitsContainer = document.createElement('div');
    mediaUnitsContainer.style = `
    display: flex;
    flex-direction : column;
    gap : 12px;
    margin-bottom : 16px;
    border-radius: 10px;
    `;
    content.appendChild(mediaUnitsContainer);

    function createMediaUnit() {
        const unitWrapper = document.createElement('div');
        unitWrapper.classList.add('media-unit');
        unitWrapper.style.backgroundColor = 'rgb(68, 67, 67)';
        unitWrapper.style.padding = '12px';
        unitWrapper.style.borderRadius = '10px';

        const selectedFiles = {
            Image: null,
            Video: null,
        };

        // === Image/Video boxes ===
        const mediaRow = document.createElement('div');
        mediaRow.style.display = 'flex';
        mediaRow.style.gap = '12px';
        mediaRow.style.marginBottom = '12px';

        ['Image', 'Video'].forEach(type => {
            const box = document.createElement('div');
            box.style = `
              position: relative;
              flex: 1;
              aspect-ratio: 1 / 1;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f9f9f9;
              border: 1px solid #ccc;
              border-radius: 12px;
              overflow: hidden;
              cursor: pointer;
            `;

            const label = document.createElement('span');
            label.textContent = type;
            label.style = `
              position: absolute;
              color: #666;
              font-size: 20px;
            `;
            box.appendChild(label);

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = type === 'Image' ? 'image/*' : 'video/*';
            input.style = `
            opacity:0;
            position:absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            cursor:pointer;
            `;

            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    label.remove();

                    box.style = `
                     position: relative;
                     flex: 1;
                     aspect-ratio: 1 / 1;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     border-radius: 12px;
                     overflow: hidden;
                     cursor: pointer;
                     background: rgba(0, 0, 0, 0);
                    `;

                    const existing = box.querySelector('img, video');
                    if (existing) existing.remove();

                    let media;
                    if (type === 'Image') {
                        media = document.createElement('img');
                    } else {
                        media = document.createElement('video');
                        media.autoplay = true;
                        media.loop = true;
                        media.muted = true;
                        media.playsInline = true;
                    }

                    media.src = reader.result;
                    media.style.width = '100%';
                    media.style.height = '100%';
                    media.style.objectFit = 'contain';
                    box.appendChild(media);

                    selectedFiles[type] = file;
                };
                reader.readAsDataURL(file);
            };

            box.appendChild(input);
            mediaRow.appendChild(box);
        });

        unitWrapper.appendChild(mediaRow);

        // === File Name and Key Row ===
        const infoRow = document.createElement('div');
        infoRow.style.display = 'flex';
        infoRow.style.flexWrap = 'wrap';
        infoRow.style.gap = '8px';
        infoRow.style.width = '100%';

        const fileNameContainer = document.createElement('div');
        fileNameContainer.style.flex = '1';
        const fileNameLabel = document.createElement('label');
        fileNameLabel.textContent = 'File Name';
        fileNameLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
        const fileNameInput = document.createElement('input');
        fileNameInput.placeholder = 'E.g. FMA00101';
        fileNameInput.maxLength = 8;
        fileNameInput.classList.add("rounded-input");
        fileNameInput.style = `text-transform: uppercase;`;

        fileNameInput.addEventListener('input', () => {
            fileNameInput.value = fileNameInput.value.toUpperCase();
        });
        fileNameInput.addEventListener('input', () => {
            if (fileNameInput.value.length > 8) {
                fileNameInput.value = fileNameInput.value.slice(0, 8);
            }
        });
        fileNameInput.addEventListener('input', () => {
            if (fileNameInput.value.trim() !== '') {
                fileNameInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
            } else {
                fileNameInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
            }
        });

        fileNameContainer.appendChild(fileNameLabel);
        fileNameContainer.appendChild(fileNameInput);

        infoRow.appendChild(fileNameContainer);

        unitWrapper.appendChild(infoRow);

        unitWrapper._fileNameInput = fileNameInput;
        unitWrapper._selectedFiles = selectedFiles;

        return unitWrapper;
    }

    // Add first default unit
    const firstUnit = createMediaUnit();
    mediaUnitsContainer.appendChild(firstUnit);

    // Trigger the "show" animation on the first unit
    requestAnimationFrame(() => {
        firstUnit.classList.add('show');
    });




    // === Add More + Delete Buttons Row ===
    const actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '12px';
    actionRow.style.marginTop = '10px';

    // Add More button
    const addMoreBtn = document.createElement('button');
    addMoreBtn.textContent = 'Add More';
    addMoreBtn.style.flex = '1';
    addMoreBtn.style = `
    width: auto;
    margin-left: 35%;
    margin-top: 1rem;
    padding: 10px;
    background: rgb(143, 137, 137);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 1rem;
    `;

    addMoreBtn.onclick = () => {
        const newUnit = createMediaUnit();
        mediaUnitsContainer.appendChild(newUnit);

        // Animate in
        requestAnimationFrame(() => {
            newUnit.classList.add('show');
        });

        updateDeleteVisibility();
    };

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.flex = '1';
    deleteBtn.style.display = 'none';
    deleteBtn.style = `
    width: auto;
    margin-left: 5%;
    margin-top: 1rem;
    padding: 10px;
    background: rgb(79, 60, 60);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 1rem;
    `;


    deleteBtn.onclick = () => {
        const allUnits = mediaUnitsContainer.querySelectorAll('.media-unit');
        if (allUnits.length > 1) {
            const lastUnit = allUnits[allUnits.length - 1];
            lastUnit.classList.remove('show');
            lastUnit.classList.add('fade-out');

            // Wait for animation to finish before removing
            setTimeout(() => {
                lastUnit.remove();
                updateDeleteVisibility();
            }, 300); // matches CSS transition duration
        }
    };

    // Add both to action row
    actionRow.appendChild(deleteBtn);
    actionRow.appendChild(addMoreBtn);
    content.appendChild(actionRow);

    // === Helper function to toggle delete visibility
    function updateDeleteVisibility() {
        const unitCount = mediaUnitsContainer.querySelectorAll('.media-unit').length;
        deleteBtn.style.display = unitCount > 1 ? 'block' : 'none';
    }


    updateDeleteVisibility();




    // === Confirm Button ===
    const confirmRow = document.createElement('div');
    confirmRow.style.marginTop = '12px';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'popup-confirm';

    confirmBtn.onclick = async () => {
        loadingStart(0.5);
        const allUnits = mediaUnitsContainer.querySelectorAll('.media-unit');

        for (const unit of allUnits) {
            const selectedFiles = unit._selectedFiles;
            const customName = unit._fileNameInput.value.trim();

            for (const type of ['Image', 'Video']) {
                let file = selectedFiles[type];
                if (!file) {
                    console.log(`${type}: No file selected.`);
                    continue;
                }

                const ext = file.name.split('.').pop();
                let renamedFile;
                if (customName) {
                    renamedFile = new File([file], `${customName}.${ext}`, { type: file.type })
                } else {
                    renamedFile = file;
                }
                selectedFiles[type] = renamedFile;
                file = renamedFile;

                let uploadFile;
                if (type === 'Image') {
                    // front-end compression + resize
                    uploadFile = await compressImage(renamedFile, 1080, 0.2);
                } else {
                    // compressVideo 
                    uploadFile = await compressVideo(renamedFile, 640, 15, 250_000);
                }

                // upload to r2
                async function uploadToR2(file) {
                    const formData = new FormData();
                    formData.append('file', file, file.name);


                    const res = await fetch(`${CONFIG.API_BASE_URL}/upload`, {
                        method: 'POST',
                        // NO Authorization header needed
                        body: formData
                    });


                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Upload failed');
                    }

                    const { publicUrl } = await res.json();
                    return publicUrl;
                }


                // ── UPLOAD TO R2 ──
                try {
                    const publicUrl = await uploadToR2(uploadFile);
                    console.log(`Image uploaded`);
                    // console.log(`${type} uploaded to:`, publicUrl);
                    // you can store it on the unit if you like:
                    // unit._uploadedUrls = unit._uploadedUrls || {};
                    // unit._uploadedUrls[type.toLowerCase()] = publicUrl;
                } catch (err) {
                    console.error(`${type} upload error:`, err);
                    continue;  // skip download/test for this file if upload fails
                }


                // For now, download the compressed file locally to test
                const link = document.createElement('a');
                link.href = URL.createObjectURL(uploadFile);
                link.download = uploadFile.name;
                link.click();
            }

        }
        loadingStop();
        overlay.remove();
        Saved();
    };

    confirmRow.appendChild(confirmBtn);
    content.appendChild(confirmRow);
}



// -----7----- Delete popup
function showDeletePopup() {
    const { overlay, title, content } = createPopup('Delete', showItemConfigPopup);

    // delete options
    [
        { label: 'Delete Item', fn: showDeleteItem },
        { label: 'Delete Version', fn: showDeleteVersion }
    ].forEach(({ label, fn }) => {
        const btn = document.createElement('button');
        btn.className = 'popup-subpill';
        btn.textContent = label;
        btn.onclick = () => {
            document.body.removeChild(overlay);
            fn();
        };
        content.appendChild(btn);
    });
}

// -----7.1----- Delete Item popup
function showDeleteItem() {
    const { overlay, title, content } = createPopup('Delete Item', showDeletePopup);

    // 1) Input for item ID
    const itemIdContainer = document.createElement('div');
    itemIdContainer.style.flex = '1';
    const itemIdLabel = document.createElement('label');
    itemIdLabel.textContent = 'Enter Full Serial';
    itemIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const itemIdInput = document.createElement('input');
    itemIdInput.placeholder = 'E.g. FMA001';
    itemIdInput.maxLength = 6;
    itemIdInput.classList.add("rounded-input");
    itemIdInput.style = `text-transform: uppercase; margin-bottom: 5%;`;

    itemIdInput.addEventListener('input', () => {
        itemIdInput.value = itemIdInput.value.toUpperCase();
    });

    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.length > 6) {
            itemIdInput.value = itemIdInput.value.slice(0, 6);
        }
    });
    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.trim() !== '') {
            itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    itemIdContainer.appendChild(itemIdLabel);
    itemIdContainer.appendChild(itemIdInput);
    content.appendChild(itemIdContainer);


    // 2) Input for item ID again
    const itemIdContainer2 = document.createElement('div');
    itemIdContainer2.style.flex = '1';
    const itemIdLabel2 = document.createElement('label');
    itemIdLabel2.textContent = 'Enter Full Serial Again';
    itemIdLabel2.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const itemIdInput2 = document.createElement('input');
    itemIdInput2.placeholder = 'E.g. FMA001';
    itemIdInput2.maxLength = 6;
    itemIdInput2.classList.add("rounded-input");
    itemIdInput2.style = `text-transform: uppercase; margin-bottom: 5%;`;

    itemIdInput2.addEventListener('input', () => {
        itemIdInput2.value = itemIdInput2.value.toUpperCase();
    });

    itemIdInput2.addEventListener('input', () => {
        if (itemIdInput2.value.length > 6) {
            itemIdInput2.value = itemIdInput2.value.slice(0, 6);
        }
    });
    itemIdInput2.addEventListener('input', () => {
        if (itemIdInput2.value.trim() !== '') {
            itemIdInput2.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput2.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    itemIdContainer2.appendChild(itemIdLabel2);
    itemIdContainer2.appendChild(itemIdInput2);
    content.appendChild(itemIdContainer2);

    // 3) Error Message
    const errorMsg = document.createElement('div');
    errorMsg.style.flex = '1';
    const errorMsgP = document.createElement('label');
    errorMsgP.innerHTML = `
    <br> 
    <li> This action can <strong>NOT</strong> be undone </li>
    <li> Deleting an item will delete all the versions </li>
    <li> Consider Setting Availability to : <strong>FALSE</strong> </li>
    <br>
`;
    errorMsgP.style = `
    display: block; 
    font-size: 15px; 
    margin-bottom: 4px; 
    color: rgb(161, 156, 156);
    `;

    const errorMsgP2 = document.createElement('label');
    errorMsgP2.innerHTML = `
        <br> 
        <li> Values Must Match </li>
        <li> Fields Can not be empty </li>
        <li> A Full Serial Contains 6 Characters </li>
        <br>
    `;
    errorMsgP2.style = `
    display: none;
    font-size: 17px; 
    margin-bottom: 4px; 
    color: rgb(167, 9, 9);
    `;

    errorMsg.appendChild(errorMsgP);
    errorMsg.appendChild(errorMsgP2);
    content.appendChild(errorMsg);



    // 2) Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style = `
    width: 70%;
    margin-left: 15%;
    margin-right: 15%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgb(173, 10, 10);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 1rem;
    `;
    content.appendChild(deleteBtn);

    // 3) On click, build dummy payload and open second popup
    deleteBtn.onclick = () => {
        const input1 = itemIdInput.value.trim();
        const input2 = itemIdInput2.value.trim();
        if (input1 === input2 && input1 !== "" && itemIdInput.value.length >= 6) {
            console.log(`Deleting Item : ${input1}`);

            // deleting functionallity here


            // close current popup
            document.body.removeChild(overlay);
            Saved();

        } else {
            errorMsgP2.style.display = 'block';

        }

    };

}

// -----7.2----- Delete Version popup
function showDeleteVersion() {
    const { overlay, title, content } = createPopup('Delete Version', showDeletePopup);

    // 1) Input for item Version ID
    const itemIdContainer = document.createElement('div');
    itemIdContainer.style.flex = '1';
    const itemIdLabel = document.createElement('label');
    itemIdLabel.textContent = 'Enter Full Serial';
    itemIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const itemIdInput = document.createElement('input');
    itemIdInput.placeholder = 'E.g. FMA00101';
    itemIdInput.maxLength = 8;
    itemIdInput.classList.add("rounded-input");
    itemIdInput.style = `text-transform: uppercase; margin-bottom: 5%;`;

    itemIdInput.addEventListener('input', () => {
        itemIdInput.value = itemIdInput.value.toUpperCase();
    });

    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.length > 8) {
            itemIdInput.value = itemIdInput.value.slice(0, 8);
        }
    });
    itemIdInput.addEventListener('input', () => {
        if (itemIdInput.value.trim() !== '') {
            itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    itemIdContainer.appendChild(itemIdLabel);
    itemIdContainer.appendChild(itemIdInput);
    content.appendChild(itemIdContainer);


    // 2) Input for item ID again
    const itemIdContainer2 = document.createElement('div');
    itemIdContainer2.style.flex = '1';
    const itemIdLabel2 = document.createElement('label');
    itemIdLabel2.textContent = 'Enter Full Serial Again';
    itemIdLabel2.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const itemIdInput2 = document.createElement('input');
    itemIdInput2.placeholder = 'E.g. FMA00101';
    itemIdInput2.maxLength = 8;
    itemIdInput2.classList.add("rounded-input");
    itemIdInput2.style = `text-transform: uppercase; margin-bottom: 5%;`;

    itemIdInput2.addEventListener('input', () => {
        itemIdInput2.value = itemIdInput2.value.toUpperCase();
    });

    itemIdInput2.addEventListener('input', () => {
        if (itemIdInput2.value.length > 8) {
            itemIdInput2.value = itemIdInput2.value.slice(0, 8);
        }
    });
    itemIdInput2.addEventListener('input', () => {
        if (itemIdInput2.value.trim() !== '') {
            itemIdInput2.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            itemIdInput2.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    itemIdContainer2.appendChild(itemIdLabel2);
    itemIdContainer2.appendChild(itemIdInput2);
    content.appendChild(itemIdContainer2);

    // 3) Error Message
    const errorMsg = document.createElement('div');
    errorMsg.style.flex = '1';
    const errorMsgP = document.createElement('label');
    errorMsgP.innerHTML = `
    <br> 
    <li> This action can <strong>NOT</strong> be undone </li>
    <li> Consider Setting Availability to : <strong>FALSE</strong> </li>
    <br>
`;
    errorMsgP.style = `
    display: block; 
    font-size: 15px; 
    margin-bottom: 4px; 
    color: rgb(161, 156, 156);
    `;

    const errorMsgP2 = document.createElement('label');
    // errorMsgP2.style.display = 'none';
    errorMsgP2.innerHTML = `
        <br> 
        <li> Values Must Match </li>
        <li> Fields Can not be empty </li>
        <li> A Full Serial Contains 8 Characters </li>
        <br>
    `;
    errorMsgP2.style = `
    display: none;
    font-size: 17px; 
    margin-bottom: 4px; 
    color: rgb(167, 9, 9);
    `;

    errorMsg.appendChild(errorMsgP);
    errorMsg.appendChild(errorMsgP2);
    content.appendChild(errorMsg);



    // 2) Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style = `
    width: 70%;
    margin-left: 15%;
    margin-right: 15%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgb(173, 10, 10);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 1rem;
    `;
    content.appendChild(deleteBtn);

    // 3) On click, build dummy payload and open second popup
    deleteBtn.onclick = () => {
        const input1 = itemIdInput.value.trim();
        const input2 = itemIdInput2.value.trim();
        if (input1 === input2 && input1 !== "" && input1.length >= 8) {
            console.log(`Deleting Item Version : ${input1}`);

            // deleting functionallity here


            // close current popup
            document.body.removeChild(overlay);
            Saved();

        } else {
            errorMsgP2.style.display = 'block';

        }

    };

    deleteBtn.onclick = async () => {
        loadingStart(0.5);
        const serial1 = itemIdInput.value.trim();
        const serial2 = itemIdInput2.value.trim();

        if (serial1 === serial2 && serial1 !== '' && serial1.length >= 8) {
            // console.log(`Deleting Item Version : ${serial1}`);

            try {
                const resp = await fetch(
                    `${CONFIG.API_BASE_URL}/products/versions/serial/${serial1}`,
                    { method: 'DELETE' }
                );
                const json = await resp.json();

                if (!resp.ok) {
                    loadingStop();
                    showMessage("Failed To Delete");
                    // console.error('Delete failed:', json.error);
                    // alert('Failed to delete version: ' + (json.error || resp.status));
                    return;
                }

                // console.log('Deleted:', json.deleted);

                // close current popup
                loadingStop();
                overlay.remove();
                Saved();

            } catch (err) {
                loadingStop();
                console.error('Delete error:', err);
                showMessage("Error deleting version");
            }

        } else {
            loadingStop();
            errorMsgP2.style.display = 'block';
        }
    };

}







// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Categories
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showCategoriesPopup() {
    createPopup('Categories');

}






// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Orders
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showOrdersPopup() {
    createPopup('Orders');

}






// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Reviews
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showReviewsPopup() {
    createPopup('Reviews');

}





// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Notifications
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showNotificationsPopup() {
    createPopup('Notifications');

}





// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Analytics
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showAnalyticsPopup() {
    createPopup('Analytics');

}







// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Audits
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showAuditsPopup() {
    createPopup('Audits');

}






// ---------------------------------------------------------------------------------------------------------------------------------------------- 
//                                                                 Settings
// ---------------------------------------------------------------------------------------------------------------------------------------------- 

function showSettingsPopup() {
    createPopup('Settings');

}




















// Hook up the main pills
document.querySelectorAll('.setting-pill').forEach(btn => {
    const action = btn.dataset.action;
    if (action === 'items') btn.onclick = showItemConfigPopup;
    else if (action === 'categories') btn.onclick = showCategoriesPopup;
    else if (action === 'orders') btn.onclick = showOrdersPopup;
    else if (action === 'reviews') btn.onclick = showReviewsPopup;
    else if (action === 'notifications') btn.onclick = showNotificationsPopup;
    else if (action === 'analytics') btn.onclick = showAnalyticsPopup;
    else if (action === 'audit') btn.onclick = showAuditsPopup;
    else if (action === 'settings') btn.onclick = showSettingsPopup;

});


























































// // 6) Helper: call backend with admin JWT
// async function apiRequest(path, method = "GET", body = null) {
//     const url = `${CONFIG.API_BASE_URL}${path}`;
//     const opts = {
//         method,
//         headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${currentSession.access_token}`,
//         },
//     };
//     if (body) opts.body = JSON.stringify(body);

//     const res = await fetch(url, opts);
//     if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.error || "API request failed");
//     }
//     return res.json();
// }

// // 7) Item CRUD

// // 7a) Create new item
// createItemBtn.addEventListener("click", async () => {
//   const baseSerial = prompt("Enter baseSerial (e.g. FMA001):").trim();
//   const category = prompt("Enter category (e.g. Fashion):").trim();
//   const subCategory = prompt("Enter subCategory (e.g. Men):").trim();
//   if (!baseSerial || !category || !subCategory) {
//     alert("All fields are required.");
//     return;
//   }
//   try {
//     await apiRequest("/admin/items", "POST", {
//       baseSerial,
//       category,
//       subCategory,
//     });
//     alert("Item created successfully.");
//   } catch (err) {
//     alert("Error creating item: " + err.message);
//   }
// });

// // 7b) List all items
// listItemsBtn.addEventListener("click", async () => {
//   try {
//     const { data } = await apiRequest("/admin/items", "GET");
//     console.table(data); // opens a console table of items
//     alert("Check console for item list (or modify this to display in the DOM)");
//   } catch (err) {
//     alert("Error listing items: " + err.message);
//   }
// });

// // 7c) Update an item
// updateItemBtn.addEventListener("click", async () => {
//   const id = prompt("Enter item ID to update (numeric):").trim();
//   if (!id) return alert("ID is required.");
//   const updates = {};
//   const newBase = prompt("New baseSerial (leave blank to skip):").trim();
//   if (newBase) updates.baseSerial = newBase;
//   const newCat = prompt("New category (leave blank to skip):").trim();
//   if (newCat) updates.category = newCat;
//   const newSub = prompt("New subCategory (leave blank to skip):").trim();
//   if (newSub) updates.subCategory = newSub;
//   if (Object.keys(updates).length === 0) {
//     return alert("No fields to update.");
//   }
//   try {
//     await apiRequest(`/admin/items/${id}`, "PUT", updates);
//     alert("Item updated successfully.");
//   } catch (err) {
//     alert("Error updating item: " + err.message);
//   }
// });

// // 7d) Delete an item
// deleteItemBtn.addEventListener("click", async () => {
//   const id = prompt("Enter item ID to delete:").trim();
//   if (!id) return alert("ID is required.");
//   if (!confirm("Really delete item ID " + id + "?")) return;
//   try {
//     await apiRequest(`/admin/items/${id}`, "DELETE");
//     alert("Item deleted successfully.");
//   } catch (err) {
//     alert("Error deleting item: " + err.message);
//   }
// });

// // 8) Version CRUD

// // 8a) Create new version
// createVersionBtn.addEventListener("click", async () => {
//   const product_id = prompt("Enter parent item ID:").trim();
//   if (!product_id) return alert("Item ID is required.");
//   // Prompt for version fields:
//   const versionSerial = prompt("versionSerial (e.g. 01):").trim();
//   const title = prompt("Title:").trim();
//   const priceValue = parseInt(prompt("Price (integer):").trim());
//   const sizesRaw = prompt("Sizes (comma-separated, e.g. S,M,L):").trim();
//   const sizes = sizesRaw.split(",").map((s) => s.trim());
//   const imageKey = prompt(
//     "Image key (R2 filename, e.g. FMA00101.jpg):"
//   ).trim();
//   const description = prompt("Description (optional):").trim();
//   const inStock = confirm("In stock? OK = yes, Cancel = no");
//   if (!versionSerial || !title || isNaN(priceValue) || sizes.length === 0 || !imageKey) {
//     return alert("Missing required version fields.");
//   }

//   try {
//     await apiRequest("/admin/versions", "POST", {
//       product_id: parseInt(product_id),
//       versionSerial,
//       title,
//       priceValue,
//       sizes,
//       imageKey,
//       description,
//       inStock,
//     });
//     alert("Version created successfully.");
//   } catch (err) {
//     alert("Error creating version: " + err.message);
//   }
// });

// // 8b) List versions for a product
// listVersionsBtn.addEventListener("click", async () => {
//   const product_id = prompt("Enter item ID to list versions:").trim();
//   if (!product_id) return alert("Item ID is required.");
//   try {
//     const { data } = await apiRequest(`/admin/items/${product_id}/versions`, "GET");
//     console.table(data);
//     alert("Check console for version list (or modify this to display in DOM).");
//   } catch (err) {
//     alert("Error listing versions: " + err.message);
//   }
// });

// // 8c) Update a version
// updateVersionBtn.addEventListener("click", async () => {
//   const id = prompt("Enter version ID to update:").trim();
//   if (!id) return alert("Version ID is required.");
//   const updates = {};
//   const newTitle = prompt("New title (leave blank to skip):").trim();
//   if (newTitle) updates.title = newTitle;
//   const newPrice = prompt("New price (integer, leave blank to skip):").trim();
//   if (newPrice) updates.priceValue = parseInt(newPrice);
//   const newSizesRaw = prompt(
//     "New sizes (comma-separated, leave blank to skip):"
//   ).trim();
//   if (newSizesRaw) updates.sizes = newSizesRaw.split(",").map((s) => s.trim());
//   const newImageKey = prompt(
//     "New imageKey (R2 key, leave blank to skip):"
//   ).trim();
//   if (newImageKey) updates.imageKey = newImageKey;
//   const newInStock = prompt(
//     "Set inStock? (yes/no/leave blank to skip):"
//   ).trim().toLowerCase();
//   if (newInStock === "yes") updates.inStock = true;
//   else if (newInStock === "no") updates.inStock = false;

//   if (Object.keys(updates).length === 0) {
//     return alert("No fields to update.");
//   }
//   try {
//     await apiRequest(`/admin/versions/${id}`, "PUT", updates);
//     alert("Version updated successfully.");
//   } catch (err) {
//     alert("Error updating version: " + err.message);
//   }
// });

// // 8d) Delete a version
// deleteVersionBtn.addEventListener("click", async () => {
//   const id = prompt("Enter version ID to delete:").trim();
//   if (!id) return alert("Version ID is required.");
//   if (!confirm("Really delete version ID " + id + "?")) return;
//   try {
//     await apiRequest(`/admin/versions/${id}`, "DELETE");
//     alert("Version deleted successfully.");
//   } catch (err) {
//     alert("Error deleting version: " + err.message);
//   }
// });

// // 9) Category CRUD

// // 9a) Create new category
// createCategoryBtn.addEventListener("click", async () => {
//   const name = prompt("Enter category name (e.g. Fashion):").trim();
//   const letter = prompt("Enter category letter (e.g. F):").trim();
//   if (!name || !letter) return alert("Both fields are required.");
//   try {
//     await apiRequest("/admin/categories", "POST", { name, letter });
//     alert("Category created.");
//   } catch (err) {
//     alert("Error creating category: " + err.message);
//   }
// });

// // 9b) List categories
// listCategoriesBtn.addEventListener("click", async () => {
//   try {
//     const { data } = await apiRequest("/admin/categories", "GET");
//     console.table(data);
//     alert("Check console for category list.");
//   } catch (err) {
//     alert("Error listing categories: " + err.message);
//   }
// });

// // 9c) Update category
// updateCategoryBtn.addEventListener("click", async () => {
//   const id = prompt("Enter category ID to update:").trim();
//   if (!id) return alert("ID is required.");
//   const updates = {};
//   const newName = prompt("New name (leave blank to skip):").trim();
//   if (newName) updates.name = newName;
//   const newLetter = prompt("New letter (leave blank to skip):").trim();
//   if (newLetter) updates.letter = newLetter;
//   if (Object.keys(updates).length === 0) {
//     return alert("No fields to update.");
//   }
//   try {
//     await apiRequest(`/admin/categories/${id}`, "PUT", updates);
//     alert("Category updated.");
//   } catch (err) {
//     alert("Error updating category: " + err.message);
//   }
// });

// // 9d) Delete category
// deleteCategoryBtn.addEventListener("click", async () => {
//   const id = prompt("Enter category ID to delete:").trim();
//   if (!id) return alert("ID is required.");
//   if (!confirm("Delete category ID " + id + "?")) return;
//   try {
//     await apiRequest(`/admin/categories/${id}`, "DELETE");
//     alert("Category deleted.");
//   } catch (err) {
//     alert("Error deleting category: " + err.message);
//   }
// });











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

    // 3) Close (“<”) button
    const closeBtn = document.createElement("button");
    closeBtn.className = 'popup-back-btn';
    closeBtn.innerHTML = '<img src="icons/back.svg" alt="Back">';

    closeBtn.onclick = () => document.body.removeChild(overlay);
    box.appendChild(closeBtn);

    // 4) Heading
    const heading = document.createElement("h2");
    heading.innerText = "New Secret-Key";
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


