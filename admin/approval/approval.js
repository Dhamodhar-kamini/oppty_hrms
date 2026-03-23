// ==========================================
// 1. CONFIGURATION & GLOBAL VARIABLES
// ==========================================
const API_BASE_URL = "https://api.theoppty.com";

// Track state
let pendingAction = null; 
let currentActiveTab = 'leave'; // Default tab

// --- PRELOADER LOGIC ---
window.addEventListener("load", function () {
    const preloader = document.getElementById("page-preloader");
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add("loaded");
            setTimeout(() => { preloader.style.display = "none"; }, 500);
        }
    }, 800);
});

document.addEventListener('DOMContentLoaded', () => {
    // Initial Data Load
    loadLeaves();
    loadAssetRequests();
    loadAttendanceRequests();
    setupUI();
});

// ==========================================
// 2. UI & EVENT LISTENERS
// ==========================================

function setupUI() {
    // Sidebar Toggle
    const menuBtn = document.getElementById("dashboardMenu");
    const submenu = document.getElementById("dashboardSubmenu");
    if (menuBtn && submenu) {
        menuBtn.onclick = () => {
            menuBtn.classList.toggle("open");
            submenu.classList.toggle("open");
        };
    }

    // Notification Dropdown
    const bellBtn = document.getElementById('ntBellBtn');
    const dropdown = document.getElementById('ntDropdown');
    if(bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        window.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // ✅ "Approve All" Button Listener
    const approveAllBtn = document.getElementById("approveAllBtn");
    if (approveAllBtn) {
        approveAllBtn.addEventListener("click", function() {
            // Trigger the modal with ID 'ALL'
            showConfirmModal(currentActiveTab, 'ALL', 'Approved');
        });
    }
}

// ✅ Tab Switching (Updated to track current tab)
window.switchTab = function(tabName, btnElement) {
    currentActiveTab = tabName; // Store active tab

    const titleMap = {
        leave: "Leaves",
        attendance: "Attendance",
        assets: "Assets"
    };
    
    // Update Title
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = titleMap[tabName] || "Dashboard";

    // Update Buttons
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    // Show/Hide Sections
    document.querySelectorAll(".table-responsive").forEach(section => section.classList.add("hidden"));
    const target = document.getElementById(tabName + "-section");
    if (target) target.classList.remove("hidden");
};


// ==========================================
// 3. MODAL LOGIC (Single & Bulk)
// ==========================================

// Open Modal
function showConfirmModal(type, id, actionType) {
    const modal = document.getElementById('confirmModal');
    const iconEl = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const textEl = document.getElementById('modalText');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    // Store action for later
    pendingAction = { type, id, actionType };

    const isApprove = actionType.toLowerCase() === 'approved';
    const isBulk = id === 'ALL'; // Check if it's "Approve All"

    // Icon
    iconEl.className = `modal-icon ${isApprove ? 'approve' : 'reject'}`;
    iconEl.innerHTML = isApprove ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-xmark"></i>';

    // ✅ Dynamic Text for Bulk vs Single
    if (isBulk) {
        titleEl.textContent = "Approve All?";
        textEl.textContent = `Are you sure you want to approve ALL pending ${type} requests?`;
        confirmBtn.textContent = "Yes, Approve All";
    } else {
        titleEl.textContent = isApprove ? 'Approve Request?' : 'Reject Request?';
        textEl.textContent = `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this request?`;
        confirmBtn.textContent = isApprove ? 'Yes, Approve' : 'Yes, Reject';
    }

    // Button Color
    confirmBtn.className = `btn-modal btn-modal-confirm ${isApprove ? 'approve' : 'reject'}`;

    modal.classList.add('show');
}

// Close Modal
window.closeConfirmModal = function() {
    document.getElementById('confirmModal').classList.remove('show');
    pendingAction = null;
};

// Confirm Button Click
document.getElementById('modalConfirmBtn').addEventListener('click', function() {
    if (!pendingAction) return;

    const { type, id, actionType } = pendingAction;
    
    // ✅ Check if it is a Bulk Action or Single Action
    if (id === 'ALL') {
        performBulkApprove(type);
    } else {
        // Single Actions
        if (type === 'leave') processLeaveUpdate(id, actionType);
        else if (type === 'asset') processAssetUpdate(id, actionType);
        else if (type === 'attendance') processAttendanceUpdate(id, actionType);
    }

    closeConfirmModal();
});


// ==========================================
// 4. BULK APPROVE LOGIC (The New Feature)
// ==========================================

async function performBulkApprove(type) {
    showToast("info", "Processing bulk approval...");

    let endpointList = "";
    let statusKey = "status"; // Some APIs might differ
    let updateUrlBase = "";

    // 1. Determine Endpoints based on Type
    if (type === 'leave') {
        endpointList = `${API_BASE_URL}/api/leave-approvals/`;
        updateUrlBase = `${API_BASE_URL}/api/employee/update/`; 
    } else if (type === 'asset') {
        endpointList = `${API_BASE_URL}/api/admin/asset-requests/`;
        updateUrlBase = `https://api.theoppty.com/api/admin/asset-request-status/`;
    } else if (type === 'attendance') {
        endpointList = `${API_BASE_URL}/api/admin/attendance-requests/`;
        updateUrlBase = `${API_BASE_URL}/api/admin/attendance-status/`;
    }

    try {
        // 2. Fetch ALL requests to find the pending IDs
        const res = await fetch(endpointList);
        const json = await res.json();
        const data = json.data || json;

        // Filter for Pending items
        const pendingItems = data.filter(item => {
            // Check status property (some APIs use 'status', leave uses 'status' inside object usually)
            // Assuming default structure provided in previous codes
            const s = item.status || 'pending'; 
            return s.toLowerCase() === 'pending';
        });

        if (pendingItems.length === 0) {
            showToast("info", "No pending requests to approve.");
            return;
        }

        // 3. Create an array of Promises (Parallel Requests)
        const promises = pendingItems.map(item => {
            return fetch(`${updateUrlBase}${item.id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [statusKey]: "Approved" })
            });
        });

        // 4. Wait for all to finish
        await Promise.all(promises);

        // 5. Refresh Data
        if (type === 'leave') loadLeaves();
        else if (type === 'asset') loadAssetRequests();
        else if (type === 'attendance') loadAttendanceRequests();

        showToast("success", `Approved ${pendingItems.length} requests successfully!`);

    } catch (error) {
        console.error("Bulk Approve Error:", error);
        showToast("error", "Some requests failed to update.");
    }
}


// ==========================================
// 5. INDIVIDUAL API ACTIONS
// ==========================================

// Leaves
function loadLeaves() {
    const tbody = document.getElementById('leaveTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    fetch(`${API_BASE_URL}/api/leave-approvals/`)
    .then(res => res.json())
    .then(response => {
        const data = response.data || response;
        tbody.innerHTML = "";
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending leaves</td></tr>`;
            return;
        }
        data.forEach(p => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${p.name}</td>
                <td>${p.details || p.leave_type || '-'}</td>
                <td>${p.duration || '-'}</td>
                <td>${p.reason}</td>
                <td>${p.days || '-'}</td>
                <td>
                    <div class="action-cell">
                        <button class="btn-action-reject" onclick="showConfirmModal('leave', ${p.id}, 'Rejected')"><i class="fa-solid fa-xmark"></i></button>
                        <button class="btn-action-approve" onclick="showConfirmModal('leave', ${p.id}, 'Approved')"><i class="fa-solid fa-check"></i> Approve</button>
                    </div>
                </td>`;
            tbody.appendChild(row);
        });
    }).catch(() => tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Failed to load</td></tr>`);
}

function processLeaveUpdate(id, status) {
    updateItem(`${API_BASE_URL}/api/employee/update/${id}/`, status, loadLeaves);
}

// Assets
async function loadAssetRequests() {
    const tbody = document.getElementById("assetsTableBody");
    if (!tbody) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/asset-requests/`);
        const data = await res.json();
        tbody.innerHTML = "";
        
        const pending = data.filter(r => !r.status || r.status.toLowerCase() === 'pending');

        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending assets</td></tr>`;
            return;
        }

        pending.forEach(req => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${req.employee_name}</td>
                <td>${req.asset_category}</td>
                <td>${req.location}</td>
                <td>${req.created_at ? req.created_at.split('T')[0] : '-'}</td>
                <td>${req.description || '-'}</td>
                <td>
                    <div class="action-cell">
                        <button class="btn-action-reject" onclick="showConfirmModal('asset', ${req.id}, 'Rejected')"><i class="fa-solid fa-xmark"></i></button>
                        <button class="btn-action-approve" onclick="showConfirmModal('asset', ${req.id}, 'Approved')"><i class="fa-solid fa-check"></i> Approve</button>
                    </div>
                </td>`;
            tbody.appendChild(row);
        });
    } catch(e) { console.error(e); }
}

function processAssetUpdate(id, status) {
    updateItem(`https://api.theoppty.com/api/admin/asset-request-status/${id}/`, status, loadAssetRequests);
}

// Attendance
async function loadAttendanceRequests() {
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/attendance-requests/`);
        const data = await res.json();
        tbody.innerHTML = "";
        
        const pending = data.filter(r => !r.status || r.status.toLowerCase() === 'pending');

        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending attendance</td></tr>`;
            return;
        }

        pending.forEach(req => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${req.employee_name}</td>
                <td>Correction</td>
                <td>${req.date}</td>
                <td>In: ${req.clock_in} <br> Out: ${req.clock_out}</td>
                <td>${req.reason}</td>
                <td>
                    <div class="action-cell">
                        <button class="btn-action-reject" onclick="showConfirmModal('attendance', ${req.id}, 'Rejected')"><i class="fa-solid fa-xmark"></i></button>
                        <button class="btn-action-approve" onclick="showConfirmModal('attendance', ${req.id}, 'Approved')"><i class="fa-solid fa-check"></i> Approve</button>
                    </div>
                </td>`;
            tbody.appendChild(row);
        });
    } catch(e) { console.error(e); }
}

function processAttendanceUpdate(id, status) {
    updateItem(`${API_BASE_URL}/api/admin/attendance-status/${id}/`, status, loadAttendanceRequests);
}

// Generic Update Helper
function updateItem(url, status, reloadCallback) {
    fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    })
    .then(res => { if(!res.ok) throw new Error("Failed"); return res.json(); })
    .then(() => {
        reloadCallback();
        showToast("success", `Request ${status}`);
    })
    .catch(() => showToast("error", "Action Failed"));
}

// Toast Notification
function showToast(type, msg) {
    console.log(`[${type}] ${msg}`);
    let toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.background = type === 'success' ? '#28a745' : (type === 'info' ? '#17a2b8' : '#dc3545');
    toast.style.color = '#fff';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '3000';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Profile & Logout (Keep existing logic)
window.hdr_toggleProfilePopup = function() {
  document.getElementById("hdrProfileDropdown")?.classList.toggle("show");
};
window.hdr_showLogoutModal = function() {
  document.getElementById("hdrProfileDropdown")?.classList.remove("show");
  document.getElementById("hdrLogoutModal")?.classList.add("show-modal");
};
window.hdr_hideLogoutModal = function() {
  document.getElementById("hdrLogoutModal")?.classList.remove("show-modal");
};
window.hdr_confirmLogout = function() {
  sessionStorage.clear(); localStorage.clear();
  window.location.href = "../../index.html";
};