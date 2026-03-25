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
    const step2Div = document.getElementById('fpStep2');
    const successDiv = document.getElementById('fpSuccess');
    const btnVerify = document.getElementById('btnVerifyEmail');
    const btnUpdate = document.getElementById('btnUpdatePass');
    const fpEmailInput = document.getElementById('fpEmail');
    const fpNewPass = document.getElementById('fpNewPass');
    const fpConfirmPass = document.getElementById('fpConfirmPass');
    const fpTitle = document.getElementById('fpTitle');
    const fpDesc = document.getElementById('fpDesc');
    const err1 = document.getElementById('fpError1');
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

    // --- STEP 1: VERIFY EMAIL (POST) ---
    btnVerify.addEventListener('click', function() {
        const emailVal = fpEmailInput.value.trim();
        if(!emailVal) {
            showError(err1, "Please enter your email.");
            return;
        }

        btnVerify.innerText = "Verifying...";
        btnVerify.disabled = true;
        err1.style.display = "none";

        fetch("https://api.theoppty.com/api/employee/verify-email/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailVal })
        })
        .then(res => {
            if (!res.ok) throw new Error("Email not found in our records.");
            return res.json();
        })
        .then(data => {
            validEmail = emailVal;
            step1Div.style.display = "none";
            step2Div.style.display = "block";
            fpTitle.innerText = "Set New Password";
            fpDesc.innerText = "Create a strong password for " + validEmail;
        })
        .catch(err => showError(err1, err.message))
        .finally(() => {
            btnVerify.innerText = "Verify Email";
            btnVerify.disabled = false;
        });
    });

    // --- STEP 2: UPDATE PASSWORD (PATCH) ---
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

        btnUpdate.innerText = "Updating...";
        btnUpdate.disabled = true;
        err2.style.display = "none";

        fetch("https://api.theoppty.com/api/employee/reset-password/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: validEmail,
                new_password: newP
            })
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

            setTimeout(() => {
                fpModal.classList.remove('show');
            }, 2500);
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
    }

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