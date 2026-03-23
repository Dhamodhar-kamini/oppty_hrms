// ==========================================
// 1. CONFIGURATION & GLOBAL VARIABLES
// ==========================================
const API_BASE_URL = "https://api.theoppty.com";

// Store pending action details here
let pendingAction = null; 

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
    // Initial Load
    loadLeaves();
    loadAssetRequests();
    loadAttendanceRequests();
    setupDropdowns();
});

// ==========================================
// 2. MODAL & UI LOGIC
// ==========================================

// Setup Dropdowns (Profile & Notification)
function setupDropdowns() {
    // Sidebar
    const menuBtn = document.getElementById("dashboardMenu");
    const submenu = document.getElementById("dashboardSubmenu");
    if (menuBtn && submenu) {
        menuBtn.onclick = () => {
            menuBtn.classList.toggle("open");
            submenu.classList.toggle("open");
        };
    }

    // Bell Notification
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
}

// --- CONFIRMATION MODAL FUNCTIONS ---

// 1. Open the Modal
function showConfirmModal(type, id, actionType) {
    const modal = document.getElementById('confirmModal');
    const iconEl = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const textEl = document.getElementById('modalText');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    // Store action for later
    pendingAction = { type, id, actionType };

    // Update UI based on action (Approve vs Reject)
    const isApprove = actionType.toLowerCase() === 'approved' || actionType.toLowerCase() === 'approve';
    
    // Icon
    iconEl.className = `modal-icon ${isApprove ? 'approve' : 'reject'}`;
    iconEl.innerHTML = isApprove ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-xmark"></i>';

    // Text
    titleEl.textContent = isApprove ? 'Approve Request?' : 'Reject Request?';
    textEl.textContent = `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this ${type} request?`;

    // Button Style
    confirmBtn.className = `btn-modal btn-modal-confirm ${isApprove ? 'approve' : 'reject'}`;
    confirmBtn.textContent = isApprove ? 'Yes, Approve' : 'Yes, Reject';

    // Show Modal
    modal.classList.add('show');
}

// 2. Close the Modal
window.closeConfirmModal = function() {
    document.getElementById('confirmModal').classList.remove('show');
    pendingAction = null;
};

// 3. Handle Confirm Click
document.getElementById('modalConfirmBtn').addEventListener('click', function() {
    if (!pendingAction) return;

    const { type, id, actionType } = pendingAction;
    
    // Call the specific API function based on type
    if (type === 'leave') {
        processLeaveUpdate(id, actionType);
    } else if (type === 'asset') {
        processAssetUpdate(id, actionType);
    } else if (type === 'attendance') {
        processAttendanceUpdate(id, actionType);
    }

    closeConfirmModal();
});

// Toast Notification
function showToast(type, msg) {
    // If you have a toast container in HTML, use it. Otherwise, console log
    console.log(`[${type}] ${msg}`);
    
    // Create a temporary toast if one doesn't exist
    let toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.color = '#fff';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '3000';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.innerText = msg;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}


// ==========================================
// 3. LEAVES SECTION
// ==========================================

