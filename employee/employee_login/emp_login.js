document.addEventListener("DOMContentLoaded", function() {
    
    // ===========================
    // 1. LOGIN LOGIC
    // ===========================
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault(); 

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError");
        const submitBtn = document.querySelector("#loginForm button[type='submit']");

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerText = "Signing in...";

        fetch("https://api.theoppty.com/api/employee/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(res => {
            if (!res.ok) throw new Error("Invalid credentials");
            return res.json();
        })
        .then(data => {
            if(data.status === "success"){
                localStorage.setItem("employee_id", data.employee_data.id);
                window.location.href = "../dashboard/dashboard.html"; 
            } else {
                throw new Error(data.message || "Incorrect credentials");
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
    const fpLink = document.getElementById('forgotPasswordLink');
    const fpModal = document.getElementById('fpModal');
    const closeBtn = document.querySelector('.fp-close-btn');
    const step1Div = document.getElementById('fpStep1');
    const stepOTPDiv = document.getElementById('fpStepOTP');
    const step2Div = document.getElementById('fpStep2');
    const successDiv = document.getElementById('fpSuccess');
    
    const btnVerify = document.getElementById('btnVerifyEmail');
    const btnVerifyOTP = document.getElementById('btnVerifyOTP');
    const btnResend = document.getElementById('btnResendOTP'); // New
    const btnUpdate = document.getElementById('btnUpdatePass');
    
    const fpEmailInput = document.getElementById('fpEmail');
    const fpOTPInput = document.getElementById('fpOTP');
    const fpNewPass = document.getElementById('fpNewPass');
    const fpConfirmPass = document.getElementById('fpConfirmPass');
    
    const fpTitle = document.getElementById('fpTitle');
    const fpDesc = document.getElementById('fpDesc');
    
    const err1 = document.getElementById('fpError1');
    const errOTP = document.getElementById('fpErrorOTP');
    const err2 = document.getElementById('fpError2');

    let validEmail = ""; 

    fpLink.addEventListener('click', (e) => {
        e.preventDefault();
        fpModal.classList.add('show');
        resetModal();
    });

    closeBtn.addEventListener('click', () => fpModal.classList.remove('show'));

    window.addEventListener('click', (e) => {
        if (e.target == fpModal) fpModal.classList.remove('show');
    });

    // --- STEP 1: VERIFY EMAIL & SEND INITIAL OTP ---
    btnVerify.addEventListener('click', function() {
        const emailVal = fpEmailInput.value.trim();
        if(!emailVal) {
            showError(err1, "Please enter your email.");
            return;
        }
        sendOTPEmail(emailVal, btnVerify, err1);
    });

    // --- NEW: RESEND OTP LOGIC ---
    btnResend.addEventListener('click', function(e) {
        e.preventDefault();
        if(btnResend.style.pointerEvents === 'none') return;
        
        btnResend.innerText = "Sending...";
        btnResend.style.color = "#ccc";
        btnResend.style.pointerEvents = 'none';

        sendOTPEmail(validEmail, null, errOTP, true);
    });

    // Helper to call the Email Verification API
    function sendOTPEmail(email, button, errorElement, isResend = false) {
        if(button) {
            button.innerText = "Checking...";
            button.disabled = true;
        }
        errorElement.style.display = "none";

        fetch("https://api.theoppty.com/api/employee/verify-email/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        })
        .then(res => {
            if (!res.ok) throw new Error("Email not found in our records.");
            return res.json();
        })
        .then(data => {
            validEmail = email;
            if(!isResend) {
                step1Div.style.display = "none";
                stepOTPDiv.style.display = "block";
            }
            fpTitle.innerText = "Verify OTP";
            fpDesc.innerText = isResend ? "A new OTP has been sent to " + validEmail : "An OTP has been sent to " + validEmail;
            
            if(isResend) {
                // Success feedback for resend
                errorElement.innerText = "OTP Resent successfully!";
                errorElement.style.color = "#28a745";
                errorElement.style.display = "block";
                setTimeout(() => { 
                    btnResend.innerText = "Resend OTP"; 
                    btnResend.style.color = "#FF5B1E";
                    btnResend.style.pointerEvents = 'auto';
                    errorElement.style.color = "#dc3545"; // Reset color for potential next error
                    errorElement.style.display = "none";
                }, 3000);
            }
        })
        .catch(err => showError(errorElement, err.message))
        .finally(() => {
            if(button) {
                button.innerText = "Verify Email";
                button.disabled = false;
            }
        });
    }

    // --- STEP 1.5: VERIFY OTP ---
    btnVerifyOTP.addEventListener('click', function() {
        const otpVal = fpOTPInput.value.trim();
        if(!otpVal) {
            showError(errOTP, "Please enter the OTP.");
            return;
        }

        btnVerifyOTP.innerText = "Verifying...";
        btnVerifyOTP.disabled = true;
        errOTP.style.display = "none";

        fetch("https://api.theoppty.com/api/employee/verify-otp/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: validEmail, otp: otpVal })
        })
        .then(res => {
            if (!res.ok) throw new Error("Invalid or expired OTP.");
            return res.json();
        })
        .then(data => {
            stepOTPDiv.style.display = "none";
            step2Div.style.display = "block";
            fpTitle.innerText = "Set New Password";
            fpDesc.innerText = "Create a strong password for your account.";
        })
        .catch(err => showError(errOTP, err.message))
        .finally(() => {
            btnVerifyOTP.innerText = "Verify OTP";
            btnVerifyOTP.disabled = false;
        });
    });

    // --- STEP 2: UPDATE PASSWORD ---
    btnUpdate.addEventListener('click', function() {
        const newP = fpNewPass.value;
        const confP = fpConfirmPass.value;

        if(!newP || newP.length < 6) {
            showError(err2, "Password must be at least 6 characters.");
            return;
        }
        if(newP !== confP) {
            showError(err2, "Passwords do not match.");
            return;
        }

        btnUpdate.innerText = "Updating...";
        btnUpdate.disabled = true;

        fetch("https://api.theoppty.com/api/employee/reset-password/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: validEmail, new_password: newP })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to update password.");
            return res.json();
        })
        .then(data => {
            step2Div.style.display = "none";
            fpTitle.style.display = "none";
            fpDesc.style.display = "none";
            successDiv.style.display = "block";
            setTimeout(() => { fpModal.classList.remove('show'); }, 2500);
        })
        .catch(err => showError(err2, err.message))
        .finally(() => {
            btnUpdate.innerText = "Update Password";
            btnUpdate.disabled = false;
        });
    });

    function showError(element, msg) {
        element.innerText = msg;
        element.style.display = "block";
        element.style.color = "#dc3545"; // Ensure error color
    }

    function resetModal() {
        step1Div.style.display = "block";
        stepOTPDiv.style.display = "none";
        step2Div.style.display = "none";
        successDiv.style.display = "none";
        fpTitle.style.display = "block";
        fpDesc.style.display = "block";
        fpTitle.innerText = "Reset Password";
        fpDesc.innerText = "Enter your email address to check if your account exists.";
        fpEmailInput.value = "";
        fpOTPInput.value = "";
        fpNewPass.value = "";
        fpConfirmPass.value = "";
        err1.style.display = "none";
        errOTP.style.display = "none";
        err2.style.display = "none";
    }
});