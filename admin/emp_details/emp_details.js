// ==========================================
// API CONFIGURATION
// ==========================================
const API_BASE_URL = "https://api.theoppty.com";

document.addEventListener("DOMContentLoaded", function () {
  let currentEmpData = null;
  const emp_id = localStorage.getItem("employee_id");
  
  if (!emp_id) {
    window.showSuccessPopup("No employee selected.");
    window.location.href = "../employeedashb/employee.html";
    return;
  }

  // ==================================================
  // 1. INJECT MODALS INTO THE PAGE FIRST
  // ==================================================
  injectEditModal();
  injectSuccessPopup();

  // ==================================================
  // 2. FETCH MAIN DASHBOARD INFO
  // ==================================================
  // ==================================================
  // 2. FETCH MAIN DASHBOARD INFO
  // ==================================================
  function loadOverviewData() {
      fetch(`${API_BASE_URL}/api/employee/dashboard/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
          currentEmpData = data; 
          
          // Helper to safely handle data whether it's an Array, Object, or Empty
          const getSafeData = (dataField) => {
              if (!dataField) return {};
              return Array.isArray(dataField) ? (dataField[0] || {}) : dataField;
          };

          const stat = getSafeData(data.statutory_details);
          const bank = getSafeData(data.bank_details);
          const other = getSafeData(data.other_details);

          // Header & Quick Stats
          document.getElementById('p_name').innerText = data.name || "N/A";
          document.getElementById('p_role').innerText = data.role || "N/A";
          document.getElementById('p_dept').innerText = data.department || "N/A";
          document.getElementById('p_dept_2').innerText = data.department || "N/A";
          document.getElementById('p_role_2').innerText = data.role || "N/A";
          document.getElementById('p_id').innerText = `EMP-${data.employee_id || emp_id}`;
          document.getElementById('p_join').innerText = data.joining || "N/A";
          document.getElementById('p_salary').innerText = data.salary ? `₹${data.salary}` : "N/A";
          document.getElementById('p_email').innerText = data.email || "N/A";
          
          const initials = data.name ? data.name.substring(0, 2).toUpperCase() : "EM";
          document.getElementById('p_initials').innerText = initials;

          // Statutory Details (Safely injected)
          document.getElementById('pan').innerText = stat.pan || "-NA-";
          document.getElementById('uan').innerText = stat.pf_uan || "-NA-";
          document.getElementById('pt').innerText = stat.profesional_tax || "-NA-";
          document.getElementById('lwf').innerText = stat.lwf_status || "-NA-";
          document.getElementById('esic').innerText = stat.esic_status || "-NA-";
          document.getElementById('esic_ip').innerText = stat.esic_ip_number || "-NA-";

          // Bank Details (Safely injected)
          document.getElementById('bank_name').innerText = bank.bank_name || "-NA-";
          document.getElementById('bank_acc').innerText = bank.acc_no || "-NA-";
          document.getElementById('bank_ifsc').innerText = bank.ifsc_code || "-NA-";

          // Personal Details (Safely injected)
          document.getElementById('p_phone').innerText = other.mobile || "N/A";
          document.getElementById('p_location').innerText = other.address || "N/A";
          
          const maritalEl = document.getElementById('p_marital');
          if(maritalEl) {
              const status = other.marital_status || "Unmarried";
              maritalEl.innerText = status;
              maritalEl.style.backgroundColor = status.toLowerCase() === 'unmarried' ? '#e6ffe6' : '#e6f2ff';
              maritalEl.style.color = status.toLowerCase() === 'unmarried' ? '#008000' : '#0066cc';
          }
        })
        .catch(err => console.error("Error fetching main data:", err));
  }

function fetchLeaveStatus() {
    // We fetch the FULL list of leaves instead of the summary API
    fetch(`${API_BASE_URL}/api/employee/leaves/${emp_id}/`)
        .then(res => res.json())
        .then(leaves => {
      
            // Manually loop and sum the days in Frontend
            // Update UI manually
           
            document.getElementById('p_sick_leave').innerText = leaves.casual_remaining;
            document.getElementById('p_casual_leave').innerText = leaves.sick_remaining;
            
            document.getElementById('p_remaining_leaves').innerText = leaves.remaining ;
        })
        .catch(err => console.error("Frontend Calculation Error:", err));
}
fetchLeaveStatus()

  // ==================================================
  // 3. FETCH LEAVES, ATTENDANCE, PAYROLL, DOCUMENTS
  // ==================================================
  function fetchLeaves() {
      const leave_table = document.getElementById('leavebody');
      if (!leave_table) return;
      fetch(`${API_BASE_URL}/api/employee/apply-leave/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            leave_table.innerHTML = "";
            if (!data || data.length === 0) {
                leave_table.innerHTML = `<tr><td colspan="5" style="text-align:center;">No leaves found</td></tr>`;
                return;
            }
            data.forEach(p => {
                let statusColor = p.status === 'approved' ? '#2ecc71' : (p.status === 'rejected' ? '#e74c3c' : '#f39c12');
                leave_table.innerHTML += `
                    <tr>
                        <td>${p.leave_type.toUpperCase()}</td>
                        <td>${p.from_date}</td>
                        <td>${p.to_date}</td>
                        <td>${p.number_of_days}</td>
                        <td style="font-weight:bold; color:${statusColor};">${p.status.toUpperCase()}</td>
                    </tr>
                `;
            });
        })
        .catch(err => console.error("Error fetching leaves:", err));
  }

  function fetchDocuments() {
      const docsGrid = document.getElementById("documentsGrid");
      if (!docsGrid) return;
      fetch(`${API_BASE_URL}/api/employee-documents/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            docsGrid.innerHTML = "";
            if(!data || data.length === 0){
              docsGrid.innerHTML = "<p style='padding:20px;'>No documents uploaded</p>";
              return;
            }
            data.forEach(doc => {
              const fileUrl = `${API_BASE_URL}${doc.file}`;
              docsGrid.innerHTML += `
              <div class="doc-card" style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #fff;">
                <div class="doc-header"><i class="fa-regular fa-file-pdf doc-icon" style="font-size: 24px; color: #4f46e5; margin-bottom: 10px;"></i></div>
                <div class="doc-info">
                  <h4 style="margin:5px 0;"><a href="${fileUrl}" target="_blank" style="color:#1e293b; text-decoration:none;">${doc.description}</a></h4>
                  <p style="margin:0 0 10px 0; color:#64748b; font-size:13px;">${doc.doc_type}</p>
                </div>
              </div>`;
            });
        })
        .catch(err => console.error("Error:", err));
  }

  function fetchAttendance() {
      const attendanceBody = document.querySelector('#attendance tbody');
      if (!attendanceBody) return;
      fetch(`${API_BASE_URL}/api/employee-attendence-history/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            attendanceBody.innerHTML = ""; 
            if (!data || data.length === 0) {
                attendanceBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No attendance records found</td></tr>`;
                return;
            }
            data.forEach(record => {
                const dateObj = new Date(record.date);
                const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                let clockIn = "--"; let clockOut = "--"; let hoursWorked = "0";
                let status = "absent"; let statusColor = "#e74c3c"; let statusBg = "#fceceb";

                if (record.checkin) {
                    const checkInDate = new Date(record.checkin);
                    clockIn = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                    if (checkInDate.toTimeString().split(' ')[0] > "10:10:00") {
                        status = "late"; statusColor = "#f39c12"; statusBg = "#fef5e6";
                    } else {
                        status = "present"; statusColor = "#2ecc71"; statusBg = "#e6f9ed";
                    }
                }
                if (record.checkout) {
                    const checkOutDate = new Date(record.checkout);
                    clockOut = checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                    if (record.checkin) {
                        const diffMs = checkOutDate - new Date(record.checkin);
                        hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(1);
                    }
                }
                attendanceBody.innerHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${clockIn}</td>
                        <td>${clockOut}</td>
                        <td>${hoursWorked}</td>
                        <td><span style="padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; color:${statusColor}; background:${statusBg};">${status}</span></td>
                    </tr>
                `;
            });
        })
        .catch(err => console.error("Error fetching attendance:", err));
  }

  function fetchPayroll() {
      const payrollTab = document.getElementById('payroll');
      if (!payrollTab) return;
      fetch(`${API_BASE_URL}/api/employee-payslips/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            payrollTab.innerHTML = `<h3 class="section-title" style="margin: 0">Salary History</h3><div id="dynamic-payroll-container"></div>`;
            const container = document.getElementById('dynamic-payroll-container');
            if (!data || data.length === 0) {
                container.innerHTML = `<p style="text-align:center; padding:20px;">No payslip records found.</p>`;
                return;
            }
            data.forEach(pay => {
                container.innerHTML += `
                  <div class="salary-card" style="margin-bottom: 20px; border:1px solid #ddd; padding:15px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                      <h4 style="margin:0;">${pay.month}</h4>
                      <button style="border:none; background:#e5e7eb; padding:4px 10px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-download"></i></button>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">
                      <div><label style="font-size:12px; color:#888;">Basic</label><div style="font-weight:bold;">₹${pay.basic_salary}</div></div>
                      <div><label style="font-size:12px; color:#888;">Gross</label><div style="font-weight:bold;">₹${pay.gross_salary}</div></div>
                      <div><label style="font-size:12px; color:#888;">PF</label><div style="font-weight:bold; color:#e74c3c;">-₹${pay.pf_amount}</div></div>
                      <div><label style="font-size:12px; color:#888;">Tax</label><div style="font-weight:bold; color:#e74c3c;">-₹${pay.professional_tax}</div></div>
                      <div><label style="font-size:12px; color:#888;">LOP</label><div style="font-weight:bold; color:#e74c3c;">-₹${pay.lop_amount}</div></div>
                      <div style="grid-column:span 3; text-align:right;"><label style="font-size:12px; color:#2ecc71;">Net Pay</label><div style="font-size:18px; font-weight:bold; color:#2ecc71;">₹${pay.net_salary}</div></div>
                    </div>
                  </div>
                `;
            });
        })
        .catch(err => console.error("Error fetching payroll:", err));
  }

  // Execute all fetches
  loadOverviewData();
  fetchLeaves();
  fetchDocuments();
  fetchAttendance();
  fetchPayroll();

  // ==================================================
  // 4. TAB SWITCHING LOGIC
  // ==================================================
  window.switchTab = function (tabName) {
    document.querySelectorAll(".tab-item").forEach((tab) => tab.classList.remove("active"));
    event.currentTarget.classList.add("active");
    
    document.querySelectorAll(".tab-content").forEach((content) => (content.style.display = "none"));
    const selectedContent = document.getElementById(tabName);
    if (selectedContent) selectedContent.style.display = "block";
  };


  // ==================================================
  // 5. EDIT PROFILE MODAL (ALL FIELDS)
  // ==================================================
  
  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      if (currentEmpData) {
          console.log("Debug - Current Emp Data:", currentEmpData);

          // Helper to handle both Arrays (old backend) and Objects (new backend) safely
          const getSafeData = (dataField) => {
              if (!dataField) return {};
              return Array.isArray(dataField) ? (dataField[0] || {}) : dataField;
          };

          const other = getSafeData(currentEmpData.other_details);
          const stat = getSafeData(currentEmpData.statutory_details);
          const bank = getSafeData(currentEmpData.bank_details);

          // Profile & Personal
          document.getElementById('edit_id').value = `EMP-${currentEmpData.employee_id || currentEmpData.id || ''}`;
          document.getElementById('edit_name').value = currentEmpData.name || '';
          document.getElementById('edit_role').value = currentEmpData.role || '';
          document.getElementById('edit_dept').value = currentEmpData.department || '';
          document.getElementById('edit_email').value = currentEmpData.email || '';
          document.getElementById('edit_joinDate').value = currentEmpData.joining || '';
          document.getElementById('edit_salary').value = currentEmpData.salary || '';
          
          // Other Details 
          document.getElementById('edit_phone').value = other.mobile || '';
          document.getElementById('edit_location').value = other.address || '';
          document.getElementById('edit_marital').value = other.marital_status || 'Single';
          
          // Statutory Details
          document.getElementById('edit_stat_pan').value = stat.pan || '';
          document.getElementById('edit_stat_uan').value = stat.pf_uan || '';
          document.getElementById('edit_stat_pt').value = stat.profesional_tax || '';
          document.getElementById('edit_stat_lwf').value = stat.lwf_status || '';
          document.getElementById('edit_stat_esic_status').value = stat.esic_status || '';
          document.getElementById('edit_stat_esic_ip').value = stat.esic_ip_number || '';

          // Bank Details
          document.getElementById('edit_bank_name').value = bank.bank_name || '';
          document.getElementById('edit_bank_account').value = bank.acc_no || '';
          document.getElementById('edit_bank_ifsc').value = bank.ifsc_code || '';
      }
      document.getElementById("admEditModal").style.display = "flex";
    });
  }

  function injectEditModal() {
    if (document.getElementById("admEditModal")) return;
    const overlay = document.createElement("div");
    overlay.id = "admEditModal";
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,.45); display: none; align-items: center; justify-content: center; padding: 18px; z-index: 9999;`;
    
    overlay.innerHTML = `
    <div style="width: min(850px, 100%); background: #fff; border-radius: 12px; padding: 25px; max-height: 90vh; overflow-y: auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 style="margin:0; font-size:22px;">Edit Employee Profile</h2>
        <button onclick="document.getElementById('admEditModal').style.display='none'" style="border:none; background:#f3f4f6; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">✕</button>
      </div>
      <hr style="border:none; border-top:1px solid #eee; margin-bottom:20px;">
      
      <form id="admEditForm" onsubmit="event.preventDefault(); window.admSaveEditEmployee();">
        
        <h4 style="margin-bottom:10px; color:#4f46e5;">Profile & Personal Info</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
          <div><label style="font-size:12px; color:#666;">Employee ID</label><input type="text" id="edit_id" disabled style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; background:#f9f9f9;"></div>
          <div><label style="font-size:12px; color:#666;">Name *</label><input type="text" id="edit_name" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Role</label><input type="text" id="edit_role" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Department</label><input type="text" id="edit_dept" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Email</label><input type="email" id="edit_email" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Phone</label><input type="text" id="edit_phone" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Location / Address</label><input type="text" id="edit_location" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Marital Status</label>
            <select id="edit_marital" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; background:#fff;">
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Unmarried">Unmarried</option>
              <option value="Divorced">Divorced</option>
            </select>
          </div>
          <div><label style="font-size:12px; color:#666;">Join Date</label><input type="date" id="edit_joinDate" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Salary</label><input type="number" id="edit_salary" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
        </div>

        <hr style="border:none; border-top:1px solid #eee; margin-bottom:15px;">
        <h4 style="margin-bottom:10px; color:#4f46e5;">Statutory Information</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px; margin-bottom:25px;">
            <div><label style="font-size:12px; color:#666;">PAN</label><input type="text" id="edit_stat_pan" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; text-transform:uppercase;"></div>
            <div><label style="font-size:12px; color:#666;">UAN</label><input type="text" id="edit_stat_uan" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
            <div><label style="font-size:12px; color:#666;">Prof. Tax</label><input type="text" id="edit_stat_pt" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
            <div><label style="font-size:12px; color:#666;">LWF Status</label><input type="text" id="edit_stat_lwf" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
            <div><label style="font-size:12px; color:#666;">ESIC Status</label><input type="text" id="edit_stat_esic_status" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
            <div><label style="font-size:12px; color:#666;">ESIC IP</label><input type="text" id="edit_stat_esic_ip" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
        </div>

        <hr style="border:none; border-top:1px solid #eee; margin-bottom:15px;">
        <h4 style="margin-bottom:10px; color:#4f46e5;">Bank Details</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
          <div><label style="font-size:12px; color:#666;">Bank Name</label><input type="text" id="edit_bank_name" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div><label style="font-size:12px; color:#666;">Account Number</label><input type="text" id="edit_bank_account" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></div>
          <div style="grid-column: span 2;"><label style="font-size:12px; color:#666;">IFSC Code</label><input type="text" id="edit_bank_ifsc" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; text-transform:uppercase;"></div>
        </div>

        <div style="margin-top:30px; text-align:right;">
          <button type="button" onclick="document.getElementById('admEditModal').style.display='none'" style="padding:10px 20px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; margin-right:10px; font-weight:bold;">Cancel</button>
          <button id="saveBtn" type="submit" style="padding:10px 20px; border-radius:8px; border:none; background:#111827; color:#fff; cursor:pointer; font-weight:bold;">Save Changes</button>
        </div>
      </form>
    </div>`;
    document.body.appendChild(overlay);
  }

  // ==================================================
  // 6. API CALL TO SAVE EDITS (PATCH)
  // ==================================================
  window.admSaveEditEmployee = function () {
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    // Gather all data from the modal
    const payload = {
        name: document.getElementById('edit_name').value,
        role: document.getElementById('edit_role').value,
        department: document.getElementById('edit_dept').value,
        email: document.getElementById('edit_email').value,
        mobile: document.getElementById('edit_phone').value,
        address: document.getElementById('edit_location').value,
        marital_status: document.getElementById('edit_marital').value,
        joining: document.getElementById('edit_joinDate').value,
        salary: document.getElementById('edit_salary').value,
        
        // Statutory
        pan: document.getElementById('edit_stat_pan').value,
        pf_uan: document.getElementById('edit_stat_uan').value,
        profesional_tax: document.getElementById('edit_stat_pt').value,
        lwf_status: document.getElementById('edit_stat_lwf').value,
        esic_status: document.getElementById('edit_stat_esic_status').value,
        esic_ip_number: document.getElementById('edit_stat_esic_ip').value,
        
        // Bank
        bank_name: document.getElementById('edit_bank_name').value,
        acc_no: document.getElementById('edit_bank_account').value,
        ifsc_code: document.getElementById('edit_bank_ifsc').value
    };

    // Send PATCH request to backend
    fetch(`${API_BASE_URL}/api/update-employee/${emp_id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to update employee");
        return res.json();
    })
    .then(data => {
        document.getElementById("admEditModal").style.display = "none";
        showSuccessPopup("Profile updated successfully!");
        
        // Reload the overview data to reflect changes
        setTimeout(() => {
            window.location.reload(); 
        }, 1500);
    })
    .catch(err => {
        console.error("Error saving employee:", err);
        window.showSuccessPopup("Failed to save changes. Please check server."); // Changed from alert
        saveBtn.innerText = "Save Changes";
        saveBtn.disabled = false;
    });
  };

  // ==================================================
  // 7. API CALL TO DELETE PERMANENTLY (DELETE)
  // ==================================================
  window.admOpenModal = function(modalId) {
      document.getElementById(modalId).style.display = "flex";
  };

  window.admCloseModal = function(modalId) {
      document.getElementById(modalId).style.display = "none";
  };

  window.admPerformAction = function (actionType) {
    if (actionType === 'delete') {
        const btn = document.querySelector(".adm-btn-confirm.adm-red");
        if (btn) {
            btn.innerText = "Deleting...";
            btn.disabled = true;
        }

        fetch(`${API_BASE_URL}/api/employee-details/${emp_id}/`, {
            method: 'DELETE'
        })
        .then(res => {
            if (res.ok) {
                // Hide the modal immediately
                document.getElementById('admDeleteModal').style.display = "none";
                // Show your custom success popup
                window.showSuccessPopup("Employee deleted permanently.");
                
                // Redirect after the popup shows
                setTimeout(() => {
                    window.location.href = "../employeedashb/employee.html";
                }, 1500);
            } else {
                throw new Error("Failed to delete");
            }
        })
        .catch(err => {
            console.error("Error deleting employee:", err);
            window.showSuccessPopup("Error: Could not delete employee.");
            if (btn) {
                btn.innerText = "Delete Permanently";
                btn.disabled = false;
            }
        })
        .finally(() => {
            // Ensure all overlays are hidden if the redirect hasn't happened yet
            document.querySelectorAll('.adm-modal-overlay').forEach(el => {
                el.style.display = "none";
            });
        });
    }
};

  // ==================================================
  // 8. SUCCESS POPUP INJECTION
  // ==================================================
  function injectSuccessPopup() {
    if (document.getElementById("admSuccessPopup")) return;
    const el = document.createElement("div");
    el.id = "admSuccessPopup";
    el.style.cssText = `position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,.45); z-index: 10000;`;
    el.innerHTML = `
      <div style="background: #fff; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        <i class="fa-solid fa-circle-check" style="font-size: 45px; color: #2ecc71; margin-bottom: 15px;"></i>
        <h3 style="margin: 0 0 10px 0; color:#333;" id="successMsgText">Success</h3>
      </div>`;
    document.body.appendChild(el);
  }

  window.showSuccessPopup = function(msg) {
      document.getElementById("successMsgText").innerText = msg;
      const popup = document.getElementById("admSuccessPopup");
      popup.style.display = "flex";
      setTimeout(() => { popup.style.display = "none"; }, 1500);
  }

  // ==================================================
  // 9. DOWNLOAD LOGIC
  // ==================================================
  window.closeDownloadModal = function () {
    const modal = document.getElementById("downloadModal");
    if (modal) modal.classList.remove("active");
  };

  document.getElementById("downloadProfileBtn")?.addEventListener("click", function () {
      const modal = document.getElementById("downloadModal");
      if (modal) modal.classList.add("active");
  });

  window.downloadAsCSV = function () {
    window.showSuccessPopup("Downloading CSV...");
    window.closeDownloadModal();
  };

  window.downloadAsPDF = function () {
    window.closeDownloadModal();
    const element = document.querySelector(".main-container");
    const opt = {
      margin: 0.3,
      filename: `Employee_Profile.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    if (typeof html2pdf !== "undefined") {
      html2pdf().set(opt).from(element).save();
    } else {
      window.showSuccessPopup("PDF Library not loaded.");
    }
  };
});