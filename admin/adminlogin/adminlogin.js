document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOGIN ELEMENTS ---
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMsg');
    const REDIRECT_URL = "../admin_page/admin.html"; 

    // ===========================
    // 1. LOGIN LOGIC (API BASED)
    // ===========================
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const submitBtn = loginForm.querySelector("button[type='submit']");

        // UI Feedback
        errorMsg.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerText = "Authenticating...";

        fetch("https://api.theoppty.com/api/admin/login/", { // Verify this endpoint with your backend
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(res => {
            if (!res.ok) throw new Error("Invalid admin credentials");
            return res.json();
        })
        .then(data => {
            if(data.status === "success"){
                // Save Admin session data
                localStorage.setItem("admin_id", data.admin_data.id);
                localStorage.setItem("admin_name", data.admin_data.name);
                localStorage.setItem("is_admin", "true");

                window.location.href = REDIRECT_URL;
            } else {
                throw new Error(data.message || "Access Denied");
            }
        })
        .catch(err => {
            errorMsg.innerText = err.message;
            errorMsg.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
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
    const btnResend = document.getElementById('btnResendOTP');
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
    window.addEventListener('click', (e) => { if (e.target == fpModal) fpModal.classList.remove('show'); });

    // Step 1: Verify Email
    btnVerify.addEventListener('click', () => {
        const emailVal = fpEmailInput.value.trim();
        if(!emailVal) return showError(err1, "Email is required.");
        sendOTPEmail(emailVal, btnVerify, err1);
    });

    // Resend OTP
    btnResend.addEventListener('click', (e) => {
        e.preventDefault();
        if(btnResend.style.pointerEvents === 'none') return;
        sendOTPEmail(validEmail, null, errOTP, true);
    });

    function sendOTPEmail(email, button, errorElement, isResend = false) {
        if(button) { button.innerText = "Searching..."; button.disabled = true; }
        errorElement.style.display = "none";

        fetch("https://api.theoppty.com/api/admin/verify-email/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ email: email })
        })
        .then(res => {
            if (!res.ok) throw new Error("Admin email not found.");
            return res.json();
        })
        .then(data => {
            validEmail = email;
            if(!isResend) {
                step1Div.style.display = "none";
                stepOTPDiv.style.display = "block";
            }
            fpTitle.innerText = "Verify OTP";
            fpDesc.innerText = isResend ? "New OTP sent to " + email : "OTP sent to " + email;
            
            if(isResend) {
                errorElement.innerText = "Sent!";
                errorElement.style.color = "#28a745";
                errorElement.style.display = "block";
                setTimeout(() => { errorElement.style.display = "none"; }, 2000);
            }
        })
        .catch(err => showError(errorElement, err.message))
        .finally(() => {
            if(button) { button.innerText = "Verify Email"; button.disabled = false; }
        });
    }

    // Step 2: Verify OTP
    btnVerifyOTP.addEventListener('click', () => {
        const otpVal = fpOTPInput.value.trim();
        if(!otpVal) return showError(errOTP, "Enter OTP.");

        btnVerifyOTP.innerText = "Verifying...";
        btnVerifyOTP.disabled = true;

        fetch("https://api.theoppty.com/api/admin/verify-otp/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ email: validEmail, otp: otpVal })
        })
        .then(res => {
            if (!res.ok) throw new Error("Invalid OTP.");
            return res.json();
        })
        .then(() => {
            stepOTPDiv.style.display = "none";
            step2Div.style.display = "block";
            fpTitle.innerText = "Set New Password";
        })
        .catch(err => showError(errOTP, err.message))
        .finally(() => {
            btnVerifyOTP.innerText = "Verify OTP";
            btnVerifyOTP.disabled = false;
        });
    });

    // Step 3: Update Password
    btnUpdate.addEventListener('click', () => {
        const newP = fpNewPass.value;
        if(newP !== fpConfirmPass.value) return showError(err2, "Passwords mismatch.");

        btnUpdate.innerText = "Updating...";
        btnUpdate.disabled = true;

        fetch("https://api.theoppty.com/api/admin/reset-password/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: validEmail, new_password: newP })
        })
        .then(res => {
            if (!res.ok) throw new Error("Update failed.");
            return res.json();
        })
        .then(() => {
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

    function showError(el, msg) {
        el.innerText = msg;
        el.style.display = "block";
        el.style.color = "#dc3545";
    }

    function resetModal() {
        step1Div.style.display = "block";
        stepOTPDiv.style.display = "none";
        step2Div.style.display = "none";
        successDiv.style.display = "none";
        fpTitle.style.display = "block";
        fpDesc.style.display = "block";
        fpEmailInput.value = "";
        fpOTPInput.value = "";
        fpNewPass.value = "";
        fpConfirmPass.value = "";
        err1.style.display = "none";
        errOTP.style.display = "none";
        err2.style.display = "none";
    }
});