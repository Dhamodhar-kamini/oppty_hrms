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

// --- HAMBURGER SECTION ---
document.addEventListener("DOMContentLoaded", function () {
    const hamburgerBtn = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("sidebar");
    const closeBtn = document.getElementById("sidebarCloseBtn");
    const overlay = document.getElementById("sidebarOverlay");

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener("click", function () {
            sidebar.classList.add("mobile-active");
            overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        });
    }

    function closeSidebar() {
        sidebar.classList.remove("mobile-active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);
});

// --- 1. GLOBAL HELPERS ---
const API_BASE_URL = "https://api.theoppty.com"; // Define if not already defined

const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

// Store table data globally
window.currentTableData = [];

// --- 2. UPDATE TOP CARDS (Summary) ---
function updateDashboard() {
    const monthPicker = document.getElementById("monthPicker");
    if (!monthPicker || !monthPicker.value) return;

    const [year, month] = monthPicker.value.split('-');
    
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
            window.currentTableData = data;
            tableBody.innerHTML = ""; 

            if (!data || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">No records found.</td></tr>`;
                return;
            }

            data.forEach((item, index) => {
                const row = document.createElement("tr");
                row.className = "payslip-row"; 
                row.style.borderBottom = "1px solid #f1f5f9";
                row.innerHTML = `
                    <td style="padding: 15px 20px;">
                        <div class="emp-name" style="font-weight: 600; color: #1e293b;">${item.employee_name}</div>
                        <div style="font-size: 11px; color: #64748b;">ID: ${item.employee_id}</div>
                    </td>
                    <td style="padding: 15px 20px; color: #475569;">${formatINR(item.annual_ctc || 0)}</td> 
                    <td style="padding: 15px 20px; color: #475569;">${item.loss_of_pay || 0}</td> 
                    <td style="padding: 15px 20px; color: #475569;">${formatINR(item.lop_amount || 0)}</td> 
                    <td style="padding: 15px 20px; color: #475569;">${item.month}</td>
                    <td style="padding: 15px 20px; color: #475569;">${formatINR(item.gross_salary)}</td>
                    <td style="padding: 15px 20px; font-weight: 600; color: #10b981;">${formatINR(item.net_salary)}</td>
                    <td style="padding: 15px 20px;">
                        <span class="download-trigger" 
                              data-index="${index}" 
                              data-employee-id="${item.employee_id}"
                              style="cursor:pointer; color: #1d4ed8; font-weight: 600; text-decoration:underline;">
                            <i class="fa fa-download"></i> Download
                        </span>
                    </td>
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
    const headers = ["Name", "Employee ID", "Month", "LOP Days", "LOP Amount", "Gross Salary", "Net Salary"];
    csvContent.push(headers.join(","));

    dataArray.forEach(item => {
        const row = [
            `"${item.employee_name || ''}"`,
            `"${item.employee_id || ''}"`,
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

// --- 5. NUMBER TO WORDS HELPER ---
function numberToWords(amount) {
    const words = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
    words[30] = 'Thirty'; words[40] = 'Forty'; words[50] = 'Fifty'; words[60] = 'Sixty'; words[70] = 'Seventy'; words[80] = 'Eighty'; words[90] = 'Ninety';
    
    if(amount === 0) return "Zero INR only";
    
    let numStr = Math.floor(amount).toString();
    let n_length = numStr.length;
    let words_string = "";

    if (n_length <= 9) {
        let n_array = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let received_n_array = [];
        for (let i = 0; i < n_length; i++) { received_n_array[i] = numStr.substr(i, 1); }
        for (let i = 9 - n_length, j = 0; i < 9; i++, j++) { n_array[i] = received_n_array[j]; }
        for (let i = 0, j = 1; i < 9; i++, j++) {
            if (i == 0 || i == 2 || i == 4 || i == 7) {
                if (n_array[i] == 1) {
                    n_array[j] = 10 + parseInt(n_array[j]);
                    n_array[i] = 0;
                }
            }
        }
        let value = "";
        for (let i = 0; i < 9; i++) {
            if (i == 0 || i == 2 || i == 4 || i == 7) { value = n_array[i] * 10; } else { value = n_array[i]; }
            if (value != 0) { words_string += words[value] + " "; }
            if ((i == 1 && value != 0) || (i == 0 && value != 0 && n_array[i + 1] == 0)) { words_string += "Crores "; }
            if ((i == 3 && value != 0) || (i == 2 && value != 0 && n_array[i + 1] == 0)) { words_string += "Lakhs "; }
            if ((i == 5 && value != 0) || (i == 4 && value != 0 && n_array[i + 1] == 0)) { words_string += "Thousand "; }
            if (i == 6 && value != 0 && (n_array[i + 1] != 0 && n_array[i + 2] != 0)) { words_string += "Hundred and "; } else if (i == 6 && value != 0) { words_string += "Hundred "; }
        }
        words_string = words_string.split("  ").join(" ");
    }
    return words_string.trim() + " INR only";
}

// --- 6. PAYSLIP WINDOW GENERATOR ---
function openPayslipWindow(employee, payslip) {
    
    const employeeId = employee.employee_id || payslip.employee_id || 'N/A';
    const name = employee.name || payslip.employee_name || 'N/A';
    const department = employee.department || 'CEO Office';
    const role = employee.role || employee.designation || payslip.designation || 'N/A';
    const pan = employee.statutory_details?.[0]?.pan || 'N/A';
    const bankAccount = employee.bank_details?.[0]?.acc_no || 'N/A';
    const bankName = employee.bank_details?.[0]?.bank_name || 'N/A';
    const ifscCode = employee.bank_details?.[0]?.ifsc_code || 'N/A';
    
    const grossSalary = Number(payslip.gross_salary) || 0;
    const netSalary = Number(payslip.net_salary) || 0;
    
    // Month / Year Parsing
    let month = payslip.month || 'N/A';
    let year = payslip.year;
    if (!year && /\d{4}/.test(month)) { 
        year = month.match(/\d{4}/)[0]; 
        month = month.replace(/\d{4}/, '').trim(); 
    } 
    if (!year) year = new Date().getFullYear();
    let parsedYear = parseInt(year);
    
    // Clean month string
    month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const monthYear = `${month} ${parsedYear}`;
    
    // Date Math: 26th to 25th Cycle calculation
    const monthNamesMap = { 
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, 
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12, 
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, 
        "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12 
    };
    let mIndex = monthNamesMap[month.toLowerCase()] || new Date().getMonth() + 1;
    
    let cycleStartDate = new Date(parsedYear, mIndex - 2, 26); 
    let cycleEndDate = new Date(parsedYear, mIndex - 1, 25);
    
    let timeDiff = cycleEndDate.getTime() - cycleStartDate.getTime();
    let daysInCycle = Math.round(timeDiff / (1000 * 3600 * 24)) + 1; 

    let lopDays = Number(payslip.lop_days) || Number(payslip.loss_of_pay) || 0;
    let paidDays = daysInCycle - lopDays;
    
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let startMonthStr = shortMonths[cycleStartDate.getMonth()];
    let endMonthStr = shortMonths[cycleEndDate.getMonth()];
    let payDate = `${startMonthStr} 26 - ${endMonthStr} 25`;

    // Salary Breakdown
    const basic = Math.round(grossSalary / 2);
    const hra = Number(payslip.hra) || Number(payslip.house_rent_allowance) || Math.round(basic * 0.5);
    const pfEmployer = Number(payslip.pf_amount) ? Number(payslip.pf_amount) / 2 : 0;
    const incentives = Number(payslip.incentives) || 0;
    
    const specialAllowance = Number(payslip.special_allowance) || Math.round(basic * 0.18);
    const lta = Number(payslip.lta) || Number(payslip.leave_travel_allowance) || Math.round(basic * 0.2);
    const otherAllowances = specialAllowance + lta;

    // Deductions
    const totalPF = Number(payslip.pf_amount) || 0;
    const professionalTax = Number(payslip.professional_tax) || Number(payslip.pt) || 200;
    const lopAmount = Number(payslip.lop_amount) || 0;
    const totalDeductions = totalPF + professionalTax + lopAmount; 
    
    const formatCurrency = (num) => Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountInWords = numberToWords(netSalary);

    const newWindow = window.open('', '_blank');
    if (!newWindow) { 
        alert("Popup blocked! Please allow popups for this site."); 
        return; 
    }

    const payslipHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Payslip - ${monthYear}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { margin: 0; padding: 0; background-color: #555; display: flex; justify-content: center; }
            .payslip-container { background-color: #ffffff; width: 794px; min-height: 1123px; padding: 40px; margin: 20px auto; box-shadow: 0 0 15px rgba(0,0,0,0.2); position: relative; }
            
            .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
            .logo { max-height: 50px; }
            .title-wrap { text-align: right; }
            .payslip-title { color: #1d4ed8; font-size: 22px; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px; }
            .payslip-month { color: #6b7280; font-size: 14px; margin: 0; font-weight: 500; }
            
            .company-details { margin-bottom: 15px; }
            .company-name { color: #1d4ed8; font-size: 20px; font-weight: 700; margin: 0 0 5px 0; }
            .company-address { color: #6b7280; font-size: 12px; margin: 0; }
            .divider { border-bottom: 2px solid #1d4ed8; margin-bottom: 30px; }
            
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            
            .info-box { background-color: #f4f9ff; border-radius: 8px; padding: 20px; }
            .info-box-title { color: #1e40af; font-weight: 700; font-size: 12px; margin-bottom: 15px; letter-spacing: 0.5px; text-transform: uppercase; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
            .info-row span { color: #111827; font-weight: 600; width: 45%; }
            .info-row strong { color: #374151; font-weight: 400; text-align: right; width: 55%; }
            
            .table-title { color: #1e40af; font-weight: 700; font-size: 12px; margin-bottom: 10px; letter-spacing: 0.5px; text-transform: uppercase; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .data-table th { background-color: #e0efff; padding: 12px 10px; color: #111827; font-weight: 700; text-align: left; }
            .data-table th.text-right { text-align: right; }
            .data-table td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
            .data-table .text-right { text-align: right; }
            .data-table .total-row td { font-weight: 700; border-bottom: none; border-top: 1px solid #d1d5db; background-color: #f9fafb; }
            
            .net-pay-box { background-color: #2563eb; color: #ffffff; border-radius: 8px; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
            .net-pay-left { flex: 1; }
            .net-pay-label { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
            .net-pay-words { font-size: 12px; opacity: 0.9; }
            .net-pay-amount { font-size: 26px; font-weight: 800; }
            
            .footer-note { text-align: center; font-size: 11px; color: #6b7280; font-style: italic; margin-top: 40px; }
            
            .action-btn { position: fixed; top: 20px; right: 20px; z-index: 9999; }
            .btn { background: #1d4ed8; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: background 0.2s; }
            .btn:hover { background: #1e40af; }
            @media print { .action-btn { display: none; } }
        </style>
    </head>
    <body>
        <div class="action-btn" data-html2canvas-ignore="true">
            <button class="btn" onclick="generatePDF()">Download PDF</button>
        </div>
        
        <div id="payslipElement" class="payslip-container">
            <header class="header">
                <img src="../assets/opptylogo.png" class="logo" alt="Logo" onerror="this.style.display='none'">
                <div class="title-wrap">
                    <h1 class="payslip-title">Payslip</h1>
                    <p class="payslip-month">${monthYear}</p>
                </div>
            </header>

            <div class="company-details">
                <h2 class="company-name">Oppty Techhub Private Limited</h2>
                <p class="company-address">108/43, Vijaya Lakshmi Enclave, 1st Floor, H.No 2, PJR Enclave Rd, Gangaram, ICRISAT Colony, Hyderabad, Telangana 500050</p>
            </div>
            <div class="divider"></div>

            <div class="grid-2">
                <div class="info-box">
                    <div class="info-box-title">EMPLOYEE DETAILS</div>
                    <div class="info-row"><span>Name:</span> <strong>${name}</strong></div>
                    <div class="info-row"><span>Employee ID:</span> <strong>${employeeId}</strong></div>
                    <div class="info-row"><span>Designation:</span> <strong>${role}</strong></div>
                    <div class="info-row"><span>Department:</span> <strong>${department}</strong></div>
                    <div class="info-row"><span>PAN:</span> <strong>${pan}</strong></div>
                    <div class="info-row"><span>Account Number:</span> <strong>${bankAccount}</strong></div>
                    <div class="info-row"><span>Bank:</span> <strong>${bankName}</strong></div>
                    <div class="info-row"><span>IFSC Code:</span> <strong>${ifscCode}</strong></div>
                </div>
                
                <div class="info-box">
                    <div class="info-box-title">PAY SUMMARY</div>
                    <div class="info-row"><span>Paid Days:</span> <strong>${paidDays}</strong></div>
                    <div class="info-row"><span>Loss of Pay Days:</span> <strong>${lopDays}</strong></div>
                    <div class="info-row"><span>Pay Date:</span> <strong>${payDate}</strong></div>
                </div>
            </div>

            <div class="grid-2 tables-grid">
                <div>
                    <div class="table-title">EARNINGS</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th class="text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Basic Salary</td><td class="text-right">${formatCurrency(basic)}</td></tr>
                            <tr><td>HRA</td><td class="text-right">${formatCurrency(hra)}</td></tr>
                            <tr><td>Other Allowances</td><td class="text-right">${formatCurrency(otherAllowances)}</td></tr>
                            <tr><td>PF Employer Share</td><td class="text-right">${formatCurrency(pfEmployer)}</td></tr>
                            <tr><td>Incentives</td><td class="text-right">${formatCurrency(incentives)}</td></tr>
                            <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                            <tr class="total-row"><td>Total Earnings</td><td class="text-right">${formatCurrency(grossSalary)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <div class="table-title">DEDUCTIONS</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th class="text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Provident Fund</td><td class="text-right">${formatCurrency(totalPF)}</td></tr>
                            <tr><td>Professional Tax</td><td class="text-right">${formatCurrency(professionalTax)}</td></tr>
                            <tr><td>Loss of Pay</td><td class="text-right">${formatCurrency(lopAmount)}</td></tr>
                            <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                            <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                            <tr class="total-row"><td>Total Deductions</td><td class="text-right">${formatCurrency(totalDeductions)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="net-pay-box">
                <div class="net-pay-left">
                    <div class="net-pay-label">Net Pay:</div>
                    <div class="net-pay-words">Amount in words: ${amountInWords}</div>
                </div>
                <div class="net-pay-amount">₹${formatCurrency(netSalary)}</div>
            </div>

            <div class="footer-note">
                Note: This is a computer-generated payslip and does not require a physical signature.
            </div>
        </div>
        
        <script>
            function generatePDF() {
                const element = document.getElementById('payslipElement');
                const opt = { 
                    margin: 0, 
                    filename: '${name.replace(/\s+/g, '_')}_Payslip_${month}_${parsedYear}.pdf', 
                    image: { type: 'jpeg', quality: 0.98 }, 
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, 
                    jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } 
                };
                html2pdf().set(opt).from(element).save();
            }
        <\/script>
    </body>
    </html>
    `;

    newWindow.document.open();
    newWindow.document.write(payslipHTML);
    newWindow.document.close();
}

// --- 7. INITIALIZATION & EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", function () {
    const monthPicker = document.getElementById("monthPicker");
    const modal = document.getElementById("detailsModal");
    const employeeSearch = document.getElementById("employeeSearch"); 
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const tableBody = document.getElementById("payslipTableBody");

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
            exportTableToCSV(window.currentTableData, "all_employees.csv");
        });
    }

    // ✅ 7. DOWNLOAD TRIGGER - Click Handler for Individual Payslip Download
    if (tableBody) {
        tableBody.addEventListener("click", function(e) {
            const downloadTrigger = e.target.closest(".download-trigger");
            if (!downloadTrigger) return;

            e.preventDefault();

            // Get data from attributes
            const index = downloadTrigger.getAttribute("data-index");
            const employeeId = downloadTrigger.getAttribute("data-employee-id");
            const payslipItem = window.currentTableData[index];

            if (!payslipItem) {
                alert("Payslip data not found.");
                return;
            }

            // Show loading state
            const originalHTML = downloadTrigger.innerHTML;
            downloadTrigger.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
            downloadTrigger.style.pointerEvents = 'none';

            // Fetch employee details
            fetch(`${API_BASE_URL}/api/employees/${employeeId}/`)
                .then(res => {
                    if (!res.ok) throw new Error("Employee fetch failed");
                    return res.json();
                })
                .then(employeeData => {
                    console.log("Employee Data:", employeeData);
                    console.log("Payslip Item:", payslipItem);
                    
                    // Open payslip window with combined data
                    openPayslipWindow(employeeData, payslipItem);
                })
                .catch(err => {
                    console.error("Error fetching employee:", err);
                    
                    // Fallback: Use payslip data even if employee fetch fails
                    console.log("Using fallback with payslip data only");
                    openPayslipWindow({}, payslipItem);
                })
                .finally(() => {
                    // Reset button state
                    downloadTrigger.innerHTML = originalHTML;
                    downloadTrigger.style.pointerEvents = '';
                });
        });
    }

    // 8. Initial Load
    updateDashboard();
    loadPayslipTable();
});