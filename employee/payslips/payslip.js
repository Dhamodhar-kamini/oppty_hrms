document.addEventListener("DOMContentLoaded", () => {

    const empId = localStorage.getItem('employee_id');
    console.log("Employee ID:", empId);

    const payslipTableBody = document.getElementById("payslipTableBody");

    if (!payslipTableBody) {
        console.error("Payslip table body not found!");
        return;
    }

    if (!empId) {
        payslipTableBody.innerHTML = `<tr><td colspan="4">Employee ID not found. Please login.</td></tr>`;
        return;
    }

    // ✅ Store data globally
    let payslipsData = [];
    let employeeData = null;

    // ✅ Fetch employee info and store it
    fetch(`https://api.theoppty.com/api/employee/dashboard/${empId}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Employee Data:", data);
            employeeData = data;
            document.getElementById("name").innerText = data.name || "-";
            document.getElementById("role").innerText = data.role || "-";
        })
        .catch(err => console.error("Error fetching employee:", err));


    // ✅ Fetch payslips
    fetch(`https://api.theoppty.com/api/employee-payslips/${empId}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Payslips Data:", data);
            
            payslipsData = data;
            payslipTableBody.innerHTML = "";

            if (!data || data.length === 0) {
                payslipTableBody.innerHTML = `<tr><td colspan="4">No payslips found</td></tr>`;
                return;
            }

            data.forEach((p, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>
                        <a href="#" class="month-link" data-index="${index}">
                            ${p.month} ${p.year || ''}
                        </a>
                    </td>
                    <td>${p.designation || "Associate Software Engineer"}</td>
                    <td>₹${Number(p.gross_salary).toLocaleString('en-IN')}</td>
                    <td>₹${Number(p.net_salary).toLocaleString('en-IN')}</td>
                `;
                payslipTableBody.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Error fetching payslips:", err);
            payslipTableBody.innerHTML = `<tr><td colspan="4">Error loading payslips</td></tr>`;
        });


    // ✅ Click handler
    payslipTableBody.addEventListener("click", function(e) {
        if (e.target.classList.contains("month-link")) {
            e.preventDefault();

            const index = e.target.dataset.index;
            const selectedPayslip = payslipsData[index];

            if (!employeeData) {
                alert("Employee data is still loading. Please try again.");
                return;
            }

            openPayslipWindow(employeeData, selectedPayslip);
        }
    });


    // ✅ Payslip Window Function
    function openPayslipWindow(employee, payslip) {
        console.log("Opening Payslip Window");
        console.log("Employee:", employee);
        console.log("Payslip:", payslip);
        
        // ✅ Employee Information
        const employeeId = employee.id || employee.employee_id || 'N/A';
        const name = employee.name || 'N/A';
        const department = employee.department || 'N/A';
        const role = employee.role || employee.designation || 'N/A';
        const joining = employee.joining || employee.date_of_joining || employee.doj || 'N/A';
        
        const pan = employee.statutory_details?.[0]?.pan || 'N/A';
        const uan = employee.statutory_details?.[0]?.pf_uan || 'N/A';
        const bankAccount = employee.bank_details?.[0]?.acc_no || 'N/A';
        
        // ✅ Salary info
        const grossSalary = Number(payslip.gross_salary) || 0;
        const netSalary = Number(payslip.net_salary) || 0;
        const deductions = grossSalary - netSalary;
        
        // ✅ Month and Year
        const month = payslip.month || 'N/A';
        const year = payslip.year || new Date().getFullYear(); // Use payslip year or current year
        const monthYear = `${month} ${year}`;
        
        // ✅ Earnings breakdown
        const basic = Number(payslip.basic) || Number(payslip.basic_salary) || Math.round(grossSalary * 0.5);
        const hra = Number(payslip.hra) || Number(payslip.house_rent_allowance) || Math.round(grossSalary * 0.25);
        const specialAllowance = Number(payslip.special_allowance) || Math.round(grossSalary * 0.09);
        const lta = Number(payslip.lta) || Number(payslip.leave_travel_allowance) || Math.round(grossSalary * 0.1);
        const pfEmployer = Number(payslip.pf_employer) || Number(payslip.employer_pf) || Math.round(basic * 0.12);
        
        // ✅ Deductions breakdown
        const pfEmployee = Number(payslip.pf_employee) || Number(payslip.employee_pf) || Math.round(basic * 0.12);
        const professionalTax = Number(payslip.professional_tax) || Number(payslip.pt) || 200;

        // ✅ Format currency helper
        const formatCurrency = (num) => {
            return Number(num).toLocaleString('en-IN');
        };

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
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payslip - ${monthYear}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <style>
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                body {
                    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #eef2f5;
                    margin: 0;
                    padding: 40px 0;
                    color: #1a1a1a;
                    display: flex;
                    justify-content: center;
                }
                
                .payslip-container {
                    background-color: #ffffff;
                    width: 850px;
                    padding: 40px 50px;
                    box-shadow: 0 5px 25px rgba(0,0,0,0.05);
                    border-radius: 8px;
                }
                
                /* ========== MAIN HEADER - 3 COLUMN LAYOUT ========== */
                .main-header {
                    display: grid;
                    grid-template-columns: 1fr 2fr 1fr;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                /* LEFT - Logo */
                .header-left {
                    display: flex;
                    align-items: center;
                }
                
                .header-left img {
                    height: 60px;
                    width: auto;
                }
                
                .header-left .logo-text {
                    display: flex;
                    flex-direction: column;
                    margin-left: 10px;
                }
                
                .header-left .brand-name {
                    font-size: 22px;
                    font-weight: 700;
                    color: #2f3542;
                }
                
                .header-left .brand-name .orange {
                    color: #e67e22;
                }
                
                /* CENTER - Company Address */
                .header-center {
                    text-align: center;
                }
                
                .header-center h1 {
                    color: #2f3542;
                    font-size: 16px;
                    margin: 0 0 8px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .header-center p {
                    color: #747d8c;
                    font-size: 11px;
                    margin: 0;
                    line-height: 1.5;
                }
                
                /* RIGHT - Payslip Generated By */
                .header-right {
                    text-align: right;
                }
                
                .header-right .payslip-month {
                    font-size: 16px;
                    font-weight: 700;
                    color: #2f3542;
                    margin-bottom: 8px;
                }
                
                .header-right .payslip-month .month-text {
                    color: #667eea;
                }
                
                .header-right .payslip-month .year-text {
                    color: #e67e22;
                    margin-left: 5px;
                }
                
                .header-right .generated-by {
                    font-size: 11px;
                    color: #747d8c;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 5px;
                }
                
                .header-right .generated-by img {
                    height: 18px;
                    width: auto;
                }
                
                .header-right .generated-by .brand {
                    font-weight: 600;
                    color: #2f3542;
                }
                
                .header-right .generated-by .brand .orange {
                    color: #e67e22;
                }
                
                /* ========== PAYSLIP TITLE BAR ========== */
                .payslip-title-bar {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 8px;
                    padding: 15px 25px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .payslip-title-bar h2 {
                    color: white;
                    font-size: 18px;
                    margin: 0;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                
                .payslip-title-bar .month-year-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 8px 20px;
                    border-radius: 20px;
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .payslip-title-bar .month-year-badge .calendar-icon {
                    font-size: 16px;
                }
                
                /* Summary Badge */
                .summary-badge {
                    display: flex;
                    align-items: center;
                    background-color: #fafafa;
                    border-radius: 6px;
                    padding: 15px 25px;
                    margin-bottom: 30px;
                    justify-content: center;
                    gap: 30px;
                }
                
                .sum-item {
                    display: flex;
                    flex-direction: column;
                }
                
                .sum-item label {
                    font-size: 11px;
                    color: #747d8c;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                
                .sum-item span {
                    font-size: 18px;
                    font-weight: 700;
                }
                
                .operator {
                    font-size: 20px;
                    color: #ccc;
                    margin-top: 10px;
                }
                
                .net-val { color: #1a1a1a; }
                .gross-val { color: #27ae60; border-left: 3px solid #27ae60; padding-left: 10px; }
                .deduct-val { color: #c0392b; border-left: 3px solid #c0392b; padding-left: 10px; }
                
                /* Employee Info Grid */
                .employee-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    row-gap: 20px;
                    column-gap: 15px;
                    margin-bottom: 40px;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                }
                
                .info-group label {
                    display: block;
                    font-size: 10px;
                    color: #95a5a6;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }
                
                .info-group span {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                /* Timeline Sections */
                .timeline-section {
                    margin-bottom: 30px;
                    position: relative;
                    padding-left: 25px;
                }
                
                .timeline-section::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    border-radius: 3px;
                }
                
                .section-earnings::before { background-color: #2ecc71; }
                .section-deductions::before { background-color: #e74c3c; }
                .section-tax::before { background-color: #3498db; }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #2c3e50;
                    display: flex;
                    align-items: center;
                }
                
                .section-note {
                    font-size: 11px;
                    color: #95a5a6;
                    margin-left: 10px;
                    font-weight: normal;
                }
                
                /* Finance Tables */
                .finance-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                
                .finance-table th {
                    text-align: left;
                    color: #95a5a6;
                    font-weight: 600;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    font-size: 11px;
                    text-transform: uppercase;
                }
                
                .finance-table td {
                    padding: 8px 0;
                    color: #34495e;
                    border-bottom: 1px dashed #f1f1f1;
                }
                
                .finance-table td.amount {
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                }
                
                .finance-table tr:last-child td {
                    border-bottom: none;
                }
                
                .row-total td {
                    font-weight: 700;
                    color: #1a1a1a;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                    border-bottom: none;
                    font-size: 14px;
                }
                
                /* Tax Projection */
                .tax-projection {
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    padding: 20px;
                    margin-top: 10px;
                }
                
                .tax-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                }
                
                .tax-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                
                /* Footer */
                .footer-note {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 11px;
                    color: #bdc3c7;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                
                .footer-logo {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                }
                
                .footer-logo img {
                    height: 25px;
                    width: auto;
                    opacity: 0.6;
                }
                
                .footer-logo .brand {
                    font-size: 14px;
                    font-weight: 600;
                    color: #95a5a6;
                }
                
                .footer-logo .brand .orange {
                    color: #e67e22;
                }
                
                /* Print Buttons */
                .action-buttons {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    display: flex;
                    gap: 10px;
                }
                
                .print-btn, .download-btn {
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    transition: background 0.3s;
                }
                
                .download-btn {
                    background: #27ae60;
                }
                
                .print-btn:hover {
                    background: #2980b9;
                }
                
                .download-btn:hover {
                    background: #219a52;
                }
                
                @media print {
                    .action-buttons { display: none; }
                    body { 
                        padding: 0; 
                        background: white; 
                    }
                    .payslip-container { 
                        box-shadow: none;
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
        
    <div class="action-buttons">
        <button style="background-color:orange;color:white" class="download-btn" id="downloadBtn" onclick="downloadPDF()">
        Download PDF
        </button>
    </div>
            
            <div class="payslip-container">
                
                <!-- ========== MAIN HEADER - 3 COLUMNS ========== -->
                <header class="main-header">
                    
                    <!-- LEFT - OPPTY Logo -->
                    <div class="header-left">
                        <img src="../assets/opptylogo.png" alt="OPPTY Logo" onerror="this.style.display='none'">
                        
                    </div>
                    
                    <!-- CENTER - Company Address -->
                    <div class="header-center">
                        <h1>Oppty Techhub Private Limited</h1>
                        <p>3rd Floor, Plot No-474, SSNA Park, Shanti Sree,<br>Ameenpur, Medak - 502032, Telangana</p>
                    </div>
                    
                    <!-- RIGHT - Month, Year & Generated By -->
                    <div class="header-right">
                        <div class="payslip-month">
                            <span class="month-text" style="color:black">${month}</span>
                            <span class="year-text">${year}</span>
                            Payslip
                        </div>
                        <div class="generated-by">
                            Generated by
                            <img src="../assets/opptylogo.png" alt="Logo" onerror="this.style.display='none'">
                            <span class="orange" style="margin-left:-10px;">HRMS</span>
                        </div>
                    </div>
                    
                </header>
                
                

                <!-- Top Summary Bar -->
                <div class="summary-badge">
                    <div class="sum-item">
                        <label>Net Pay</label>
                        <span class="net-val">₹${formatCurrency(netSalary)}</span>
                    </div>
                    <div class="operator">=</div>
                    <div class="sum-item">
                        <label>Gross Pay (A)</label>
                        <span class="gross-val">₹${formatCurrency(grossSalary)}</span>
                    </div>
                    <div class="operator">-</div>
                    <div class="sum-item">
                        <label>Deductions (B)</label>
                        <span class="deduct-val">₹${formatCurrency(deductions)}</span>
                    </div>
                </div>

                <!-- Employee Info Grid -->
                <div class="employee-info-grid">
                    <div class="info-group">
                        <label>Employee Code</label>
                        <span>EMP-${employeeId}</span>
                    </div>
                    <div class="info-group">
                        <label>Name</label>
                        <span>${name}</span>
                    </div>
                    <div class="info-group">
                        <label>Department</label>
                        <span>${department}</span>
                    </div>
                    <div class="info-group">
                        <label>Designation</label>
                        <span>${role}</span>
                    </div>
                    <div class="info-group">
                        <label>Date of Joining</label>
                        <span>${joining}</span>
                    </div>
                    <div class="info-group">
                        <label>PAN</label>
                        <span>${pan}</span>
                    </div>
                    <div class="info-group">
                        <label>UAN</label>
                        <span>${uan}</span>
                    </div>
                    <div class="info-group">
                        <label>Bank Account</label>
                        <span>${bankAccount}</span>
                    </div>
                </div>

                <!-- Section 1: Earnings -->
                <div class="timeline-section section-earnings">
                    <div class="section-header">
                        <div class="section-title">Gross Pay (A) <span class="section-note">Total money earned before deductions</span></div>
                    </div>
                    <table class="finance-table">
                        <thead>
                            <tr>
                                <th>Earnings</th>
                                <th style="text-align:right">Monthly</th>
                                <th style="text-align:right">YTD Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Basic</td>
                                <td class="amount">₹${formatCurrency(basic)}</td>
                                <td class="amount">₹${formatCurrency(basic)}</td>
                            </tr>
                            <tr>
                                <td>House Rent Allowance</td>
                                <td class="amount">₹${formatCurrency(hra)}</td>
                                <td class="amount">₹${formatCurrency(hra)}</td>
                            </tr>
                            <tr>
                                <td>Special Allowance</td>
                                <td class="amount">₹${formatCurrency(specialAllowance)}</td>
                                <td class="amount">₹${formatCurrency(specialAllowance)}</td>
                            </tr>
                            <tr>
                                <td>Leave & Travel Allowance</td>
                                <td class="amount">₹${formatCurrency(lta)}</td>
                                <td class="amount">₹${formatCurrency(lta)}</td>
                            </tr>
                            <tr>
                                <td>PF Employer Contribution</td>
                                <td class="amount">₹${formatCurrency(pfEmployer)}</td>
                                <td class="amount">₹${formatCurrency(pfEmployer)}</td>
                            </tr>
                            <tr class="row-total">
                                <td>Total Gross Pay</td>
                                <td class="amount">₹${formatCurrency(grossSalary)}</td>
                                <td class="amount">₹${formatCurrency(grossSalary)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Section 2: Deductions -->
                <div class="timeline-section section-deductions">
                    <div class="section-header">
                        <div class="section-title">Deductions (B) <span class="section-note">Amount deducted for taxes & benefits</span></div>
                    </div>
                    <table class="finance-table">
                        <thead>
                            <tr>
                                <th>Deductions</th>
                                <th style="text-align:right">Monthly</th>
                                <th style="text-align:right">YTD Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>PF Employee Contribution</td>
                                <td class="amount">₹${formatCurrency(pfEmployee)}</td>
                                <td class="amount">₹${formatCurrency(pfEmployee)}</td>
                            </tr>
                            <tr>
                                <td>PF Employer Contribution</td>
                                <td class="amount">₹${formatCurrency(pfEmployer)}</td>
                                <td class="amount">₹${formatCurrency(pfEmployer)}</td>
                            </tr>
                            <tr>
                                <td>Professional Tax</td>
                                <td class="amount">₹${formatCurrency(professionalTax)}</td>
                                <td class="amount">₹${formatCurrency(professionalTax)}</td>
                            </tr>
                            <tr class="row-total">
                                <td>Total Deductions</td>
                                <td class="amount">₹${formatCurrency(deductions)}</td>
                                <td class="amount">₹${formatCurrency(deductions)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Section 3: Tax Summary -->
                <div class="timeline-section section-tax">
                    <div class="section-header">
                        <div class="section-title">Taxable Income Summary (Regime: New)</div>
                    </div>
                    
                    <div class="tax-projection">
                        <div class="tax-grid">
                            <div class="left">
                                <div class="tax-row">
                                    <span>Annual Gross Salary Projection</span>
                                    <strong>₹${formatCurrency(grossSalary * 12)}</strong>
                                </div>
                                <div class="tax-row">
                                    <span>Standard Deductions (Sec 16)</span>
                                    <strong>-₹75,000</strong>
                                </div>
                            </div>
                            <div class="right">
                                <div class="tax-row">
                                    <span>Net Taxable Income</span>
                                    <strong>₹${formatCurrency((grossSalary * 12) - 75000)}</strong>
                                </div>
                                <div class="tax-row">
                                    <span>Tax Deducted This Month</span>
                                    <strong>₹0</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer-note">
                    <div class="footer-logo">
                        <img src="../assets/opptylogo.png" alt="Logo" onerror="this.style.display='none'">
                        <span class="brand">OPPTY<span class="orange">HRMS</span></span>
                    </div>
                    <p>This is a system-generated payslip for ${month} ${year}. No signature is required.</p>
                </div>

            </div>
             <script>
        
        
        function downloadPDF() {
    const element = document.querySelector('.payslip-container');

    if (!element) {
        alert("Payslip not found!");
        return;
    }

    const opt = {
        margin: 0.5,
        filename: 'payslip.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
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