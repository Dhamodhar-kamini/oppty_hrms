
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
// NEW: Define API Base URL at the top
// ==========================================
const API_BASE_URL = "https://theoppty.com"; // Use your server's address

// ==========================================
// NEW: Helper function to force UTC time display
// ==========================================
function formatTimeUTC(timeStr) {
    if (!timeStr) return null;
    
    // If the backend is already sending a short string like "06:24 AM", just return it as-is
    if (timeStr.length < 10 && !timeStr.includes("T")) return timeStr; 

    try {
        const dateObj = new Date(timeStr);
        return dateObj.toLocaleTimeString('en-US', { 
            timeZone: 'UTC', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    } catch (error) {
        return timeStr; // Fallback to raw string if parsing fails
    }
}


// ==========================================
// NEW: Function to load and update the pending approvals count
// ==========================================
async function loadPendingApprovalsCount() {
    try {
        // Define all the fetch promises
        const leavePromise = fetch(`${API_BASE_URL}/api/leave-approvals/`);
        const assetPromise = fetch(`${API_BASE_URL}/api/admin/asset-requests/`);
        const attendancePromise = fetch(`${API_BASE_URL}/api/admin/attendance-requests/`);

        // Wait for all fetches to complete
        const responses = await Promise.all([leavePromise, assetPromise, attendancePromise]);

        // Check if all responses are OK
        for (const res of responses) {
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }
        }

        // Parse all responses as JSON
        const [leaveData, assetData, attendanceData] = await Promise.all(responses.map(res => res.json()));

        // Calculate counts
        // Note: leaveData is nested under a 'data' key according to your approval.js
        const leaveCount = leaveData.data ? leaveData.data.length : 0; 
        const assetCount = assetData ? assetData.length : 0;
        const attendanceCount = attendanceData ? attendanceData.length : 0;
        
        const totalCount = leaveCount + assetCount + attendanceCount;

        // Update the HTML
        const approvalSpan = document.getElementById('pendingApprovalsCount');
        if (approvalSpan) {
            approvalSpan.innerHTML = `
                <a href="../approval/approval.html" class="highlight-pending">
                    ${totalCount} Pending Approvals
                </a>
            `;
        }

    } catch (error) {
        console.error("Error loading pending approvals count:", error);
        const approvalSpan = document.getElementById('pendingApprovalsCount');
        if (approvalSpan) {
            approvalSpan.innerHTML = `
                <a href="../approval/approval.html" class="highlight-pending">
                    Error loading approvals
                </a>
            `;
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // Call the function to get the dynamic count on page load
  // ==========================================
  loadPendingApprovalsCount();

  console.log("oppty Dashboard JS Initialized.");

  // --- 1. Job Applicants Tab Switching ---
  const applicantTabsContainer = document.querySelector(
    "#job-applicants .tabs",
  );
  const applicantListContainer = document.getElementById(
    "applicant-list-content",
  );

  const OPENINGS_CONTENT = `
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>Lead Backend Engineer</strong><small>Exp: 5+ Years • USA</small></div>
            <span class="badge python" style="background-color: var(--color-purple);">Python</span>
        </div>
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>HR Manager</strong><small>Exp: 3+ Years • UK</small></div>
            <span class="badge finance" style="background-color: var(--color-red);">HR</span>
        </div>
    `;

  const APPLICANTS_CONTENT = `
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>Brian Villalobos</strong><small>Exp: 5+ Years • USA</small></div>
            <span class="badge ui-ux" style="background-color: var(--color-teal);">UI/UX Designer</span>
        </div>
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>Anthony Lewis</strong><small>Exp: 4+ Years • USA</small></div>
            <span class="badge python" style="background-color: var(--color-blue);">Python Developer</span>
        </div>
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>Stephan Peralt</strong><small>Exp: 6+ Years • USA</small></div>
            <span class="badge android" style="background-color: var(--color-orange);">Android Developer</span>
        </div>
        <div class="user-entry">
            <img src="../assets/profiledp.jpeg">
            <div><strong>Doglas Martini</strong><small>Exp: 2+ Years • USA</small></div>
            <span class="badge react" style="background-color: var(--color-green);">React Developer</span>
        </div>
    `;
});


document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("detailModal");
    const modalTableBody = document.getElementById("modalTableBody");
    const trigger = document.querySelector(".attendance-trigger");
    const closeBtn = document.querySelector(".close-btn");

    async function loadTodayAttendance(){

        try{

            const res = await fetch(`${API_BASE_URL}/api/today-attendance/`);
            const data = await res.json();

            modalTableBody.innerHTML="";

            if(data.length === 0){
                modalTableBody.innerHTML =
                `<tr><td colspan="5">No attendance today</td></tr>`;
                return;
            }

            data.forEach(emp=>{

                const row = document.createElement("tr");

                row.innerHTML=`
                <td>${emp.id}</td>
                <td>
                    <strong>${emp.name}</strong>
                    <br>
                    <small>${emp.role}</small>
                </td>
                <td>${emp.date}</td>
                <td>
                    In: ${formatTimeUTC(emp.checkin) || "--"} <br>
                    Out: ${formatTimeUTC(emp.checkout) || "--"}
                </td>
                <td>${emp.duration || "--"}</td>
                `;

                modalTableBody.appendChild(row);

            });

        }
        catch(err){
            console.error(err);
        }

    }

    if(trigger) {
        trigger.addEventListener("click", async (e)=>{
            e.preventDefault();
            await loadTodayAttendance();
            modal.style.display="block";
        });
    }

    if(closeBtn) {
        closeBtn.onclick=()=>modal.style.display="none";
    }

    function closeModal() {
        const detailModal = document.getElementById('detailModal');
        detailModal.style.display = "none";
    }

    // Close Button Logic
    if (closeBtn) closeBtn.onclick = closeModal;

    // Click outside to close
    window.onclick = (event) => {
        const detailModal = document.getElementById('detailModal');
        if (event.target === detailModal) {
        closeModal();
        }
    };
});


