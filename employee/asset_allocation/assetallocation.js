// ==========================================
// 1. CONFIGURATION & GLOBAL VARIABLES
// ==========================================

const API_BASE_URL = "https://api.theoppty.com";

// Get User Data from LocalStorage
const DB_PK = localStorage.getItem("employee_id"); 
const WORK_ID = localStorage.getItem("work_id");
const EMP_ID = DB_PK;
let EMP_NAME = localStorage.getItem("emp_name") || "Employee";
let EMP_ROLE = localStorage.getItem("emp_role") || "Associate Software Engineer";

// Chart Instance Variable
let assetChart = null;

// ==========================================
// 2. INITIALIZATION (ON PAGE LOAD)
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Login Status
    if (!EMP_ID) {
        console.warn("No Employee ID found. Redirecting to login...");
        window.location.href = "../employee_login/emp_login.html";
        return;
    }

    console.log("Logged in as ID:", EMP_ID);

    // 2. Initial UI Setup (Set defaults while loading)
    updateUserInterface(EMP_NAME, EMP_ROLE, EMP_ID);

    // 3. Fetch Data from Backend
    // await fetchEmployeeProfile(EMP_ID);
    // await loadEmployeeAssets(EMP_ID);
    await fetchEmployeeProfile(DB_PK); // Stays 11 to get Balaji's name/role
    await loadEmployeeAssets(WORK_ID);

    // 4. Setup Mobile Sidebar (if element exists)
    const mobileBtn = document.getElementById('mobile-menu-btn'); // Adjust ID if needed
    const sidebar = document.querySelector('.sidebar'); // Adjust selector if needed
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});

// ==========================================
// 3. CORE API FUNCTIONS
// ==========================================

/**
 * Fetch Employee Name/Role to ensure data is up to date
 */
async function fetchEmployeeProfile(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employee/dashboard/${id}/`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Update Globals
            if (data.name) EMP_NAME = data.name;
            if (data.role) EMP_ROLE = data.role;

            // Update UI
            updateUserInterface(EMP_NAME, EMP_ROLE, id);
        }
    } catch (error) {
        console.error("Could not fetch profile:", error);
    }
}

/**
 * Fetch and Render Assets
 */
/**
 * Fetch and Filter Assets Locally
 */
async function loadEmployeeAssets(id) {
    try {
        // 1. Fetch ALL assets from the general assets endpoint
        // This avoids the "109" vs "11" URL error because we aren't putting the ID in the URL path
        const response = await fetch(`${API_BASE_URL}/api/assets/`);

        if (!response.ok) throw new Error("Failed to fetch assets");

        const allAssets = await response.json();
        
        // 2. Filter the list in JavaScript to only show 109
        // We use WORK_ID (109) here to match the 'emp_id' column in the Asset model
        const myWorkId = localStorage.getItem("work_id");
        const filteredData = allAssets.filter(asset => asset.emp_id == myWorkId);
        
        console.log(`Filtered ${allAssets.length} assets down to ${filteredData.length} for ID: ${myWorkId}`);

        // 3. Render only YOUR assets
        renderAssetChart(filteredData);
        renderAssetTable(filteredData);

    } catch (error) {
        console.error("Error loading assets:", error);
        const tableBody = document.getElementById("ast-table-body");
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">No assets found for ID 109</td></tr>`;
    }
}

// ==========================================
// 4. UI RENDERING FUNCTIONS
// ==========================================

function updateUserInterface(name, role, id) {
    document.querySelectorAll("#name").forEach(el => el.innerText = name);
    
    const roleEl = document.getElementById("role");
    if (roleEl) roleEl.innerText = role;

    const idEl = document.getElementById("employee_id");
    if (idEl) {
        // Change this line to show the WORK_ID (109)
        idEl.innerText = WORK_ID || id; 
    }
}

