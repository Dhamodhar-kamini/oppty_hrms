
// --- PRELOADER LOGIC ---
window.addEventListener("load", function () {
    const preloader = document.getElementById("page-preloader");
    
    // Minimum wait time of 800ms for a smooth experience, 
    // even if the page loads instantly.
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add("loaded");
            
            // Optional: Remove it from DOM entirely after fade out ends
            setTimeout(() => {
                preloader.style.display = "none";
            }, 500); // Matches CSS transition time
        }
    }, 800);
});

// --- Data Storage ---
let hraAssets = [];
let hraReturnAssets = [];
let currentEditingDatabaseId = null; 

// --- Asset Allocation Selectors ---
const hraTableBody = document.getElementById('hraAssetTableBody');
const hraModal = document.getElementById('hraAssetModal');
const hraModalTitle = document.getElementById('hraModalTitle');
const hraModalSubmitBtn = document.getElementById('hraModalSubmitBtn');
const hraAddBtn = document.getElementById('hraAddAssetBtn');
const hraCloseBtn = document.getElementById('hraCloseModal');
const hraAssetForm = document.getElementById('hraAssetForm');
const hraSearchInput = document.getElementById('hraSearchInput');

// --- Sidebar/Global Selectors ---
const hraSidebar = document.getElementById('hraSidebar');
const hraMenuToggle = document.getElementById('hraMenuToggle');
const hraSuccessPopup = document.getElementById('hraSuccessPopup');

// --- Return Assets Selectors ---
const hraReturnTableBody = document.getElementById('hraReturnTableBody');
const hraReturnModal = document.getElementById('hraReturnModal');
const hraReturnForm = document.getElementById('hraReturnForm');
const hraReturnSearchInput = document.getElementById('hraReturnSearchInput');
const hraReturnCloseModal = document.getElementById('hraReturnCloseModal');

// --- Notifications Selectors ---
const bellBtn = document.getElementById('ntBellBtn');
const dropdown = document.getElementById('ntDropdown');
const markReadBtn = document.getElementById('ntMarkAllRead');
const ntListContainer = document.getElementById('ntList');
const ntBadge = document.getElementById('ntBadge');


// ==========================================
// 2. CORE UTILITY FUNCTIONS
// ==========================================

// Helper to get Icon Class based on type
function hraGetIcon(type) {

    if (!type) return "fa-box";

    const t = type.toLowerCase().replace(/\s/g, "");

    switch (t) {

        case "laptop":
            return "fa-laptop";

        case "monitor":
            return "fa-desktop";

        case "phone":
            return "fa-mobile-screen";

        case "headset":
            return "fa-headphones";

        case "keyboard":
            return "fa-keyboard";

        case "mouse":
            return "fa-computer-mouse";

        case "charger":
            return "fa-plug";

        case "idcard":
        case "id":
            return "fa-id-card";

        default:
            return "fa-box";
    }
}
// Helper to Show Success Popup
function showSuccessPopup() {
    if (!hraSuccessPopup) return;
    hraSuccessPopup.classList.add('hra-show');
    setTimeout(() => {
        hraSuccessPopup.classList.remove('hra-show');
    }, 3000);
}


// ==========================================
// 3. ASSET ALLOCATION LOGIC
// ==========================================

// Fetch Assets from API
async function loadAssets() {
    try {
        const response = await fetch("http://13.51.167.95:8000/api/assets/");
        if (response.ok) {
            const data = await response.json();
            hraAssets = data;
            hraRenderTable(hraAssets);
        } else {
            console.error("Failed to fetch assets");
        }
    } catch (error) {
        console.error("Error loading assets:", error);
    }
}

// Render Asset Table
function hraRenderTable(data) {
    if (!hraTableBody) return;
    hraTableBody.innerHTML = '';

    if (data.length === 0) {
        hraTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No assets found.</td></tr>';
        return;
    }

    data.forEach(asset => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">${asset.asset_id}</td>
            <td>${asset.emp_id}</td>
            <td>${asset.employee}</td>
            <td><i class="fa-solid ${hraGetIcon(asset.asset_type)}"></i> ${asset.asset_type}</td>
            <td>${asset.model_details}</td>
            <td>${asset.assigned_date}</td>
            <td><span class="hra-status-badge hra-status-${asset.status}">${asset.status}</span></td>
            <td>
                <button class="hra-action-icon hra-edit-btn" data-pk="${asset.id}">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="hra-action-icon hra-delete-btn" data-pk="${asset.id}" style="color:#ef4444;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        hraTableBody.appendChild(tr);
    });
}