document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Employees Array
    const EMPLOYEES = [];

    // --- Selectors ---
    const employeeModal = document.getElementById("employeeModal");
    const tableBody = document.getElementById("employeeTableBody");
    const searchInput = document.getElementById("employeeSearch");
    const closeEmployeeBtn = document.querySelector(".close-employee-btn");
    const triggerEmployeeBtn = document.querySelector(".employee-trigger");
    const addEmpFromTableBtn = document.getElementById("addEmpFromTableBtn");

    const empModal = document.getElementById("empModal");
    const empOpenBtn = document.getElementById("empOpenBtn");
    const empCloseBtn = document.getElementById("empCloseBtn");
    const empCancelBtn = document.getElementById("empCancelBtn");
    const empForm = document.getElementById("empForm");

    const successModal = document.getElementById("successModal");
    const successOkBtn = document.getElementById("successOkBtn");

    // =========================================================
    // 2. DASHBOARD STATS LOGIC (API DRIVEN)
    // =========================================================
    async function loadEmployeeStats() {
        try {
            // 1. Fetch data from your backend
            const response = await fetch(`${API_BASE_URL}/api/employees/`);
            if (!response.ok) throw new Error("Failed to fetch employees for stats");
            
            const data = await response.json();
            
            // 2. Get the total number of employees
            const total = data.length;
            
            // 3. Initialize our counters
            let counts = {
                "WFO": 0,
                "WFH": 0,
                "Internship": 0
            };

            // 4. Loop through the backend data and tally them up
            data.forEach(emp => {
                const type = emp.full_time; 
                if (counts.hasOwnProperty(type)) {
                    counts[type]++;
                } else if (type) {
                    const upperType = type.toUpperCase().trim();
                    if (upperType === "WFO") counts["WFO"]++;
                    if (upperType === "WFH") counts["WFH"]++;
                    if (upperType.includes("INTERN")) counts["Internship"]++;
                }
            });

            // 5. Update the Total Count text in the HTML
            const totalEl = document.getElementById("totalEmpCount");
            if (totalEl) totalEl.innerText = total;

            // 6. Helper function to update the bars, labels, and values
            const updateBar = (typeKey, barId, labelId, valId) => {
                const count = counts[typeKey];
                const percent = total === 0 ? 0 : Math.round((count / total) * 100);

                const barEl = document.getElementById(barId);
                if (barEl) barEl.style.width = percent + "%";

                const labelEl = document.getElementById(labelId);
                if (labelEl) labelEl.innerText = `${typeKey} (${percent}%)`;

                const valEl = document.getElementById(valId);
                if (valEl) valEl.innerText = count < 10 && count > 0 ? "0" + count : count; 
            };

            // 7. Apply the updates to all three categories
            updateBar("WFO", "bar-wfo", "label-wfo", "val-wfo");
            updateBar("WFH", "bar-wfh", "label-wfh", "val-wfh");
            updateBar("Internship", "bar-intern", "label-intern", "val-intern");

        } catch (error) {
            console.error("Error loading employee stats:", error);
        }
    }


    // =========================================================
    // 3. TABLE FUNCTIONS
    // =========================================================
    function renderTable(data) {
        let html = "";
        if (data.length === 0) {
            html = '<tr><td colspan="5" style="text-align:center;">No employees found</td></tr>';
        } else {
            data.forEach((emp) => {
                html += `
                    <tr>
                        <td>${emp.emp_id}</td>
                        <td>${emp.name}</td>
                        <td>${emp.email}</td>
                        <td>${emp.position}</td>
                        <td>${emp.salary !== null && emp.salary !== undefined ? "₹" + emp.salary : "N/A"}</td>
                    </tr>`;
            });
        }
        if (tableBody) tableBody.innerHTML = html;
    }

    // --- Fetch from backend when clicking "View All Employees" ---
    if (triggerEmployeeBtn) {
        triggerEmployeeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading employees...</td></tr>';
            employeeModal.style.display = "block";

            try {
                const response = await fetch(`${API_BASE_URL}/api/employees/`);
                if (!response.ok) throw new Error("Failed to fetch employees");
                
                const data = await response.json();

                EMPLOYEES.length = 0; 
                
                data.forEach(emp => {
                    EMPLOYEES.push({
                        emp_id: emp.employee_id || emp.id || "--", 
                        name: emp.name || "Unknown",
                        email: emp.email || "--",
                        position: emp.role || emp.department || "--", 
                        salary: emp.salary || 0,
                        type: emp.full_time || "WFO" 
                    });
                });

                renderTable(EMPLOYEES);

            } catch (error) {
                console.error("Error loading employee list:", error);
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Failed to load employees. Please check your server.</td></tr>';
            }
        });
    }

    // Search bar filter
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = EMPLOYEES.filter((emp) =>
                emp.name.toLowerCase().includes(term) ||
                emp.emp_id.toLowerCase().includes(term)
            );
            renderTable(filtered);
        });
    }

    const closeTableModal = () => {
        if (employeeModal) employeeModal.style.display = "none";
        if (searchInput) searchInput.value = "";
    };
    if (closeEmployeeBtn) closeEmployeeBtn.onclick = closeTableModal;

    // =========================================================
    // 4. FORM LOGIC & SUBMISSION
    // =========================================================
    if (empOpenBtn) empOpenBtn.onclick = () => (empModal.style.display = "flex");
    if (addEmpFromTableBtn) addEmpFromTableBtn.onclick = () => (empModal.style.display = "flex");

    const closeAddModal = () => { empModal.style.display = "none"; };
    
    // Reset form helper
    function resetForm() {
        if(!empForm) return;
        empForm.reset();
        const inputs = empForm.querySelectorAll("input, select");
        inputs.forEach((input) => input.classList.remove("input-error"));
        const msgs = empForm.querySelectorAll(".error-msg");
        msgs.forEach(msg => msg.style.display = 'none');
    }

    if (empCloseBtn) empCloseBtn.onclick = () => { closeAddModal(); resetForm(); };
    if (empCancelBtn) empCancelBtn.onclick = () => { closeAddModal(); resetForm(); };

    // Validation Helpers
    const setError = (element, message) => {
        const inputControl = element.parentElement;
        const errorDisplay = inputControl.querySelector(".error-msg");
        if (errorDisplay) {
            errorDisplay.innerText = message;
            errorDisplay.style.display = "block";
        }
        element.classList.add("input-error");
    };

    const setSuccess = (element) => {
        const inputControl = element.parentElement;
        const errorDisplay = inputControl.querySelector(".error-msg");
        if (errorDisplay) {
            errorDisplay.style.display = "none";
        }
        element.classList.remove("input-error");
    };

    const validateInputs = () => {
        let isValid = true;
        const name = document.getElementById("nameInput");
        const empId = document.getElementById("empIdInput");
        const email = document.getElementById("emailInput");
        const type = document.getElementById("typeInput");

        if (name.value.trim() === "") { setError(name, "Name required"); isValid = false; } else { setSuccess(name); }
        if (empId.value.trim() === "") { setError(empId, "ID required"); isValid = false; } else { setSuccess(empId); }
        if (email.value.trim() === "") { setError(email, "Email required"); isValid = false; } else { setSuccess(email); }
        if (type.value === "") { setError(type, "Type required"); isValid = false; } else { setSuccess(type); }

        return isValid;
    };

    // --- FORM SUBMIT HANDLER ---
    if(empForm){
        empForm.addEventListener("submit", function (e) {
            e.preventDefault();

            if (validateInputs()) {
                // Gather Values
                const nameVal = document.getElementById("nameInput").value;
                const empIdVal = document.getElementById("empIdInput").value;
                const emailVal = document.getElementById("emailInput").value;
                const jobVal = document.getElementById("jobInput").value;
                const salaryVal = document.getElementById("salaryInput").value;
                const typeVal = document.getElementById("typeInput").value; 

                const empIdNum = parseInt(empIdVal);
                const newEmpId = String(empIdNum).padStart(3, "0");

                // API Object (Backend Model)
                const apiEmployee = {
                    name: nameVal,
                    employee_id: newEmpId,
                    email: emailVal,
                    password: document.getElementById("passwordInput").value,
                    role: jobVal || "Not Specified",
                    salary: salaryVal,
                    joining: document.getElementById("dateInput").value,
                    department: document.getElementById("deptInput").value, 
                    manager_employee: document.getElementById("managerInput").value,
                    location: document.getElementById("locationInput").value,
                    full_time: typeVal 
                };

                // Send to API
                fetch(`${API_BASE_URL}/api/create/`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(apiEmployee)
                })
                .then(res => {
                    if(!res.ok) throw new Error("Network response was not ok");
                    return res.json();
                })
                .then(response => {
                    console.log("API Success:", response);
                    
                    // Update the stats bars immediately via API refetch
                    loadEmployeeStats(); 
                    
                    // Close Modal & Show Success
                    closeAddModal();
                    if (successModal) successModal.style.display = "flex"; 
                })
                .catch(err => console.error("API Error:", err));
            }
        });
    }

    if (successOkBtn) {
        successOkBtn.onclick = () => {
            successModal.style.display = "none";
            resetForm();
        };
    }

    window.onclick = function (e) {
        if (e.target === empModal) { closeAddModal(); resetForm(); }
        if (e.target === employeeModal && (!empModal || empModal.style.display !== "flex")) { closeTableModal(); }
        if (e.target === successModal) { successModal.style.display = "none"; resetForm(); }
    };

    // Initialize stats on load
    loadEmployeeStats();
});


