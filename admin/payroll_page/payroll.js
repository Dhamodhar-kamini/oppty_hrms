
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


//hambargar section
document.addEventListener("DOMContentLoaded", function () {
    const hamburgerBtn = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("sidebar");
    const closeBtn = document.getElementById("sidebarCloseBtn");
    const overlay = document.getElementById("sidebarOverlay");

    // Open Sidebar
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener("click", function () {
        sidebar.classList.add("mobile-active");
        overlay.classList.add("active");
        // Optional: Prevent body scrolling when menu is open
        document.body.style.overflow = "hidden";
      });
    }

    // Close Sidebar (Function)
    function closeSidebar() {
      sidebar.classList.remove("mobile-active");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }

    // Close on X button click
    if (closeBtn) {
      closeBtn.addEventListener("click", closeSidebar);
    }

    // Close on Overlay click
    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }
  });

// --- 1. GLOBAL HELPERS ---
const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

// Store table data globally so the CSV exporter can access it
window.currentTableData = [];

// --- 2. UPDATE TOP CARDS (Summary) ---
function updateDashboard() {
    const monthPicker = document.getElementById("monthPicker");
    if (!monthPicker || !monthPicker.value) return;

    const [year, month] = monthPicker.value.split('-');
    
    // Note: Ensure API_BASE_URL is defined somewhere in your global scope!
    fetch(`${API_BASE_URL}/api/salary/?year=${year}&month=${month}`)  
        .then(res => res.json())
        .then(data => {
            window.currentPayrollData = data; 
            document.getElementById("totalAnnualNet").innerText = formatINR(data.total_annual_salary);
            document.getElementById("totalMonthlyNet").innerText = formatINR(data.total_monthly_salary);

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            document.getElementById("monthlyLabel").innerText = `Total Payout for ${monthNames[parseInt(month)-1]} ${year}`;
        })
        .catch(err => console.error("Top Cards Load Failed:", err));
}

// --- 3. LOAD TABLE RECORDS (Detailed List) ---
function loadPayslipTable() {
    const monthPicker = document.getElementById("monthPicker");
    if (!monthPicker || !monthPicker.value) return;

    const [year, month] = monthPicker.value.split('-'); 
    const tableBody = document.getElementById("payslipTableBody");
    
    fetch(`${API_BASE_URL}/api/salary/list/?month=${month}&year=${year}`)
        .then(res => res.json())
        .then(data => {
            window.currentTableData = data; // Save data for CSV export
            tableBody.innerHTML = ""; 

            if (!data || data.length === 0) {
                // Fixed colspan from 6 to 5 to match your table columns
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px;">No records found.</td></tr>`;
                return;
            }

            data.forEach(item => {
                const row = document.createElement("tr");
                row.className = "payslip-row"; 
                row.style.borderBottom = "1px solid #f1f5f9";
                row.innerHTML = `
                    <td style="padding: 15px 20px;">
                        <div class="emp-name" style="font-weight: 600; color: #1e293b;">${item.employee_name}</div>
                        <div style="font-size: 11px; color: #64748b;">ID: ${item.employee_id}</div>
                    </td>
                    <td style="padding: 15px 20px; color: #475569;">${formatINR(item.annual_ctc || 0)}</td> 
                     <td style="padding: 15px 20px; color: #475569;">${(item.loss_of_pay)}</td> 

                      <td style="padding: 15px 20px; color: #475569;">${formatINR(item.lop_amount)}</td> 


                    <td style="padding: 15px 20px; color: #475569;">${item.month}</td>
                    <td style="padding: 15px 20px; color: #475569;">${formatINR(item.gross_salary)}</td>
                    <td style="padding: 15px 20px; font-weight: 600; color: #10b981;">${formatINR(item.net_salary)}</td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(err => console.error("Table Load Failed:", err));
}

// --- 4. CSV EXPORT LOGIC ---
function exportTableToCSV(dataArray, filename) {
    if (!dataArray || dataArray.length === 0) {
        alert("No data to export!");
        return;
    }

    let csvContent = [];
    const headers = ["Name", "Month","lop_days","lop_amount" ,"Gross Salary", "Net Salary"];
    csvContent.push(headers.join(","));

    dataArray.forEach(item => {
        // Fixed keys to match the API response shown in your table rendering
        const row = [
            `"${item.employee_name || ''}"`, 
            `"${item.month || ''}"`, 
            `"${item.loss_of_pay || 0}"`, 
            `"${item.lop_amount || 0}"`,
            `"${item.gross_salary || 0}"`,
            `"${item.net_salary || 0}"`
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

// --- 5. INITIALIZATION & EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", function () {
    const monthPicker = document.getElementById("monthPicker");
    const modal = document.getElementById("detailsModal");
    const employeeSearch = document.getElementById("employeeSearch"); 
    const downloadAllBtn = document.getElementById("downloadAllBtn"); 

    // 1. Set default Date to current month
    const now = new Date();
    monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 2. Modal Helper
    window.closeModal = () => modal.style.display = 'none';

    function modalFill(title, gross, pf, pt, net) {
        document.getElementById("modalTitle").innerText = title;
        document.getElementById("modalGross").innerText = formatINR(gross);
        document.getElementById("modalPF").innerText = formatINR(pf);
        document.getElementById("modalPT").innerText = formatINR(pt);
        document.getElementById("modalNet").innerText = formatINR(net);
        modal.style.display = 'flex';
    }

    // 3. Modal Click Events
    document.getElementById("viewMonthlyDetails").onclick = () => {
        const data = window.currentPayrollData;
        if (data) modalFill("Monthly Breakdown", data.total_monthly_gross, data.total_monthly_pf, data.total_monthly_pt, data.total_monthly_salary);
    };

    document.getElementById("viewYearlyDetails").onclick = () => {
        const data = window.currentPayrollData;
        if (data) modalFill("Annual Breakdown", data.total_annual_gross, data.total_annual_pf, data.total_annual_pt, data.total_annual_salary);
    };

    // 4. Calendar Change Listener
    monthPicker.onchange = () => {
        updateDashboard();
        loadPayslipTable();
    };

    // 5. Search Filter Logic
    if (employeeSearch) {
        employeeSearch.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll(".payslip-row");

            rows.forEach(row => {
                const nameText = row.querySelector(".emp-name").textContent.toLowerCase();
                if (nameText.includes(searchTerm) || row.innerText.toLowerCase().includes(searchTerm)) {
                    row.style.display = ""; 
                } else {
                    row.style.display = "none"; 
                }
            });
        });
    }

    // 6. Download All Excel/CSV Logic
    if(downloadAllBtn) {
        downloadAllBtn.addEventListener("click", function() {
            // Note: If you want to export ONLY the searched/filtered rows, 
            // you will need to filter `window.currentTableData` based on the search input here.
            exportTableToCSV(window.currentTableData, "all_employees.csv");
        });
    }

    // 7. Initial Load (Moved inside DOMContentLoaded so elements exist when called)
    updateDashboard();
    loadPayslipTable();
});