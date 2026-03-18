// ==========================================
// API CONFIGURATION
// ==========================================
const API_BASE_URL = "https://theoppty.com";

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const toggle = document.getElementById('calcModeToggle');
    const ctcInput = document.getElementById('ctcInput');
    
    // Buttons & Popup Elements
    const generateBtn = document.getElementById('generateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const successPopup = document.getElementById("successPopup");
    const popupCloseBtn = document.querySelector(".btn-popup-primary"); // "Done" button
    const popupViewBtn = document.querySelector(".btn-popup-secondary"); // "View PDF" button
    const sentEmpName = document.getElementById("sentEmpName");

    // Inputs
    const inputs = {
        month: document.getElementById('monthSelect'),
        year: document.getElementById('yearSelect'),
        basic: document.getElementById('basicSalary'),
        lopDays: document.getElementById('lopDays'),
        lopAmount: document.getElementById('lopAmount'),
        pf: document.getElementById('pfAmount'),
        tax: document.getElementById('taxAmount'),
        empName: document.getElementById('empSelect')
    };

    // Preview Elements
    const preview = {
        monthYear: document.getElementById('prevMonthYear'),
        name: document.getElementById('prevName'),
        days: document.getElementById('prevDays'),
        basic: document.getElementById('prevBasic'),
        gross: document.getElementById('prevGross'),
        pf: document.getElementById('prevPf'),
        tax: document.getElementById('prevTax'),
        lop: document.getElementById('prevLop'),
        lopDays: document.getElementById('prevLopDays'),
        net: document.getElementById('prevNet'),
        words: document.getElementById('amountWords')
    };  
  
    const PF_RATE = 0.12;

    // --- 1. Automatic Date Initialization ---
    function initDates() {
        const today = new Date();
        const sysDate = document.getElementById('systemDate');
        if(sysDate) sysDate.textContent = today.toDateString(); 

        const targetMonth = today.getMonth(); 
        const targetYear = today.getFullYear();

        if (inputs.year) {
            inputs.year.innerHTML = '';
            for (let y = targetYear - 1; y <= targetYear + 1; y++) {
                let opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if(y === targetYear) opt.selected = true;
                inputs.year.appendChild(opt);
            }
        }

        if (inputs.month) {
            inputs.month.innerHTML = '';
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            monthNames.forEach((m, index) => {
                let opt = document.createElement('option');
                opt.value = index; 
                opt.textContent = m;
                if(index === targetMonth) opt.selected = true;
                inputs.month.appendChild(opt);
            });
        }
    }

    // --- 2. Fetch Employees for Dropdown ---
    function loadEmployees() {
        fetch(`${API_BASE_URL}/api/employees/`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById("empSelect");
            select.innerHTML = '<option value="">Select Employee</option>';

            data.forEach(emp => {
                const option = document.createElement("option");
                option.value = emp.id;
                option.textContent = `${emp.name} (${emp.employee_id})`;
                select.appendChild(option);
            });
        })
        .catch(err => console.error("Error loading employees:", err));
    }

    // --- 3. Calculation Logic ---
    function calculateSalary() {
        if (!inputs.year || !inputs.month) return;

        const selYear = parseInt(inputs.year.value);
        const selMonth = parseInt(inputs.month.value);

        let prevMonthIndex = selMonth - 1;
        let prevYear = selYear;

        if (prevMonthIndex < 0) {
            prevMonthIndex = 11; 
            prevYear = selYear - 1;
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        if (preview.monthYear) {
            if (prevYear !== selYear) {
                preview.monthYear.textContent = `26 ${monthNames[prevMonthIndex]} ${prevYear} - 25 ${monthNames[selMonth]} ${selYear}`;
            } else {
                preview.monthYear.textContent = `26 ${monthNames[prevMonthIndex]} - 25 ${monthNames[selMonth]} ${selYear}`;
            }
        }

        // Days in Month Calculation
        const startDate = new Date(prevYear, prevMonthIndex, 26);
        const endDate = new Date(selYear, selMonth, 25);
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysInMonth = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

        let basic = 0, pf = 0, tax = 0, lopDays = 0, lopVal = 0, finalBasic = 0;

        lopDays = parseFloat(inputs.lopDays.value) || 0;
        tax = parseFloat(inputs.tax.value) || 0;

        if (toggle && toggle.checked) {
            const annualCTC = parseFloat(ctcInput.value) || 0;
            const monthlyCTC = annualCTC / 12;
            basic = monthlyCTC;

            if (basic > 0) {
                let perDaySalary = basic / daysInMonth;
                lopVal = perDaySalary * lopDays;
            }

            finalBasic = basic - lopVal;
            pf = finalBasic * PF_RATE;

            inputs.basic.value = basic.toFixed(2);
            inputs.pf.value = pf.toFixed(2);

        } else {
            basic = parseFloat(inputs.basic.value) || 0;
            pf = parseFloat(inputs.pf.value) || 0;

            if (basic > 0) {
                let perDaySalary = basic / daysInMonth;
                lopVal = perDaySalary * lopDays;
            }
            finalBasic = basic - lopVal;
        }

        inputs.lopAmount.value = lopVal.toFixed(2);

        let gross = finalBasic;
        let totalDeductions = pf + tax;
        let net = gross - totalDeductions;
        if (net < 0) net = 0;

        updateUI(basic, gross, pf, tax, lopDays, lopVal, net, daysInMonth);
    }

    function updateUI(basic, gross, pf, tax, lopDays, lopVal, net, totalDays) {
        if(preview.basic) preview.basic.textContent = formatINR(basic);
        if(preview.gross) preview.gross.textContent = formatINR(gross);
        if(preview.pf) preview.pf.textContent = "-" + formatINR(pf);
        if(preview.tax) preview.tax.textContent = "-" + formatINR(tax);
        if(preview.lopDays) preview.lopDays.textContent = lopDays;
        if(preview.lop) preview.lop.textContent = "-" + formatINR(lopVal);
        if(preview.days) preview.days.textContent = Math.max(0, totalDays - lopDays);
        if(preview.net) preview.net.textContent = formatINR(net);
        if(preview.words) preview.words.textContent = net > 0 ? convertNumberToWords(Math.round(net)) + " Only" : "Zero Only";
    }

    // --- Helpers ---
    function formatINR(amount) {
        return "₹" + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function convertNumberToWords(amount) {
        if (amount === 0) return "Zero";
        return "Amount in Words"; // You can implement a real converter here later
    }

    // --- Listeners ---
    if(toggle) {
        toggle.addEventListener('change', () => {
            const grp = document.getElementById('ctcGroup');
            const lbl = document.getElementById('modeLabel');
            if(toggle.checked) {
                if(lbl) lbl.textContent = "Auto-Calculate (CTC)";
                if(grp) grp.style.display = "block";
                inputs.basic.readOnly = true;
                inputs.pf.readOnly = true;
            } else {
                if(lbl) lbl.textContent = "Manual Entry";
                if(grp) grp.style.display = "none";
                inputs.basic.readOnly = false;
                inputs.pf.readOnly = false;
            }
            calculateSalary();
        });
    }

    [ctcInput, inputs.month, inputs.year, inputs.basic, inputs.lopDays, inputs.pf, inputs.tax].forEach(el => {
        if(el) {
            el.addEventListener('input', calculateSalary);
            el.addEventListener('change', calculateSalary);
        }
    });

    if(inputs.empName) {
        inputs.empName.addEventListener('change', () => {
            const selectedText = inputs.empName.options[inputs.empName.selectedIndex].text;
            if(preview.name) preview.name.textContent = selectedText.split('(')[0].trim();
        });
    }

    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            initDates();
            if(toggle) toggle.checked = true;
            if(ctcInput) ctcInput.value = 420000;
            if(inputs.lopDays) inputs.lopDays.value = 0;
            if(inputs.basic) inputs.basic.readOnly = true;
            calculateSalary();
        });
    }

    // ==========================================
    // 4. API CALL & POPUP LOGIC
    // ==========================================
    if(generateBtn) {
        generateBtn.addEventListener('click', (e) => {
            e.preventDefault(); 

            const employeeId = inputs.empName.value;
            
            if (!employeeId) {
                alert("Please select an employee first!");
                return;
            }

            // Get Employee Name for the popup
            const empName = inputs.empName.options[inputs.empName.selectedIndex].text.split('(')[0].trim();
            
            // Get Month Name (e.g., "March") instead of number
            const monthText = inputs.month.options[inputs.month.selectedIndex].text;

            const bas = Number(inputs.basic.value) || 0;
            const lop_A = Number(inputs.lopAmount.value) || 0;
            const pf_a = Number(inputs.pf.value) || 0;
            const pt = Number(inputs.tax.value) || 0;
            const lop_d = Number(inputs.lopDays.value) || 0;

            const gr = bas ;         
            const n = gr -lop_A-pf_a-pt; 


            const payload = {
                month: monthText,
                basic_salary: bas,
                lop_days: lop_d,
                lop_amount: lop_A,
                pf_amount: pf_a,
                professional_tax: pt,
                gross_salary: gr,
                net_salary: n
            };
            console.log(payload)
            // Show Loading State
            const originalText = generateBtn.innerHTML;
            generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
            generateBtn.disabled = true;

            // Send to Backend
            fetch(`${API_BASE_URL}/api/create-payslip/${employeeId}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(async res => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to generate payslip");
                }
                return res.json();
            })
            .then(data => {
                // Reset Button
                generateBtn.innerHTML = originalText;
                generateBtn.disabled = false;

                // Show Success Popup
                if (sentEmpName) sentEmpName.innerText = empName;
                if (successPopup) successPopup.classList.add("active");
            })
            .catch(error => {
                console.error("Error:", error);
                alert(`Error: ${error.message}`);
                generateBtn.innerHTML = originalText;
                generateBtn.disabled = false;
            });
        });
    }

    // Close Popup Function
    function closePopup() {
        if(successPopup) successPopup.classList.remove("active");
    }

    if(popupCloseBtn) popupCloseBtn.addEventListener('click', closePopup);
    
    if(popupViewBtn) {
        popupViewBtn.addEventListener('click', () => {
            alert("Opening PDF...");
            closePopup();
        });
    }

    // Close on Outside Click
    window.addEventListener('click', (e) => {
        if (e.target === successPopup) closePopup();
    });

    // --- INITIALIZATION ---
    initDates();
    loadEmployees();
    calculateSalary();
});