// ====================================================================
// employee distribution chart
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {

    const dd_svgChart = document.querySelector('.dd-donut-svg');
    const dd_legendList = document.getElementById('ddLegendList');
    const dd_totalDisplay = document.getElementById('ddTotalDisplay');
    const totalEmpCountEl = document.getElementById('totalEmpCount');
    const totalEmployeesEl = document.getElementById("total_employees");

    fetch(`${API_BASE_URL}/api/employees/`)
    .then(res => res.json())
    .then(data => {

        // 1️⃣ TOTAL EMPLOYEES
        const total = data.length;
        if(dd_totalDisplay) dd_totalDisplay.innerText = total;
        if(totalEmpCountEl) totalEmpCountEl.innerText = data.length;
        if(totalEmployeesEl) totalEmployeesEl.innerText = data.length;

        // 2️⃣ GROUP BY DEPARTMENT
        const departmentMap = {};

        data.forEach(emp => {
            const dept = emp.department || "Others";

            if(!departmentMap[dept]){
                departmentMap[dept] = 0;
            }

            departmentMap[dept] += 1;
        });

        // 3️⃣ CONVERT TO ARRAY FORMAT
        const colors = ["#4CAF50","#2196F3","#FF9800","#E91E63","#9C27B0","#009688"];

        const dd_departmentData = Object.keys(departmentMap).map((dept,index)=>({
            name: dept,
            count: departmentMap[dept],
            color: colors[index % colors.length],
            class: `dept-${index}`
        }));

        renderChart(dd_departmentData, total);

    })
    .catch(err=>{
        console.error("Error fetching employees:", err);
    });

    function renderChart(dd_departmentData, total){
        if (!dd_svgChart || !dd_legendList) return;

        let cumulativePercent = 0;

        dd_departmentData.forEach(dept => {

            const percentage = total > 0 ? ((dept.count / total) * 100).toFixed(1) : 0;

            // Legend
            const li = document.createElement('li');
            li.className = 'dd-legend-item';

            li.innerHTML = `
                <div class="dd-item-left">
                    <span class="dd-color-dot" style="background:${dept.color}"></span>
                    <div>
                        <span class="dd-dept-name">${dept.name}</span>
                        <span class="dd-dept-percent">${percentage}%</span>
                    </div>
                </div>
                <span class="dd-dept-count">${dept.count}</span>
            `;

            dd_legendList.appendChild(li);

            // SVG DONUT
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const segmentLength = total > 0 ? (dept.count / total) * circumference : 0;

            circle.setAttribute("cx","50");
            circle.setAttribute("cy","50");
            circle.setAttribute("r",radius);
            circle.setAttribute("stroke",dept.color);
            circle.setAttribute("fill","transparent");
            circle.setAttribute("stroke-width","10");

            const offset = -1 * (cumulativePercent / 100) * circumference;

            circle.style.strokeDasharray = `0 ${circumference}`;
            circle.style.strokeDashoffset = offset;

            dd_svgChart.appendChild(circle);

            setTimeout(()=>{
                circle.style.strokeDasharray = `${segmentLength} ${circumference}`;
            },100);

            cumulativePercent += total > 0 ? (dept.count / total) * 100 : 0;
        });
    }
});