// Filter Assets
function hraGetFilteredAssets() {
    const term = hraSearchInput ? hraSearchInput.value.toLowerCase().trim() : '';
    if (!term) return hraAssets;

    return hraAssets.filter(asset =>
        (asset.employee && asset.employee.toLowerCase().includes(term)) ||
        (asset.asset_id && asset.asset_id.toLowerCase().includes(term)) ||
        (asset.model_details && asset.model_details.toLowerCase().includes(term))||
        (asset.emp_id && asset.emp_id.toLowerCase().includes(term))
    );
}

// Modal Operations
function hraOpenModalForCreate() {
    currentEditingDatabaseId = null;
    if (hraModalTitle) hraModalTitle.textContent = 'Allocate New Asset';
    if (hraModalSubmitBtn) hraModalSubmitBtn.textContent = 'Confirm Allocation';
    if (hraAssetForm) {
        hraAssetForm.reset();
         document.getElementById('hraAssetId').disabled = false; 
        // document.getElementById('hraEmpId').value = '';
        // document.getElementById('hraEmpEmail').value = '';
    }
    if (hraModal) hraModal.style.display = 'flex';
}

function hraOpenModalForEdit(asset) {
    currentEditingDatabaseId = asset.id; 

    if (hraModalTitle) hraModalTitle.textContent = 'Edit Asset Details';
    if (hraModalSubmitBtn) hraModalSubmitBtn.textContent = 'Save Changes';

    document.getElementById('hraEmpId').value = asset.emp_id || '';
    document.getElementById('hraEmpName').value = asset.employee;
    document.getElementById('hraEmpEmail').value = asset.email || '';
    document.getElementById('hraAssetType').value = asset.asset_type;
    document.getElementById('hraModelDetails').value = asset.model_details;
    document.getElementById('hraAssetId').value = asset.asset_id;
    document.getElementById('hraAssetId').disabled = true; 
    document.getElementById('hraAssignDate').value = asset.assigned_date;

    if (hraModal) hraModal.style.display = 'flex';
}

function hraCloseModal() {
    currentEditingDatabaseId = null;
    if (hraModal) hraModal.style.display = 'none';
    if (hraAssetForm) hraAssetForm.reset();
}


// ==========================================
// 4. RETURN ASSETS LOGIC (UPDATED)
// ==========================================

// Fetch Return Assets from API + DUMMY DATA FALLBACK
async function loadReturnAssets() {
    try {
        const response = await fetch("http://13.51.167.95:8000/api/return-assets/");

        if (response.ok) {
            const data = await response.json();

            hraReturnAssets = data.map(item => ({
                ...item,
                status: item.status || "pending"
            }));

            hraRenderReturnTable(hraReturnAssets);

        } else {
            console.error("Failed to fetch return assets");
        }

    } catch (error) {
        console.error("Error loading return assets:", error);
        hraReturnAssets = [];
    }

    hraRenderReturnTable(hraReturnAssets);
}

