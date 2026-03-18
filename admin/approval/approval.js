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

// ==========================================
// 1. CONFIGURATION & GLOBAL VARIABLES
// ==========================================

const API_BASE_URL = "https://api.theoppty.com";

// ==========================================
// 2. UI & NAVIGATION LOGIC
// ==========================================
// Tab Switch Logic (Attached to window so HTML onclick works)
window.switchTab = function(tabName, btnElement) {
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

document.addEventListener('DOMContentLoaded', () => {

    // Sidebar Toggle
    const menuBtn = document.getElementById("dashboardMenu");
    const submenu = document.getElementById("dashboardSubmenu");
    if (menuBtn && submenu) {
        menuBtn.onclick = function () {
            this.classList.toggle("open");
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

// Load Data Initially
    loadLeaves();
    loadAssetRequests();
    loadAttendanceRequests();
});

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
            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="rejectLeave(${p.id})">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="approveLeave(${p.id})">
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

// Leave Action Functions
window.approveLeave = function(id) {
    if(!confirm("Approve this leave?")) return;
    updateLeaveStatus(id, "approved");
};

window.rejectLeave = function(id) {
    if(!confirm("Reject this leave?")) return;
    updateLeaveStatus(id, "rejected");
};

function updateLeaveStatus(id, status) {
    fetch(`${API_BASE_URL}/api/employee/update/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    })
    .then(res => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
    })
    .then(() => {
        loadLeaves(); // Reload table
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
            // Only show Pending requests
            if (req.status && req.status.toLowerCase() !== 'pending') return;

            const dateStr = req.created_at ? req.created_at.split('T')[0] : new Date().toLocaleDateString();

            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="updateAssetStatus(${req.id}, 'Rejected')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="updateAssetStatus(${req.id}, 'Approved')">
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

        // If all were filtered out
        if (assetTableBody.children.length === 0) {
            assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending requests</td></tr>`;
        }

    } catch (error) {
        console.error("Error loading assets:", error);
        assetTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading data</td></tr>`;
    }
}

window.updateAssetStatus = function(id, status) {
    if(!confirm(`Mark asset request as ${status}?`)) return;

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
        loadAssetRequests(); // Reload table
        showToast("success", `Asset ${status}`);
    })
    .catch(err => {
        console.error(err);
        showToast("error", "Failed to update asset status");
    });
};


// ==========================================
// 5. ATTENDANCE APPROVAL SECTION
// ==========================================

async function loadAttendanceRequests() {
    const attendanceTableBody = document.getElementById("attendanceTableBody");
    if (!attendanceTableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/attendance-requests/`); // Updated endpoint to match pattern
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        attendanceTableBody.innerHTML = "";

        if (!data || data.length === 0) {
            attendanceTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending attendance requests</td></tr>`;
            return;
        }

        data.forEach(req => {
            // Only show Pending
            if (req.status && req.status.toLowerCase() !== 'pending') return;

            const actionHtml = `
                <div class="action-cell">
                    <button class="btn-action-reject" onclick="updateAttendanceStatus(${req.id}, 'Rejected')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="btn-action-approve" onclick="updateAttendanceStatus(${req.id}, 'Approved')">
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

window.updateAttendanceStatus = function(id, status) {
    if(!confirm(`Mark attendance request as ${status}?`)) return;

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
};

// Helper: Simple Toast Notification (Optional, prevents crashing if missing)
function showToast(type, msg) {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    // If you have a toast element, add logic here:
    // const toast = document.getElementById("popupToast"); 
    // ... logic ...
}


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