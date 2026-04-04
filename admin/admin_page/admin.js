// --- PRELOADER LOGIC ---
window.addEventListener("load", function () {
    const preloader = document.getElementById("page-preloader");

    setTimeout(() => {
        if (preloader) {
            preloader.classList.add("loaded");

            setTimeout(() => {
                preloader.style.display = "none";
            }, 500);
        }
    }, 800);
});

// ==========================================
// API BASE URL
// ==========================================
const API_BASE_URL = "https://api.theoppty.com";

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function formatTimeUTC(timeStr) {
    if (!timeStr) return null;

    if (timeStr.length < 10 && !timeStr.includes("T")) return timeStr;

    try {
        const dateObj = new Date(timeStr);
        return dateObj.toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch (error) {
        return timeStr;
    }
}

function safeSetDisplay(id, value) {
    const el = document.getElementById(id);
    if (el) el.style.display = value;
}

// ==========================================
// PENDING APPROVALS COUNT
// ==========================================
async function loadPendingApprovalsCount() {
    try {
        const leavePromise = fetch(`${API_BASE_URL}/api/leave-approvals/`);
        const assetPromise = fetch(`${API_BASE_URL}/api/admin/asset-requests/`);
        const attendancePromise = fetch(`${API_BASE_URL}/api/admin/attendance-requests/`);

        const responses = await Promise.all([leavePromise, assetPromise, attendancePromise]);

        for (const res of responses) {
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }
        }

        const [leaveData, assetData, attendanceData] = await Promise.all(
            responses.map((res) => res.json())
        );

        const leaveCount = leaveData.data ? leaveData.data.length : 0;
        const assetCount = assetData ? assetData.length : 0;
        const attendanceCount = attendanceData ? attendanceData.length : 0;

        const totalCount = leaveCount + assetCount + attendanceCount;

        const approvalSpan = document.getElementById("pendingApprovalsCount");
        if (approvalSpan) {
            approvalSpan.innerHTML = `
                <a href="../approval/approval.html" class="highlight-pending">
                    ${totalCount} Pending Approvals
                </a>
            `;
        }
    } catch (error) {
        console.error("Error loading pending approvals count:", error);
        const approvalSpan = document.getElementById("pendingApprovalsCount");
        if (approvalSpan) {
            approvalSpan.innerHTML = `
                <a href="../approval/approval.html" class="highlight-pending">
                    Error loading approvals
                </a>
            `;
        }
    }
}

// ==========================================
// BIRTHDAY GLOBALS
// ==========================================
let todayBirthdays = [];
let upcomingBirthdays = [];
let currentBdayIndex = 0;
let bdayAutoInterval = null;
window.currentTargetPhone = "";

// ==========================================
// BIRTHDAY FUNCTIONS
// ==========================================
async function loadBirthdayData() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/birthdays/`);
        if (!res.ok) throw new Error("Failed to fetch birthdays");
        const data = await res.json();

        todayBirthdays = data.today || [];
        upcomingBirthdays = data.upcoming || [];

        if (todayBirthdays.length > 0) {
            currentBdayIndex = 0;
            updateBdayCarousel(0);
            startBdayRotation();
        } else {
            const nameEl = document.getElementById("bdayName");
            if (nameEl) nameEl.innerText = "No Birthdays Today";
        }
    } catch (err) {
        console.error("Birthday Fetch Error:", err);
    }
}

function updateBdayCarousel(index) {
    const container = document.getElementById("bdayProfileContainer");
    if (!container || todayBirthdays.length === 0) return;

    container.classList.remove("fade-in");
    void container.offsetWidth;

    const person = todayBirthdays[index];
    const imgEl = document.getElementById("bdayImg");
    const nameEl = document.getElementById("bdayName");
    const roleEl = document.getElementById("bdayRole");
    const dateEl = document.getElementById("bdayDate");

    const oldInit = container.querySelector(".avatar-initials-gen");
    if (oldInit) oldInit.remove();

    if (imgEl) {
        if (person.profile_pic) {
            imgEl.src = API_BASE_URL + person.profile_pic;
            imgEl.style.display = "block";
        } else {
            imgEl.style.display = "none";

            const nameParts = (person.name || "").trim().split(" ");
            const initials = (
                (nameParts[0]?.charAt(0) || "") +
                (nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || "" : "")
            ).toUpperCase();

            const initialsDiv = document.createElement("div");
            initialsDiv.className = "avatar-initials-gen";
            initialsDiv.innerText = initials || "?";
            container.prepend(initialsDiv);
        }
    }

    if (nameEl) nameEl.innerText = person.name || "Unknown";
    if (roleEl) roleEl.innerText = person.role || "Associate Software Engineering";
    if (dateEl) dateEl.innerText = `Today, ${person.dob || ""}`;

    container.classList.add("fade-in");
}

function startBdayRotation() {
    if (todayBirthdays.length <= 1) return;
    clearInterval(bdayAutoInterval);
    bdayAutoInterval = setInterval(() => {
        currentBdayIndex = (currentBdayIndex + 1) % todayBirthdays.length;
        updateBdayCarousel(currentBdayIndex);
    }, 5000);
}

window.openWishModal = function (id) {
    clearInterval(bdayAutoInterval);

    let p =
        id === "current"
            ? todayBirthdays[currentBdayIndex]
            : [...todayBirthdays, ...upcomingBirthdays].find((x) => x.name === id);

    if (p) {
        const targetName = document.getElementById("wishTargetName");
        const messageEl = document.getElementById("wishMessage");
        if (targetName) targetName.innerText = p.name || "";
        if (messageEl) messageEl.value = `Happy Birthday ${p.name}! 🎂`;
        window.currentTargetPhone = p.mobile || "";
        document.getElementById("wishModal")?.classList.add("active");
    }
};

window.openAllBirthdaysModal = function () {
    clearInterval(bdayAutoInterval);

    const listContainer = document.getElementById("bdayListContainer");
    const today = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const tenDaysLater = new Date();
    tenDaysLater.setDate(today.getDate() + 10);

    const next10DaysList = upcomingBirthdays.filter((p) => {
        const bdayThisYear = new Date(`${p.dob} ${today.getFullYear()}`);
        return bdayThisYear >= tomorrow && bdayThisYear <= tenDaysLater;
    });

    if (listContainer) {
        if (next10DaysList.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">No birthdays in the next 10 days.</div>`;
        } else {
            listContainer.innerHTML = next10DaysList
                .map((p) => {
                    let avatarHtml = p.profile_pic
                        ? `<img src="${API_BASE_URL}${p.profile_pic}" style="width:45px; height:45px; border-radius:50%; object-fit:cover;">`
                        : `<div class="avatar-initials-gen" style="width:45px; height:45px; font-size:16px; margin:0; display:flex; align-items:center; justify-content:center; background:#ff5b1e; color:white; border-radius:50%;">${p.name ? p.name.charAt(0).toUpperCase() : "?"}</div>`;

                    return `
                    <div class="bday-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f0f0f0;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${avatarHtml}
                            <div>
                                <h4 style="margin:0; font-size:14px; color:#333;">${p.name || ""}</h4>
                                <span style="font-size:12px; color:#888;">${p.dob || ""}</span>
                            </div>
                        </div>
                        <button class="btn-mini-wish" onclick="openWishModal('${p.name}')" style="background:#ff5b1e; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">Wish</button>
                    </div>`;
                })
                .join("");
        }
    }

    document.getElementById("allBirthdaysModal")?.classList.add("active");
};

