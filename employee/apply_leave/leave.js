document.addEventListener("DOMContentLoaded", function () {

   
    // 1. CONFIG & GLOBAL VARS
   
    const emp_id = localStorage.getItem("employee_id");
    const API_BASE = "https://theoppty.com/api/employee";

    // Redirect if no ID found
    if (!emp_id) {
        alert("User not logged in!");
        // window.location.href = "../login/login.html"; 
        return;
    }

    
    // 2. DOM ELEMENTS
    
    // Modals
    const leaveModal = document.getElementById("lmLeaveModal");
    const successModal = document.getElementById("lmSuccessModal");
    
    // Buttons
    const openBtn = document.querySelector(".btn-trigger"); // "Add Leave" Button
    const closeBtn = document.getElementById("lmCloseBtn");
    const cancelBtn = document.getElementById("lmCancelBtn");
    const successCloseBtn = document.getElementById("lmSuccessCloseBtn");

    // Form Inputs
    const empNameIn = document.getElementById("lmEmpName");
    const leaveTypeIn = document.getElementById("lmLeaveType");
    const fromDateIn = document.getElementById("lmFromDate");
    const toDateIn = document.getElementById("lmToDate");
    const numDaysIn = document.getElementById("lmNumDays");
    const balanceIn = document.getElementById("lmBalance");
    const reasonIn = document.getElementById("lmReason");
    const leaveForm = document.getElementById("lmLeaveForm");

    
    // 3. FETCH DATA FUNCTIONS
    
    function fetchDashboardData() {
        fetch(`${API_BASE}/dashboard/${emp_id}/`)
            .then(res => res.json())
            .then(data => {
                if(document.getElementById("name")) document.getElementById("name").innerText = data.name;
                if(document.getElementById("role")) document.getElementById("role").innerText = data.role;
                if(empNameIn) empNameIn.value = data.name; // Auto-fill modal name
            })
            .catch(err => console.error("Dashboard Error:", err));
    }

    function fetchLeaveStatus() {
        fetch(`${API_BASE}/leaves/${emp_id}/`)
            .then(res => res.json())
            .then(data => {
                if(document.getElementById('taken')) document.getElementById('taken').innerText = data.taken || 0;
                if(document.getElementById('casual')) document.getElementById('casual').innerText = data.casual_taken || 0;
                if(document.getElementById('sick')) document.getElementById('sick').innerText = data.sick_taken || 0;
                if(document.getElementById('lop')) document.getElementById('lop').innerText = data.lop || 0;
                if(document.getElementById('remaining')) document.getElementById('remaining').innerText = data.remaining || 0;
            })
            .catch(err => console.error("Leaves Error:", err));
    }

    // Initial Calls
    fetchDashboardData();
    fetchLeaveStatus();
    setInterval(fetchLeaveStatus, 10000); // Refresh every 10s

    // =============================
    // 4. MODAL LOGIC (OPEN / CLOSE)
    // =============================
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            leaveModal.classList.add("active");
            // Set min date to today
            const today = new Date().toISOString().split('T')[0];
            fromDateIn.setAttribute('min', today);
            toDateIn.setAttribute('min', today);
        });
    }

    // Universal Close Function
    function closeAllModals() {
        leaveModal.classList.remove("active");
        successModal.classList.remove("active");
        resetForm(); // Clear data when closed
    }

    if (closeBtn) closeBtn.addEventListener("click", closeAllModals);
    if (cancelBtn) cancelBtn.addEventListener("click", closeAllModals);
    if (successCloseBtn) successCloseBtn.addEventListener("click", closeAllModals);

    // Close on Outside Click
    window.addEventListener("click", (e) => {
        if (e.target === leaveModal) closeAllModals();
        if (e.target === successModal) closeAllModals();
    });

    // =============================
    // 5. DATE CALCULATION
    // =============================
    function calculateDays() {
        if (!fromDateIn.value || !toDateIn.value) {
            numDaysIn.value = 0;
            return;
        }

        const start = new Date(fromDateIn.value);
        const end = new Date(toDateIn.value);

        if (end < start) {
            alert("To Date cannot be before From Date");
            toDateIn.value = "";
            numDaysIn.value = 0;
            return;
        }

        // Difference in ms -> days
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
        numDaysIn.value = diffDays;
    }

    fromDateIn.addEventListener("change", calculateDays);
    toDateIn.addEventListener("change", calculateDays);

    // =============================
    // 6. SUBMIT FORM (APPLY LEAVE)
    // =============================
    if (leaveForm) {
        leaveForm.addEventListener("submit", function (event) {
            event.preventDefault();

            // 1. Gather Data
            const leaveType = leaveTypeIn.value;
            const fromDate = fromDateIn.value;
            const toDate = toDateIn.value;
            const numDays = parseInt(numDaysIn.value);
            const reason = reasonIn.value;
            // Handle balance logic (Use 0 if '-' or not a number)
            const balanceVal = parseInt(balanceIn.value) || 0; 

            // 2. Validation
            if (!leaveType || !fromDate || !toDate || !reason) {
                alert("Please fill all required fields");
                return;
            }

            // 3. Prepare Payload
            const data = {
                leave_type: leaveType,
                from_date: fromDate,
                to_date: toDate,
                number_of_days: numDays,
                // backend usually handles remaining calculation, but sending if required
                remaining_leaves: balanceVal, 
                reason: reason
            };

            // 4. API Call
            fetch(`${API_BASE}/apply-leave/${emp_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) throw new Error("Submission Failed");
                return response.json();
            })
            .then(result => {
                console.log("Success:", result);

                // --- SUCCESS ACTIONS ---
                leaveModal.classList.remove("active");   // Hide Form
                successModal.classList.add("active");    // Show Success Popup
                
                fetchLeaveStatus(); // Refresh dashboard stats
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error applying leave. Please try again.");
            });
        });
    }

    // =============================
    // 7. HELPER FUNCTIONS
    // =============================
    function resetForm() {
        if(leaveForm) leaveForm.reset();
        numDaysIn.value = 0;
        balanceIn.value = "-";
    }

});
