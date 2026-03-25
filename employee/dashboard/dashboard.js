
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
            }, 1000); // Matches CSS transition time
        }
    }, 800);
});



document.addEventListener("DOMContentLoaded", function () {
    const emp_id = localStorage.getItem('employee_id');

    // 1. GLOBAL AUTH CHECK
    // Redirect to login if employee_id is missing (Not logged in)
    if (!emp_id) {
        window.location.href = '../employee_login/emp_login.html';
        return;
    }

    console.log("Logged in Employee ID:", emp_id);

    // ==========================================
    // 2. FETCH REAL USER DATA FROM BACKEND
    // ==========================================
    fetch(`https://api.theoppty.com/api/employee/dashboard/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Employee Data:", data);

            // A. UPDATE HEADER & SIDEBAR
            if (document.getElementById("name")) document.getElementById("name").innerText = data.name;
            if (document.getElementById("role")) document.getElementById("role").innerText = data.role;

            // B. UPDATE DASHBOARD MAIN PROFILE
            if (document.getElementById("display_name")) document.getElementById("display_name").innerText = data.name;
            if (document.getElementById("email")) document.getElementById("email").innerText = data.email;
            if (document.getElementById("display_role")) document.getElementById("display_role").innerText = data.role;
            if (document.getElementById("display_salary")) document.getElementById("display_salary").innerText = data.salary;

            // C. UPDATE DASHBOARD OTHER DETAILS
            if (data.other_details && data.other_details.length > 0) {
                const od = data.other_details[0];
                if (document.getElementById("display_dob")) document.getElementById("display_dob").innerText = od.dob;
                if (document.getElementById("display_marital")) document.getElementById("display_marital").innerText = od.marital_status;
                if (document.getElementById("display_number")) document.getElementById("display_number").innerText = od.mobile;
                if (document.getElementById("display_address")) document.getElementById("display_address").innerText = od.address;
                if (document.getElementById("display_city")) document.getElementById("display_city").innerText = od.city;
                if (document.getElementById("display_other_phone")) document.getElementById("display_other_phone").innerText = od.mobile;
                if (document.getElementById("display_other_gender")) document.getElementById("display_other_gender").innerText = od.Gender;
                if (document.getElementById("display_other_dob")) document.getElementById("display_other_dob").innerText = od.dob;
            }

            // D. UPDATE DASHBOARD BANK DETAILS
            if (data.bank_details && data.bank_details.length > 0) {
                const bd = data.bank_details[0];
                if (document.getElementById("bankname")) document.getElementById("bankname").innerText = bd.bank_name;
                if (document.getElementById("accno")) document.getElementById("accno").innerText = bd.acc_no;
                if (document.getElementById("ifsccode")) document.getElementById("ifsccode").innerText = bd.ifsc_code;
                if (document.getElementById("accholdername")) document.getElementById("accholdername").innerText = bd.holder_name;
                if (document.getElementById("number")) document.getElementById("number").innerText = bd.mobile;
                if (document.getElementById("branch")) document.getElementById("branch").innerText = bd.branch;
            }

            // E. PASS DATA TO HEADER AVATAR DROPDOWN
            let fName = data.name || "Employee";
            let lName = "";
            if (data.name && data.name.includes(" ")) {
                let parts = data.name.split(" ");
                fName = parts[0];
                lName = parts.slice(1).join(" ");
            }

            let profileImageUrl = "";
            if (data.profile_pic) {
                // Construct full URL using your server IP
                profileImageUrl = `https://api.theoppty.com${data.profile_pic}`;
            }
            loadUserProfile({
                firstName: fName,
                lastName: lName,
                empId: data.employee_id || emp_id,
                profilePic: profileImageUrl // Provide actual image URL here if backend sends one
            });

        })
        .catch(err => console.error("Failed to load employee data:", err));

    // ==========================================
    // 3. GLOBAL TOAST NOTIFICATION LOGIC
    // ==========================================
    const toast = document.getElementById("successToast");
    const toastCloseBtn = document.querySelector(".toast-close");

    function showToast() {
        if (toast) {
            toast.classList.add("show");
            setTimeout(() => {
                toast.classList.remove("show");
            }, 3000);
        }
    }

    if (toastCloseBtn) {
        toastCloseBtn.addEventListener("click", () => {
            toast.classList.remove("show");
        });
    }

    // ==========================================
    // 4. PROFILE DETAILS CARD LOGIC (Dashboard Only)
    // ==========================================
    const profileModal = document.getElementById("editProfileModal");
    const profileOpenBtn = document.getElementById("openEditModalBtn");
    const profileCloseBtn = document.getElementById("closeEditModal");
    const profileCancelBtn = document.getElementById("cancelEditBtn");
    const profileForm = document.getElementById("editProfileForm");

    const dispNumber = document.getElementById("display_number");
    const dispDob = document.getElementById("display_dob");
    const dispAddress = document.getElementById("display_address");
    const dispCity = document.getElementById("display_city");

    const inputNumber = document.getElementById("input_number");
    const inputDob = document.getElementById("input_dob");
    const inputAddress = document.getElementById("input_address");
    const inputCity = document.getElementById("input_city");

    if (profileOpenBtn) {
        profileOpenBtn.addEventListener("click", () => {
            if (inputNumber && dispNumber) inputNumber.value = dispNumber.innerText;
            if (inputDob && dispDob) inputDob.value = dispDob.innerText;
            if (inputAddress && dispAddress) inputAddress.value = dispAddress.innerText;
            if (inputCity && dispCity) inputCity.value = dispCity.innerText;
            if (profileModal) profileModal.classList.add("active");
        });
    }

    const closeProfileModalFunc = () => {
        if (profileModal) profileModal.classList.remove("active");
    };

    if (profileCloseBtn) profileCloseBtn.addEventListener("click", closeProfileModalFunc);
    if (profileCancelBtn) profileCancelBtn.addEventListener("click", closeProfileModalFunc);

    if (profileForm) {
        profileForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const profileData = {
                mobile: document.getElementById('input_number') ? document.getElementById('input_number').value : "",
                dob: document.getElementById('input_dob') ? document.getElementById('input_dob').value : "",
                marital_status: document.getElementById('input_other_marital') ? document.getElementById('input_other_marital').value : "",
                address: document.getElementById('input_address') ? document.getElementById('input_address').value : "",
                city: document.getElementById('input_city') ? document.getElementById('input_city').value : ""
            };

            fetch(`https://api.theoppty.com/api/update-employee/${emp_id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileData)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message || data.profile) {
                        alert("Profile updated successfully!");
                        closeProfileModalFunc();
                        showToast();
                        window.location.reload();
                    } else {
                        alert("Update failed, check console.");
                        console.error(data);
                    }
                })
                .catch(err => {
                    console.error("Profile update error:", err);
                    alert("Failed to update profile.");
                });
        });
    }

    // ==========================================
    // 5. OTHER INFORMATION CARD LOGIC (Dashboard Only)
    // ==========================================
    const otherModal = document.getElementById("editOtherModal");
    const otherOpenBtn = document.getElementById("openOtherEditBtn");
    const otherCloseBtn = document.getElementById("closeOtherModal");
    const otherCancelBtn = document.getElementById("cancelOtherBtn");
    const otherForm = document.getElementById("editOtherForm");

    const dispOtherPhone = document.getElementById("display_other_phone");
    const dispOtherGender = document.getElementById("display_other_gender");
    const dispOtherDob = document.getElementById("display_other_dob");

    const inputOtherPhone = document.getElementById("input_other_phone");
    const inputOtherGender = document.getElementById("input_other_gender");
    const inputOtherDob = document.getElementById("input_other_dob");

    if (otherOpenBtn) {
        otherOpenBtn.addEventListener("click", () => {
            if (inputOtherPhone && dispOtherPhone) inputOtherPhone.value = dispOtherPhone.innerText;
            if (inputOtherGender && dispOtherGender) inputOtherGender.value = dispOtherGender.innerText;
            if (inputOtherDob && dispOtherDob) inputOtherDob.value = dispOtherDob.innerText;
            if (otherModal) otherModal.classList.add("active");
        });
    }

    const closeOtherModalFunc = () => {
        if (otherModal) otherModal.classList.remove("active");
    };

    if (otherCloseBtn) otherCloseBtn.addEventListener("click", closeOtherModalFunc);
    if (otherCancelBtn) otherCancelBtn.addEventListener("click", closeOtherModalFunc);

    if (otherForm) {
        otherForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const profileData = {
                mobile: document.getElementById('input_other_phone') ? document.getElementById('input_other_phone').value : "",
                Gender: document.getElementById('input_other_gender') ? document.getElementById('input_other_gender').value : "",
                dob: document.getElementById('input_other_dob') ? document.getElementById('input_other_dob').value : "",
            };

            fetch(`https://api.theoppty.com/api/update-employee/${emp_id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileData)
            })
                .then(res => res.json())
                .then(data => {
                    alert("Other Information updated successfully!");
                    closeOtherModalFunc();
                    showToast();
                    window.location.reload();
                })
                .catch(err => {
                    console.error("Profile update error:", err);
                    alert("Failed to update profile.");
                });
        });
    }

    // Close Modals on Outside Click
    window.addEventListener("click", (e) => {
        if (profileModal && e.target === profileModal) closeProfileModalFunc();
        if (otherModal && e.target === otherModal) closeOtherModalFunc();
    });
});