// ====================================================================
// ATTENDANCE GRAPH & DETAILS LOGIC
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION & SELECTORS ---
    const da_monthSelect = document.getElementById('daMonthSelect');
    const da_yAxis = document.getElementById('daYAxisContainer');
    const da_barsContainer = document.getElementById('daBarsContainer');
    const da_xLabelsContainer = document.getElementById('daXLabelsContainer');
    
    // Stats Elements for daily counts
    const da_statOntime = document.getElementById('daAvgOntimeDisplay');
    const da_statLate = document.getElementById('daAvgLateDisplay');
    const da_statAbsent = document.getElementById('daAvgAbsentDisplay');
    const da_overviewCount = document.getElementById('attendanceOverviewCount');

    const da_staffInput = document.getElementById('daStaffCountInput');

    const detailModal = document.getElementById("detailModal");
    const modalTableBody = document.getElementById("modalTableBody");
    const triggerBtn = document.querySelector(".attendance-trigger");
    const closeBtn = document.querySelector(".close-btn");

    // --- 2. ASYNC FUNCTION TO RENDER ALL DYNAMIC DATA ---
    async function da_runSimulation() {
        if (da_barsContainer) da_barsContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        // --- A. FETCH AND DISPLAY DAILY STATS CARDS ---
        try {
            const statsRes = await fetch(`${API_BASE_URL}/api/attendance-graph/`);
            const statsData = await statsRes.json();
            
            if(da_overviewCount) {
                da_overviewCount.innerText = `${statsData.present}/${statsData.total}`;
            }
            if(da_statOntime) {
                const ontime = statsData.present - statsData.late;
                da_statOntime.innerText = `${ontime}/${statsData.total}`;
            }
            if(da_statLate) da_statLate.innerText = `${statsData.late}/${statsData.total}`;
            if(da_statAbsent) da_statAbsent.innerText = `${statsData.absent}/${statsData.total}`;

        } catch (error) {
            console.error("Failed to load daily stats:", error);
            if(da_overviewCount) da_overviewCount.innerText = "N/A";
            if(da_statOntime) da_statOntime.innerText = "N/A";
            if(da_statLate) da_statLate.innerText = "N/A";
            if(da_statAbsent) da_statAbsent.innerText = "N/A";
        }

        // --- B. FETCH AND RENDER MONTHLY BAR CHART ---
        try {
            const monthIndex = da_monthSelect.value;
            const currentYear = new Date().getFullYear(); 
            
            const chartRes = await fetch(`${API_BASE_URL}/api/attendance/monthly-summary/?year=${currentYear}&month=${parseInt(monthIndex) + 1}`);
            const chartData = await chartRes.json();
            
            const totalEmployees = chartData.total_employees;

            if (da_staffInput) {
                da_staffInput.value = totalEmployees;
            }
            
            const data = chartData.daily_data;

            // Update Y-Axis
            if(da_yAxis) {
                da_yAxis.innerHTML = '';
                for(let i=0; i<=5; i++) {
                    const val = Math.round((totalEmployees / 5) * i);
                    const span = document.createElement('span');
                    span.innerText = val;
                    da_yAxis.appendChild(span);
                }
            }
            
            if(da_barsContainer) da_barsContainer.innerHTML = "";
            if(da_xLabelsContainer) da_xLabelsContainer.innerHTML = "";

            data.forEach((dayData, index) => {
                const hOntime = totalEmployees > 0 ? (dayData.ontime / totalEmployees) * 100 : 0;
                const hLate = totalEmployees > 0 ? (dayData.late / totalEmployees) * 100 : 0;
                const hAbsent = totalEmployees > 0 ? (dayData.absent / totalEmployees) * 100 : 0;

                const col = document.createElement('div');
                col.className = 'da-bar-column';
                col.setAttribute('data-tooltip', `Day ${dayData.day}\nOn Time: ${dayData.ontime}\nLate: ${dayData.late}\nAbsent: ${dayData.absent}`);

                col.innerHTML = `
                    <div class="da-bar-segment da-bg-ontime" style="height: ${hOntime}%"></div>
                    <div class="da-bar-segment da-bg-late" style="height: ${hLate}%"></div>
                    <div class="da-bar-segment da-bg-absent" style="height: ${hAbsent}%"></div>
                `;
                if(da_barsContainer) da_barsContainer.appendChild(col);

                if (index === 0 || (index + 1) % 5 === 0) {
                    const label = document.createElement('div');
                    label.className = 'da-x-label-item';
                    label.innerText = dayData.day;
                    const leftPos = (index / (data.length - 1)) * 100;
                    label.style.position = 'absolute';
                    if (index === 0) label.style.left = '0%';
                    else if (index === data.length - 1) label.style.right = '0%';
                    else label.style.left = `${leftPos}%`;
                    
                    if(da_xLabelsContainer) da_xLabelsContainer.appendChild(label);
                }
            });

        } catch (error) {
            console.error("Failed to load monthly chart data:", error);
            if (da_barsContainer) da_barsContainer.innerHTML = '<p class="error-text">Could not load chart data.</p>';
        }
    }

    // --- 3. MODAL LOGIC (for "View Details") ---
    async function loadTodayAttendanceModal() {
        if (!modalTableBody) return;
        modalTableBody.innerHTML = '<tr><td colspan="5" class="loading-spinner"></td></tr>';

        try {
            const res = await fetch(`${API_BASE_URL}/api/today-attendance/`);
            const data = await res.json();
            modalTableBody.innerHTML = ""; 

            if (data.length === 0) {
                modalTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No attendance records for today.</td></tr>`;
                return;
            }

            data.forEach(emp => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${emp.id}</td>
                    <td class="employee-cell">
                        <strong>${emp.name}</strong><br>
                        <small>${emp.role}</small>
                    </td>
                    <td>${emp.date}</td>
                    <td>
                        <div style="font-size: 13px;">In: ${formatTimeUTC(emp.checkin) || "--:--"}</div>
                        <div style="font-size: 13px;">Out: ${formatTimeUTC(emp.checkout) || "--:--"}</div>
                    </td>
                    <td>${emp.duration || "N/A"}</td>
                `;
                modalTableBody.appendChild(row);
            });
        } catch (err) {
            console.error("Error fetching today's attendance:", err);
            modalTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading details.</td></tr>`;
        }
    }
    
    const currentMonthIndex = new Date().getMonth(); 
    if (da_monthSelect) {
        da_monthSelect.value = currentMonthIndex;
    }

    if (da_monthSelect) {
        da_monthSelect.addEventListener('change', da_runSimulation);
    }
    
    if (da_staffInput) {
        da_staffInput.addEventListener('change', () => {
            const inputVal = da_staffInput.value;
            if(inputVal && inputVal > 0) {
                da_runSimulation(); 
            }
        });
    }

    if (triggerBtn && detailModal) {
        triggerBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await loadTodayAttendanceModal();
            detailModal.style.display = "flex";
        });
    }

    if (closeBtn && detailModal) {
        closeBtn.addEventListener("click", () => {
            detailModal.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.style.display = "none";
        }
    });
    
    da_runSimulation();
});
// ====================================================================

//birthday wihes
//birthday wishes
document.addEventListener("DOMContentLoaded", function () {
    
    // Updated data with phone numbers (Use real numbers in production)
    const birthdays = [
        { name: "Dhamodhar", role: "IOS Developer", date: "24 Oct", rawDate: "2023-10-24", img: "../assets/profiledp.jpeg", phone: "8790997602" },
        { name: "Saleem", role: "UI Designer", date: "25 Oct", rawDate: "2023-10-25", img: "../assets/profiledp.jpeg", phone: "7075653250" },
        { name: "Balaji", role: "Product Manager", date: "26 Oct", rawDate: "2023-10-26", img: "../assets/profiledp.jpeg", phone: "8309930827" },
        { name: "Manikanta", role: "QA Engineer", date: "28 Oct", rawDate: "2023-10-28", img: "../assets/profiledp.jpeg", phone: "7036084043" },
        { name: "Arjun", role: "HR Manager", date: "02 Nov", rawDate: "2023-11-02", img: "../assets/profiledp.jpeg", phone: "919876543214" }
    ];

    let currentIndex = 0;
    let currentTargetPhone = ""; // Variable to store phone number for redirection
    let autoSlideInterval;

    const imgEl = document.getElementById("bdayImg");
    const nameEl = document.getElementById("bdayName");
    const roleEl = document.getElementById("bdayRole");
    const dateEl = document.getElementById("bdayDate");
    const container = document.getElementById("bdayProfileContainer");
    const bdayCard = document.querySelector(".birthday-card");

    function updateCarousel(index) {
        if(!container) return;
        container.classList.remove("fade-in");
        void container.offsetWidth; 
        const person = birthdays[index];
        if(imgEl) imgEl.src = person.img;
        if(nameEl) nameEl.innerText = person.name;
        if(roleEl) roleEl.innerText = person.role;
        if(dateEl) dateEl.innerText = person.date;
        container.classList.add("fade-in");
    }

    function startAutoSlide() {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % birthdays.length;
            updateCarousel(currentIndex);
        }, 4000);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    if(bdayCard) {
        bdayCard.addEventListener("mouseenter", stopAutoSlide);
        bdayCard.addEventListener("mouseleave", startAutoSlide);
    }

    const nextBtn = document.getElementById("nextBdayBtn");
    const prevBtn = document.getElementById("prevBdayBtn");

    if(nextBtn) nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % birthdays.length;
        updateCarousel(currentIndex);
        stopAutoSlide(); 
        if(!bdayCard.matches(':hover')) startAutoSlide();
    });

    if(prevBtn) prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + birthdays.length) % birthdays.length;
        updateCarousel(currentIndex);
        stopAutoSlide();
        if(!bdayCard.matches(':hover')) startAutoSlide();
    });

    // --- Modal Elements ---
    const wishModal = document.getElementById("wishModal");
    const wishTargetName = document.getElementById("wishTargetName");
    const wishMessage = document.getElementById("wishMessage");
    const successWishModal = document.getElementById("successWishModal"); 
    const successName = document.getElementById("successName"); 

    // --- Open Modal Logic ---
    window.openWishModal = function(identifier) {
        stopAutoSlide();
        let person = null;

        if (identifier === 'current') {
            person = birthdays[currentIndex];
        } else {
            // Find person by name from the list view
            person = birthdays.find(p => p.name === identifier);
        }

        if (person) {
            if(wishTargetName) wishTargetName.innerText = person.name;
            currentTargetPhone = person.phone; // Store the phone number
            // Pre-fill a nice message
            if(wishMessage) wishMessage.value = `Happy Birthday ${person.name}! Have a fantastic year ahead! 🎉`; 
            if(wishModal) wishModal.classList.add("active");
        }
    };

    window.closeWishModal = function() {
        if(wishModal) wishModal.classList.remove("active");
        if(bdayCard && !bdayCard.matches(':hover')) {
            startAutoSlide();
        }
    };

    // --- Submit Logic (WhatsApp Redirect) ---
    window.submitWish = function() {
        const btn = document.querySelector(".btn-send-wish");
        const message = wishMessage.value.trim();

        if(!btn) return;
        if(!message) {
            alert("Please write a message first!");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening WhatsApp...';
        
        // Simulate a small delay for better UX
        setTimeout(() => {
            // Construct WhatsApp URL
            const whatsappUrl = `https://wa.me/${currentTargetPhone}?text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp in new tab
            window.open(whatsappUrl, '_blank');

            // Reset UI
            btn.innerHTML = originalText;
            const currentName = wishTargetName.innerText;
            closeWishModal();
            openSuccessWishModal(currentName); // Show success modal after redirecting
        }, 1000);
    };

    window.openSuccessWishModal = function(name) {
        if(successName) successName.innerText = name;
        if(successWishModal) successWishModal.classList.add("active");
    };

    window.closeSuccessWishModal = function() {
        if(successWishModal) successWishModal.classList.remove("active");
    };

    // --- View All Logic ---
    const allBdayModal = document.getElementById("allBirthdaysModal");
    const listContainer = document.getElementById("bdayListContainer");

    window.openAllBirthdaysModal = function() {
        stopAutoSlide();
        if(listContainer) {
            listContainer.innerHTML = "";
            birthdays.forEach(person => {
                const item = document.createElement("div");
                item.className = "bday-item";
                item.innerHTML = `
                    <div class="bday-left">
                        <img src="${person.img}" alt="${person.name}">
                        <div class="bday-info">
                            <h4>${person.name}</h4>
                            <span>${person.date} - ${person.role}</span>
                        </div>
                    </div>
                    <button class="btn-mini-wish" onclick="openWishModal('${person.name}')">
                        Wish
                    </button>
                `;
                listContainer.appendChild(item);
            });
        }
        if(allBdayModal) allBdayModal.classList.add("active");
    };

    window.closeAllBirthdaysModal = function() {
        if(allBdayModal) allBdayModal.classList.remove("active");
        if(bdayCard && !bdayCard.matches(':hover')) {
            startAutoSlide();
        }
    };

    // Close on outside click
    window.onclick = function(event) {
        if (event.target === wishModal) closeWishModal();
        if (event.target === allBdayModal) closeAllBirthdaysModal();
        if (event.target === successWishModal) closeSuccessWishModal();
    };

    // Initial Load
    if(birthdays.length > 0) {
        updateCarousel(currentIndex);
        startAutoSlide();
    }
});


