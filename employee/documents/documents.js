document.addEventListener('DOMContentLoaded', function() {
    const emp_id = localStorage.getItem('employee_id','123')
    console.log(emp_id)
   fetch(`http://13.51.167.95:8000/api/employee/dashboard/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            console.log(data)
            document.getElementById("name").innerText = data.name;
            document.getElementById("role").innerText = data.role;})

    // Required documents list
    const requiredDocs = [
        { key: 'bank_details', label: 'Bank Details', icon: 'fa-university' },
        { key: 'pan', label: 'PAN', icon: 'fa-id-card' },
        { key: '10_class_marks', label: '10th Class', icon: 'fa-graduation-cap' },
        { key: 'inter', label: 'Intermediate', icon: 'fa-school' },
        { key: 'btech', label: 'B.Tech', icon: 'fa-university' },
        { key: 'photo', label: 'Photo', icon: 'fa-camera' },
        { key: 'aadhar', label: 'Aadhar', icon: 'fa-id-card' }
    ];

    // Function to update progress bar
    function updateProgressBar(uploadedDocs) {
        const uploadedTypes = uploadedDocs.map(d => d.doc_type.toLowerCase());
        const uploadedSet = new Set(uploadedTypes);
        
        let count = 0;
        requiredDocs.forEach(doc => {
            if (uploadedSet.has(doc.key)) {
                count++;
            }
        });

        const percentage = Math.round((count / requiredDocs.length) * 100);
        
        // Update progress bar
        const progressBar = document.getElementById('docProgressBar');
        const progressPercent = document.getElementById('docProgressPercent');
        const progressText = document.getElementById('docProgressText');
        const requiredList = document.getElementById('docRequiredList');

        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        if (progressPercent) {
            progressPercent.textContent = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = count + ' of ' + requiredDocs.length + ' documents uploaded';
        }

        // Update required documents list
        if (requiredList) {
            requiredList.innerHTML = '';
            requiredDocs.forEach(doc => {
                const isUploaded = uploadedSet.has(doc.key);
                const item = document.createElement('div');
                item.className = 'doc-doc-item' + (isUploaded ? ' uploaded' : '');
                item.innerHTML = `<i class="fa-solid ${doc.icon}"></i> ${doc.label}`;
                requiredList.appendChild(item);
            });
        }
    }

    function documents_table(){
    function formatDate(isoString) {
    const date = new Date(isoString); // Convert ISO string to Date object
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        // second: '2-digit',
        hour12: true 
    };
    return date.toLocaleString('en-IN', options); // Format according to locale
}


        
    
    const documentstable = document.getElementById('table-documents')
    fetch(`http://13.51.167.95:8000/api/employee-documents/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            documentstable.innerHTML = "";
            console.log(data)
            if (!data || data.length === 0) {
                documnets.innerHTML = `<tr><td colspan="4">No documnets found</td></tr>`;
                return;
            }

            // Update progress bar with uploaded documents
            updateProgressBar(data);

            data.forEach(p => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${formatDate(p.uploaded_at)}</td>
                    <td>${p.doc_type}</td>
                    <td>${p.description}</td>
                    <td> <a href="http://13.51.167.95${p.file}" target="_blank">View
                    </a></td>
                `;
                documentstable.appendChild(row);
            });
        })}
setInterval(documents_table,1000)
        // .catch(err => {
        //     console.error("Error fetching payslips:", err);
        //     payslipTableBody.innerHTML = `<tr><td colspan="4">Error loading documents</td></tr>`;
        // });

    // Select elements using the NEW UNIQUE IDs
    const docInput = document.getElementById('docFileInput');
    const docArea = document.getElementById('docDropArea');
    const docText = document.getElementById('docFileName');
    const docForm = document.getElementById('docUniqueUploadForm');

    // 1. Handle file selection via Click
    if(docInput) {
        docInput.addEventListener('change', function() {
            handleDocFiles(this.files);
        });
    }

    // 2. Handle Drag and Drop Visuals
    if(docArea) {
        // Drag Over
        docArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            docArea.style.borderColor = '#ff6b00';
            docArea.style.backgroundColor = '#fff8f0';
        });

        // Drag Leave
        docArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            docArea.style.borderColor = '#e0e0e0';
            docArea.style.backgroundColor = '#fafafa';
        });

        // Drop
        docArea.addEventListener('drop', (e) => {
            e.preventDefault();
            docArea.style.borderColor = '#e0e0e0';
            docArea.style.backgroundColor = '#fafafa';
            
            // Transfer files to input
            if(docInput) {
                docInput.files = e.dataTransfer.files;
                handleDocFiles(docInput.files);
            }
        });
    }

    // 3. Update Text Helper
    function handleDocFiles(files) {
        if (files.length > 0) {
            if (files.length === 1) {
                docText.textContent = files[0].name;
                docText.style.color = '#2c3e50'; // Dark text
            } else {
                docText.textContent = `${files.length} files ready to upload`;
                docText.style.color = '#2c3e50';
            }
        } else {
            docText.innerHTML = 'Click to browse';
            docText.style.color = '#ff6b00'; // Orange
        }
    }

    // 4. Form Submit Demo
    if (docForm) {
    docForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();

        formData.append("doc_type", document.getElementById("docTypeSelect").value);
        formData.append("description", document.getElementById("docDescInput").value);
        formData.append("file", document.getElementById("docFileInput").files[0]);

        console.log(document.getElementById("docFileInput").files[0]);

        fetch(`http://13.51.167.95:8000/api/upload-documents/${emp_id}/`, {
            method: "POST",
            body: formData
        })
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(result => {

            console.log("Response status:", result.status);
            console.log("Response body:", result.body);

            const popup = document.getElementById('uploadSuccessPopup');

            if(result.status === 201 || result.status === 200){
                if (popup) popup.classList.add('show');
            } else {
                alert("Upload failed: " + JSON.stringify(result.body));
            }

        })
        .catch(error => {
            console.error("Error:", error);
        });

    });
}

const popupCloseBtn = document.getElementById('uploadPopupClose');

if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', function() {
        const popup = document.getElementById('uploadSuccessPopup');
        if (popup) popup.classList.remove('show');
    });
}
});