// ==========================================
// 6. PROFILE PHOTO MODAL LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const photoModal = document.getElementById("photoModal");
    const openPhotoBtn = document.getElementById("openPhotoModalBtn");
    const closePhotoBtn = document.getElementById("closePhotoModal");
    const cancelPhotoBtn = document.getElementById("cancelPhotoBtn");
    const savePhotoBtn = document.getElementById("savePhotoBtn");

    const mainImg = document.getElementById("mainProfileImage");
    const previewImg = document.getElementById("modalImagePreview");
    const fileInput = document.getElementById("newPhotoInput");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const toast = document.getElementById("successToast");

    if (openPhotoBtn) {
        openPhotoBtn.addEventListener("click", () => {
            if (previewImg && mainImg) previewImg.src = mainImg.src;
            if (fileNameDisplay) fileNameDisplay.textContent = "No file chosen";
            if (fileInput) fileInput.value = "";
            if (photoModal) photoModal.classList.add("active");
        });
    }

    const closePhotoModalFunc = () => {
        if (photoModal) photoModal.classList.remove("active");
    };

    if (closePhotoBtn) closePhotoBtn.addEventListener("click", closePhotoModalFunc);
    if (cancelPhotoBtn) cancelPhotoBtn.addEventListener("click", closePhotoModalFunc);

    window.addEventListener("click", (e) => {
        if (photoModal && e.target === photoModal) closePhotoModalFunc();
    });

    if (fileInput) {
        fileInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (file) {
                if (fileNameDisplay) fileNameDisplay.textContent = file.name;
                const reader = new FileReader();
                reader.onload = function (e) {
                    if (previewImg) previewImg.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (savePhotoBtn) {
        savePhotoBtn.addEventListener("click", () => {
            if (mainImg && previewImg) mainImg.src = previewImg.src;
            closePhotoModalFunc();
            if (toast) {
                toast.classList.add("show");
                setTimeout(() => toast.classList.remove("show"), 3000);
            }
        });
    }
});

// ==========================================
// 7. AVATAR & INITIALS LOGIC (Universal)
// ==========================================
// ==========================================
// 7. AVATAR & INITIALS LOGIC (Universal)
// ==========================================
function loadUserProfile(user) {
    const nameEl = document.getElementById("db-user-name");
    const empIdEl = document.getElementById("db-employee-id");

    if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
    if (empIdEl) empIdEl.textContent = user.empId;

    updateAvatar("db-trigger-avatar-box", "db-trigger-img", user);
    updateAvatar("db-header-avatar-box", "db-header-img", user);
}

function updateAvatar(containerId, imgId, user) {
    const container = document.getElementById(containerId);
    const imgElement = document.getElementById(imgId);

    if (!container) return; // Failsafe if element isn't on the page

    if (user.profilePic && user.profilePic.trim() !== "") {
        if (imgElement) {
            imgElement.src = user.profilePic;
            imgElement.style.display = "block";
            imgElement.style.width = "100%"; // Ensures it fits the circle
            imgElement.style.height = "100%"; 
            imgElement.style.objectFit = "cover";
            imgElement.style.borderRadius = "50%";
        }
        const existingInitials = container.querySelector('.avatar-initials');
        if (existingInitials) existingInitials.remove();
    } else {
        if (imgElement) imgElement.style.display = "none";

        const fInitial = user.firstName ? user.firstName.charAt(0) : "";
        const lInitial = user.lastName ? user.lastName.charAt(0) : "";
        const initials = (fInitial + lInitial).toUpperCase();

        let initialsDiv = container.querySelector('.avatar-initials');
        if (!initialsDiv) {
            initialsDiv = document.createElement("div");
            initialsDiv.className = "avatar-initials";
            container.appendChild(initialsDiv);
        }
        initialsDiv.textContent = initials;
    }
}

// ==========================================
// 8. NOTIFICATIONS, PROFILE MENU & LOGOUT
// ==========================================
// --- NOTIFICATION FETCH LOGIC ---
// --- NOTIFICATION FETCH LOGIC ---
// --- NOTIFICATION FETCH LOGIC ---
 async function fetchNotifications(markAsRead = false) {
    const emp_id = localStorage.getItem('employee_id');
    const notifList = document.getElementById("db-notif-list"); 
    const badge = document.querySelector(".db-notif-badge");

    if (!emp_id || !notifList) return;

    try {
        let apiUrl = `https://api.theoppty.com/api/notofications/${emp_id}/`;
        if (markAsRead) apiUrl += '?mark_read=true';

        const res = await fetch(apiUrl);
        const data = await res.json();

        // --- RED DOT LOGIC ---
     if (badge) {
    if (markAsRead) {
        // If user just opened the menu, hide the dot
        badge.classList.remove("active-dot");
        badge.style.display = "none";
    } else {
        // Check if ANY notification in the list has is_read === false
        // We check for both Boolean and String "false" to be safe
        const hasUnread = data.some(n => n.is_read === false || String(n.is_read).toLowerCase() === "false");
        
        console.log("Badge Status -> Unread items found:", hasUnread);

        if (hasUnread) {
            badge.classList.add("active-dot");
            // Manually forcing display in case CSS class is being overridden
            badge.style.setProperty('display', 'block', 'important');
        } else {
            badge.classList.remove("active-dot");
            badge.style.display = "none";
        }
    }
}

        // Render List
        notifList.innerHTML = "";
        if (data.length === 0) {
            notifList.innerHTML = '<div class="db-notif-item"><p style="padding:15px; text-align:center;">No new notifications</p></div>';
            return;
        }

        data.forEach(n => {
            const timeStr = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // --- DYNAMIC COLOR LOGIC ---
            // If the message contains "rejected", use the alert symbol class (Red)
            const isRejected = n.message.toLowerCase().includes("rejected");
            const symbolClass = isRejected ? 'db-symbol-alert' : ''; // db-symbol-alert is red in your CSS
            
            const itemClass = (n.is_read || markAsRead) ? '' : 'unread';
            
            const item = `
                <div class="db-notif-item ${itemClass}">
                    <div class="db-notif-symbol ${symbolClass}">
                        <i class="fa-solid ${isRejected ? 'fa-circle-xmark' : 'fa-bell'}"></i>
                    </div>
                    <div class="db-notif-text">
                        <h4>${isRejected ? 'Leave Rejected' : 'Update'}</h4>
                        <p>${n.message}</p>
                        <span class="db-time-ago">${timeStr}</span>
                    </div>
                </div>`;
            notifList.innerHTML += item;
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
}
function db_toggleNotifications() {
    const notifDropdown = document.getElementById('db-notification-menu');
    const notifBtn = document.querySelector('.db-notif-trigger-btn');
    const badge = document.querySelector(".db-notif-badge");
    
    if (!notifDropdown || !notifBtn) return;

    db_closeProfile();
    
    const isOpening = !notifDropdown.classList.contains('db-show-menu');
    if (isOpening) {
        // This now correctly triggers the 'mark_read=true' path in your Django view
        fetchNotifications(true); 
        
        if (badge) badge.classList.remove("has-unread");
    }

    notifDropdown.classList.toggle('db-show-menu');
    notifBtn.classList.toggle('db-active-state');
}

// Initial fetch on page load
document.addEventListener("DOMContentLoaded", fetchNotifications);

function db_toggleProfile() {
    const profileDropdown = document.getElementById('db-profile-menu');
    const profileBtn = document.querySelector('.db-profile-trigger-btn');
    if (!profileDropdown || !profileBtn) return;

    db_closeNotifications();
    profileDropdown.classList.toggle('db-show-menu');
    profileBtn.classList.toggle('db-active-state');
}

function db_closeNotifications() {
    const menu = document.getElementById('db-notification-menu');
    const btn = document.querySelector('.db-notif-trigger-btn');
    if (menu) menu.classList.remove('db-show-menu');
    if (btn) btn.classList.remove('db-active-state');
}

function db_closeProfile() {
    const menu = document.getElementById('db-profile-menu');
    const btn = document.querySelector('.db-profile-trigger-btn');
    if (menu) menu.classList.remove('db-show-menu');
    if (btn) btn.classList.remove('db-active-state');
}

// Global click to close dropdowns safely
window.onclick = function (event) {
    if (!event.target.closest('.db-widget-wrapper')) {
        db_closeNotifications();
        db_closeProfile();
    }
};

// --- GLOBAL LOGOUT LOGIC ---
// --- 1. OPEN LOGOUT MODAL ---
function db_logoutUser() {
    // Close the profile dropdown menu first (optional but cleaner)
    const profileMenu = document.getElementById("db-profile-menu");
    if (profileMenu) profileMenu.classList.remove("active");

    // Show the Custom Logout Modal
    const modal = document.getElementById("logout-confirm-modal");
    if (modal) {
        modal.classList.add("show"); // Uses your CSS class '.show' to make it visible
    }
}

// --- 2. CLOSE MODAL (Cancel Button) ---
function closeLogoutModal() {
    const modal = document.getElementById("logout-confirm-modal");
    if (modal) {
        modal.classList.remove("show");
    }
}

// --- 3. PERFORM LOGOUT (Yes Button) ---
function performLogout() {
    // Clear session data
    localStorage.removeItem('employee_id');
    localStorage.removeItem('profileImage');
    
    // Redirect to Login Page
    window.location.href = '../../index.html';
}

// --- 4. CLOSE ON OUTSIDE CLICK ---
window.addEventListener('click', function(e) {
    const modal = document.getElementById("logout-confirm-modal");
    if (e.target === modal) {
        closeLogoutModal();
    }
});

// =========================================
// 9. SMART RULE-BASED CHATBOT
// =========================================

// 1. Bot Knowledge Base
const botKnowledge = [
    {
        keywords: ["hello", "hi", "hey", "greetings", "morning", "afternoon"],
        response: "Hello! 👋 I am the company AI assistant. How can I help you today?"
    },
    {
        keywords: ["time", "timing", "hour", "clock", "shift", "schedule", "open", "close"],
        response: "General office hours are <strong>10:00 AM to 7:00 PM</strong>, Monday to Saturday."
    },
    {
        keywords: ["leave", "sick", "casual", "vacation", "holiday", "off"],
        // We add a negative check logic inside the function to distinguish 'holiday' vs 'leave'
        response: "You currently have <strong>12 Casual Leaves</strong> and <strong>5 Sick Leaves</strong> remaining. <br><a href='../apply_leave/leave.html' style='color:#ff6b00;'>Apply here</a>"
    },
    {
        keywords: ["pay", "salary", "slip", "money", "bonus", "account", "bank"],
        response: "Payslips are generated on the <strong>15th of every month</strong>. You can download them from the Payroll section."
    },
    {
        keywords: ["pass", "reset", "login", "auth", "access", "account"],
        response: "To reset your password, go to <strong>Settings > Security</strong> in the top right menu."
    },
    {
        keywords: ["holiday", "festival", "calendar"],
        response: "The next upcoming holiday is <strong>Ugadi</strong> on March 19th."
    }
];

const defaultResponse = "I'm not sure about that. Would you like to connect with a human? <br><button class='chat-inline-btn' onclick='connectToHuman()'>Chat with HR</button>";

// 2. MAIN LOGIC: Smart Matching
function getBotResponse(userText) {
    userText = userText.toLowerCase();

    // Loop through all topics
    for (let topic of botKnowledge) {
        const match = topic.keywords.some(word => userText.includes(word));

        if (match) {
            // SPECIAL HANDLING: Distinguish "Holiday" from "Leave"
            if (topic.response.includes("Casual Leaves") && (userText.includes("holiday") || userText.includes("festival"))) {
                continue; 
            }
            return topic.response;
        }
    }
    return defaultResponse;
}

/* --- STANDARD UI FUNCTIONS --- */

let isChatInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
    if (!isChatInitialized && document.getElementById("chat-window")) {
        setTimeout(() => {
            addMessageToChat("Hello! 👋 I can help with:<br><br>" +
                "<span class='chip' onclick='quickAsk(\"leave\")'>Leave Balance</span>" +
                "<span class='chip' onclick='quickAsk(\"time\")'>Office Hours</span>" +
                "<span class='chip' onclick='quickAsk(\"pay\")'>Payroll</span>",
                'received');
            isChatInitialized = true;
        }, 1000);
    }
});

function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    const badge = document.querySelector('.chat-notify-badge');
    if(chatWindow) chatWindow.classList.toggle('active');
    
    if (chatWindow && chatWindow.classList.contains('active')) {
        if(badge) badge.style.display = 'none';
        setTimeout(() => {
           if(document.getElementById('chat-input')) document.getElementById('chat-input').focus();
        }, 300);
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    const userText = input.value.trim();
    if (userText === "") return;

    addMessageToChat(userText, 'sent');
    input.value = "";
    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        const reply = getBotResponse(userText);
        addMessageToChat(reply, 'received');
    }, 800);
}

