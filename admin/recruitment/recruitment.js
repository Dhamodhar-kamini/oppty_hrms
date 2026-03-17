
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


// 1. State
let imMeetings = [];
let imModalOverlay; // Will be assigned after DOM loads

// 2. Initialization - Waits for HTML to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Assign DOM elements to variables
  imModalOverlay = document.getElementById("imModalOverlay");
  const btnOpen = document.getElementById("imBtnOpenModal");
  const btnCancel = document.getElementById("imBtnCancel");
  const btnSave = document.getElementById("imBtnSave");

  // Attach Event Listeners (Cleaner than inline onclick="")
  if (btnOpen) btnOpen.addEventListener("click", imOpenModal);
  if (btnCancel) btnCancel.addEventListener("click", imCloseModal);
  if (btnSave) btnSave.addEventListener("click", imHandleSchedule);

  // Close modal if clicking on the dark overlay background
  window.addEventListener("click", (event) => {
    if (event.target === imModalOverlay) {
      imCloseModal();
    }
  });

  // Initial Render
  imRenderMeetings();
});

// 3. Render Function
function imRenderMeetings() {
  const container = document.getElementById("imListContainer");
  const countLabel = document.getElementById("imTotalCount");

  if (!container || !countLabel) return;

  container.innerHTML = "";
  countLabel.textContent = imMeetings.length;

  // Empty State
  if (imMeetings.length === 0) {
    container.innerHTML = `
            <div class="im-empty-state">
                <img src="https://img.icons8.com/ios/100/cbd5e1/calendar--v1.png"/>
                <p>No interviews scheduled yet.<br>Click the button to add one.</p>
            </div>
        `;
    return;
  }

  // Sort: Chronological
  imMeetings.sort((a, b) => a.fullDateObj - b.fullDateObj);

  // Render Items
  imMeetings.forEach((mtg) => {
    const card = document.createElement("div");
    card.className = "im-card";

    card.innerHTML = `
            <div class="im-card-info">
                <h4>${mtg.title}</h4>
                <p>With: ${mtg.candidate}</p>
                ${mtg.link ? `<a href="${mtg.link}" target="_blank" class="im-card-link">🔗 Join Meeting</a>` : ""}
            </div>
            <div class="im-card-time-box">
                <div class="im-card-time">${mtg.formattedTime}</div>
                <div class="im-card-date">${mtg.formattedDate}</div>
            </div>
        `;
    container.appendChild(card);
  });
}