// Render Return Table (Without Status Column, Actions Only)
function hraRenderReturnTable(data) {
    if (!hraReturnTableBody) return;
    hraReturnTableBody.innerHTML = '';

    if (!data || data.length === 0) {
        hraReturnTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #6b7280;">No returned assets yet.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        
        // --- Actions Logic ---
        let actionsHtml = '';

        // Delete Button (Always visible)
        const deleteBtn = `
            <button class="hra-action-icon hra-return-delete-btn" data-id="${item.id}" title="Delete" style="border:none; background:transparent; cursor:pointer; color: #ef4444; font-size: 14px;">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        // If 'received' -> Show Text "Received"
        if (item.status === 'received') {
            actionsHtml = `<span style="color:#166534; font-weight:600; font-size:13px; margin-right:10px;">Received</span> ${deleteBtn}`;
        } 
        // If 'not_received' -> Show Text "Not Received"
        else if (item.status === 'not_received') {
            actionsHtml = `<span style="color:#991b1b; font-weight:600; font-size:13px; margin-right:10px;">Not Received</span> ${deleteBtn}`;
        } 
        // If 'pending' -> Show Tick & Cross Buttons
        else {
            actionsHtml = `
                <div style="display:flex; align-items:center; gap: 8px;">
                    <button class="hra-return-confirm-btn" data-id="${item.id}" title="Mark Received" 
                        style="border: 1px solid #10b981; background: transparent; color: #10b981; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    
                    <button class="hra-return-reject-btn" data-id="${item.id}" title="Mark Not Received" 
                        style="border: 1px solid #ef4444; background: transparent; color: #ef4444; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    
                    <div style="width:1px; height:18px; background:#e5e7eb; margin:0 4px;"></div>
                    ${deleteBtn}
                </div>
            `;
        }

        // Handle inconsistent API field names
        const name = item.employee_name || item.name || 'Unknown';
        const type = item.asset_type || item.assetType || 'Unknown';
        const condition = item.condition || 'Unknown';
        const reason = item.description || item.reason || '-';

        tr.innerHTML = `
            <td style="padding:12px 15px;">${name}</td>
            <td style="padding:12px 15px;"><i class="fa-solid ${hraGetIcon(type)}"></i> ${type}</td>
            <td style="padding:12px 15px;">${condition}</td>
            <td style="padding:12px 15px;">${reason}</td>
            <td style="padding:12px 15px;">${actionsHtml}</td>
        `;
        hraReturnTableBody.appendChild(tr);
    });
}

function hraGetFilteredReturnAssets() {
    const term = hraReturnSearchInput ? hraReturnSearchInput.value.toLowerCase().trim() : '';
    if (!term) return hraReturnAssets;
    return hraReturnAssets.filter(item => {
        const name = item.employee_name || item.name || '';
        const type = item.asset_type || item.assetType || '';
        return name.toLowerCase().includes(term) || type.toLowerCase().includes(term);
    });
}

function hraCloseReturnModalFunc() {
    if (hraReturnModal) hraReturnModal.style.display = 'none';
    if (hraReturnForm) hraReturnForm.reset();
}


// ==========================================
// 5. NOTIFICATIONS LOGIC
// ==========================================
let notifications = [
    { id: 1, text: "<strong>Dhamodhar</strong> applied for the UX Designer position.", time: "2 mins ago", icon: "👩‍💼", read: false },
    { id: 2, text: "Meeting with <strong>Dev Team</strong> starts in 15 minutes.", time: "15 mins ago", icon: "📅", read: false },
    { id: 3, text: "New system update available.", time: "1 hour ago", icon: "⚙️", read: true },
    { id: 4, text: "<strong>Arjun</strong> accepted the offer.", time: "3 hours ago", icon: "✅", read: true }
];

function ntRenderList() {
    if (!ntListContainer) return;

    ntListContainer.innerHTML = '';
    const unreadCount = notifications.filter(n => !n.read).length;

    if (ntBadge) {
        if (unreadCount > 0) {
            ntBadge.style.display = 'flex';
            ntBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        } else {
            ntBadge.style.display = 'none';
        }
    }

    if (notifications.length === 0) {
        ntListContainer.innerHTML = '<div class="nt-empty">No notifications</div>';
        return;
    }

    notifications.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `nt-item ${!item.read ? 'nt-unread' : ''}`;
        itemDiv.innerHTML = `
            <div class="nt-avatar">${item.icon}</div>
            <div class="nt-content">
                <p class="nt-text">${item.text}</p>
                <span class="nt-time">${item.time}</span>
            </div>
        `;
        itemDiv.addEventListener('click', () => {
            item.read = true;
            ntRenderList();
        });
        ntListContainer.appendChild(itemDiv);
    });
}


// ==========================================
// 6. MAIN EVENT LISTENERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Data
    loadAssets();
    loadReturnAssets();
    
    // 2. Initialize Notifications
    if (bellBtn) ntRenderList();

    // ----------------------------
    // Event Listeners: Asset Allocation
    // ----------------------------
    if (hraAddBtn) hraAddBtn.addEventListener('click', hraOpenModalForCreate);
    if (hraCloseBtn) hraCloseBtn.addEventListener('click', hraCloseModal);
    
    // Search
    if (hraSearchInput) {
        hraSearchInput.addEventListener('input', () => hraRenderTable(hraGetFilteredAssets()));
    }

    // Asset Form Submit (Save/Update)
    if (hraAssetForm) {
    hraAssetForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const assetData = {
            asset_id: document.getElementById('hraAssetId').value,
            emp_id: document.getElementById('hraEmpId').value,
            employee: document.getElementById('hraEmpName').value,
            email: document.getElementById('hraEmpEmail').value,
            asset_type: document.getElementById('hraAssetType').value,
            model_details: document.getElementById('hraModelDetails').value,
            assigned_date: document.getElementById('hraAssignDate').value,
            status: "assigned"
        };

        try {

            let url = "http://13.51.167.95:8000/api/assets/save/";
            let method = "POST";

            // If editing → update instead of create
            if(currentEditingDatabaseId){
                    url = `http://13.51.167.95:8000/api/assets/${currentEditingDatabaseId}/`;
                    method = "PATCH";
                }

            const response = await fetch(url,{
                method: method,
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(assetData)
            });

            if(response.ok){
                loadAssets();
                hraCloseModal();
                showSuccessPopup();
            }
            else {
                    alert("Failed to save asset. Check console.");

        }}
         catch(error){
            console.error(error);
        }

    });
}
    // Asset Table Actions (Edit/Delete)
    if (hraTableBody) {
        hraTableBody.addEventListener('click', async(e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const dbId = button.getAttribute('data-pk');

            if (button.classList.contains('hra-edit-btn')) {
                const asset = hraAssets.find(a => a.id == dbId);
                if (asset) hraOpenModalForEdit(asset);
            }

            if (button.classList.contains('hra-delete-btn')) {

    if(confirm("Are you sure you want to delete this asset?")) {

        const response = await fetch(`http://13.51.167.95:8000/api/assets/${dbId}/`,{
            method:"DELETE"
        });

        if(response.ok){
            loadAssets(); // reload data from backend
            showSuccessPopup();
        }else{
            console.error("Delete failed");
        }
    }
}
        });
    }

    // ----------------------------
    // Event Listeners: Return Assets
    // ----------------------------
    if (hraReturnCloseModal) {
        hraReturnCloseModal.addEventListener('click', hraCloseReturnModalFunc);
    }
    
    // Return Form Submit
    if (hraReturnForm) {
        hraReturnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const condition = document.getElementById('hraReturnCondition').value;
            const reason = document.getElementById('hraReturnReason').value;

            if (!condition || !reason) {
                alert('Please fill in all fields');
                return;
            }

            // Save Return Data Logic
            const returnData = {
                id: Date.now(),
                employee_name: "Current Selection", 
                asset_type: "Unknown",
                condition: condition,
                description: reason,
                status: 'pending' 
            };

            hraReturnAssets.push(returnData);
            hraRenderReturnTable(hraGetFilteredReturnAssets());
            hraCloseReturnModalFunc();
            showSuccessPopup();
        });
    }

    // Search Return
    if (hraReturnSearchInput) {
        hraReturnSearchInput.addEventListener('input', () => hraRenderReturnTable(hraGetFilteredReturnAssets()));
    }

    // Return Table Actions (Tick/Cross/Delete)
    if (hraReturnTableBody) {
        hraReturnTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const returnId = button.getAttribute('data-id'); 
            // Handle different ID types (string/number)
            const assetIndex = hraReturnAssets.findIndex(a => a.id == returnId);

            if (assetIndex === -1) return;

 // 1️⃣ Mark Received (Green Tick)
if (button.classList.contains('hra-return-confirm-btn')) {

    const response = await fetch(`http://13.51.167.95:8000/api/return-status/${returnId}/`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            status: "received"
        })
    });

    if (response.ok) {
        loadReturnAssets();
        loadAssets();
        showSuccessPopup();
    }
}
        
    