function loadLeaves() {
    const leaveTableBody = document.getElementById('leaveTableBody');
    if (!leaveTableBody) return;

    fetch(`${API_BASE_URL}/api/leave-approvals/`)
    .then(res => res.json())
    .then(response => {
        const data = response.data || response; 
        leaveTableBody.innerHTML = "";

        if (!data || data.length === 0) {
            leaveTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending leaves found</td></tr>`;
            return;
        }

        data.forEach(p => {
            // Note: Updated onclick handlers to use showConfirmModal
            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="showConfirmModal('leave', ${p.id}, 'Rejected')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="showConfirmModal('leave', ${p.id}, 'Approved')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                </div>
            `;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${p.name}</td>
                <td>${p.details || p.leave_type || '-'}</td>
                <td>${p.duration || '-'}</td>
                <td>${p.reason}</td>
                <td>${p.days || '-'}</td>
                <td>${actionHtml}</td>
            `;
            leaveTableBody.appendChild(row);
        });
    })
    .catch(err => {
        console.error("Error fetching leaves:", err);
        leaveTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Failed to load leaves</td></tr>`;
    });
}

// Actual API Call for Leaves
function processLeaveUpdate(id, status) {
    // Convert status to lowercase for API if needed (usually 'approved'/'rejected')
    const apiStatus = status.toLowerCase();

    fetch(`${API_BASE_URL}/api/employee/update/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatus })
    })
    .then(res => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
    })
    .then(() => {
        loadLeaves(); 
        showToast("success", `Leave ${status}`);
    })
    .catch(err => {
        console.error(err);
        showToast("error", "Action failed");
    });
}


// ==========================================
// 4. ASSETS APPROVAL SECTION
// ==========================================

async function loadAssetRequests() {
    const assetTableBody = document.getElementById("assetsTableBody");
    if (!assetTableBody) return;
    
    assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/asset-requests/`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        
        assetTableBody.innerHTML = "";

        if (!data || data.length === 0) {
            assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending asset requests</td></tr>`;
            return;
        }

        data.forEach(req => {
            if (req.status && req.status.toLowerCase() !== 'pending') return;

            const dateStr = req.created_at ? req.created_at.split('T')[0] : new Date().toLocaleDateString();

            // Note: Updated onclick handlers
            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="showConfirmModal('asset', ${req.id}, 'Rejected')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="showConfirmModal('asset', ${req.id}, 'Approved')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                </div>`;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${req.employee_name}</td>
                <td>${req.asset_category}</td>
                <td>${req.location}</td>
                <td>${dateStr}</td>
                <td>${req.description || '-'}</td>
                <td>${actionHtml}</td>
            `;
            assetTableBody.appendChild(row);
        });
        
        if (assetTableBody.children.length === 0) {
            assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending requests</td></tr>`;
        }

    } catch (error) {
        console.error("Error loading assets:", error);
        assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading data</td></tr>`;
    }
}

// Actual API Call for Assets
function processAssetUpdate(id, status) {
    fetch(`https://api.theoppty.com/api/admin/asset-request-status/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
    })
    .then(() => {
        loadAssetRequests();
        showToast("success", `Asset ${status}`);
    })
    .catch(err => {
        console.error(err);
        showToast("error", "Failed to update asset status");
    });
}


// ==========================================
// 5. ATTENDANCE APPROVAL SECTION
// ==========================================

async function loadAttendanceRequests() {
    const attendanceTableBody = document.getElementById("attendanceTableBody");
    if (!attendanceTableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/attendance-requests/`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        
        attendanceTableBody.innerHTML = "";

        if (!data || data.length === 0) {
            attendanceTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending attendance requests</td></tr>`;
            return;
        }

        data.forEach(req => {
            if (req.status && req.status.toLowerCase() !== 'pending') return;

            // Note: Updated onclick handlers
            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="showConfirmModal('attendance', ${req.id}, 'Rejected')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="showConfirmModal('attendance', ${req.id}, 'Approved')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                </div>`;

            const row = document.createElement("tr");
            const inTime = req.clock_in || '-';
            const outTime = req.clock_out || '-';

            row.innerHTML = `
                <td>${req.employee_name}</td>
                <td>Correction</td>
                <td>${req.date}</td>
                <td>In: ${inTime} <br> Out: ${outTime}</td>
                <td>${req.reason}</td>
                <td>${actionHtml}</td>
            `;
            attendanceTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading attendance:", error);
        attendanceTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading data</td></tr>`;
    }
}

// Actual API Call for Attendance
function processAttendanceUpdate(id, status) {
    fetch(`${API_BASE_URL}/api/admin/attendance-status/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
    })
    .then(() => {
        loadAttendanceRequests();
        showToast("success", `Attendance ${status}`);
    })
    .catch(err => {
        console.error(err);
        showToast("error", "Failed to update status");
    });
}

// ==========================================
// 6. UI NAVIGATION (Tabs & Profile)
// ==========================================

window.switchTab = function(tabName, btnElement) {
    const titleMap = {
        leave: "Leaves",
        attendance: "Attendance",
        assets: "Assets"
    };
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = titleMap[tabName] || "Dashboard";

    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    document.querySelectorAll(".table-responsive").forEach(section => section.classList.add("hidden"));
    const target = document.getElementById(tabName + "-section");
    if (target) target.classList.remove("hidden");
};

// Profile & Logout Logic
window.hdr_toggleProfilePopup = function() {
  const dropdown = document.getElementById("hdrProfileDropdown");
  if (dropdown) dropdown.classList.toggle("show");
};

window.hdr_showLogoutModal = function() {
  const dropdown = document.getElementById("hdrProfileDropdown");
  if (dropdown) dropdown.classList.remove("show");

  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.add("show-modal");
};

window.hdr_hideLogoutModal = function() {
  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.remove("show-modal");
};

window.hdr_confirmLogout = function() {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "../../index.html";
};

// Global click to close profile dropdown
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