//holidays section
let holidays = [
    { name: 'Republic Day', date: '2025-01-26', type: 'Public Holiday' },
    { name: 'Holi', date: '2025-03-14', type: 'Public Holiday' },
    { name: 'Good Friday', date: '2025-04-18', type: 'Optional Holiday' },
    { name: 'Independence Day', date: '2025-08-15', type: 'Public Holiday' },
    { name: 'Diwali', date: '2025-10-20', type: 'Public Holiday' }
];

document.addEventListener('DOMContentLoaded', () => {

    const holidayListModal = document.getElementById('hraHolidayListModal');
    const holidayAddModal = document.getElementById('hraAddHolidayModal');
    const tableBody = document.getElementById('hraHolidayTableBody');
    const successPopup = document.getElementById('hraSuccessPopup');

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });
    }

    function getDayName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    function updateCard() {
        const today = new Date().toISOString().split('T')[0];
        const sortedHolidays = holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        const nextHoliday = sortedHolidays.find(h => h.date >= today);
        
        const textElement = document.getElementById('hraNextHolidayText');
        if (textElement) {
            if (nextHoliday) {
                textElement.textContent = `${nextHoliday.name}, ${formatDate(nextHoliday.date)}`;
            } else {
                textElement.textContent = "No upcoming holidays";
            }
        }
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));

        holidays.forEach(h => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight:600;">${formatDate(h.date)}</td>
                <td style="color: #6b7280;">${getDayName(h.date)}</td>
                <td>${h.name}</td>
                <td><span style="background:#f3f4f6; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${h.type}</span></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function showSuccess() {
        if (!successPopup) return;
        successPopup.classList.add('hra-show');
        setTimeout(() => {
            successPopup.classList.remove('hra-show');
        }, 3000);
    }

    updateCard(); 

    const viewHolidayBtn = document.getElementById('hraViewHolidayBtn');
    if (viewHolidayBtn) {
        viewHolidayBtn.addEventListener('click', () => {
            renderTable();
            if (holidayListModal) holidayListModal.style.display = 'flex';
        });
    }

    const closeHolidayListBtn = document.getElementById('hraCloseHolidayList');
    if (closeHolidayListBtn) {
        closeHolidayListBtn.addEventListener('click', () => {
            if (holidayListModal) holidayListModal.style.display = 'none';
        });
    }

    const openAddHolidayBtn = document.getElementById('hraOpenAddHolidayBtn');
    if (openAddHolidayBtn) {
        openAddHolidayBtn.addEventListener('click', () => {
            if (holidayAddModal) holidayAddModal.style.display = 'flex';
        });
    }

    const closeAddHolidayBtn = document.getElementById('hraCloseAddHoliday');
    if (closeAddHolidayBtn) {
        closeAddHolidayBtn.addEventListener('click', () => {
            if (holidayAddModal) holidayAddModal.style.display = 'none';
        });
    }

    const holidayForm = document.getElementById('hraHolidayForm');
    if (holidayForm) {
        holidayForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('hraHolidayName').value;
            const date = document.getElementById('hraHolidayDate').value;
            const type = document.getElementById('hraHolidayType').value;

            holidays.push({ name, date, type });

            renderTable(); 
            updateCard();  

            if (holidayAddModal) holidayAddModal.style.display = 'none';
            holidayForm.reset();

            showSuccess();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target == holidayListModal) holidayListModal.style.display = 'none';
        if (e.target == holidayAddModal) holidayAddModal.style.display = 'none';
    });
});