window.closeWishModal = () => {
    document.getElementById("wishModal")?.classList.remove("active");
    startBdayRotation();
};

window.closeAllBirthdaysModal = () => {
    document.getElementById("allBirthdaysModal")?.classList.remove("active");
    startBdayRotation();
};

window.openSuccessWishModal = function (name) {
    const successName = document.getElementById("successName");
    const successWishModal = document.getElementById("successWishModal");
    if (successName) successName.innerText = name;
    if (successWishModal) successWishModal.classList.add("active");
};

window.closeSuccessWishModal = function () {
    document.getElementById("successWishModal")?.classList.remove("active");
};

window.submitWish = function () {
    const btn = document.querySelector(".btn-send-wish");
    const wishMessageEl = document.getElementById("wishMessage");
    const wishTargetNameEl = document.getElementById("wishTargetName");

    if (!btn || !wishMessageEl) return;

    const message = wishMessageEl.value.trim();
    if (!message) {
        alert("Please write a message first!");
        return;
    }

    if (!window.currentTargetPhone) {
        alert("Phone number not available for this employee.");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening WhatsApp...';

    setTimeout(() => {
        const whatsappUrl = `https://wa.me/${window.currentTargetPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");

        btn.innerHTML = originalText;
        const currentName = wishTargetNameEl ? wishTargetNameEl.innerText : "";
        closeWishModal();
        openSuccessWishModal(currentName);
    }, 1000);
};

// ==========================================
// LATE & ABSENT LIST FUNCTIONS
// ==========================================
function isLateCheck(timeStr) {
    if (!timeStr) return false;

    if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const [time, modifier] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        hours = parseInt(hours);
        minutes = parseInt(minutes);

        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        return hours > 10 || (hours === 10 && minutes > 0);
    }

    const dateObj = new Date(timeStr);
    const h = dateObj.getUTCHours();
    const m = dateObj.getUTCMinutes();
    return h > 10 || (h === 10 && m > 0);
}

async function loadLateList() {
    const table = document.getElementById("lateTableBody");
    if (!table) return;

    table.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Loading...</td></tr>";

    try {
        const res = await fetch(`${API_BASE_URL}/api/today-attendance/`);
        if (!res.ok) throw new Error("Failed to fetch late list");
        const data = await res.json();

        const lateEmployees = data.filter((emp) => isLateCheck(emp.checkin));

        if (lateEmployees.length === 0) {
            table.innerHTML =
                "<tr><td colspan='4' style='text-align:center;'>No data found matching late criteria.</td></tr>";
            return;
        }

        table.innerHTML = "";
        lateEmployees.forEach((emp) => {
            table.innerHTML += `
                <tr>
                    <td>${emp.id || "--"}</td>
                    <td><strong>${emp.name || "--"}</strong><br><small>${emp.role || "--"}</small></td>
                    <td style="color: #dc3545; font-weight: bold;">${emp.checkin || "--"}</td>
                    <td><span class="status-badge rejected">Late</span></td>
                </tr>`;
        });
    } catch (e) {
        console.error("Late list error:", e);
        table.innerHTML =
            "<tr><td colspan='4' style='text-align:center; color:red;'>Error loading data.</td></tr>";
    }
}

async function loadAbsentList() {
    const table = document.getElementById("absentTableBody");
    if (!table) return;

    table.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    try {
        const [empRes, attRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/employees/`),
            fetch(`${API_BASE_URL}/api/today-attendance/`),
        ]);

        if (!empRes.ok || !attRes.ok) throw new Error("Failed to fetch absent data");

        const allEmployees = await empRes.json();
        const presentData = await attRes.json();
        const presentIds = presentData.map((p) => String(p.id));

        const absentList = allEmployees.filter(
            (e) => !presentIds.includes(String(e.employee_id || e.id))
        );

        table.innerHTML = absentList.length
            ? ""
            : "<tr><td colspan='4'>Everyone is present!</td></tr>";

        absentList.forEach((emp) => {
            const row = `<tr>
                <td>${emp.employee_id || emp.id || "--"}</td>
                <td><strong>${emp.name || "--"}</strong></td>
                <td>${emp.role || emp.department || "--"}</td>
                <td><span class="status-badge rejected">Absent</span></td>
            </tr>`;
            table.innerHTML += row;
        });
    } catch (e) {
        console.error("Absent list error:", e);
        table.innerHTML =
            "<tr><td colspan='4' style='color:red; text-align:center;'>Error loading data.</td></tr>";
    }
}

