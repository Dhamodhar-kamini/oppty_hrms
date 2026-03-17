document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "http://13.51.167.95:8000"; // Live Server IP
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
            if(wrapper) wrapper.innerHTML = `<div class="swiper-slide"><div class="birthday-profile"><h3>Could not load birthdays</h3></div></div>`;
        });

    function initBirthdaySlider(dataList) {
        if (!wrapper) return;
        wrapper.innerHTML = ""; 

        if (!dataList || dataList.length === 0) {
            wrapper.innerHTML = `
                <div class="swiper-slide">
                    <div class="birthday-profile">
                        <img src="../assets/profiledp.jpeg" style="filter: grayscale(1); opacity: 0.5;">
                        <h3>No Birthdays Today</h3>
                        <p>Check "View All" for upcoming</p>
                    </div>
                </div>`;
            if(wishBtn) wishBtn.style.display = "none";
            return;
        }

        if(wishBtn) wishBtn.style.display = "block";

        dataList.forEach(person => {
            const slide = document.createElement("div");
            slide.className = "swiper-slide";
            // Store phone and name in dataset for the Send Wish logic
            slide.setAttribute("data-phone", person.mobile || "");
            slide.setAttribute("data-name", person.name || "");
            
            slide.innerHTML = `
                <div class="birthday-profile">
                    <img src="../assets/profiledp.jpeg" alt="${person.name}">
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
        if (birthdaySwiper) birthdaySwiper.autoplay.stop();
        currentTargetPhone = person.phone || "";
        if (wishTargetNameEl) wishTargetNameEl.innerText = person.name;
        if (wishMessageEl) wishMessageEl.value = `Happy Birthday ${person.name}! 🎂 Wishing you a fantastic year ahead!`;
        if (wishModal) wishModal.classList.add("active");
    };

    window.closeWishModal = function () {
        if (wishModal) wishModal.classList.remove("active");
        if (birthdaySwiper) birthdaySwiper.autoplay.start();
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

    window.openAllBirthdaysModal = function () {
        const listContainer = document.getElementById("bdayListContainer");
        const allBirthdays = [...todayBirthdays, ...upcomingBirthdays];
        
        if (listContainer) {
            if (allBirthdays.length === 0) {
                listContainer.innerHTML = "<p style='text-align:center; padding:20px;'>No birthday records found.</p>";
            } else {
                listContainer.innerHTML = allBirthdays.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="../assets/profiledp.jpeg" style="width:40px; height:40px; border-radius:50%;">
                            <div>
                                <h4 style="margin:0; font-size:14px;">${p.name}</h4>
                                <span style="font-size:12px; color:#666;">${p.dob}</span>
                            </div>
                        </div>
                        <button style="padding:5px 10px; background:#ff6b00; color:white; border:none; border-radius:4px; cursor:pointer;" 
                            onclick="openWishModal({name: '${p.name}', phone: '${p.mobile}'})">
                            Wish
                        </button>
                    </div>`).join("");
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

    window.openImageUpload = function() {
        if (uploadInput) uploadInput.click();
    };

    fetch(`${API_BASE}/api/employee/dashboard/${emp_id}/`)
    .then(res => res.json())
    .then(data => {
        document.getElementById("name").innerText = data.name;
        document.getElementById("role").innerText = data.role;
        document.getElementById("p_name").innerText = data.name;
        document.getElementById("p_role").innerText = data.role;
        document.getElementById("email").innerText = data.email;
        if(data.other_details && data.other_details.length > 0){
            document.getElementById("mobile").innerText = data.other_details[0].mobile;
        }

        if (data.profile_pic) {
            const serverImageUrl = `${API_BASE}${data.profile_pic}`;
            profileImage.src = serverImageUrl;
            if (typeof loadUserProfile === "function") {
                const names = (data.name || "Employee").split(" ");
                loadUserProfile({
                    firstName: names[0],
                    lastName: names.length > 1 ? names.slice(1).join(" ") : "",
                    empId: data.employee_id || emp_id,
                    profilePic: serverImageUrl 
                });
            }
        }
    });

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
                    profileImage.src = fullUrl;
                    if (typeof loadUserProfile === "function") {
                        const currentName = document.getElementById("p_name").innerText;
                        const parts = currentName.split(" ");
                        loadUserProfile({ 
                            firstName: parts[0], 
                            lastName: parts.length > 1 ? parts.slice(1).join(" ") : "", 
                            empId: emp_id, 
                            profilePic: fullUrl 
                        });
                    }
                    alert("Profile picture saved to server!");
                }
            })
            .catch(err => console.error("Server upload failed:", err));
        });
    }

    // ==========================================
    // --- 4. SIDEBAR & GLOBAL CLICKS ---
    // ==========================================
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const holidayPopup = document.getElementById("holidayPopup");
    const openHoliday = document.getElementById("viewHolidayBtn");
    const closeHoliday = document.getElementById("closeHoliday");

    if(mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => sidebar.classList.toggle("active"));
    if(openHoliday) openHoliday.onclick = () => holidayPopup.classList.add("active");
    if(closeHoliday) closeHoliday.onclick = () => holidayPopup.classList.remove("active");

    window.onclick = function(event) {
        if (event.target === wishModal) closeWishModal();
        if (event.target === allBdayModal) closeAllBirthdaysModal();
        if (event.target === successWishModal) closeSuccessWishModal();
        if (event.target === holidayPopup) holidayPopup.classList.remove("active");
    };
});