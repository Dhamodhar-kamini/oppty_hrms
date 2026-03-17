document.getElementById('loginForm').addEventListener('submit', function(e) {
    // Prevent the form from reloading the page
    e.preventDefault();
    
     const data = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  fetch("https://theoppty.com/api/employee/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(data => {
    console.log("Response:", data);

    if(data.status === "success"){
      localStorage.setItem("employee_id", data.employee_data.id);
      console.log(data.employee_data.id)
      window.location.href = "../dashboard/dashboard.html";
    } else {
      alert(data.message);
    }
  })
  .catch(err => {
    console.error("Fetch error:", err);
  });
    // Redirect to user.html
});