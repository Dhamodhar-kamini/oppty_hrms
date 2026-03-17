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
// API CONFIGURATION
// ==========================================
const API_BASE_URL = "http://13.51.167.95:8000"; // Make sure this is your active backend URL

document.addEventListener("DOMContentLoaded", function () {

    // --- 1. GLOBAL STATE (Filled dynamically by API) ---
    let employees = [];

    // --- 2. DOM ELEMENTS ---
    const tableBody = document.getElementById("employeeTableBody");
    
    // Filter Inputs
    const searchInput = document.getElementById("searchInput");
    const deptFilter = document.getElementById("deptFilter");
    const statusFilter = document.getElementById("statusFilter");
    const empFilter = document.getElementById("empFilter"); // Type filter
    const downloadBtn = document.getElementById("downloadBtn"); 
    
    // Stats Elements (Using the IDs you added to the HTML)
    const statTotal = document.getElementById("stat-total");
    const statActive = document.getElementById("stat-active");
    const statLeave = document.getElementById("stat-leave");
    const statNew = document.getElementById("stat-new");
    
    // Main Form Modal Elements
    const modal = document.getElementById("employeeModal");
    const employeeForm = document.getElementById("empForm"); 
    const addBtn = document.getElementById("addEmployeeBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");

    // Success Modal Elements
    const successModal = document.getElementById("successModal");
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");
    const successTitle = document.getElementById("successTitle");
    const successMessage = document.getElementById("successMessage");

    // Delete Modal Elements
    const deleteModal = document.getElementById("deleteModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const deleteEmpName = document.getElementById("deleteEmpName");

    // State Variables
    let isEditMode = false;
    let currentEditId = null;
    let deleteTargetId = null;

    // --- 3. INITIAL FETCH FROM BACKEND ---
    function loadDataFromAPI() {
        if (!tableBody) return;
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 20px;'>Loading employees from server... <i class='fa-solid fa-spinner fa-spin'></i></td></tr>";

        fetch(`${API_BASE_URL}/api/employees/`)
        .then(res => {
            if(!res.ok) throw new Error("Network response was not ok");
            return res.json();
        })
        .then(data => {
            console.log("Backend Data Fetched:", data);
            
            // Map the backend data to our frontend structure
            employees = data.map(emp => ({
                id: emp.id || emp.employee_id || "N/A",
                name: emp.name || "N/A",
                email: emp.email || "N/A",
                dept: emp.department || "N/A",
                role: emp.role || "N/A",
                type: emp.full_time || "N/A", 
                status: emp.status || "Active", // Default to active if missing
                phone: emp.phone || "",
                joinDate: emp.joining || "",
                salary: emp.salary || "",
                location: emp.location || ""
            }));

            // Render table and stats using the freshly fetched data
            renderTable(employees);
            updateDashboardStats();
        })
        .catch(err => {
            console.error("Error fetching employees:", err);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: red;">Failed to load data from server. Ensure your Django server is running.</td></tr>`;
        });
    }

    // --- 4. RENDER TABLE WITH DYNAMIC STATUS ---
    function renderTable(dataArray) {
        if (!tableBody) return;
        tableBody.innerHTML = "";

        if (!dataArray || dataArray.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color:#999;">No employees match your search/filters.</td></tr>`;
            return;
        }

        dataArray.forEach(emp => {
            // Determine Status CSS and Icon based on backend value
            let currentStatus = emp.status;
            let statusClass = "status-active";
            let icon = "fa-check";

            const statusLower = currentStatus.toLowerCase();
            if (statusLower.includes("leave")) { 
                statusClass = "status-leave"; 
                icon = "fa-clock"; 
            } 
            else if (statusLower.includes("remote") || statusLower.includes("wfh")) { 
                statusClass = "status-remote"; 
                icon = "fa-house-laptop"; 
            }
            else if (statusLower.includes("inactive") || statusLower.includes("dismissed")) {
                statusClass = "status-inactive";
                icon = "fa-xmark";
                // Fallback class if status-inactive doesn't exist in CSS
                if(!document.styleSheets[0].cssRules) statusClass = "status-leave"; 
            }

            const row = `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-info">
                                <span class="user-name view-profile-btn" data-id="${emp.id}" 
                                      style="cursor:pointer; color:#FF5B1E; font-weight:600;">
                                    ${emp.name}
                                </span>
                                <span class="user-email">${emp.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>EMP-${emp.id}</td>
                    <td>${emp.dept}</td>
                    <td>${emp.role}</td>
                    <td>${emp.type}</td>
                    <td>
                        <span class="status-pill ${statusClass}">
                            <i class="fa-solid ${icon}"></i> ${currentStatus}
                        </span>
                    </td>
                    <td>
                        <div class="action-menu">
                            <button class="btn-action edit-btn" data-id="${emp.id}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
                            <button class="btn-action delete-btn" data-id="${emp.id}" title="Delete" style="color:#FF5B5B;"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // --- 5. UPDATE DASHBOARD STATS DYNAMICALLY ---
    function updateDashboardStats() {
        if (!statTotal || !statActive || !statLeave || !statNew) return;

        const totalEmployees = employees.length;
        
        const activeCount = employees.filter(emp => 
            emp.status.toLowerCase() === 'active' || emp.status.toLowerCase() === 'remote' || emp.status.toLowerCase() === 'wfh'
        ).length;

        const onLeaveCount = employees.filter(emp => 
            emp.status.toLowerCase().includes('leave')
        ).length;

        // Calculate New Hires (Joined in the last 30 days)
        let newHiresCount = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        employees.forEach(emp => {
            if (emp.joinDate) {
                const joinDate = new Date(emp.joinDate);
                if (joinDate >= thirtyDaysAgo) {
                    newHiresCount++;
                }
            }
        });

        // Update the DOM Elements
        statTotal.innerText = totalEmployees;
        statActive.innerText = activeCount;
        statLeave.innerText = onLeaveCount;
        statNew.innerText = newHiresCount;
    }

    // --- 6. SEARCH & FILTERS LOGIC ---
    function applyFilters() {
        const term = searchInput ? searchInput.value.toLowerCase() : "";
        const deptValue = deptFilter ? deptFilter.value : "all";
        const statusValue = statusFilter ? statusFilter.value : "all";
        const typeValue = empFilter ? empFilter.value : "all"; 

        const filtered = employees.filter(emp => {
            // Check Search Term
            const matchesSearch = 
                emp.name.toLowerCase().includes(term) ||
                emp.role.toLowerCase().includes(term) ||
                String(emp.id).toLowerCase().includes(term) ||
                emp.email.toLowerCase().includes(term);
            
            // Check Dropdowns
            const matchesDept = (deptValue === "all") || (emp.dept.toLowerCase() === deptValue.toLowerCase());
            const matchesStatus = (statusValue === "all") || (emp.status.toLowerCase() === statusValue.toLowerCase());
            
            // Type dropdown is tricky because your HTML says "Internship", but DB might say "Intern"
            const matchesType = (typeValue === "all") || (emp.type.toLowerCase().includes(typeValue.toLowerCase().replace('ship', '')));

            return matchesSearch && matchesDept && matchesStatus && matchesType;
        });

        renderTable(filtered);
    }

    // Attach Filter Listeners
    if(searchInput) searchInput.addEventListener("input", applyFilters);
    if(deptFilter) deptFilter.addEventListener("change", applyFilters);
    if(statusFilter) statusFilter.addEventListener("change", applyFilters);
    if(empFilter) empFilter.addEventListener("change", applyFilters); 

    // --- 7. EVENT DELEGATION (View Profile, Edit, Delete) ---
    if(tableBody) {
        tableBody.addEventListener("click", function(e) {
            
            // VIEW PROFILE Click
            if (e.target.classList.contains("view-profile-btn") || e.target.closest(".view-profile-btn")) {
                const btn = e.target.closest(".view-profile-btn") || e.target;
                const id = btn.getAttribute("data-id");
                
                // Save ID to local storage and redirect to detail page
                localStorage.setItem('employee_id', id);
                window.location.href = "../emp_details/emp_details.html"; 
            }

            // DELETE Click
            if (e.target.closest(".delete-btn")) {
                const btn = e.target.closest(".delete-btn");
                const id = btn.getAttribute("data-id");
                openDeleteModal(id);
            }
            
            // EDIT Click
            if (e.target.closest(".edit-btn")) {
                const btn = e.target.closest(".edit-btn");
                const id = btn.getAttribute("data-id");
                openEditModal(id);
            }
        });
    }

    // --- 8. DELETE LOGIC ---
    function openDeleteModal(id) {
        const emp = employees.find(e => String(e.id) === String(id));
        if(!emp) return;
        deleteTargetId = id;
        if(deleteEmpName) deleteEmpName.innerText = emp.name;
        if(deleteModal) deleteModal.classList.add("active");
    }

    if(confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", () => {
            if(deleteTargetId) {
                // If you add a delete endpoint to your Django URLs later, call it here:
                // fetch(`${API_BASE_URL}/api/employee/delete/${deleteTargetId}/`, { method: 'DELETE' });

                // Remove from local array to update UI instantly
                employees = employees.filter(emp => String(emp.id) !== String(deleteTargetId));
                
                applyFilters(); // Re-render table
                updateDashboardStats(); // Update stat numbers
                
                deleteModal.classList.remove("active");
                showSuccess("Deleted!", "Employee removed successfully.");
            }
        });
    }

    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", () => deleteModal.classList.remove("active"));

    // --- 9. EDIT MODAL LOGIC ---
    function openEditModal(id) {
        const emp = employees.find(e => String(e.id) === String(id));
        if (!emp) return;

        // Populate Form Fields
        if(document.getElementById("empName")) document.getElementById("empName").value = emp.name;
        if(document.getElementById("empEmail")) document.getElementById("empEmail").value = emp.email;
        if(document.getElementById("empDept")) document.getElementById("empDept").value = emp.dept;
        if(document.getElementById("empRole")) document.getElementById("empRole").value = emp.role;
        if(document.getElementById("empType")) document.getElementById("empType").value = emp.type;
        if(document.getElementById("empStatus")) document.getElementById("empStatus").value = emp.status;

        isEditMode = true;
        currentEditId = id;
        
        const titleEl = document.querySelector(".modal-header h2");
        if(titleEl) titleEl.innerText = "Edit Employee";
        
        const subBtn = employeeForm.querySelector(".btn-submit");
        if(subBtn) subBtn.innerText = "Update";

        modal.classList.add("active");
    }

    // --- 10. ADD NEW MODAL LOGIC ---
    if(addBtn) {
        addBtn.addEventListener("click", () => {
            isEditMode = false;
            currentEditId = null;
            if(employeeForm) employeeForm.reset();
            
            const titleEl = document.querySelector(".modal-header h2");
            if(titleEl) titleEl.innerText = "Add New Employee";

            const subBtn = employeeForm.querySelector(".btn-submit");
            if(subBtn) subBtn.innerText = "Add Employee";
            
            modal.classList.add("active");
        });
    }

    // --- 11. FORM SUBMIT (Add/Edit) ---
    if(employeeForm) {
        employeeForm.addEventListener("submit", function(e) {
            e.preventDefault();

            const name = document.getElementById("empName") ? document.getElementById("empName").value : "";
            const email = document.getElementById("empEmail") ? document.getElementById("empEmail").value : "";
            const dept = document.getElementById("empDept") ? document.getElementById("empDept").value : "";
            const role = document.getElementById("empRole") ? document.getElementById("empRole").value : "";
            const type = document.getElementById("empType") ? document.getElementById("empType").value : "";
            const status = document.getElementById("empStatus") ? document.getElementById("empStatus").value : "";

            if (isEditMode) {
                // UPDATE LOCAL ARRAY (Simulating update until backend PATCH is fully hooked up for base model)
                const index = employees.findIndex(e => String(e.id) === String(currentEditId));
                if (index !== -1) {
                    employees[index] = { ...employees[index], name, email, dept, role, type, status };
                    showSuccess("Updated!", "Employee details have been updated successfully.");
                }
            } else {
                // CREATE NEW EMPLOYEE (POST to backend)
                const newEmpId = String(Math.floor(Math.random() * 900) + 100); // Generate temp 3 digit ID
                
                const payload = {
                    name: name,
                    email: email,
                    role: role,
                    department: dept,
                    full_time: type,
                    salary: 0, // Default 0
                    joining: new Date().toISOString().split('T')[0], // Today
                    location: "Not Specified",
                    manager_employee: "Not Assigned",
                    password: "password123", // Default placeholder
                    employee_id: newEmpId
                };

                fetch(`${API_BASE_URL}/api/create/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    console.log("Created:", data);
                    // Add to local array so it shows up instantly without page refresh
                    employees.push({
                        id: newEmpId, name: name, email: email, dept: dept, role: role, type: type, status: status,
                        joinDate: payload.joining, salary: "₹0", location: payload.location
                    });
                    showSuccess("Added!", "New employee added successfully.");
                    applyFilters(); 
                    updateDashboardStats();
                })
                .catch(err => {
                    console.error("Error creating:", err);
                    alert("Failed to add employee to database.");
                });
            }

            if(isEditMode) {
                applyFilters(); 
                updateDashboardStats();
            }
            closeModal();
        });
    }

    // Modal UI Helpers
    function closeModal() {
        if(modal) modal.classList.remove("active");
    }
    if(closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if(cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);
    
    // Close Modals on outside click
    window.addEventListener("click", (e) => { 
        if (e.target === modal) closeModal(); 
        if (e.target === successModal) successModal.classList.remove("active");
        if (e.target === deleteModal) deleteModal.classList.remove("active");
    });

    function showSuccess(title, msg) {
        if(successTitle) successTitle.innerText = title;
        if(successMessage) successMessage.innerText = msg;
        if(successModal) successModal.classList.add("active");
    }
    if(closeSuccessBtn) closeSuccessBtn.addEventListener("click", () => successModal.classList.remove("active"));

    // --- 12. DOWNLOAD CSV EXPORT ---
    if(downloadBtn) {
        downloadBtn.addEventListener("click", function() {
            // We export whatever is currently visible on the table based on filters
            exportTableToCSV(employees, "all_employees.csv");
        });
    }

    function exportTableToCSV(dataArray, filename) {
        if (!dataArray || dataArray.length === 0) {
            alert("No data to export!");
            return;
        }

        let csvContent = [];
        const headers = ["ID", "Name", "Email", "Phone", "Department", "Role", "Type", "Status", "Join Date", "Salary", "Location"];
        csvContent.push(headers.join(","));

        dataArray.forEach(item => {
            const row = [
                `"${item.id}"`, `"${item.name}"`, `"${item.email}"`, `"${item.phone || ''}"`,
                `"${item.dept}"`, `"${item.role}"`, `"${item.type}"`, `"${item.status}"`,
                `"${item.joinDate || ''}"`, `"${item.salary || ''}"`, `"${item.location || ''}"`
            ];
            csvContent.push(row.join(","));
        });

        const csvString = csvContent.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- TRIGGER THE INITIAL LOAD ---
    loadDataFromAPI();
});


