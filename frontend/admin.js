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

    back.onclick = () => {
        document.body.removeChild(overlay);
        if (typeof onBack === 'function') onBack();
    };

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
function compressImage(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(blob => {
                    const compressed = new File([blob], file.name, { type: file.type });
                    resolve(compressed);
                }, 'image/jpeg', 0.2); // JPEG, 20% quality
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// compress video
async function compressVideo(file) {
    // This does NOT compress much — real compression needs server-side tools like ffmpeg
    return new File([file], file.name, { type: file.type });
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
// function showAddVersionPopup() {
//     const { overlay, title, content } = createPopup('Add Version', showItemConfigPopup);

//     // 11 inputs + 2 selectors in first 2 rows
//     for (let i = 1; i <= 11; i++) {
//         const row = document.createElement('div');
//         row.style.display = 'flex';
//         row.style.gap = '6px';
//         row.style.marginBottom = '6px';

//         const input = document.createElement('input');
//         input.title = `Field ${i}`;
//         input.placeholder = `Field ${i}`;
//         input.style.flex = i <= 2 ? '1' : 'auto';
//         input.style.padding = '6px';
//         row.appendChild(input);

//         if (i <= 2) {
//             const sel = document.createElement('select');
//             sel.innerHTML = '<option>Unit</option><option>Value</option>';
//             sel.style.padding = '6px';
//             row.appendChild(sel);
//         }

//         content.appendChild(row);
//     }

//     // wide description box
//     const desc = document.createElement('textarea');
//     desc.placeholder = 'Version description…';
//     desc.style.width = '100%';
//     desc.style.height = '60px';
//     desc.style.overflowX = 'auto';
//     content.appendChild(desc);

//     // file + camera + name input + preview
//     const fileRow = document.createElement('div');
//     fileRow.style.display = 'flex';
//     fileRow.style.alignItems = 'center';
//     fileRow.style.gap = '4px';

//     const upload = document.createElement('input');
//     upload.type = 'file';
//     upload.accept = 'image/*,video/*';
//     upload.onchange = (e) => {
//         const [file] = e.target.files;
//         if (!file) return;
//         const reader = new FileReader();
//         reader.onload = () => {
//             const img = document.createElement('img');
//             img.src = reader.result;
//             img.style.width = '40px';
//             img.style.height = '40px';
//             fileRow.appendChild(img);
//         };
//         reader.readAsDataURL(file);
//     };
//     fileRow.appendChild(upload);

//     const nameIn = document.createElement('input');
//     nameIn.placeholder = 'File name…';
//     nameIn.style.flex = '1';
//     fileRow.appendChild(nameIn);

//     content.appendChild(fileRow);

//     // confirm
//     const confirm = document.createElement('button');
//     confirm.className = 'popup-confirm';
//     confirm.textContent = 'Confirm';
//     content.appendChild(confirm);
// }

function showAddVersionPopup() {
    const { overlay, title, content } = createPopup('Add Version', showItemConfigPopup);
    // basic style helpers
    const pillStyle = `
    border: 1px solid #ccc;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 14px;
    outline: none;
  `;
    const inputStyle = pillStyle + 'background: #fff; flex: 1;';
    const selectStyle = pillStyle + 'background: #fff; flex: 1;';

    // common row container
    const makeRow = (heightPercent = null) => {
        const r = document.createElement('div');
        r.style.display = 'flex';
        r.style.alignItems = 'center';
        r.style.margin = '6px 0';
        r.style.gap = '8px';
        if (heightPercent) r.style.height = heightPercent;
        return r;
    };



    // ROW 1: Media boxes + inputs below with external labels
    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.flexDirection = 'column';
    row1.style.gap = '12px';
    row1.style.marginBottom = '16px';

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
          z-index: 1;
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
        input.capture = type.toLowerCase();
        input.style = 'opacity:0;position:absolute;top:0;left:0;width:100%;height:100%;cursor:pointer;';


        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            // Use the provided file name input
            const customName = fileNameInput.value.trim();
            const ext = file.name.split('.').pop();

            // Only rename if name is provided
            const finalFile = (customName)
                ? new File([file], `${customName}.${ext}`, { type: file.type })
                : file;

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
    fileNameInput.style = `
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      border: 1px solid #ccc;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 14px;
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
    keyInput.maxLength = 1;
    keyInput.style = `
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
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
    itemIdContainer.style.flex = '2';
    itemIdContainer.style.minWidth = '0';

    const itemIdLabel = document.createElement('label');
    itemIdLabel.textContent = 'Item Id';
    itemIdLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const itemIdInput = document.createElement('input');
    itemIdInput.placeholder = 'E.g   FMA001';
    itemIdInput.maxLength = 6;
    itemIdInput.style = `
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid #ccc;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 14px;
          text-transform: uppercase;
        `;


    // Prefill itemIdInput if stored
    const savedItemId = localStorage.getItem('lastItemId');
    if (savedItemId) {
        itemIdInput.value = savedItemId;
        itemIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            itemIdInput.dispatchEvent(new Event('input'));
        });
    }

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

    // Selector container (2 parts)
    const itemSelectContainer = document.createElement('div');
    itemSelectContainer.style.flex = '3';
    itemSelectContainer.style.minWidth = '0';

    const itemSelectLabel = document.createElement('label');
    itemSelectLabel.textContent = 'Item Selector';
    itemSelectLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';

    const itemSelect = document.createElement('select');
    itemSelect.style = `
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 14px;
    `;

    //  populate this from DB
    // const Items = `  
    // <option value="" selected>Select Item…</option>
    // <option value="1">Men Sweater</option>
    // <option value="2">Men Shirt</option>
    // <option value="3">Men's Jeans</option>
    // `;

    // itemSelect.innerHTML = Items;



    itemSelect.addEventListener('change', () => {
        if (itemSelect.value !== '') {
            itemSelect.style.backgroundColor = 'rgba(193, 239, 183, 0.43)'; // light green
        } else {
            itemSelect.style.backgroundColor = 'rgba(210, 185, 161, 0.46)'; // reset
        }
    });

    itemSelectContainer.appendChild(itemSelectLabel);
    itemSelectContainer.appendChild(itemSelect);


    // populate from DB
    // items title map
    const itemMap = {
        9: "Men Sweater",
        7: "Men Shirt",
        10: "Long jeans",
        2: "Men's Jeans"
    };


    function buildItemOptions(itemMap) {
        return `
        <option value="" selected>Select Item…</option>
        ${Object.entries(itemMap)
                .map(([id, title]) => `<option value="${id}">${title}</option>`)
                .join('')}
        `;
    }

    const Items = buildItemOptions(itemMap);
    itemSelect.innerHTML = Items;

    // Reverse map
    const titleToIdMap = Object.entries(itemMap).reduce((acc, [id, title]) => {
        acc[title] = id;
        return acc;
    }, {});

    itemIdInput.addEventListener('input', () => {
        const id = itemIdInput.value.trim().toUpperCase();
        itemIdInput.value = id; // Force uppercase

        if (id !== '') {
            itemSelect.disabled = true;
            itemSelect.style.opacity = 0.8;

            const title = itemMap[id] || 'No Item Found';
            itemSelect.innerHTML = `<option value="">${title}</option>`;
            itemSelect.style.backgroundColor = '';

        } else {
            itemSelect.disabled = false;
            itemSelect.style.opacity = 1;
            itemSelect.innerHTML = Items; // Reset to original options
            itemSelect.style.backgroundColor = '';
        }
    });

    itemSelect.addEventListener('change', () => {
        const selected = itemSelect.options[itemSelect.selectedIndex].text;

        if (itemSelect.value !== '') {
            itemIdInput.disabled = true;
            itemIdInput.style.opacity = 0.8;
            itemIdInput.style.backgroundColor = '';

            const id = titleToIdMap[selected] || '';
            itemIdInput.value = id;

        } else {
            itemIdInput.disabled = false;
            itemIdInput.style.opacity = 1;
            itemIdInput.value = '';
            itemIdInput.style.backgroundColor = '';
        }
    });


    // Append containers to row
    row2.appendChild(itemIdContainer);
    row2.appendChild(itemSelectContainer);
    content.appendChild(row2);




    // ROW 3: Unique Item ID input + availability indicator
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

    uniqueIdInput.style = `
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    uniqueIdInput.addEventListener('input', () => {
        if (uniqueIdInput.value.length > 2) {
            uniqueIdInput.value = uniqueIdInput.value.slice(0, 2);
        }
    });
    uniqueIdInput.addEventListener('input', () => {
        if (uniqueIdInput.value.trim() !== '') {
            uniqueIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            uniqueIdInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

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
    titleInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    titleInput.addEventListener('input', () => {
        if (titleInput.value.trim() !== '') {
            titleInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            titleInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

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
    priceInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    priceInput.addEventListener('input', () => {
        if (priceInput.value.trim() !== '') {
            priceInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            priceInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

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
    sizeInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    sizeInput.addEventListener('input', () => {
        if (sizeInput.value.trim() !== '') {
            sizeInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            sizeInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    // On input: convert comma-separated string to array and log
    sizeInput.addEventListener('input', () => {
        const raw = sizeInput.value;
        const array = raw
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        console.log('Size Array:', array);
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
    materialInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    materialInput.addEventListener('input', () => {
        if (materialInput.value.trim() !== '') {
            materialInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            materialInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

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
    weightInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    weightInput.addEventListener('input', () => {
        if (weightInput.value.trim() !== '') {
            weightInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            weightInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

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
    marginInput.placeholder = 'E.g   1.5';
    marginInput.value = '1.5';
    marginInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
  background-color: rgba(193, 239, 183, 0.43);
`;

    marginInput.addEventListener('input', () => {
        if (marginInput.value.trim() !== '') {
            marginInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';
        } else {
            marginInput.style.backgroundColor = 'rgba(210, 185, 161, 0.46)';
        }
    });

    marginContainer.appendChild(marginLabel);
    marginContainer.appendChild(marginInput);

    // In Stock container
    const stockContainer = document.createElement('div');
    stockContainer.style.flex = '1';
    const stockLabel = document.createElement('label');
    stockLabel.textContent = 'In Stock';
    stockLabel.style = 'display: block; font-size: 13px; margin-bottom: 4px; color: rgb(161, 156, 156);';
    const stockSelect = document.createElement('select');
    stockSelect.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
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
    sellerIdInput.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

    const savedSellerId = localStorage.getItem('lastSellerId');
    if (savedSellerId) {
        sellerIdInput.value = savedSellerId;
        sellerIdInput.style.backgroundColor = 'rgba(193, 239, 183, 0.43)';

        requestAnimationFrame(() => {
            sellerIdInput.dispatchEvent(new Event('input'));
        });
    }

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
    // sellerSelect.innerHTML = '<option value="">Select Seller…</option>'; 
    sellerSelect.style = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
`;

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
    // sellers title map
    const sellerMap = {
        1: "Al Muftah Shop",
        2: "Multistar Electronics",
        3: "Bi fashion",
        4: "Mwembe kuku",
        5: "Jolte City"
    };



    function buildSellerOptions(sellerMap) {
        return `
        <option value="" selected>Select Item…</option>
        ${Object.entries(sellerMap)
                .map(([id, title]) => `<option value="${id}">${title}</option>`)
                .join('')}
        `;
    }

    const sellers = buildSellerOptions(sellerMap);
    itemSelect.innerHTML = sellers;



    // Reverse map
    const sellerToIdMap = Object.entries(sellerMap).reduce((acc, [id, title]) => {
        acc[title] = id;
        return acc;
    }, {});

    sellerIdInput.addEventListener('input', () => {
        const id = sellerIdInput.value.trim().toUpperCase();
        sellerIdInput.value = id; // Force uppercase

        if (id !== '') {
            sellerSelect.disabled = true;
            sellerSelect.style.opacity = 0.8;

            const title = sellerMap[id] || 'No Seller Found';
            sellerSelect.innerHTML = `<option value="">${title}</option>`;
            sellerSelect.style.backgroundColor = '';

        } else {
            sellerSelect.disabled = false;
            sellerSelect.style.opacity = 1;
            sellerSelect.innerHTML = sellers; // Reset to original options
            sellerSelect.style.backgroundColor = '';
        }
    });

    sellerSelect.addEventListener('change', () => {
        const selected = sellerSelect.options[sellerSelect.selectedIndex].text;

        if (sellerSelect.value !== '') {
            sellerIdInput.disabled = true;
            sellerIdInput.style.opacity = 0.8;
            sellerIdInput.style.backgroundColor = '';

            const id = sellerToIdMap[selected] || '';
            sellerIdInput.value = id;

        } else {
            sellerIdInput.disabled = false;
            sellerIdInput.style.opacity = 1;
            sellerIdInput.value = '';
            sellerIdInput.style.backgroundColor = '';
        }
    });


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


    // Append to row
    row10.appendChild(attrLabel);
    row10.appendChild(attrTextarea);
    content.appendChild(row10);




    // ROW 11: Confirm button
    const row11 = document.createElement('div');
    row11.style.width = '100%';

    // Button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'popup-confirm'; // already styled in your CSS
    confirmBtn.style.width = '100%';
    confirmBtn.style.borderRadius = '999px';

    // Click logic
    confirmBtn.addEventListener('click', async () => {

        const payload = {
            base_item_id: itemIdInput.value,
            version_number: uniqueIdInput.value.padStart(2, '0'),
            title: titleInput.value,
            price: priceInput.value,
            image_key: keyInput.value,
            sizes: sizeInput.value.split(',').map(s => s.trim()),
            // sizes: JSON.stringify(sizeInput.value.split(',').map(s => s.trim())),
            material: materialInput.value,
            weight: weightInput.value,
            other_attrs: attrTextarea.value,
            in_stock: stockSelect.options[stockSelect.selectedIndex].text,
            profit_margin: marginInput.value,
            seller_id: sellerIdInput.value,

        };
        console.log('Payload ready:', payload);


        // store history
        // localStorage.setItem('lastItemId', payload.base_item_id);
        // localStorage.setItem('lastSellerId', payload.seller_id);

        // // ❌ Incorrect
        // localStorage.setItem('lastItemId', payload.itemIdInput);
        // localStorage.setItem('lastSellerId', payload.sellerIdInput);

        // // ✅ Correct
        localStorage.setItem('lastItemId', itemIdInput.value);
        localStorage.setItem('lastSellerId', sellerIdInput.value);



        for (const type of ['Image', 'Video']) {
            const file = selectedFiles[type];
            if (!file) {
                console.log(`${type}: No file selected.`);
                continue;
            }

            console.log(`${type}: Original File`, file);

            let compressedFile;
            if (type === 'Image') {
                compressedFile = await compressImage(file);
            } else {
                compressedFile = await compressVideo(file);
            }

            console.log(`${type}: Compressed File`, compressedFile);

            // For now, download the compressed file locally to test
            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressedFile);
            link.download = compressedFile.name;
            link.click();
        }



        overlay.remove();
        Saved();
    });

    // Append button
    row11.appendChild(confirmBtn);
    content.appendChild(row11);




}

showAddVersionPopup();

// -----2----- Edit Version popup
function showEditVersionPopup() {
    createPopup('Edit Version', showItemConfigPopup);
}


// -----3----- Add Item popup
function showAddItemPopup() {
    createPopup('Add Item', showItemConfigPopup);
}


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
    createPopup('Add Image', showItemConfigPopup);
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
    createPopup('Delete Item', showDeletePopup);

}

// -----7.2----- Delete Version popup
function showDeleteVersion() {
    createPopup('Delete Version', showDeletePopup);

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
    heading.innerText = "Generate New Secret-Key";
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


