document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get('empId') || localStorage.getItem('employee_id');
    console.log("Employee ID:", empId);

    const payslipTableBody = document.getElementById("payslipTableBody");
    const yearSelect = document.getElementById("yearSelect");

    if (!payslipTableBody) {
        console.error("Payslip table body not found!");
        return;
    }

    if (!empId) {
        payslipTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Employee ID not found. Please login.</td></tr>`;
        return;
    }

    // ✅ Store data globally
    let allPayslipsData = [];
    let employeeData = null;

    // ✅ 1. Fetch Employee Info
    fetch(`https://api.theoppty.com/api/employee/dashboard/${empId}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Employee Data:", data);
            employeeData = data;
            const nameEl = document.getElementById("name");
            const roleEl = document.getElementById("role");
            if(nameEl) nameEl.innerText = data.name || "-";
            if(roleEl) roleEl.innerText = data.role || "-";
        })
        .catch(err => console.error("Error fetching employee:", err));


    // ✅ 2. Fetch Payslips & Initialize
    fetch(`https://api.theoppty.com/api/employee-payslips/${empId}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Payslips Data:", data);
            
            if (!data || data.length === 0) {
                payslipTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No payslips found</td></tr>`;
                return;
            }

            // Store raw data
            allPayslipsData = data;

            // Dynamically populate the Year Dropdown based on data
            populateYearDropdown(data);

            // Trigger initial render based on the current selection (defaulting to current FY)
            if(yearSelect) {
                renderPayslips(yearSelect.value);
            } else {
                renderRows(allPayslipsData);
            }
        })
        .catch(err => {
            console.error("Error fetching payslips:", err);
            payslipTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Error loading payslips</td></tr>`;
        });


    // ✅ 3. DYNAMIC DROPDOWN POPULATION
    function populateYearDropdown(data) {
        if (!yearSelect) return;

        const financialYears = new Set();
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12

        let currentFY = (currentMonth >= 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

        data.forEach(p => {
            let pYear = p.year;
            let pMonth = p.month.trim().toLowerCase();

            if (!pYear && /\d{4}/.test(pMonth)) {
                pYear = pMonth.match(/\d{4}/)[0];
                pMonth = pMonth.replace(/\d{4}/, '').trim(); 
            }
            if(!pYear) pYear = currentYear;
            pYear = parseInt(pYear);

            const months = { "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12 };
            const cleanMonth = pMonth.slice(0, 3).toLowerCase();
            const mIndex = months[cleanMonth];

            if (mIndex) {
                let fy = (mIndex >= 4) ? `${pYear}-${pYear + 1}` : `${pYear - 1}-${pYear}`;
                financialYears.add(fy);
            }
        });

        financialYears.add(currentFY);
        financialYears.add(`${currentYear - 1}-${currentYear}`);

        const sortedYears = Array.from(financialYears).sort().reverse();
        
        yearSelect.innerHTML = "";
        sortedYears.forEach(fy => {
            const option = document.createElement("option");
            option.value = fy;
            option.textContent = fy;
            if (fy === currentFY) option.selected = true; 
            yearSelect.appendChild(option);
        });
    }

    // ✅ 4. FILTER LOGIC
    function renderPayslips(selectedFinancialYear) {
        payslipTableBody.innerHTML = "";

        const [startYear, endYear] = selectedFinancialYear.split('-').map(Number);

        const filteredData = allPayslipsData.filter(p => {
            let pYear = p.year;
            let pMonth = p.month.trim().toLowerCase();

            if (!pYear && /\d{4}/.test(pMonth)) {
                pYear = pMonth.match(/\d{4}/)[0];
                pMonth = pMonth.replace(/\d{4}/, '').trim(); 
            }
            if(!pYear) pYear = new Date().getFullYear(); 
            pYear = parseInt(pYear);

            const months = { "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12 };
            const cleanMonth = pMonth.slice(0, 3).toLowerCase();
            const monthIndex = months[cleanMonth];

            if (!monthIndex) return false;

            if (monthIndex >= 4 && monthIndex <= 12) {
                return pYear === startYear;
            } else if (monthIndex >= 1 && monthIndex <= 3) {
                return pYear === endYear;
            }
            return false;
        });

        if (filteredData.length === 0) {
            payslipTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999; padding: 20px;">No payslips found for ${selectedFinancialYear}</td></tr>`;
            return;
        }

        renderRows(filteredData);
    }

    // Helper to render rows
    function renderRows(data) {
        data.forEach((p) => {
            const originalIndex = allPayslipsData.indexOf(p); 
            let displayYear = p.year || '';
            if(!displayYear && /\d{4}/.test(p.month)) {
                displayYear = p.month.match(/\d{4}/)[0];
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <a href="#" class="month-link" data-index="${originalIndex}" style="color:#FF5B1E; font-weight:600; text-decoration:none;">
                        ${p.month} ${(!p.month.includes(displayYear)) ? displayYear : ''}
                    </a>
                </td>
                <td>${p.designation || "Associate Software Engineer"}</td>
                <td>₹${Number(p.gross_salary).toLocaleString('en-IN')}</td>
                <td>₹${Number(p.net_salary).toLocaleString('en-IN')}</td>
            `;
            payslipTableBody.appendChild(row);
        });
    }

    // ✅ 5. Dropdown Listener
    if(yearSelect) {
        yearSelect.addEventListener("change", function() {
            renderPayslips(this.value);
        });
    }

    // ✅ 6. Click Handler
    payslipTableBody.addEventListener("click", function(e) {
        if (e.target.classList.contains("month-link") || e.target.closest('.month-link')) {
            e.preventDefault();
            const linkElement = e.target.classList.contains("month-link") ? e.target : e.target.closest('.month-link');
            const index = linkElement.dataset.index;
            const selectedPayslip = allPayslipsData[index]; 

            if (!employeeData) {
                alert("Employee data is still loading. Please try again.");
                return;
            }
            openPayslipWindow(employeeData, selectedPayslip);
        }
    });

    // Helper Function to Convert Numbers to Words
    function numberToWords(amount) {
        const words = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
        words[30] = 'Thirty'; words[40] = 'Forty'; words[50] = 'Fifty'; words[60] = 'Sixty'; words[70] = 'Seventy'; words[80] = 'Eighty'; words[90] = 'Ninety';
        
        if(amount === 0) return "Zero INR only";
        
        let numStr = Math.floor(amount).toString();
        let n_length = numStr.length;
        let words_string = "";

        if (n_length <= 9) {
            let n_array = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            let received_n_array = new Array();
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

    // ✅ 7. PAYSLIP WINDOW (Updated Design + Accurate Date Math)
    function openPayslipWindow(employee, payslip) {
        
        const employeeId = employee.employee_id || 'N/A';
        const name = employee.name || 'N/A';
        const department = employee.department || 'CEO Office';
        const role = employee.role || employee.designation || 'N/A';
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
        
        // ==========================================
        // ✅ NEW DATE MATH: 26th to 25th Cycle calculation
        // ==========================================
        const monthNamesMap = { "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12 };
        let mIndex = monthNamesMap[month.toLowerCase()] || new Date().getMonth() + 1;
        
        // JS Months are 0-11. mIndex is 1-12. 
        // Start date: 26th of the PREVIOUS month (mIndex - 2)
        let cycleStartDate = new Date(parsedYear, mIndex - 2, 26); 
        // End date: 25th of the CURRENT month (mIndex - 1)
        let cycleEndDate = new Date(parsedYear, mIndex - 1, 25);
        
        // Calculate difference in days (+1 to include both start and end days)
        let timeDiff = cycleEndDate.getTime() - cycleStartDate.getTime();
        let daysInCycle = Math.round(timeDiff / (1000 * 3600 * 24)) + 1; 

        let lopDays = Number(payslip.lop_days) || 0;
        let paidDays = daysInCycle - lopDays;
        
        // Formatted Pay Date range (e.g., Feb 26 - Mar 25)
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let startMonthStr = shortMonths[cycleStartDate.getMonth()];
        let endMonthStr = shortMonths[cycleEndDate.getMonth()];
        let payDate = `${startMonthStr} 26 - ${endMonthStr} 25`;
        // ==========================================

        // Salary Breakdown
        const basic = Math.round(grossSalary / 2);
        const hra = Number(payslip.hra) || Number(payslip.house_rent_allowance) || Math.round(basic * 0.5);
        const pfEmployer = Number(payslip.pf_amount) ? Number(payslip.pf_amount) / 2 : 0;
        const incentives = Number(payslip.incentives) || 0;
        
        // Sum of Special + LTA into "Other Allowances"
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
        if (!newWindow) { alert("Popup blocked!"); return; }

        const payslipHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Payslip - ${monthYear}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <style>
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                body { margin: 0; padding: 0; background-color: #555; display: flex; justify-content: center; }
                .payslip-container { background-color: #ffffff; width: 794px; min-height: 1123px; padding: 40px; margin: 20px auto; box-shadow: 0 0 15px rgba(0,0,0,0.2); position: relative; }
                
                /* Header */
                .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .logo { max-height: 50px; }
                .title-wrap { text-align: right; }
                .payslip-title { color: #1d4ed8; font-size: 22px; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px; }
                .payslip-month { color: #6b7280; font-size: 14px; margin: 0; font-weight: 500; }
                
                /* Company Info */
                .company-details { margin-bottom: 15px; }
                .company-name { color: #1d4ed8; font-size: 20px; font-weight: 700; margin: 0 0 5px 0; }
                .company-address { color: #6b7280; font-size: 12px; margin: 0; }
                .divider { border-bottom: 2px solid #1d4ed8; margin-bottom: 30px; }
                
                /* Grid Layouts */
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                
                /* Info Boxes */
                .info-box { background-color: #f4f9ff; border-radius: 8px; padding: 20px; }
                .info-box-title { color: #1e40af; font-weight: 700; font-size: 12px; margin-bottom: 15px; letter-spacing: 0.5px; text-transform: uppercase; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
                .info-row span { color: #111827; font-weight: 600; width: 45%; }
                .info-row strong { color: #374151; font-weight: 400; text-align: right; width: 55%; }
                
                /* Tables */
                .table-title { color: #1e40af; font-weight: 700; font-size: 12px; margin-bottom: 10px; letter-spacing: 0.5px; text-transform: uppercase; }
                .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .data-table th { background-color: #e0efff; padding: 12px 10px; color: #111827; font-weight: 700; text-align: left; }
                .data-table th.text-right { text-align: right; }
                .data-table td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
                .data-table .text-right { text-align: right; }
                .data-table .total-row td { font-weight: 700; border-bottom: none; border-top: 1px solid #d1d5db; background-color: #f9fafb; }
                
                /* Net Pay Banner */
                .net-pay-box { background-color: #2563eb; color: #ffffff; border-radius: 8px; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
                .net-pay-left { flex: 1; }
                .net-pay-label { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
                .net-pay-words { font-size: 12px; opacity: 0.9; }
                .net-pay-amount { font-size: 26px; font-weight: 800; }
                
                /* Footer */
                .footer-note { text-align: center; font-size: 11px; color: #6b7280; font-style: italic; margin-top: 40px; }
                
                /* Button */
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
                <!-- Header -->
                <header class="header">
                    <img src="../assets/opptylogo.png" class="logo" alt="Logo" onerror="this.style.display='none'">
                    <div class="title-wrap">
                        <h1 class="payslip-title">Payslip</h1>
                        <p class="payslip-month">${monthYear}</p>
                    </div>
                </header>

                <!-- Company Details -->
                <div class="company-details">
                    <h2 class="company-name">Oppty Techhub Private Limited</h2>
                    <p class="company-address">108/43, Vijaya Lakshmi Enclave, 1st Floor, H.No 2, PJR Enclave Rd, Gangaram, ICRISAT Colony, Hyderabad, Telangana 500050</p>
                </div>
                <div class="divider"></div>

                <!-- Info Grids -->
                <div class="grid-2">
                    <!-- Employee Details -->
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
                    
                    <!-- Pay Summary -->
                    <div class="info-box">
                        <div class="info-box-title">PAY SUMMARY</div>
                        <div class="info-row"><span>Paid Days:</span> <strong>${paidDays}</strong></div>
                        <div class="info-row"><span>Loss of Pay Days:</span> <strong>${lopDays}</strong></div>
                        <div class="info-row"><span>Pay Date:</span> <strong>${payDate}</strong></div>
                    </div>
                </div>

                <!-- Tables Grid -->
                <div class="grid-2 tables-grid">
                    <!-- Earnings -->
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
                                
                                <!-- Empty spacers to push total row to bottom -->
                                <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                                
                                <tr class="total-row"><td>Total Earnings</td><td class="text-right">${formatCurrency(grossSalary)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Deductions -->
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
                                
                                <!-- Empty spacers to match height with Earnings -->
                                <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                                <tr><td style="border:none; padding:10px;">&nbsp;</td><td style="border:none;"></td></tr>
                                
                                <tr class="total-row"><td>Total Deductions</td><td class="text-right">${formatCurrency(totalDeductions)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Net Pay Box -->
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
                        filename: '${name.replace(/\s+/g, '_')}_Payslip_${month}_${year}.pdf', 
                        image: { type: 'jpeg', quality: 0.98 }, 
                        html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, 
                        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } 
                    };
                    html2pdf().set(opt).from(element).save();
                }
            </script>
        </body>
        </html>
        `;

        newWindow.document.open();
        newWindow.document.write(payslipHTML);
        newWindow.document.close();
    }
});