// ==========================================
// NOTIFICATION LOGIC 
// ==========================================
let notifications = [
    { id: 1, text: "<strong>Dhamodhar</strong> applied for the UX Designer position.", time: "2 mins ago", icon: "👩‍💼", read: false },
    { id: 2, text: "Meeting with <strong>Dev Team</strong> starts in 15 minutes.", time: "15 mins ago", icon: "📅", read: false },
    { id: 3, text: "New system update available.", time: "1 hour ago", icon: "⚙️", read: true },
    { id: 4, text: "<strong>Arjun</strong> accepted the offer.", time: "3 hours ago", icon: "✅", read: true }
];

document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('ntBellBtn');
    const dropdown = document.getElementById('ntDropdown');
    const markReadBtn = document.getElementById('ntMarkAllRead');

    ntRenderList();

    if(bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
        });
    }

    if(markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            notifications.forEach(n => n.read = true);
            ntRenderList();
        });
    }

    window.addEventListener('click', (e) => {
        if (dropdown && bellBtn && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
});

function ntRenderList() {
    const listContainer = document.getElementById('ntList');
    const badge = document.getElementById('ntBadge');
    
    if(!listContainer || !badge) return;
    listContainer.innerHTML = '';

    const unreadCount = notifications.filter(n => !n.read).length;

    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    if (notifications.length === 0) {
        listContainer.innerHTML = '<div class="nt-empty">No notifications</div>';
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

        listContainer.appendChild(itemDiv);
    });
}

// ==========================================
// HEADER LOGOUT LOGIC
// ==========================================
function hdr_toggleProfilePopup() {
    const dropdown = document.getElementById("hdrProfileDropdown");
    if(dropdown) dropdown.classList.toggle("show");
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

window.onclick = function(event) {
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
}