// 4. Modal Functions
function imOpenModal() {
  if (imModalOverlay) {
    imModalOverlay.style.display = "flex";
    // Auto-fill today's date
    const dateInput = document.getElementById("imInputDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  }
}

function imCloseModal() {
  if (imModalOverlay) {
    imModalOverlay.style.display = "none";
  }
}

// 5. Save & Logic
function imHandleSchedule() {
  // Get values using the new unique IDs
  const title = document.getElementById("imInputTitle").value;
  const candidate = document.getElementById("imInputCandidate").value;
  const link = document.getElementById("imInputLink").value;
  const dateVal = document.getElementById("imInputDate").value;
  const timeVal = document.getElementById("imInputTime").value;

  if (!title || !dateVal || !timeVal) {
    alert("Please fill in Title, Date, and Time.");
    return;
  }

  // Create Date Object
  const fullDateObj = new Date(`${dateVal}T${timeVal}`);
  const formattedTime = fullDateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const formattedDate = fullDateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Add to array
  imMeetings.push({
    title,
    candidate,
    link,
    fullDateObj,
    formattedTime,
    formattedDate,
  });

  // Google Calendar URL Generation
  const endObj = new Date(fullDateObj.getTime() + 60 * 60000); // 1 Hour duration
  const formatGCal = (d) => d.toISOString().replace(/[-:]|\.\d+/g, "");

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGCal(fullDateObj)}/${formatGCal(endObj)}&details=${encodeURIComponent("Attendee: " + candidate + "\nLink: " + link)}&location=${encodeURIComponent(link)}&sf=true&output=xml`;

  window.open(gCalUrl, "_blank");

  // Reset Form
  document.getElementById("imInputTitle").value = "";
  document.getElementById("imInputCandidate").value = "";
  document.getElementById("imInputLink").value = "";
  document.getElementById("imInputTime").value = "";

  imRenderMeetings();
  imCloseModal();
}

/* Recruitment Dashboard Script */

document.addEventListener("DOMContentLoaded", function () {
  // 1. Date Logic
  const rdDateBtn = document.getElementById("rdDateBtn");
  if (rdDateBtn) {
    const now = new Date();
    rdDateBtn.textContent = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // 2. Overview Chart (Doughnut)
  const ctxOverview = document.getElementById("rdRecruitmentChart");

  if (ctxOverview) {
    new Chart(ctxOverview, {
      type: "doughnut",
      data: {
        labels: ["Applicants", "Shortlisted", "Hired", "Rejected"],
        datasets: [
          {
            data: [65, 20, 10, 5],
            backgroundColor: ["#3b82f6", "#f59e0b", "#10b981", "#cbd5e1"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: {
            position: "right",
            labels: { boxWidth: 10, usePointStyle: true },
          },
        },
      },
    });
  }

  /* 
       Note: The HTML for "rdTimeToHireChart" was not in your snippet, 
       but I've renamed the JS here just in case you add the canvas later.
    */
  const ctxTime = document.getElementById("rdTimeToHireChart");
  if (ctxTime) {
    new Chart(ctxTime, {
      type: "bar",
      data: {
        labels: ["MKT", "DEV", "DES", "SALES"],
        datasets: [
          {
            label: "Days to Hire",
            data: [12, 25, 18, 10],
            backgroundColor: "#64748b",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { display: false } },
          x: { grid: { display: false } },
        },
      },
    });
  }
});

// Placeholder function for the button
function rdOpenJobModal() {
  alert("Open 'Add New Job' Modal (Function: rdOpenJobModal)");
}

//notification section
//notification section
let notifications = [
  {
    id: 1,
    text: "<strong>Dhamodhar</strong> applied for the UX Designer position.",
    time: "2 mins ago",
    icon: "👩‍💼", // Using emojis as placeholders for images
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

document.addEventListener("DOMContentLoaded", () => {
  // Select Elements
  const bellBtn = document.getElementById("ntBellBtn");
  const dropdown = document.getElementById("ntDropdown");
  const markReadBtn = document.getElementById("ntMarkAllRead");

  // Initialize
  ntRenderList();

  // Toggle Dropdown
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent immediate closing
    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";
  });

  // Mark All as Read
  markReadBtn.addEventListener("click", () => {
    notifications.forEach((n) => (n.read = true));
    ntRenderList();
  });

  // Close Dropdown when clicking outside
  window.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
});

// Render Function
function ntRenderList() {
  const listContainer = document.getElementById("ntList");
  const badge = document.getElementById("ntBadge");

  // Clear current list
  listContainer.innerHTML = "";

  // Count unread
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update Badge
  if (unreadCount > 0) {
    badge.style.display = "flex";
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
  } else {
    badge.style.display = "none";
  }

  // Check if empty
  if (notifications.length === 0) {
    listContainer.innerHTML = '<div class="nt-empty">No notifications</div>';
    return;
  }

  // Build List
  notifications.forEach((item) => {
    const itemDiv = document.createElement("div");
    // Add class 'nt-unread' if not read
    itemDiv.className = `nt-item ${!item.read ? "nt-unread" : ""}`;

    itemDiv.innerHTML = `
            <div class="nt-avatar">${item.icon}</div>
            <div class="nt-content">
                <p class="nt-text">${item.text}</p>
                <span class="nt-time">${item.time}</span>
            </div>
        `;

    // Click individual item to mark as read
    itemDiv.addEventListener("click", () => {
      item.read = true;
      ntRenderList();
    });

    listContainer.appendChild(itemDiv);
  });
}

//position cards
document.addEventListener("DOMContentLoaded", () => {
  updateAllCounts();
});

// --- 1. ENRICHED DATA STORE ---
const db = {
  positions: {
    title: "Open Positions",
    items: [
      { title: "Senior React Developer" },
      { title: "UI/UX Designer" },
      { title: "Backend Node.js Lead" },
    ],
  },
  candidates: {
    title: "Total Candidates",
    items: [
      {
        name: "Arya Stark",
        email: "arya@winterfell.com",
        job: "React Dev",
        status: "Interested",
      },
      {
        name: "Jon Snow",
        email: "jon@watch.com",
        job: "UI Designer",
        status: "Screening",
      },
      {
        name: "Tyrion L",
        email: "tyrion@lannister.com",
        job: "Backend Lead",
        status: "Not Interested",
      },
    ],
  },
  interviews: {
    title: "Interviews Today",
    items: [
      {
        name: "Sansa Stark",
        email: "sansa@winterfell.com",
        job: "HR Manager",
        status: "Interested",
        date: "2023-10-25",
        time: "10:00",
      },
      {
        name: "Jaime L",
        email: "jaime@gold.com",
        job: "Security Lead",
        status: "Screening",
        date: "2023-10-25",
        time: "14:00",
      },
    ],
  },
  offers: {
    title: "Offers Released",
    items: [
      {
        name: "Rachel Zane",
        email: "rachel@law.com",
        job: "Legal Counsel",
        status: "Sent",
      },
      {
        name: "Louis Litt",
        email: "louis@law.com",
        job: "Finance Head",
        status: "Pending",
      },
    ],
  },
};

let currentKey = null;
let deleteIdx = null;

// --- 2. LIST MODAL LOGIC ---
function openMainModal(key) {
  currentKey = key;
  document.getElementById("listTitle").innerText = db[key].title;
  renderList();
  document.getElementById("listModal").classList.add("active");
}

function closeListModal() {
  document.getElementById("listModal").classList.remove("active");
  currentKey = null;
}

function updateAllCounts() {
  Object.keys(db).forEach((key) => {
    const el = document.getElementById("count-" + key);
    if (el) el.innerText = db[key].items.length;
  });
}

// --- 3. RENDER LIST ITEMS (With All Details) ---
function renderList() {
  const container = document.getElementById("itemsContainer");
  container.innerHTML = "";
  const items = db[currentKey].items;

  if (items.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; color:#999; padding:20px;">No records found.</div>';
    return;
  }

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "rd-list-item";

    let contentHTML = "";

    // --- TEMPLATES ---
    if (currentKey === "positions") {
      contentHTML = `
                <div>
                    <div class="item-title">${item.title}</div>
                </div>`;
    } else if (currentKey === "candidates") {
      let badgeColor =
        item.status === "Interested"
          ? "green"
          : item.status === "Not Interested"
            ? "red"
            : "blue";
      contentHTML = `
                <div>
                    <div class="item-title">${item.name} <span class="rd-badge rd-badge-${badgeColor}">${item.status}</span></div>
                    <div class="item-sub">${item.job} | ${item.email}</div>
                </div>`;
    } else if (currentKey === "interviews") {
      contentHTML = `
                <div>
                    <div class="item-title">${item.name} <span style="font-weight:400; font-size:12px; color:#555;">(${item.status})</span></div>
                    <div class="item-sub">Role: ${item.job} | ${item.email}</div>
                    <div class="item-sub" style="color:#ff6b00; font-weight:500;">${item.date} at ${item.time}</div>
                </div>`;
    } else if (currentKey === "offers") {
      let actionBtn =
        item.status === "Sent"
          ? `<span class="rd-badge rd-badge-green"><i class="fa-solid fa-check"></i> Sent</span>`
          : `<button class="rd-btn-small" onclick="sendOffer(${index})">Send Offer</button>`;

      contentHTML = `
                <div>
                    <div class="item-title">${item.name}</div>
                    <div class="item-sub">${item.job} | ${item.email}</div>
                    <div style="margin-top:6px;">${actionBtn}</div>
                </div>`;
    }

    /* Inside renderList() function */
    const actionsHTML = `
    <div class="rd-actions">
        <!-- Edit Button -->
        <button class="btn-icon" onclick="openFormModal(${index})">
            <i class="fa-solid fa-pen"></i>
        </button>
        
        <!-- Delete Button (Has 'delete' class) -->
        <button class="btn-icon delete" onclick="openDeleteModal(${index})">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    </div>
`;

    div.innerHTML = contentHTML + actionsHTML;
    container.appendChild(div);
  });
}

// --- 4. FORM MODAL (Dynamic Inputs) ---
function openFormModal(index = -1) {
  const isEdit = index !== -1;
  document.getElementById("formHeaderTitle").innerText = isEdit
    ? "Edit Record"
    : "Add New";
  document.getElementById("editIndex").value = index;

  const container = document.getElementById("formInputs");
  const data = isEdit ? db[currentKey].items[index] : {};

  let html = "";

  if (currentKey === "positions") {
    html = `<div class="form-group"><label>Job Title</label><input class="form-input" id="inp_title" value="${data.title || ""}"></div>`;
  } else if (currentKey === "candidates") {
    html = `
            <div class="form-group"><label>Name</label><input class="form-input" id="inp_name" value="${data.name || ""}"></div>
            <div class="form-group"><label>Email</label><input class="form-input" id="inp_email" value="${data.email || ""}"></div>
            <div class="form-group"><label>Job Applied For</label><input class="form-input" id="inp_job" value="${data.job || ""}"></div>
            <div class="form-group"><label>Status</label>
                <select class="form-input" id="inp_status">
                    <option value="Interested" ${data.status === "Interested" ? "selected" : ""}>Interested</option>
                    <option value="Screening" ${data.status === "Screening" ? "selected" : ""}>Screening</option>
                    <option value="Not Interested" ${data.status === "Not Interested" ? "selected" : ""}>Not Interested</option>
                </select>
            </div>`;
  } else if (currentKey === "interviews") {
    html = `
            <div class="form-group"><label>Candidate Name</label><input class="form-input" id="inp_name" value="${data.name || ""}"></div>
            <div class="form-group"><label>Email</label><input class="form-input" id="inp_email" value="${data.email || ""}"></div>
            <div class="form-group"><label>Job Role</label><input class="form-input" id="inp_job" value="${data.job || ""}"></div>
            <div class="form-group"><label>Interview Status</label>
                <select class="form-input" id="inp_status">
                    <option value="Interested" ${data.status === "Interested" ? "selected" : ""}>Interested</option>
                    <option value="Not Interested" ${data.status === "Not Interested" ? "selected" : ""}>Not Interested</option>
                </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group"><label>Date</label><input type="date" class="form-input" id="inp_date" value="${data.date || ""}"></div>
                <div class="form-group"><label>Time</label><input type="time" class="form-input" id="inp_time" value="${data.time || ""}"></div>
            </div>`;
  } else if (currentKey === "offers") {
    html = `
            <div class="form-group"><label>Name</label><input class="form-input" id="inp_name" value="${data.name || ""}"></div>
            <div class="form-group"><label>Email</label><input class="form-input" id="inp_email" value="${data.email || ""}"></div>
            <div class="form-group"><label>Job Role</label><input class="form-input" id="inp_job" value="${data.job || ""}"></div>
            <div class="form-group"><label>Offer Status</label>
                <select class="form-input" id="inp_status">
                    <option value="Pending" ${data.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Sent" ${data.status === "Sent" ? "selected" : ""}>Sent</option>
                </select>
            </div>`;
  }

  container.innerHTML = html;
  document.getElementById("formModal").classList.add("active");
}

function closeFormModal() {
  document.getElementById("formModal").classList.remove("active");
}

function saveItem() {
  const idx = parseInt(document.getElementById("editIndex").value);
  let newItem = {};

  // Capture Values
  if (currentKey === "positions") {
    newItem = { title: document.getElementById("inp_title").value };
  } else {
    newItem = {
      name: document.getElementById("inp_name").value,
      email: document.getElementById("inp_email").value,
      job: document.getElementById("inp_job").value,
      status: document.getElementById("inp_status").value,
    };
    // Extra fields for interviews
    if (currentKey === "interviews") {
      newItem.date = document.getElementById("inp_date").value;
      newItem.time = document.getElementById("inp_time").value;
    }
  }

  if (!Object.values(newItem).every((v) => v !== "")) {
    alert("Please fill all fields.");
    return;
  }

  if (idx === -1) db[currentKey].items.push(newItem);
  else db[currentKey].items[idx] = newItem;

  closeFormModal();
  renderList();
  updateAllCounts();
  showToast("Record Saved Successfully");
}

// --- 5. SEND OFFER LOGIC ---
function sendOffer(index) {
  db.offers.items[index].status = "Sent";
  renderList();
  showToast("Offer Letter Sent Successfully!");
}

// --- 6. DELETE LOGIC ---
function openDeleteModal(index) {
  deleteIdx = index;
  document.getElementById("deleteModal").classList.add("active");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("active");
}

function confirmDelete() {
  if (deleteIdx !== null) {
    db[currentKey].items.splice(deleteIdx, 1);
    renderList();
    updateAllCounts();
    showToast("Record Deleted");
  }
  closeDeleteModal();
}

// --- 7. TOAST NOTIFICATION ---
function showToast(msg) {
  const toast = document.getElementById("rdToast");
  document.getElementById("toastMessage").innerText = msg;
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 3000);
}

//logout section
/* --- Toggle Profile Dropdown --- */
function hdr_toggleProfilePopup() {
  const dropdown = document.getElementById("hdrProfileDropdown");
  dropdown.classList.toggle("show");
}

/* --- Show Logout Modal --- */
function hdr_showLogoutModal() {
  // 1. Hide the dropdown menu first (optional UI polish)
  const dropdown = document.getElementById("hdrProfileDropdown");
  if (dropdown) dropdown.classList.remove("show");

  // 2. Show the modal
  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.add("show-modal");
}

/* --- Hide Logout Modal --- */
function hdr_hideLogoutModal() {
  const modal = document.getElementById("hdrLogoutModal");
  if (modal) modal.classList.remove("show-modal");
}

/* --- Perform Actual Logout --- */
function hdr_confirmLogout() {
  // 1. Clear session/local storage
  sessionStorage.clear();
  localStorage.clear();

  // 2. Redirect to Login Page
  window.location.href = "../adminlogin/adminlogin.html";
}

/* --- Close Dropdown when clicking outside --- */
window.onclick = function (event) {
  // If click is NOT on the profile wrapper
  if (!event.target.closest(".hdr-profile-wrapper")) {
    const dropdown = document.getElementById("hdrProfileDropdown");
    if (dropdown && dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
    }
  }

  // Optional: Close modal if clicking on the overlay background
  const modal = document.getElementById("hdrLogoutModal");
  if (event.target === modal) {
    hdr_hideLogoutModal();
  }
};
