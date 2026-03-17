
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

let shrpTickets = [
    { subject: 'Unable to access Payroll', name: 'Dhamu', email: 'dhamu@oppty.in', status: 'Open' },
    { subject: 'Need new monitor', name: 'Saleem', email: 'saleem@oppty.in', status: 'Open' },
    { subject: 'Password Reset', name: 'Mani', email: 'mani@oppty.in', status: 'Closed' },
    { subject: 'VPN Connection Failed', name: 'Arjun', email: 'arjun@oppty.in', status: 'Open' },
    { subject: 'Software Installation', name: 'Siddu', email: 'siddu@oppty.in', status: 'Closed' }
];

let shrpCurrentIdx = null;

function shrpRenderTable() {
    const tbody = document.getElementById('shrp-table-body');
    tbody.innerHTML = '';
    document.getElementById('shrp-ticket-counter').innerText = shrpTickets.length;

    shrpTickets.forEach((ticket, index) => {
        const isOpen = ticket.status === 'Open';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="shrp-cell-id">${index + 1}</td>
            <td class="shrp-cell-subject">${ticket.subject}</td>
            <td>
                <div class="shrp-user-detail">
                    <h4>${ticket.name}</h4>
                    <span>${ticket.email}</span>
                </div>
            </td>
            <td>
                <span class="shrp-status-pill ${isOpen ? 'shrp-status-open' : 'shrp-status-closed'}">
                    ${ticket.status}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="shrp-action-icon" onclick="shrpOpenModal(${index})">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function shrpOpenModal(index) {
    shrpCurrentIdx = index;
    const ticket = shrpTickets[index];
    
    // Set values in the modal
    document.getElementById('shrp-input-name').value = ticket.name;
    document.getElementById('shrp-input-email').value = ticket.email;
    document.getElementById('shrp-input-status').value = ticket.status;
    
    // Show modal
    document.getElementById('shrp-modal-edit').classList.add('shrp-is-visible');
}

function shrpCloseModal() {
    document.getElementById('shrp-modal-edit').classList.remove('shrp-is-visible');
}

// New Function to Trigger Toast
function shrpShowToast() {
    const toast = document.getElementById('shrp-toast');
    
    // Add active class to show it
    toast.classList.add('shrp-active');
    
    // Remove active class after 3 seconds
    setTimeout(() => {
        toast.classList.remove('shrp-active');
    }, 3000);
}

function shrpSaveChanges(e) {
    e.preventDefault();
    
    // Update data array
    shrpTickets[shrpCurrentIdx].name = document.getElementById('shrp-input-name').value;
    shrpTickets[shrpCurrentIdx].email = document.getElementById('shrp-input-email').value;
    shrpTickets[shrpCurrentIdx].status = document.getElementById('shrp-input-status').value;
    
    // Refresh table
    shrpRenderTable();
    
    // Close Modal
    shrpCloseModal();
    
    // Trigger Success Popup
    shrpShowToast();
}

// Initial render
document.addEventListener('DOMContentLoaded', shrpRenderTable);


//notification section
let notifications = [
    {
        id: 1,
        text: "<strong>Dhamodhar</strong> applied for the UX Designer position.",
        time: "2 mins ago",
        icon: "👩‍💼", // Using emojis as placeholders for images
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
    
    // Select Elements
    const bellBtn = document.getElementById('ntBellBtn');
    const dropdown = document.getElementById('ntDropdown');
    const markReadBtn = document.getElementById('ntMarkAllRead');

    // Initialize
    ntRenderList();

    // Toggle Dropdown
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Mark All as Read
    markReadBtn.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        ntRenderList();
    });

    // Close Dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
});

// Render Function
function ntRenderList() {
    const listContainer = document.getElementById('ntList');
    const badge = document.getElementById('ntBadge');
    
    // Clear current list
    listContainer.innerHTML = '';

    // Count unread
    const unreadCount = notifications.filter(n => !n.read).length;

    // Update Badge
    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    // Check if empty
    if (notifications.length === 0) {
        listContainer.innerHTML = '<div class="nt-empty">No notifications</div>';
        return;
    }

    // Build List
    notifications.forEach(item => {
        const itemDiv = document.createElement('div');
        // Add class 'nt-unread' if not read
        itemDiv.className = `nt-item ${!item.read ? 'nt-unread' : ''}`;
        
        itemDiv.innerHTML = `
            <div class="nt-avatar">${item.icon}</div>
            <div class="nt-content">
                <p class="nt-text">${item.text}</p>
                <span class="nt-time">${item.time}</span>
            </div>
        `;

        // Click individual item to mark as read
        itemDiv.addEventListener('click', () => {
            item.read = true;
            ntRenderList();
        });

        listContainer.appendChild(itemDiv);
    });
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
    window.location.href = "../../index.html";
}

/* --- Close Dropdown when clicking outside --- */
window.onclick = function(event) {
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
}