document.addEventListener("DOMContentLoaded", function() {
    
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Stop page reload

        // 1. Get Elements
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError"); // The new tag we added
        const submitBtn = document.querySelector("button[type='submit']");

        // 2. Reset Error Message & Button
        errorEl.style.display = 'none';
        errorEl.innerText = "";
        submitBtn.disabled = true;
        submitBtn.innerText = "Signing in...";

        // 3. Prepare Data
        const data = {
            email: email,
            password: password
        };

        // 4. Send Request
        fetch("https://api.theoppty.com/api/employee/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => {
            // Check if server returned a 400/500 error code
            if (!res.ok) {
                // If the API returns a standard error format, try to parse it
                return res.json().then(errData => {
                    throw new Error(errData.message || "Invalid credentials");
                });
            }
            return res.json();
        })
        .then(data => {
            console.log("Response:", data);

            if(data.status === "success"){
                // --- SUCCESS ---
                localStorage.setItem("employee_id", data.employee_data.id);
                // Redirect
                window.location.href = "../dashboard/dashboard.html"; 
            } else {
                // --- FAILED (Logic returned by API) ---
                throw new Error(data.message || "Incorrect email or password.");
            }
        })
        .catch(err => {
            // --- DISPLAY ERROR ---
            console.error("Login Error:", err);
            
            errorEl.innerText = err.message; // Set the text
            errorEl.style.display = "block"; // Make it visible
            
            // Optional: Shake animation to draw attention
            errorEl.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], {
                duration: 300
            });
        })
        .finally(() => {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerText = "Sign In";
        });
    });

});