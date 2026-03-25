// --- HAMBURGER MENU SECTION ---
document.addEventListener('DOMContentLoaded', function() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    const icon = mobileBtn ? mobileBtn.querySelector('i') : null;

    // Function to toggle sidebar
    function toggleSidebar() {
        if (!sidebar || !overlay || !icon) return;
        
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Toggle Icon between Bars and Times (X)
        if (sidebar.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }

    // Event Listener for Button Click
    if(mobileBtn) {
        mobileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Event Listener for Overlay Click
    if(overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }

    // Close sidebar when a menu link is clicked
    const menuLinks = document.querySelectorAll('.sidebar-menu .menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if(window.innerWidth <= 992) {
                toggleSidebar();
            }
        });
    });
});


// --- MAIN DASHBOARD LOGIC ---
document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "https://api.theoppty.com"; // Live Server IP
    const emp_id = localStorage.getItem('employee_id');

    let birthdaySwiper = null;
    let todayBirthdays = [];    // Real data for slider
    let upcomingBirthdays = []; // Real data for modal
    const wrapper = document.getElementById("birthdayWrapper");
    const wishBtn = document.getElementById('sendWishBtn');

    // ==========================================
    // --- 1. FETCH BIRTHDAYS FROM SERVER ---
    // ==========================================
    fetch(`${API_BASE}/api/birthdays/`)
        .then(res => {
            if (!res.ok) throw new Error("Server error (500)");
            return res.json();
        })
        .then(data => {
            todayBirthdays = data.today || [];
            upcomingBirthdays = data.upcoming || [];

            // Initialize slider ONLY with today's birthdays
            initBirthdaySlider(todayBirthdays);
        })
        .catch(err => {
            console.error("Birthday Fetch Error:", err);
            if (wrapper) wrapper.innerHTML = `<div class="swiper-slide"><div class="birthday-profile"><h3>Could not load birthdays</h3></div></div>`;
        });

    function initBirthdaySlider(dataList) {
        if (!wrapper) return;
        wrapper.innerHTML = "";

        if (!dataList || dataList.length === 0) {
            wrapper.innerHTML = `
                <div class="swiper-slide">
                    <div class="birthday-profile">
                        <img src="../assets/db_wish_card.png" style="filter: grayscale(1); opacity: 0.5;">
                        <h3>No Birthdays Today</h3>
                        <p>Check "View All" for upcoming</p>
                    </div>
                </div>`;
            if (wishBtn) wishBtn.style.display = "none";
            return;
        }

        if (wishBtn) wishBtn.style.display = "block";

        dataList.forEach(person => {
            const slide = document.createElement("div");
            slide.className = "swiper-slide";
            slide.setAttribute("data-phone", person.mobile || "");
            slide.setAttribute("data-name", person.name || "");

            // --- FETCH IMAGE OR RENDER LETTERS ---
            let avatarHtml = "";
            
            if (person.profile_pic && person.profile_pic !== "") {
                const fullImgUrl = `${API_BASE}${person.profile_pic}`;
                avatarHtml = `<img src="${fullImgUrl}" alt="${person.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                const parts = person.name.split(" ");
                const initials = (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : "")).toUpperCase();
                avatarHtml = `<div class="avatar-initials-gen">${initials}</div>`;
            }

            slide.innerHTML = `
                <div class="birthday-profile">
                    <div class="avatar-container-gen">
                        ${avatarHtml}
                    </div>
                    <h3>${person.name}</h3>
                    <p>🎂 Today, ${person.dob}</p>
                    <small>${person.role || 'Team Member'}</small>
                </div>
            `;
            wrapper.appendChild(slide);
        });

        if (birthdaySwiper) birthdaySwiper.destroy(true, true);
        birthdaySwiper = new Swiper(".birthdaySwiper", {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: dataList.length > 1,
            autoplay: { delay: 4000, disableOnInteraction: false },
            pagination: { el: ".swiper-pagination", clickable: true }
        });
    }

    // ==========================================
    // --- 2. MODAL & SEND WISH LOGIC ---
    // ==========================================
    const wishModal = document.getElementById("wishModal");
    const successWishModal = document.getElementById("successWishModal");
    const allBdayModal = document.getElementById("allBirthdaysModal");
    const wishTargetNameEl = document.getElementById("wishTargetName");
    const wishMessageEl = document.getElementById("wishMessage");
    let currentTargetPhone = "";

    // Wish button under Slider
    if (wishBtn) {
        wishBtn.addEventListener("click", function () {
            const activeSlide = document.querySelector('.swiper-slide-active');
            if (!activeSlide) return;

            const name = activeSlide.getAttribute('data-name');
            const phone = activeSlide.getAttribute('data-phone');

            if (name) openWishModal({ name, phone });
        });
    }

    window.openWishModal = function (person) {
        if (birthdaySwiper && birthdaySwiper.autoplay) birthdaySwiper.autoplay.stop();
        currentTargetPhone = person.phone || "";
        if (wishTargetNameEl) wishTargetNameEl.innerText = person.name;
        if (wishMessageEl) wishMessageEl.value = `Happy Birthday ${person.name}! 🎂 Wishing you a fantastic year ahead!`;
        if (wishModal) wishModal.classList.add("active");
    };

    window.closeWishModal = function () {
        if (wishModal) wishModal.classList.remove("active");
        if (birthdaySwiper && birthdaySwiper.autoplay) birthdaySwiper.autoplay.start();
    };

    window.submitWish = function () {
        if (!currentTargetPhone || currentTargetPhone === "null" || currentTargetPhone === "") {
            alert("No phone number registered for this employee.");
            return;
        }
        const message = wishMessageEl ? wishMessageEl.value : "Happy Birthday!";
        const cleanPhone = currentTargetPhone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');

        closeWishModal();
        if (successWishModal) successWishModal.classList.add("active");
    };

    window.closeSuccessWishModal = function () {
        if (successWishModal) successWishModal.classList.remove("active");
    };

    // --- UPDATED: ONLY SHOW UPCOMING (NEXT 10) ---
    // --- UPDATED: FILTER BY NEXT 10 DAYS ONLY ---
    window.openAllBirthdaysModal = function () {
        const listContainer = document.getElementById("bdayListContainer");
        const today = new Date();
        
        // Define the time window: Tomorrow to 10 days from now
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const tenDaysLater = new Date();
        tenDaysLater.setDate(today.getDate() + 11); // +11 to include the full 10th day
        tenDaysLater.setHours(23, 59, 59, 999);

        // Filter the upcomingBirthdays array
        const next10DaysList = upcomingBirthdays.filter(p => {
            // Convert string "28 May" to a real Date object for this year
            const bdayThisYear = new Date(`${p.dob} ${today.getFullYear()}`);
            
            // Check if it falls within our 10-day window
            return bdayThisYear >= tomorrow && bdayThisYear <= tenDaysLater;
        });

        if (listContainer) {
            if(next10DaysList.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No birthdays in the next 10 days.</p>`;
            } else {
                listContainer.innerHTML = next10DaysList.map(p => {
                    let miniAvatar = "";
                    if (p.profile_pic) {
                        miniAvatar = `<img src="${API_BASE}${p.profile_pic}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`;
                    } else {
                        const parts = p.name.split(" ");
                        const initials = (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : "")).toUpperCase();
                        miniAvatar = `<div class="avatar-initials-gen" style="width:40px; height:40px; font-size:14px; margin:0; display:flex; align-items:center; justify-content:center; background:#ff5b1e; color:white; border-radius:50%;">${initials}</div>`;
                    }

                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${miniAvatar}
                                <div>
                                    <h4 style="margin:0; font-size:14px;">${p.name}</h4>
                                    <span style="font-size:12px; color:#666;">${p.dob}</span>
                                </div>
                            </div>
                            <button style="padding:5px 10px; background:#ff6b00; color:white; border:none; border-radius:4px; cursor:pointer;" 
                                onclick="openWishModal({name: '${p.name}', phone: '${p.mobile}'})">
                                Wish
                            </button>
                        </div>`;
                }).join("");
            }
        }
        if (allBdayModal) allBdayModal.classList.add("active");
    };

    window.closeAllBirthdaysModal = function () {
        if (allBdayModal) allBdayModal.classList.remove("active");
    };

    // ==========================================
    // --- 3. PROFILE & IMAGE UPLOAD ---
    // ==========================================
    const uploadInput = document.getElementById("imageUpload");
    const profileImage = document.getElementById("profileImage");
    const profileContainer = document.querySelector(".profile-left");

    // --- Helper: Show Success Toast ---
    function showSuccessToast() {
        const toast = document.getElementById("successToast");
        if(toast) {
            toast.classList.add("show");
            // Hide after 3 seconds
            setTimeout(() => {
                toast.classList.remove("show");
            }, 3000);
        }
    }

    window.openImageUpload = function () {
        if (uploadInput) uploadInput.click();
    };

    // 1. FETCH INITIAL DATA
    if(emp_id) {
        fetch(`${API_BASE}/api/employee/dashboard/${emp_id}/`)
            .then(res => res.json())
            .then(data => {
                // Update text fields if elements exist
                const nameEl = document.getElementById("name");
                const roleEl = document.getElementById("role");
                const pNameEl = document.getElementById("p_name");
                const pRoleEl = document.getElementById("p_role");
                const emailEl = document.getElementById("email");
                const mobileEl = document.getElementById("mobile");

                if(nameEl) nameEl.innerText = data.name;
                if(roleEl) roleEl.innerText = data.role;
                if(pNameEl) pNameEl.innerText = data.name;
                if(pRoleEl) pRoleEl.innerText = data.role;
                if(emailEl) emailEl.innerText = data.email;
                if (mobileEl && data.other_details && data.other_details.length > 0) {
                    mobileEl.innerText = data.other_details[0].mobile;
                }

                // Profile Picture Logic
                if (data.profile_pic) {
                    if(profileImage) {
                        profileImage.src = `${API_BASE}${data.profile_pic}`;
                        profileImage.style.display = "block";
                        profileImage.classList.remove('hidden');
                    }
                    // Remove initials if they exist
                    const oldInit = document.getElementById("profileInitials");
                    if (oldInit) oldInit.style.display = 'none';
                } else {
                    // Hide image, show initials
                    if(profileImage) profileImage.style.display = "none";
                    
                    const initialsBox = document.getElementById("profileInitials");
                    if(initialsBox) {
                        const parts = data.name.split(" ");
                        const initials = (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : "")).toUpperCase();
                        initialsBox.innerText = initials;
                        initialsBox.style.display = 'flex';
                    }
                }
            })
            .catch(err => console.error("Dashboard Data Error:", err));
    }

    // 2. HANDLE UPLOAD
    if (uploadInput && profileImage) {
        uploadInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("profile_pic", file);

            fetch(`${API_BASE}/api/upload-profile-pic/${emp_id}/`, {
                method: "PATCH",
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.profile_pic_url) {
                    const fullUrl = `${API_BASE}${data.profile_pic_url}`;
                    
                    // Update Image Immediately
                    profileImage.src = fullUrl;
                    profileImage.style.display = "block";
                    profileImage.classList.remove('hidden');

                    // Hide Initials div if present
                    const initialsDiv = document.getElementById("profileInitials");
                    if (initialsDiv) {
                        initialsDiv.style.display = 'none';
                    }

                    // Call Notification Function
                    showSuccessToast();
                }
            })
            .catch(err => console.error("Server upload failed:", err));
        });
    }

    // ==========================================
    // --- 4. SIDEBAR & GLOBAL CLICKS ---
    // ==========================================
    const holidayPopup = document.getElementById("holidayPopup");
    const openHoliday = document.getElementById("viewHolidayBtn");
    const closeHoliday = document.getElementById("closeHoliday");

    if (openHoliday) openHoliday.onclick = () => holidayPopup.classList.add("active");
    if (closeHoliday) closeHoliday.onclick = () => holidayPopup.classList.remove("active");

    window.onclick = function (event) {
        if (event.target === wishModal) closeWishModal();
        if (event.target === allBdayModal) closeAllBirthdaysModal();
        if (event.target === successWishModal) closeSuccessWishModal();
        if (event.target === holidayPopup) holidayPopup.classList.remove("active");
    };
});