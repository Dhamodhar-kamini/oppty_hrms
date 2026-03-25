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
    // ✅ Payslip Window Function (Fixed Download Button)
    function openPayslipWindow(employee, payslip) {
        
        // --- 1. EXTRACT DATA ---
        const employeeId = employee.employee_id || 'N/A';
        const name = employee.name || 'N/A';
        const department = employee.department || 'N/A';
        const role = employee.role || employee.designation || 'N/A';
        const joining = employee.joining || employee.date_of_joining || employee.doj || 'N/A';
        
        const pan = employee.statutory_details?.[0]?.pan || 'N/A';
        const uan = employee.statutory_details?.[0]?.pf_uan || 'N/A';
        const bankAccount = employee.bank_details?.[0]?.acc_no || 'N/A';
        
        const grossSalary = Number(payslip.gross_salary) || 0;
        const netSalary = Number(payslip.net_salary) || 0;
        const deductions = grossSalary - netSalary;
        
        const month = payslip.month || 'N/A';
        const year = payslip.year || new Date().getFullYear();
        const monthYear = `${month} ${year}`;
        
        const basic = Number(payslip.basic) || Number(payslip.basic_salary) || Math.round(grossSalary * 0.5);
        const hra = Number(payslip.hra) || Number(payslip.house_rent_allowance) || Math.round(grossSalary * 0.25);
        const specialAllowance = Number(payslip.special_allowance) || Math.round(grossSalary * 0.09);
        const lta = Number(payslip.lta) || Number(payslip.leave_travel_allowance) || Math.round(grossSalary * 0.1);
        const pfEmployer = Number(payslip.pf_employer) || Number(payslip.employer_pf) || Math.round(basic * 0.12);
        
        const pfEmployee = Number(payslip.pf_employee) || Number(payslip.employee_pf) || Math.round(basic * 0.12);
        const professionalTax = Number(payslip.professional_tax) || Number(payslip.pt) || 200;

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
            <title>Payslip - ${monthYear}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <style>
                /* RESET */
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; font-family: 'Segoe UI', sans-serif; }
                body { margin: 0; padding: 0; background-color: #555; display: flex; justify-content: center; }
                
                /* A4 CONTAINER (Fixed Size for PDF) */
                .payslip-container {
                    background-color: #ffffff;
                    width: 794px; /* A4 Width in px */
                    min-height: 1123px; /* A4 Height */
                    padding: 40px 50px;
                    margin: 20px auto;
                    box-shadow: 0 0 15px rgba(0,0,0,0.2);
                    position: relative;
                }

                /* HEADER */
                .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
                .logo img { height: 55px; }
                .company-info { text-align: center; flex: 1; margin: 0 20px; }
                .company-info h1 { font-size: 16px; font-weight: 800; color: #2c3e50; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .company-info p { font-size: 10px; color: #7f8c8d; margin: 0; line-height: 1.4; }
                
                .payslip-meta { text-align: right; }
                .payslip-meta h2 { font-size: 16px; color: #333; margin: 0 0 5px 0; font-weight: 700; }
                .payslip-meta span { color: #e67e22; }
                .generated-by { font-size: 10px; color: #95a5a6; }
                .generated-by .orange { color: #e67e22; font-weight: 600; }

                /* SUMMARY CARD */
                .summary-box { 
                    background-color: #fcfcfc; 
                    border: 1px solid #f0f0f0; 
                    border-radius: 8px; 
                    padding: 20px 0; 
                    margin-bottom: 30px; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    gap: 40px;
                }
                .sum-item { text-align: center; }
                .sum-item label { font-size: 10px; color: #95a5a6; text-transform: uppercase; margin-bottom: 5px; display: block; font-weight: 600; }
                .sum-item span { font-size: 20px; font-weight: 700; color: #2c3e50; }
                
                .net-val { color: #2c3e50; }
                .gross-val { color: #27ae60; }
                .deduct-val { color: #c0392b; }
                .operator { font-size: 18px; color: #ddd; }

                /* EMPLOYEE GRID */
                .employee-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px 10px;
                    margin-bottom: 40px;
                    background: #fbfbfb;
                    padding: 20px;
                    border-radius: 6px;
                }
                .info-group label { display: block; font-size: 9px; color: #95a5a6; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
                .info-group span { font-size: 12px; font-weight: 600; color: #2c3e50; }

                /* TABLE SECTION STYLE */
                .section-container { margin-bottom: 30px; position: relative; padding-left: 20px; }
                .section-container::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 2px; }
                
                .green-border::before { background-color: #27ae60; }
                .red-border::before { background-color: #c0392b; }

                .section-title { font-size: 14px; font-weight: 700; color: #2c3e50; margin-bottom: 15px; }
                
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { text-align: left; color: #95a5a6; font-weight: 700; text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid #eee; font-size: 10px; }
                td { padding: 10px 0; color: #34495e; border-bottom: 1px dashed #f0f0f0; }
                td.amount { text-align: right; font-weight: 600; }
                
                .total-row td { 
                    padding-top: 15px; 
                    border-top: 1px solid #eee; 
                    border-bottom: none; 
                    font-size: 14px; 
                    font-weight: 800; 
                    color: #2c3e50; 
                }

                /* FOOTER */
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #f0f0f0; padding-top: 20px; }

                /* DOWNLOAD BUTTON STYLING */
                .action-btn { 
                    position: fixed; 
                    top: 20px; 
                    right: 20px; 
                    z-index: 9999; /* High z-index to ensure it is visible */
                }
                .btn { 
                    background: #e67e22; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-weight: 600; 
                    font-size: 14px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2); 
                    transition: background 0.2s;
                }
                .btn:hover { background: #d35400; }

                /* Manually hide button if user tries Ctrl+P */
                @media print {
                    .action-btn { display: none; }
                }
            </style>
        </head>
        <body>

            <!-- The Download Button -->
            <div class="action-btn" data-html2canvas-ignore="true">
                <button class="btn" onclick="generatePDF()">Download PDF</button>
            </div>

            <!-- PDF CONTENT -->
            <div id="payslipElement" class="payslip-container">
                
                <header class="main-header">
                    <div class="logo">
                        <img src="../assets/opptylogo.png" alt="Logo" onerror="this.style.display='none'">
                    </div>
                    <div class="company-info">
                        <h1>Oppty Techhub Private Limited</h1>
                        <p>108/43, Vijaya Lakshmi Enclave, 1st Floor, H.No 2, PJR Enclave,<br>Rd, Gangaram, ICRISAT Colony,Hyderabad, Telangana 500050</p>
                    </div>
                    <div class="payslip-meta">
                        <h2>${month} <span>${year}</span></h2>
                        <div class="generated-by">Generated by OPPTY<span class="orange">HRMS</span></div>
                    </div>
                </header>

                <div class="summary-box">
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

                <div class="employee-grid">
                    <div class="info-group"><label>Employee Code</label><span>${employeeId}</span></div>
                    <div class="info-group"><label>Name</label><span>${name}</span></div>
                    <div class="info-group"><label>Department</label><span>${department}</span></div>
                    <div class="info-group"><label>Designation</label><span>${role}</span></div>
                    <div class="info-group"><label>Date of Joining</label><span>${joining}</span></div>
                    <div class="info-group"><label>PAN</label><span>${pan}</span></div>
                    <div class="info-group"><label>UAN</label><span>${uan}</span></div>
                    <div class="info-group"><label>Bank Account</label><span>${bankAccount}</span></div>
                </div>

                <div class="section-container green-border">
                    <div class="section-title">Gross Pay (A)</div>
                    <table>
                        <thead><tr><th>Earnings</th><th style="text-align:right">Monthly</th></tr></thead>
                        <tbody>
                            <tr><td>Basic</td><td class="amount">₹${formatCurrency(basic)}</td></tr>
                            <tr><td>House Rent Allowance</td><td class="amount">₹${formatCurrency(hra)}</td></tr>
                            <tr><td>Special Allowance</td><td class="amount">₹${formatCurrency(specialAllowance)}</td></tr>
                            <tr><td>Leave & Travel Allowance</td><td class="amount">₹${formatCurrency(lta)}</td></tr>
                            <tr><td>PF Employer Contribution</td><td class="amount">₹${formatCurrency(pfEmployer)}</td></tr>
                            <tr class="total-row"><td>Total Gross Pay</td><td class="amount">₹${formatCurrency(grossSalary)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="section-container red-border">
                    <div class="section-title">Deductions (B)</div>
                    <table>
                        <thead><tr><th>Deductions</th><th style="text-align:right">Monthly</th></tr></thead>
                        <tbody>
                            <tr><td>PF Employee Contribution</td><td class="amount">₹${formatCurrency(pfEmployee)}</td></tr>
                            <tr><td>PF Employer Contribution</td><td class="amount">₹${formatCurrency(pfEmployer)}</td></tr>
                            <tr><td>Professional Tax</td><td class="amount">₹${formatCurrency(professionalTax)}</td></tr>
                            <tr class="total-row"><td>Total Deductions</td><td class="amount">₹${formatCurrency(deductions)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    This is a system-generated payslip for ${month} ${year}. No signature is required.
                </div>

            </div>

            <script>
                function generatePDF() {
                    const element = document.getElementById('payslipElement');
                    
                    const opt = {
                        margin: 0, 
                        filename: 'Payslip_${month}_${year}.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { 
                            scale: 2, 
                            useCORS: true, 
                            scrollY: 0 
                        },
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