// ==========================================
// GLOBAL MODAL CLOSE FUNCTIONS
// ==========================================
window.closeAttendanceModal = () => safeSetDisplay("detailModal", "none");
window.closeLateModal = () => safeSetDisplay("lateModal", "none");
window.closeAbsentModal = () => safeSetDisplay("absentModal", "none");

// ==========================================
// MAIN DOM READY
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("oppty Dashboard JS Initialized.");

    // ==========================================
    // INITIAL LOADS
    // ==========================================
    loadBirthdayData();
    loadPendingApprovalsCount();

    // ==========================================
    // HAMBURGER SECTION
    // ==========================================
    const hamburgerBtn = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("sidebar");
    const closeBtn = document.getElementById("sidebarCloseBtn");
    const overlay = document.getElementById("sidebarOverlay");

    if (hamburgerBtn && sidebar && overlay) {
        hamburgerBtn.addEventListener("click", function () {
            sidebar.classList.add("mobile-active");
            overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        });
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove("mobile-active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    // ==========================================
    // JOB APPLICANTS STATIC CONTENT
    // ==========================================
    const applicantTabsContainer = document.querySelector("#job-applicants .tabs");
    const applicantListContainer = document.getElementById("applicant-list-content");

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

    if (applicantTabsContainer && applicantListContainer) {
        applicantTabsContainer.addEventListener("click", (e) => {
            const tab = e.target.closest(".tab");
            if (!tab) return;

            applicantTabsContainer.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            const tabType = tab.dataset.tab;
            applicantListContainer.innerHTML =
                tabType === "openings" ? OPENINGS_CONTENT : APPLICANTS_CONTENT;
        });
    }

    // ==========================================
    // EMPLOYEE MODULE
    // ==========================================
    const EMPLOYEES = [];

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

    async function loadEmployeeStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/`);
            if (!response.ok) throw new Error("Failed to fetch employees for stats");

            const data = await response.json();
            const total = data.length;

            let counts = {
                WFO: 0,
                WFH: 0,
                Internship: 0,
            };

            data.forEach((emp) => {
                const type = emp.full_time;
                if (counts.hasOwnProperty(type)) {
                    counts[type]++;
                } else if (type) {
                    const upperType = String(type).toUpperCase().trim();
                    if (upperType === "WFO") counts.WFO++;
                    else if (upperType === "WFH") counts.WFH++;
                    else if (upperType.includes("INTERN")) counts.Internship++;
                }
            });

            const totalEl = document.getElementById("totalEmpCount");
            if (totalEl) totalEl.innerText = total;

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

            updateBar("WFO", "bar-wfo", "label-wfo", "val-wfo");
            updateBar("WFH", "bar-wfh", "label-wfh", "val-wfh");
            updateBar("Internship", "bar-intern", "label-intern", "val-intern");
        } catch (error) {
            console.error("Error loading employee stats:", error);
        }
    }

    function renderTable(data) {
        if (!tableBody) return;

        let html = "";
        if (data.length === 0) {
            html = '<tr><td colspan="5" style="text-align:center;">No employees found</td></tr>';
        } else {
            data.forEach((emp) => {
                html += `
                    <tr>
                        <td>${emp.emp_id || "--"}</td>
                        <td>${emp.name || "--"}</td>
                        <td>${emp.email || "--"}</td>
                        <td>${emp.position || "--"}</td>
                        <td>${emp.salary !== null && emp.salary !== undefined ? "₹" + emp.salary : "N/A"}</td>
                    </tr>`;
            });
        }
        tableBody.innerHTML = html;
    }

    if (triggerEmployeeBtn && employeeModal) {
        triggerEmployeeBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (tableBody) {
                tableBody.innerHTML =
                    '<tr><td colspan="5" style="text-align:center;">Loading employees...</td></tr>';
            }
            employeeModal.style.display = "block";

            try {
                const response = await fetch(`${API_BASE_URL}/api/employees/`);
                if (!response.ok) throw new Error("Failed to fetch employees");

                const data = await response.json();

                EMPLOYEES.length = 0;

                data.forEach((emp) => {
                    EMPLOYEES.push({
                        emp_id: emp.employee_id || emp.id || "--",
                        name: emp.name || "Unknown",
                        email: emp.email || "--",
                        position: emp.role || emp.department || "--",
                        salary: emp.salary ?? 0,
                        type: emp.full_time || "WFO",
                    });
                });

                renderTable(EMPLOYEES);
            } catch (error) {
                console.error("Error loading employee list:", error);
                if (tableBody) {
                    tableBody.innerHTML =
                        '<tr><td colspan="5" style="text-align:center; color: red;">Failed to load employees. Please check your server.</td></tr>';
                }
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = EMPLOYEES.filter(
                (emp) =>
                    String(emp.name).toLowerCase().includes(term) ||
                    String(emp.emp_id).toLowerCase().includes(term)
            );
            renderTable(filtered);
        });
    }

    const closeTableModal = () => {
        if (employeeModal) employeeModal.style.display = "none";
        if (searchInput) searchInput.value = "";
    };

    if (closeEmployeeBtn) closeEmployeeBtn.onclick = closeTableModal;

    if (empOpenBtn && empModal) empOpenBtn.onclick = () => (empModal.style.display = "flex");
    if (addEmpFromTableBtn && empModal) {
        addEmpFromTableBtn.onclick = () => (empModal.style.display = "flex");
    }

    const closeAddModal = () => {
        if (empModal) empModal.style.display = "none";
    };

    function resetForm() {
        if (!empForm) return;
        empForm.reset();
        const inputs = empForm.querySelectorAll("input, select");
        inputs.forEach((input) => input.classList.remove("input-error"));
        const msgs = empForm.querySelectorAll(".error-msg");
        msgs.forEach((msg) => (msg.style.display = "none"));
    }

    if (empCloseBtn) {
        empCloseBtn.onclick = () => {
            closeAddModal();
            resetForm();
        };
    }

    if (empCancelBtn) {
        empCancelBtn.onclick = () => {
            closeAddModal();
            resetForm();
        };
    }

    const setError = (element, message) => {
        if (!element) return;
        const inputControl = element.parentElement;
        const errorDisplay = inputControl ? inputControl.querySelector(".error-msg") : null;
        if (errorDisplay) {
            errorDisplay.innerText = message;
            errorDisplay.style.display = "block";
        }
        element.classList.add("input-error");
    };

    const setSuccess = (element) => {
        if (!element) return;
        const inputControl = element.parentElement;
        const errorDisplay = inputControl ? inputControl.querySelector(".error-msg") : null;
        if (errorDisplay) errorDisplay.style.display = "none";
        element.classList.remove("input-error");
    };

    const validateInputs = () => {
        let isValid = true;
        const name = document.getElementById("nameInput");
        const empId = document.getElementById("empIdInput");
        const email = document.getElementById("emailInput");
        const type = document.getElementById("typeInput");
        const password = document.getElementById("passwordInput");

        if (!name || name.value.trim() === "") {
            setError(name, "Name required");
            isValid = false;
        } else {
            setSuccess(name);
        }

        if (!empId || empId.value.trim() === "") {
            setError(empId, "ID required");
            isValid = false;
        } else {
            setSuccess(empId);
        }

        if (!email || email.value.trim() === "") {
            setError(email, "Email required");
            isValid = false;
        } else {
            setSuccess(email);
        }

        if (!password || password.value.trim() === "") {
            setError(password, "Password required");
            isValid = false;
        } else {
            setSuccess(password);
        }

        if (!type || type.value === "") {
            setError(type, "Type required");
            isValid = false;
        } else {
            setSuccess(type);
        }

        return isValid;
    };

    // IMPORTANT FIX:
    // Employee was not adding because payload/field handling and error handling were weak.
    // This version uses async/await, proper status checking, better payload cleanup,
    // and shows backend error messages.
    if (empForm) {
        empForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            if (!validateInputs()) return;

            const submitBtn = empForm.querySelector('button[type="submit"]');

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving...";
                }

                const nameVal = document.getElementById("nameInput")?.value.trim() || "";
                const empIdVal = document.getElementById("empIdInput")?.value.trim() || "";
                const emailVal = document.getElementById("emailInput")?.value.trim() || "";
                const jobVal = document.getElementById("jobInput")?.value.trim() || "";
                const salaryVal = document.getElementById("salaryInput")?.value.trim() || "";
                const typeVal = document.getElementById("typeInput")?.value || "";
                const passwordVal = document.getElementById("passwordInput")?.value.trim() || "";
                const joiningVal = document.getElementById("dateInput")?.value || "";
                const deptVal = document.getElementById("deptInput")?.value.trim() || "";
                const managerVal = document.getElementById("managerInput")?.value.trim() || "";
                const locationVal = document.getElementById("locationInput")?.value.trim() || "";

                const newEmpId = String(empIdVal).padStart(3, "0");

                const apiEmployee = {
                    name: nameVal,
                    employee_id: newEmpId,
                    email: emailVal,
                    password: passwordVal,
                    role: jobVal || "Not Specified",
                    salary: salaryVal === "" ? null : Number(salaryVal),
                    joining: joiningVal || null,
                    department: deptVal || "",
                    manager_employee: managerVal || "",
                    location: locationVal || "",
                    full_time: typeVal,
                };

                console.log("Sending employee payload:", apiEmployee);

                const response = await fetch(`${API_BASE_URL}/api/create/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(apiEmployee),
                });

                let responseData = null;
                const responseText = await response.text();

                try {
                    responseData = responseText ? JSON.parse(responseText) : {};
                } catch {
                    responseData = { message: responseText };
                }

                if (!response.ok) {
                    console.error("Create employee failed:", response.status, responseData);
                    alert(
                        responseData?.message ||
                            responseData?.detail ||
                            JSON.stringify(responseData) ||
                            "Failed to add employee."
                    );
                    return;
                }

                console.log("API Success:", responseData);

                await loadEmployeeStats();

                if (employeeModal && employeeModal.style.display === "block") {
                    try {
                        const listRes = await fetch(`${API_BASE_URL}/api/employees/`);
                        if (listRes.ok) {
                            const data = await listRes.json();
                            EMPLOYEES.length = 0;
                            data.forEach((emp) => {
                                EMPLOYEES.push({
                                    emp_id: emp.employee_id || emp.id || "--",
                                    name: emp.name || "Unknown",
                                    email: emp.email || "--",
                                    position: emp.role || emp.department || "--",
                                    salary: emp.salary ?? 0,
                                    type: emp.full_time || "WFO",
                                });
                            });
                            renderTable(EMPLOYEES);
                        }
                    } catch (listErr) {
                        console.error("Refresh employee list failed:", listErr);
                    }
                }

                closeAddModal();
                if (successModal) successModal.style.display = "flex";
            } catch (err) {
                console.error("API Error:", err);
                alert("Something went wrong while adding employee. Please check console/network.");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Submit";
                }
            }
        });
    }

    if (successOkBtn) {
        successOkBtn.onclick = () => {
            if (successModal) successModal.style.display = "none";
            resetForm();
        };
    }

    // ==========================================
    // EMPLOYEE DISTRIBUTION CHART
    // ==========================================
    const dd_svgChart = document.querySelector(".dd-donut-svg");
    const dd_legendList = document.getElementById("ddLegendList");
    const dd_totalDisplay = document.getElementById("ddTotalDisplay");
    const totalEmpCountEl = document.getElementById("totalEmpCount");
    const totalEmployeesEl = document.getElementById("total_employees");

    fetch(`${API_BASE_URL}/api/employees/`)
        .then((res) => res.json())
        .then((data) => {
            const total = data.length;
            if (dd_totalDisplay) dd_totalDisplay.innerText = total;
            if (totalEmpCountEl) totalEmpCountEl.innerText = total;
            if (totalEmployeesEl) totalEmployeesEl.innerText = total;

            const departmentMap = {};

            data.forEach((emp) => {
                const dept = emp.department || "Others";
                if (!departmentMap[dept]) departmentMap[dept] = 0;
                departmentMap[dept] += 1;
            });

            const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#009688"];

            const dd_departmentData = Object.keys(departmentMap).map((dept, index) => ({
                name: dept,
                count: departmentMap[dept],
                color: colors[index % colors.length],
                class: `dept-${index}`,
            }));

            renderChart(dd_departmentData, total);
        })
        .catch((err) => {
            console.error("Error fetching employees:", err);
        });

    function renderChart(dd_departmentData, total) {
        if (!dd_svgChart || !dd_legendList) return;

        dd_svgChart.innerHTML = "";
        dd_legendList.innerHTML = "";

        let cumulativePercent = 0;

        dd_departmentData.forEach((dept) => {
            const percentage = total > 0 ? ((dept.count / total) * 100).toFixed(1) : 0;

            const li = document.createElement("li");
            li.className = "dd-legend-item";

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

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const segmentLength = total > 0 ? (dept.count / total) * circumference : 0;

            circle.setAttribute("cx", "50");
            circle.setAttribute("cy", "50");
            circle.setAttribute("r", radius);
            circle.setAttribute("stroke", dept.color);
            circle.setAttribute("fill", "transparent");
            circle.setAttribute("stroke-width", "10");

            const offset = -1 * (cumulativePercent / 100) * circumference;

            circle.style.strokeDasharray = `0 ${circumference}`;
            circle.style.strokeDashoffset = offset;

            dd_svgChart.appendChild(circle);

            setTimeout(() => {
                circle.style.strokeDasharray = `${segmentLength} ${circumference}`;
            }, 100);

            cumulativePercent += total > 0 ? (dept.count / total) * 100 : 0;
        });
    }

    // ==========================================
    // ATTENDANCE GRAPH & DETAILS LOGIC
    // ==========================================
    const da_monthSelect = document.getElementById("daMonthSelect");
    const da_yAxis = document.getElementById("daYAxisContainer");
    const da_barsContainer = document.getElementById("daBarsContainer");
    const da_xLabelsContainer = document.getElementById("daXLabelsContainer");

    const da_statOntime = document.getElementById("daAvgOntimeDisplay");
    const da_statLate = document.getElementById("daAvgLateDisplay");
    const da_statAbsent = document.getElementById("daAvgAbsentDisplay");
    const da_overviewCount = document.getElementById("attendanceOverviewCount");

    const da_staffInput = document.getElementById("daStaffCountInput");

    const detailModal = document.getElementById("detailModal");
    const modalTableBody = document.getElementById("modalTableBody");
    const triggerBtn = document.querySelector(".attendance-trigger");
    const detailCloseBtn = document.querySelector(".close-btn");

    async function loadTodayAttendanceModal() {
        if (!modalTableBody) return;
        modalTableBody.innerHTML = '<tr><td colspan="5" class="loading-spinner"></td></tr>';

        try {
            const res = await fetch(`${API_BASE_URL}/api/today-attendance/`);
            if (!res.ok) throw new Error("Failed to fetch today's attendance");
            const data = await res.json();
            modalTableBody.innerHTML = "";

            if (data.length === 0) {
                modalTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No attendance records for today.</td></tr>`;
                return;
            }

            data.forEach((emp) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${emp.id || "--"}</td>
                    <td><strong>${emp.name || "--"}</strong><br><small>${emp.role || "--"}</small></td>
                    <td>${emp.date || "--"}</td>
                    <td style="color: #e18112; font-weight: bold;">${emp.checkin || "--"}</td>
                    <td style="color: #dc3545; font-weight: bold;">${emp.checkout || "--"}</td>
                `;
                modalTableBody.appendChild(row);
            });
        } catch (err) {
            console.error("Error fetching today's attendance:", err);
            modalTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading details.</td></tr>`;
        }
    }

    async function da_runSimulation() {
        if (da_barsContainer) da_barsContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const statsRes = await fetch(`${API_BASE_URL}/api/attendance-graph/`);
            if (!statsRes.ok) throw new Error("Failed daily stats");
            const statsData = await statsRes.json();

            if (da_overviewCount) da_overviewCount.innerText = `${statsData.present}/${statsData.total}`;
            if (da_statOntime) {
                const ontime = statsData.present - statsData.late;
                da_statOntime.innerText = `${ontime}/${statsData.total}`;
            }
            if (da_statLate) da_statLate.innerText = `${statsData.late}/${statsData.total}`;
            if (da_statAbsent) da_statAbsent.innerText = `${statsData.absent}/${statsData.total}`;
        } catch (error) {
            console.error("Failed to load daily stats:", error);
            if (da_overviewCount) da_overviewCount.innerText = "N/A";
            if (da_statOntime) da_statOntime.innerText = "N/A";
            if (da_statLate) da_statLate.innerText = "N/A";
            if (da_statAbsent) da_statAbsent.innerText = "N/A";
        }

        try {
            if (!da_monthSelect) return;

            const monthIndex = da_monthSelect.value;
            const currentYear = new Date().getFullYear();

            const chartRes = await fetch(
                `${API_BASE_URL}/api/attendance/monthly-summary/?year=${currentYear}&month=${parseInt(monthIndex) + 1}`
            );
            if (!chartRes.ok) throw new Error("Failed monthly chart");

            const chartData = await chartRes.json();
            const totalEmployees = chartData.total_employees || 0;

            if (da_staffInput) da_staffInput.value = totalEmployees;

            const data = chartData.daily_data || [];

            if (da_yAxis) {
                da_yAxis.innerHTML = "";
                for (let i = 0; i <= 5; i++) {
                    const val = Math.round((totalEmployees / 5) * i);
                    const span = document.createElement("span");
                    span.innerText = val;
                    da_yAxis.appendChild(span);
                }
            }

            if (da_barsContainer) da_barsContainer.innerHTML = "";
            if (da_xLabelsContainer) da_xLabelsContainer.innerHTML = "";

            data.forEach((dayData, index) => {
                const hOntime = totalEmployees > 0 ? (dayData.ontime / totalEmployees) * 100 : 0;
                const hLate = totalEmployees > 0 ? (dayData.late / totalEmployees) * 100 : 0;
                const hAbsent = totalEmployees > 0 ? (dayData.absent / totalEmployees) * 100 : 0;

                const col = document.createElement("div");
                col.className = "da-bar-column";
                col.setAttribute(
                    "data-tooltip",
                    `Day ${dayData.day}\nOn Time: ${dayData.ontime}\nLate: ${dayData.late}\nAbsent: ${dayData.absent}`
                );
                col.innerHTML = `
                    <div class="da-bar-segment da-bg-ontime" style="height: ${hOntime}%"></div>
                    <div class="da-bar-segment da-bg-late" style="height: ${hLate}%"></div>
                    <div class="da-bar-segment da-bg-absent" style="height: ${hAbsent}%"></div>
                `;
                if (da_barsContainer) da_barsContainer.appendChild(col);

                if (index === 0 || (index + 1) % 5 === 0 || index === data.length - 1) {
                    const label = document.createElement("div");
                    label.className = "da-x-label-item";
                    label.innerText = dayData.day;
                    const leftPos = data.length > 1 ? (index / (data.length - 1)) * 100 : 0;
                    label.style.position = "absolute";

                    if (index === 0) label.style.left = "0%";
                    else if (index === data.length - 1) label.style.right = "0%";
                    else label.style.left = `${leftPos}%`;

                    if (da_xLabelsContainer) da_xLabelsContainer.appendChild(label);
                }
            });
        } catch (error) {
            console.error("Failed to load monthly chart data:", error);
            if (da_barsContainer) {
                da_barsContainer.innerHTML = '<p class="error-text">Could not load chart data.</p>';
            }
        }
    }

    const attTrigger = document.getElementById("attendanceTrigger");
    if (attTrigger && detailModal) {
        attTrigger.addEventListener("click", async (e) => {
            e.preventDefault();
            await loadTodayAttendanceModal();
            detailModal.style.display = "flex";
        });
    }

    if (triggerBtn && detailModal) {
        triggerBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await loadTodayAttendanceModal();
            detailModal.style.display = "flex";
        });
    }

    if (detailCloseBtn && detailModal) {
        detailCloseBtn.addEventListener("click", () => {
            detailModal.style.display = "none";
        });
    }

    const lateTrigger = document.getElementById("lateTrigger");
    if (lateTrigger) {
        lateTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            safeSetDisplay("lateModal", "flex");
            loadLateList();
        });
    }

    const absentTrigger = document.getElementById("absentTrigger");
    if (absentTrigger) {
        absentTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            safeSetDisplay("absentModal", "flex");
            loadAbsentList();
        });
    }

    if (da_statLate) {
        da_statLate.addEventListener("click", () => {
            safeSetDisplay("lateModal", "flex");
            loadLateList();
        });
    }

    if (da_statAbsent) {
        da_statAbsent.addEventListener("click", () => {
            safeSetDisplay("absentModal", "flex");
            loadAbsentList();
        });
    }

    const currentMonthIndex = new Date().getMonth();
    if (da_monthSelect) {
        da_monthSelect.value = currentMonthIndex;
        da_monthSelect.addEventListener("change", da_runSimulation);
    }

    if (da_staffInput) {
        da_staffInput.addEventListener("change", () => {
            const inputVal = da_staffInput.value;
            if (inputVal && inputVal > 0) da_runSimulation();
        });
    }

    da_runSimulation();

    // ==========================================
    // BIRTHDAY BUTTON EVENTS
    // ==========================================
    document.getElementById("nextBdayBtn")?.addEventListener("click", () => {
        if (todayBirthdays.length === 0) return;
        clearInterval(bdayAutoInterval);
        currentBdayIndex = (currentBdayIndex + 1) % todayBirthdays.length;
        updateBdayCarousel(currentBdayIndex);
    });

    document.getElementById("prevBdayBtn")?.addEventListener("click", () => {
        if (todayBirthdays.length === 0) return;
        clearInterval(bdayAutoInterval);
        currentBdayIndex = (currentBdayIndex - 1 + todayBirthdays.length) % todayBirthdays.length;
        updateBdayCarousel(currentBdayIndex);
    });

    // ==========================================
    // HOLIDAYS SECTION
    // ==========================================
    let holidays = [
        { name: "Republic Day", date: "2025-01-26", type: "Public Holiday" },
        { name: "Holi", date: "2025-03-14", type: "Public Holiday" },
        { name: "Good Friday", date: "2025-04-18", type: "Optional Holiday" },
        { name: "Independence Day", date: "2025-08-15", type: "Public Holiday" },
        { name: "Diwali", date: "2025-10-20", type: "Public Holiday" },
    ];

    const holidayListModal = document.getElementById("hraHolidayListModal");
    const holidayAddModal = document.getElementById("hraAddHolidayModal");
    const holidayTableBody = document.getElementById("hraHolidayTableBody");
    const successPopup = document.getElementById("hraSuccessPopup");

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function getDayName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { weekday: "long" });
    }

    function updateCard() {
        const today = new Date().toISOString().split("T")[0];
        const sortedHolidays = holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        const nextHoliday = sortedHolidays.find((h) => h.date >= today);

        const textElement = document.getElementById("hraNextHolidayText");
        if (textElement) {
            if (nextHoliday) {
                textElement.textContent = `${nextHoliday.name}, ${formatDate(nextHoliday.date)}`;
            } else {
                textContent = "No upcoming holidays";
            }
        }
    }

    function renderHolidayTable() {
        if (!holidayTableBody) return;
        holidayTableBody.innerHTML = "";
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));

        holidays.forEach((h) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="font-weight:600;">${formatDate(h.date)}</td>
                <td style="color: #6b7280;">${getDayName(h.date)}</td>
                <td>${h.name}</td>
                <td><span style="background:#f3f4f6; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${h.type}</span></td>
            `;
            holidayTableBody.appendChild(row);
        });
    }

    function showSuccess() {
        if (!successPopup) return;
        successPopup.classList.add("hra-show");
        setTimeout(() => {
            successPopup.classList.remove("hra-show");
        }, 3000);
    }

    updateCard();

    document.getElementById("hraViewHolidayBtn")?.addEventListener("click", () => {
        renderHolidayTable();
        if (holidayListModal) holidayListModal.style.display = "flex";
    });

    document.getElementById("hraCloseHolidayList")?.addEventListener("click", () => {
        if (holidayListModal) holidayListModal.style.display = "none";
    });

    document.getElementById("hraOpenAddHolidayBtn")?.addEventListener("click", () => {
        if (holidayAddModal) holidayAddModal.style.display = "flex";
    });

    document.getElementById("hraCloseAddHoliday")?.addEventListener("click", () => {
        if (holidayAddModal) holidayAddModal.style.display = "none";
    });

    const holidayForm = document.getElementById("hraHolidayForm");
    if (holidayForm) {
        holidayForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("hraHolidayName")?.value || "";
            const date = document.getElementById("hraHolidayDate")?.value || "";
            const type = document.getElementById("hraHolidayType")?.value || "";

            holidays.push({ name, date, type });

            renderHolidayTable();
            updateCard();

            if (holidayAddModal) holidayAddModal.style.display = "none";
            holidayForm.reset();

            showSuccess();
        });
    }

    // ==========================================
    // CALENDAR SECTION
    // ==========================================
    const dateBtn = document.getElementById("dateTriggerBtn");
    const displaySpan = document.getElementById("dateDisplay");
    const dateInput = document.getElementById("nativeDatePicker");

    if (dateBtn && displaySpan && dateInput) {
        function formatDateDisplay(dateObj) {
            return dateObj.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        }

        const today = new Date();
        displaySpan.innerText = formatDateDisplay(today);

        dateBtn.addEventListener("click", function () {
            try {
                dateInput.showPicker();
            } catch (error) {
                dateInput.focus();
                dateInput.click();
            }
        });

        dateInput.addEventListener("change", function () {
            if (this.value) {
                const selectedDate = new Date(this.value);
                displaySpan.innerText = formatDateDisplay(selectedDate);
            }
        });
    }

    // ==========================================
    // NOTIFICATION LOGIC
    // ==========================================
    let notifications = [
        {
            id: 1,
            text: "<strong>Dhamodhar</strong> applied for the UX Designer position.",
            time: "2 mins ago",
            icon: "👩‍💼",
            read: false,
        },
        {
            id: 2,
            text: "Meeting with <strong>Dev Team</strong> starts in 15 minutes.",
            time: "15 mins ago",
            icon: "📅",
            read: false,
        },
        {
            id: 3,
            text: "New system update available.",
            time: "1 hour ago",
            icon: "⚙️",
            read: true,
        },
        {
            id: 4,
            text: "<strong>Arjun</strong> accepted the offer.",
            time: "3 hours ago",
            icon: "✅",
            read: true,
        },
    ];

    const bellBtn = document.getElementById("ntBellBtn");
    const dropdown = document.getElementById("ntDropdown");
    const markReadBtn = document.getElementById("ntMarkAllRead");

    function ntRenderList() {
        const listContainer = document.getElementById("ntList");
        const badge = document.getElementById("ntBadge");

        if (!listContainer || !badge) return;

        listContainer.innerHTML = "";

        const unreadCount = notifications.filter((n) => !n.read).length;

        if (unreadCount > 0) {
            badge.style.display = "flex";
            badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        } else {
            badge.style.display = "none";
        }

        if (notifications.length === 0) {
            listContainer.innerHTML = '<div class="nt-empty">No notifications</div>';
            return;
        }

        notifications.forEach((item) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = `nt-item ${!item.read ? "nt-unread" : ""}`;

            itemDiv.innerHTML = `
                <div class="nt-avatar">${item.icon}</div>
                <div class="nt-content">
                    <p class="nt-text">${item.text}</p>
                    <span class="nt-time">${item.time}</span>
                </div>
            `;

            itemDiv.addEventListener("click", () => {
                item.read = true;
                ntRenderList();
            });

            listContainer.appendChild(itemDiv);
        });
    }

    if (bellBtn && dropdown && markReadBtn) {
        ntRenderList();

        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === "block";
            dropdown.style.display = isVisible ? "none" : "block";
        });

        markReadBtn.addEventListener("click", () => {
            notifications.forEach((n) => (n.read = true));
            ntRenderList();
        });
    }

    // ==========================================
    // GLOBAL CLICK HANDLERS FOR MODALS
    // ==========================================
    window.addEventListener("click", function (e) {
        if (e.target === empModal) {
            closeAddModal();
            resetForm();
        }

        if (
            e.target === employeeModal &&
            (!empModal || empModal.style.display !== "flex")
        ) {
            closeTableModal();
        }

        if (e.target === successModal) {
            if (successModal) successModal.style.display = "none";
            resetForm();
        }

        if (e.target === detailModal) safeSetDisplay("detailModal", "none");
        if (e.target === document.getElementById("lateModal")) safeSetDisplay("lateModal", "none");
        if (e.target === document.getElementById("absentModal")) safeSetDisplay("absentModal", "none");

        if (e.target === holidayListModal && holidayListModal) holidayListModal.style.display = "none";
        if (e.target === holidayAddModal && holidayAddModal) holidayAddModal.style.display = "none";

        const wishModal = document.getElementById("wishModal");
        const allBdayModal = document.getElementById("allBirthdaysModal");
        const successWishModal = document.getElementById("successWishModal");

        if (e.target === wishModal) closeWishModal();
        if (e.target === allBdayModal) closeAllBirthdaysModal();
        if (e.target === successWishModal) closeSuccessWishModal();

        if (dropdown && bellBtn) {
            if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
                dropdown.style.display = "none";
            }
        }

        if (!e.target.closest(".hdr-profile-wrapper")) {
            const profileDropdown = document.getElementById("hdrProfileDropdown");
            if (profileDropdown && profileDropdown.classList.contains("show")) {
                profileDropdown.classList.remove("show");
            }
        }

        const logoutModal = document.getElementById("hdrLogoutModal");
        if (e.target === logoutModal) {
            hdr_hideLogoutModal();
        }
    });

    // Initialize employee stats
    loadEmployeeStats();
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