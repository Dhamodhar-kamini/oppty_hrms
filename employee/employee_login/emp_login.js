document.addEventListener("DOMContentLoaded", function() {
    
    // ===========================
    // 1. EXISTING LOGIN LOGIC
    // ===========================
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault(); 

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError");
        const submitBtn = document.querySelector("#loginForm button[type='submit']");

        errorEl.style.display = 'none';
        errorEl.innerText = "";
        submitBtn.disabled = true;
        submitBtn.innerText = "Signing in...";

        const data = { email: email, password: password };

        fetch("https://api.theoppty.com/api/employee/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => { throw new Error(errData.message || "Invalid credentials"); });
            }
            return res.json();
        })
        .then(data => {
            if(data.status === "success"){
                localStorage.setItem("employee_id", data.employee_data.id);
                window.location.href = "../dashboard/dashboard.html"; 
            } else {
                throw new Error(data.message || "Incorrect email or password.");
            }
        })
        .catch(err => {
            errorEl.innerText = err.message;
            errorEl.style.display = "block";
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerText = "Sign In";
        });
    });


    // ===========================
    // 2. FORGOT PASSWORD LOGIC
    // ===========================

    // Elements
    const fpLink = document.getElementById('forgotPasswordLink');
    const fpModal = document.getElementById('fpModal');
    const closeBtn = document.querySelector('.fp-close-btn');
    
    // Steps
    const step1Div = document.getElementById('fpStep1');
    const step2Div = document.getElementById('fpStep2');
    const successDiv = document.getElementById('fpSuccess');
    
    // Inputs & Buttons
    const btnVerify = document.getElementById('btnVerifyEmail');
    const btnUpdate = document.getElementById('btnUpdatePass');
    const fpEmailInput = document.getElementById('fpEmail');
    const fpNewPass = document.getElementById('fpNewPass');
    const fpConfirmPass = document.getElementById('fpConfirmPass');
    const fpTitle = document.getElementById('fpTitle');
    const fpDesc = document.getElementById('fpDesc');

    // Errors
    const err1 = document.getElementById('fpError1');
    const err2 = document.getElementById('fpError2');

    let validEmail = ""; // Store verified email

    // --- OPEN MODAL ---
    fpLink.addEventListener('click', (e) => {
        e.preventDefault();
        fpModal.classList.add('show');
        resetModal();
    });

    // --- CLOSE MODAL ---
    closeBtn.addEventListener('click', () => {
        fpModal.classList.remove('show');
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target == fpModal) {
            fpModal.classList.remove('show');
        }
    });

    // --- STEP 1: VERIFY EMAIL ---
    btnVerify.addEventListener('click', function() {
        const emailVal = fpEmailInput.value.trim();
        
        if(!emailVal) {
            showError(err1, "Please enter your email.");
            return;
        }

        // UI Loading State
        btnVerify.innerText = "Checking...";
        btnVerify.disabled = true;
        err1.style.display = "none";

        // *** TODO: Replace URL with your actual Check Email API ***
        // Example logic: Check if email exists in DB
        
        // Simulating API Call for demonstration (Replace this FETCH block)
        /* 
        fetch("https://api.theoppty.com/api/employee/check-email/", {
             method: "POST",
             body: JSON.stringify({ email: emailVal })
             ...
        })
        */

        // MOCK SUCCESS (Remove this setTimeout and use real Fetch in production)
        setTimeout(() => {
            // Assume API returns success if email is valid
            const apiResponseSuccess = true; // Change logic based on real API

            if(apiResponseSuccess) {
                validEmail = emailVal;
                // Switch to Step 2
                step1Div.style.display = "none";
                step2Div.style.display = "block";
                fpTitle.innerText = "Set New Password";
                fpDesc.innerText = "Create a strong password for " + validEmail;
            } else {
                showError(err1, "Email not found in our records.");
            }
            
            btnVerify.innerText = "Verify Email";
            btnVerify.disabled = false;
        }, 1000);
    });

    // --- STEP 2: UPDATE PASSWORD ---
    btnUpdate.addEventListener('click', function() {
        const newP = fpNewPass.value;
        const confP = fpConfirmPass.value;

        if(!newP || !confP) {
            showError(err2, "Please fill in all fields.");
            return;
        }

        if(newP !== confP) {
            showError(err2, "Passwords do not match.");
            return;
        }

        if(newP.length < 6) {
            showError(err2, "Password must be at least 6 characters.");
            return;
        }

        // UI Loading State
        btnUpdate.innerText = "Updating...";
        btnUpdate.disabled = true;
        err2.style.display = "none";

        // *** TODO: Replace URL with your actual Reset Password API ***
        const payload = {
            email: validEmail,
            new_password: newP
        };

        // Simulating API Call
        /*
        fetch("https://api.theoppty.com/api/employee/reset-password/", {
            method: "POST",
             headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        */

        // MOCK SUCCESS (Remove setTimeout and use real Fetch)
        setTimeout(() => {
            // Show Success View
            step2Div.style.display = "none";
            fpTitle.style.display = "none";
            fpDesc.style.display = "none";
            successDiv.style.display = "block";

            // Redirect to Login (Close modal) after 2 seconds
            setTimeout(() => {
                fpModal.classList.remove('show');
                // Optional: reload page or just stay on login
                // window.location.reload(); 
            }, 2500);

            btnUpdate.innerText = "Update Password";
            btnUpdate.disabled = false;
        }, 1500);
    });

    // Helper: Show Error
    function showError(element, msg) {
        element.innerText = msg;
        element.style.display = "block";
    }

    // Helper: Reset Modal State
    function resetModal() {
        step1Div.style.display = "block";
        step2Div.style.display = "none";
        successDiv.style.display = "none";
        fpTitle.style.display = "block";
        fpDesc.style.display = "block";
        
        fpTitle.innerText = "Reset Password";
        fpDesc.innerText = "Enter your email address to check if your account exists.";
        
        fpEmailInput.value = "";
        fpNewPass.value = "";
        fpConfirmPass.value = "";
        err1.style.display = "none";
        err2.style.display = "none";
    }

});