function renderAssetTable(assets) {
    const tableBody = document.getElementById("ast-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (assets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">No assets allocated</td></tr>`;
        return;
    }

    assets.forEach(asset => {
        let badgeClass = "ast-badge-active"; 
        if (asset.status && asset.status.toLowerCase() === "returned") badgeClass = "ast-badge-returned"; 

        const row = `
        <tr>
            <td>
                <div class="ast-row-info">
                    <div class="ast-icon-box">
                        <i class="fa-solid fa-laptop"></i>
                    </div>
                    <div>
                        <strong>${asset.asset_type}</strong>
                        <span>${asset.model_details || 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td>${asset.asset_id}</td>
            <td>${asset.assigned_date}</td>
            <td><span class="ast-badge ${badgeClass}">${asset.status}</span></td>
        </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function renderAssetChart(assets) {
    const ctx = document.getElementById("ast-main-chart");
    if (!ctx) return; 

    // Calculate Data
    const assetTypes = ["Laptop", "Monitor", "Keyboard", "Mouse", "Phone"];
    const assetCount = { Laptop: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Phone: 0 };

    assets.forEach(asset => {
        // Normalize casing logic
        const type = Object.keys(assetCount).find(key => key.toLowerCase() === (asset.asset_type || "").toLowerCase());
        if (type) assetCount[type]++;
    });

    const values = assetTypes.map(type => assetCount[type]);
    const maxValue = Math.max(...values);
    const chartMax = maxValue > 0 ? Math.ceil(maxValue / 5) * 5 : 5; 

    // Destroy previous instance to prevent glitches
    if (assetChart) assetChart.destroy();

    assetChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: assetTypes,
            datasets: [{
                label: "Assets",
                data: values,
                backgroundColor: ["#FF5B1E", "#164E63", "#FCD34D", "#10B981", "#6366F1"],
                borderRadius: 6,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: chartMax, grid: { color: "#f3f4f6" } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ==========================================
// 5. ASSET REQUEST (POST)
// ==========================================

function openAssetRequest() {
    const modal = document.getElementById("assetRequest");
    if(modal) modal.style.display = "flex";
}

function closeAssetRequest() {
    const modal = document.getElementById("assetRequest");
    if(modal) modal.style.display = "none";
}

function submitAssetRequest() {
    const category = document.getElementById("AssetCategory").value;
    const description = document.getElementById("assetDes").value;
    const location = document.getElementById("assetLocation").value;

    if (!category || !description || !location) {
        showToast("error", "Please fill all fields");
        return;
    }

    const payload = {
        emp_id: localStorage.getItem("work_id"),
        employee_name: localStorage.getItem("emp_name"), // Pull directly from storage
        asset_category: category,
        model_detail: description,
        location: location,
        status: "Pending"
    };

    fetch(`${API_BASE_URL}/api/asset-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        if (!res.ok) {
            const errorDetail = await res.json(); // Get the actual error from Django
            throw new Error(JSON.stringify(errorDetail));
        }
        return res.json();
    })
    .then(data => {
        showToast("success", "Asset request sent successfully");
        closeAssetRequest();
    })
    .catch(err => {
        console.error("Full Error:", err.message);
        alert("Submission Error: " + err.message); // This will tell us the field name
    });
}

// ==========================================
// 6. ASSET RETURN (POST)
// ==========================================

function openAssetPopup() {
    const modal = document.getElementById("assetReturnPopup");
    if(modal) modal.style.display = "flex";
}

function closeAssetReturn() {
    const modal = document.getElementById("assetReturnPopup");
    if(modal) modal.style.display = "none";
}

function submitAssetReturn() {
    const asset = document.getElementById("assetType").value;
    const condition = document.getElementById("assetCondition").value;
    const reason = document.getElementById("assetreason").value;

    if (!asset || !condition || !reason) {
        showToast("error", "Please fill all fields");
        return;
    }

    const payload = {
        emp_id: localStorage.getItem("work_id"),
        employee_name: EMP_NAME,
        asset_type: asset,
        condition: condition,
        description: reason,
        status: "Pending" // Assuming backend needs a status
    };

    fetch(`${API_BASE_URL}/api/asset-return/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Return Request failed");
        return res.json();
    })
    .then(data => {
        showToast("success", "Return request submitted");
        closeAssetReturn();
        // Clear Form
        document.getElementById("assetType").value = "";
        document.getElementById("assetCondition").value = "";
        document.getElementById("assetreason").value = "";
    })
    .catch(err => {
        console.error(err);
        showToast("error", "Failed to submit return request");
    });
}

// ==========================================
// 7. UTILITIES (TOAST & LOGOUT)
// ==========================================

function showToast(type, message) {
    const toast = document.getElementById("popupToast");
    const icon = document.getElementById("toastIcon");
    const title = document.getElementById("toastTitle");
    const msg = document.getElementById("toastMsg");

    if (!toast) return;

    toast.classList.remove("success", "error", "show");

    if (type === "success") {
        toast.classList.add("success");
        if(icon) icon.className = "fa-solid fa-circle-check";
        if(title) title.innerText = "Success";
    } else {
        toast.classList.add("error");
        if(icon) icon.className = "fa-solid fa-circle-exclamation";
        if(title) title.innerText = "Error";
    }

    if(msg) msg.innerText = message;
    
    // Force reflow for animation restart
    void toast.offsetWidth; 
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function logoutUser(){
    localStorage.clear();
    window.location.href = "../employee_login/emp_login.html";
}