//calender section
document.addEventListener("DOMContentLoaded", function() {
    
    const btn = document.getElementById("dateTriggerBtn");
    const displaySpan = document.getElementById("dateDisplay");
    const dateInput = document.getElementById("nativeDatePicker");

    if (!btn || !displaySpan || !dateInput) return;

    function formatDate(dateObj) {
        return dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    const today = new Date();
    displaySpan.innerText = formatDate(today);

    btn.addEventListener("click", function() {
        try {
            dateInput.showPicker(); 
        } catch (error) {
            dateInput.focus();
            dateInput.click();
        }
    });

    dateInput.addEventListener("change", function() {
        if (this.value) {
            const selectedDate = new Date(this.value);
            displaySpan.innerText = formatDate(selectedDate);
        }
    });

});


/* --- NOTIFICATION LOGIC (nt-) --- */
let notifications = [
    {
        id: 1,
        text: "<strong>Dhamodhar</strong> applied for the UX Designer position.",
        time: "2 mins ago",
        icon: "👩‍💼", 
        read: false
    },
    {
        id: 2,
        text: "Meeting with <strong>Dev Team</strong> starts in 15 minutes.",
        time: "15 mins ago",
        icon: "📅",
        read: false
    },
    {
        id: 3,
        text: "New system update available.",
        time: "1 hour ago",
        icon: "⚙️",
        read: true
    },
    {
        id: 4,
        text: "<strong>Arjun</strong> accepted the offer.",
        time: "3 hours ago",
        icon: "✅",
        read: true
    }
];

document.addEventListener('DOMContentLoaded', () => {
    
    const bellBtn = document.getElementById('ntBellBtn');
    const dropdown = document.getElementById('ntDropdown');
    const markReadBtn = document.getElementById('ntMarkAllRead');

    if (!bellBtn || !dropdown || !markReadBtn) return;

    ntRenderList();

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });

    markReadBtn.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        ntRenderList();
    });

    window.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
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


//logout section
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

    // 2. Redirect to Login Page
    window.location.href = "../../index.html";
}

window.addEventListener('click', function(event) {
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
});