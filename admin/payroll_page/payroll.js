// --- PRELOADER LOGIC ---
window.addEventListener("load", function () {
    const preloader = document.getElementById("page-preloader");
    
    // Minimum wait time of 800ms for a smooth experience
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add("loaded");
            setTimeout(() => {
                preloader.style.display = "none";
            }, 500);
        }
    }, 800);
});

document.addEventListener("DOMContentLoaded", function () {
    
    // --- 1. SETUP YEAR PICKER ---
    const yearPicker = document.getElementById("yearPicker");
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar, etc.
    
    // Populate Dropdown (Current Year - 10 to Current Year + 5)
    for (let y = currentYear - 10; y <= currentYear + 5; y++) {
        const option = document.createElement("option");
        option.value = y;
        option.text = y;
        if (y === currentYear) option.selected = true;
        yearPicker.appendChild(option);
    }

    // --- 2. HELPERS ---
    function formatRupee(number) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(number);
    }

    function formatCompact(number) {
        return new Intl.NumberFormat("en-IN", {
            notation: "compact",
            compactDisplay: "short",
            style: "currency",
            currency: "INR",
        }).format(number);
    }

    // Mock Data Generator (Simulate backend response based on year)
    function getDataForYear(year) {
        const baseSalary = 800000 + (year - 2020) * 50000; 
        let monthlyData = [];
        for (let i = 0; i < 12; i++) {
            let randomFactor = 0.8 + Math.random() * 0.4; 
            monthlyData.push(Math.floor(baseSalary * randomFactor));
        }
        return monthlyData;
    }

    // --- 3. CHART INITIALIZATION ---
    const ctx = document.getElementById("payrollChart").getContext("2d");
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Create Gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "#FF6B00"); // Orange Start
    gradient.addColorStop(1, "#FFB74D"); // Orange End

    const payrollChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [], // Injected dynamically
            datasets: [
                {
                    label: "Total Salary",
                    data: [], // Injected dynamically
                    backgroundColor: gradient,
                    borderRadius: 6,
                    maxBarThickness: 30,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return formatRupee(context.raw);
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return formatCompact(value);
                        },
                        color: "#9ca3af"
                    },
                    grid: { color: "#f3f4f6" }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: "#6b7280" }
                },
            },
        },
    });

    // --- 4. UPDATE LOGIC (DYNAMIC CUTOFF) ---
    function updateDashboard(year) {
        let newData = getDataForYear(year);
        let displayMonths = [...allMonths];

        if (year === currentYear) {
            // Cut off at the current month for the current year
            newData = newData.slice(0, currentMonthIndex + 1);
            displayMonths = displayMonths.slice(0, currentMonthIndex + 1);
        } else if (year > currentYear) {
            // Future years have no data
            newData = [];
            displayMonths = [];
        }

        // Update Chart
        payrollChart.data.labels = displayMonths;
        payrollChart.data.datasets[0].data = newData;
        payrollChart.update();
    }

    // Initial Stats Load
    updateDashboard(currentYear);
    
    // --- 5. API FETCH ---
    fetch(`https://theoppty.com/api/salary`)
        .then(res => res.json())
        .then(data => {
            console.log('API Data:', data);
            if (data.total_annual_salary) {
                document.getElementById("totalPayout").innerText = formatRupee(data.total_annual_salary);
            }
            if (data.total_monthly_salary) {
                document.getElementById("avgPayout").innerText = formatRupee(data.total_monthly_salary);
            }
        })
        .catch(err => console.error("Error fetching salary API:", err));

    // --- 6. EVENT LISTENER ---
    yearPicker.addEventListener("change", (e) => {
        updateDashboard(parseInt(e.target.value));
    });

});

// ==========================================
// NOTIFICATION SECTION
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

document.addEventListener("DOMContentLoaded", () => {
  const bellBtn = document.getElementById("ntBellBtn");
  const dropdown = document.getElementById("ntDropdown");
  const markReadBtn = document.getElementById("ntMarkAllRead");

  if (!bellBtn || !dropdown || !markReadBtn) return;

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

  window.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
});

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