// 2️⃣ Mark Not Received (Red Cross)
if (button.classList.contains('hra-return-reject-btn')) {

    const response = await fetch(`http://13.51.167.95:8000/api/return-status/${returnId}/`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            status: "not_received"
        })
    });

    if (response.ok) {
        loadReturnAssets();
        showSuccessPopup();
    }
}

            // 3. Delete Return Record
            if (button.classList.contains('hra-return-delete-btn')) {

    if(confirm("Delete this return record?")) {

        const response = await fetch(`http://13.51.167.95:8000/api/return-assets/${returnId}/`,{
            method:"DELETE"
        });

        if(response.ok){
            loadReturnAssets();   // reload from backend
            showSuccessPopup();
        }
    }
}
        });
    }

    // ----------------------------
    // Event Listeners: Notifications & Sidebar
    // ----------------------------
    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
        });
    }

    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            notifications.forEach(n => n.read = true);
            ntRenderList();
        });
    }

    if (hraMenuToggle) {
        hraMenuToggle.addEventListener('click', () => {
            hraSidebar.classList.toggle('hra-active');
        });
    }

    // Close Modals/Dropdowns on Outside Click
    window.addEventListener('click', (e) => {
        if (hraModal && e.target == hraModal) hraCloseModal();
        if (hraReturnModal && e.target == hraReturnModal) hraCloseReturnModalFunc();
        if (dropdown && bellBtn && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
});


// ==========================================
// LOGOUT SECTION
// ==========================================
function hdr_toggleProfilePopup() {
  const dropdown = document.getElementById("hdrProfileDropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

function hdr_showLogoutModal() {
  const dropdown = document.getElementById("hdrProfileDropdown");
  if (dropdown) dropdown.classList.remove("show");

  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.add("show-modal");
}

function hdr_hideLogoutModal() {
  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.remove("show-modal");
}

function hdr_confirmLogout() {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "../../index.html";
}

window.onclick = function (event) {
  if (!event.target.closest(".hdr-profile-wrapper")) {
    const dropdown = document.getElementById("hdrProfileDropdown");
    if (dropdown && dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
    }
  }

  const modal = document.getElementById("hdrLogoutModal");
  if (event.target === modal) {
    hdr_hideLogoutModal();
  }
};