function quickAsk(keyword) {
    let label = keyword;
    if (keyword === 'leave') label = "Leave Balance";
    if (keyword === 'time') label = "Office Hours";
    if (keyword === 'pay') label = "Payroll Info";

    addMessageToChat(label, 'sent');
    showTypingIndicator();
    setTimeout(() => {
        const reply = getBotResponse(keyword);
        addMessageToChat(reply, 'received');
        removeTypingIndicator();
    }, 800);
}

function connectToHuman() {
    addMessageToChat("Connecting to HR...", 'sent');
    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        addMessageToChat("An HR representative has been notified.", 'received');
    }, 2000);
}

function addMessageToChat(htmlContent, type) {
    const chatBody = document.getElementById('chat-body');
    if(!chatBody) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<p>${htmlContent}</p><span class="msg-time">${time}</span>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function handleEnter(event) {
    if (event.key === 'Enter') sendMessage();
}

function showTypingIndicator() {
    const chatBody = document.getElementById('chat-body');
    if(!chatBody) return;
    removeTypingIndicator();
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message received typing';
    typingDiv.innerHTML = `<span></span><span></span><span></span>`;
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}


//hambargar section
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    
    // Create Overlay if missing
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    function toggleSidebar() {
        const isActive = sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
        
        // Prevent background scrolling
        document.body.style.overflow = isActive ? 'hidden' : '';
        
        // Change icon to 'X' when open (if using FontAwesome)
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        }
    }

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        // Close on overlay click
        overlay.addEventListener('click', toggleSidebar);

        // Close on clicking menu links
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if (sidebar.classList.contains('mobile-active')) toggleSidebar();
            });
        });
    }
});