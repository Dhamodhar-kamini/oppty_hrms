// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMsg');

    // === CONFIGURATION ===
    // Change this to the name of your next page (e.g. 'timesheet.html')
    const REDIRECT_URL = "../admin_page/admin.html"; 

    loginForm.addEventListener('submit', function(e) {
        // Prevent the form from refreshing the page
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        // Check Credentials
        if (email === "admin@oppty.in" && password === "admin123") {
            // Success: Hide error and redirect
            errorMsg.style.display = 'none';
            console.log("Login Successful");
            
            // Redirect user
            window.location.href = REDIRECT_URL;
        } else {
            // Failure: Show error message
            errorMsg.style.display = 'block';
            
            // Optional: Shake animation logic or clear password
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
});