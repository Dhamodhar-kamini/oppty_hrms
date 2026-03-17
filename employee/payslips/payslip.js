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

    // ✅ Store full payslip data
    let payslipsData = [];

    // ✅ Fetch employee info
    fetch(`https://theoppty.com/api/employee/dashboard/${empId}/`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("name").innerText = data.name || "-";
            document.getElementById("role").innerText = data.role || "-";
        })
        .catch(err => console.error("Error fetching employee:", err));


    // ✅ Fetch payslips
    fetch(`https://theoppty.com/api/employee-payslips/${empId}/`)
        .then(res => res.json())
        .then(data => {

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
                            ${p.month}
                        </a>
                    </td>
                    <td>${p.designation || "Associate Software Engineer"}</td>
                    <td>₹${p.gross_salary}</td>
                    <td>₹${p.net_salary}</td>
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

            openPayslipWindow(selectedPayslip);
        }
    });


    // ✅ Payslip Window Function
    function openPayslipWindow(p) {

        const newWindow = window.open('', '_blank');

        const payslipHTML = `
        <!DOCTYPE html>
       <html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payslip - November 2025</title>
    <style>
        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact; /* Ensures colors print correctly */
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

        /* Main Paper Container */
        .payslip-container {
            background-color: #ffffff;
            width: 850px; /* Standard A4 width approx */
            padding: 40px 50px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.05);
            border-radius: 8px;
        }

        /* 1. Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 20px;
        }

        .company-branding h1 {
            color: #2f3542;
            font-size: 20px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .company-branding p {
            color: #747d8c;
            font-size: 11px;
            margin: 0;
            max-width: 350px;
            line-height: 1.4;
        }

        .payslip-meta {
            text-align: right;
        }

        .payslip-meta h2 {
            font-size: 16px;
            margin: 0;
            color: #2f3542;
        }

        .payslip-meta span {
            font-size: 12px;
            color: #747d8c;
        }

        /* 2. Top Summary Badge (Net = Gross - Ded) */
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

        /* Color accents for summary */
        .net-val { color: #1a1a1a; }
        .gross-val { color: #27ae60; border-left: 3px solid #27ae60; padding-left: 10px; }
        .deduct-val { color: #c0392b; border-left: 3px solid #c0392b; padding-left: 10px; }


        /* 3. Employee Details Grid */
        .employee-info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            row-gap: 20px;
            column-gap: 15px;
            margin-bottom: 40px;
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

        /* 4. Timeline Sections (The Vertical Line Design) */
        .timeline-section {
            margin-bottom: 30px;
            position: relative;
            padding-left: 25px; /* Space for the colored line */
        }

        /* The vertical line logic */
        .timeline-section::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            border-radius: 3px;
        }

        .section-earnings::before { background-color: #2ecc71; } /* Green Line */
        .section-deductions::before { background-color: #e74c3c; } /* Red/Orange Line */
        .section-tax::before { background-color: #3498db; } /* Blue Line */

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

        /* Tables inside sections */
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
            font-variant-numeric: tabular-nums; /* Aligns numbers nicely */
        }

        .finance-table tr:last-child td {
            border-bottom: none;
        }

        /* Total Row Styles */
        .row-total td {
            font-weight: 700;
            color: #1a1a1a;
            padding-top: 15px;
            border-top: 1px solid #eee;
            border-bottom: none;
            font-size: 14px;
        }

        /* 5. Footer/Tax Projection (Simplified) */
        .tax-projection {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-top: 10px;
        }

        .tax-header {
            font-size: 12px;
            font-weight: 700;
            color: #3498db;
            margin-bottom: 10px;
            text-transform: uppercase;
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

        /* Footer Message */
        .footer-note {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #bdc3c7;
        }

    </style>
</head>
<body>

    <div class="payslip-container">
        
        <!-- Header -->
        <header class="header">
            <div class="company-branding">
                <!-- Placeholder for Logo if needed -->
                <h1>Oppty Techhub Private Limited</h1>
                <p>3rd Floor, Plot No-474, SSNA Park, Shanti Sree, Ameenpur, Medak - 502032, Telangana</p>
            </div>
            <div class="payslip-meta">
                <h2>Payslip</h2>
                <span>Nov 2025</span>
            </div>
        </header>

        <!-- Top Summary Bar (Visual Math) -->
        <div class="summary-badge">
            <div class="sum-item">
                <label>Net Pay</label>
                <span class="net-val">₹30,600</span>
            </div>
            <div class="operator">=</div>
            <div class="sum-item">
                <label>Gross Pay (A)</label>
                <span class="gross-val">₹35,000</span>
            </div>
            <div class="operator">-</div>
            <div class="sum-item">
                <label>Deductions (B)</label>
                <span class="deduct-val">₹4,400</span>
            </div>
        </div>

        <!-- Employee Info -->
        <div class="employee-info-grid">
            <div class="info-group">
                <label>Employee Code</label>
                <span>111</span>
            </div>
            <div class="info-group">
                <label>Name</label>
                <span>John Doe</span> <!-- Placeholder Name -->
            </div>
            <div class="info-group">
                <label>Department</label>
                <span>IT</span>
            </div>
            <div class="info-group">
                <label>Designation</label>
                <span>Associate Software Engineer</span>
            </div>
            <div class="info-group">
                <label>Date of Joining</label>
                <span>04/08/2025</span>
            </div>
            <div class="info-group">
                <label>PAN</label>
                <span>ABCDE1234F</span> <!-- Placeholder PAN -->
            </div>
            <div class="info-group">
                <label>UAN</label>
                <span>100200300400</span> <!-- Placeholder UAN -->
            </div>
            <div class="info-group">
                <label>Bank Account</label>
                <span>**5422</span>
            </div>
        </div>

        <!-- Section 1: Earnings (Green Line) -->
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
                        <td class="amount">17,500</td>
                        <td class="amount">17,500</td>
                    </tr>
                    <tr>
                        <td>House Rent Allowance</td>
                        <td class="amount">8,750</td>
                        <td class="amount">8,750</td>
                    </tr>
                    <tr>
                        <td>Special Allowance</td>
                        <td class="amount">3,150</td>
                        <td class="amount">3,150</td>
                    </tr>
                    <tr>
                        <td>Leave & Travel Allowance</td>
                        <td class="amount">3,500</td>
                        <td class="amount">3,500</td>
                    </tr>
                    <tr>
                        <td>PF Employer Contribution</td>
                        <td class="amount">2,100</td>
                        <td class="amount">2,100</td>
                    </tr>
                    <tr class="row-total">
                        <td>Total Gross Pay</td>
                        <td class="amount">35,000</td>
                        <td class="amount">35,000</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Section 2: Deductions (Red/Orange Line) -->
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
                        <td class="amount">2,100</td>
                        <td class="amount">2,100</td>
                    </tr>
                    <tr>
                        <td>PF Employer Contribution</td>
                        <td class="amount">2,100</td>
                        <td class="amount">2,100</td>
                    </tr>
                    <tr>
                        <td>Professional Tax</td>
                        <td class="amount">200</td>
                        <td class="amount">200</td>
                    </tr>
                    <tr class="row-total">
                        <td>Total Deductions</td>
                        <td class="amount">4,400</td>
                        <td class="amount">4,400</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Section 3: Tax Summary (Blue Line) -->
        <div class="timeline-section section-tax">
            <div class="section-header">
                <div class="section-title">Taxable Income Summary (Regime: New)</div>
            </div>
            
            <div class="tax-projection">
                <div class="tax-grid">
                    <div class="left">
                        <div class="tax-row">
                            <span>Annual Gross Salary Projection</span>
                            <strong>1,99,500</strong>
                        </div>
                        <div class="tax-row">
                            <span>Standard Deductions (Sec 16)</span>
                            <strong>-75,000</strong>
                        </div>
                    </div>
                    <div class="right">
                        <div class="tax-row">
                            <span>Net Taxable Income</span>
                            <strong>1,24,500</strong>
                        </div>
                        <div class="tax-row">
                            <span>Tax Deducted This Month</span>
                            <strong>0</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-note">
            <p>This is a system-generated payslip. No signature is required.</p>
        </div>

    </div>

</body>
</html>
        
        `;

        newWindow.document.open();
        newWindow.document.write(payslipHTML);
        newWindow.document.close();
    }

});