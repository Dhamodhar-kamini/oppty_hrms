document.addEventListener('DOMContentLoaded', function() {
    const emp_id = localStorage.getItem('employee_id') || '123';
    let documentIdToDelete = null;

    // --- 1. Fetch Basic Info ---
    fetch(`https://api.theoppty.com/api/employee/dashboard/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            if(document.getElementById("name")) document.getElementById("name").innerText = data.name;
            if(document.getElementById("role")) document.getElementById("role").innerText = data.role;
        });

    const requiredDocs = [
        { key: 'bank_details', label: 'Bank Details', icon: 'fa-university' },
        { key: 'pan', label: 'PAN', icon: 'fa-id-card' },
        { key: '10_class_marks', label: '10th Class', icon: 'fa-graduation-cap' },
        { key: 'inter', label: 'Intermediate', icon: 'fa-school' },
        { key: 'btech', label: 'B.Tech', icon: 'fa-university' },
        { key: 'photo', label: 'Photo', icon: 'fa-camera' },
        { key: 'aadhar', label: 'Aadhar', icon: 'fa-id-card' }
    ];

    // --- 2. Progress Bar Logic ---
    function updateProgressBar(uploadedDocs) {
        const uploadedSet = new Set(uploadedDocs.map(d => d.doc_type.toLowerCase()));
        let count = 0;
        const requiredList = document.getElementById('docRequiredList');
        if (requiredList) requiredList.innerHTML = '';

        requiredDocs.forEach(doc => {
            const isUploaded = uploadedSet.has(doc.key.toLowerCase());
            if (isUploaded) count++;

            if (requiredList) {
                const item = document.createElement('div');
                item.className = 'doc-doc-item' + (isUploaded ? ' uploaded' : '');
                item.innerHTML = `<i class="fa-solid ${doc.icon}"></i> ${doc.label} ${isUploaded ? '<i class="fa-solid fa-circle-check" style="float:right; margin-left:30px; color:#27ae60"></i>' : ''}`;
                requiredList.appendChild(item);
            }
        });

        const percentage = Math.round((count / requiredDocs.length) * 100);
        const progressBar = document.getElementById('docProgressBar');
        const progressPercent = document.getElementById('docProgressPercent');
        const progressText = document.getElementById('docProgressText');

        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressPercent) progressPercent.textContent = percentage + '%';
        if (progressText) progressText.textContent = `${count} of ${requiredDocs.length} documents uploaded`;
    }

    // --- 3. Table Rendering ---
    window.documents_table = function() {
        const documentstable = document.getElementById('table-documents');
        fetch(`https://api.theoppty.com/api/employee-documents/${emp_id}/`)
            .then(res => res.json())
            .then(data => {
                if(!documentstable) return;
                documentstable.innerHTML = "";
                if (!data || data.length === 0) {
                    documentstable.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No documents found</td></tr>`;
                    updateProgressBar([]);
                    return;
                }

                updateProgressBar(data);

                data.forEach(p => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${new Date(p.uploaded_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</td>
                        <td style="text-transform: capitalize;">${p.doc_type.replace(/_/g, ' ')}</td>
                        <td>${p.description || '-'}</td>
                        <td><a href="https://api.theoppty.com${p.file}" target="_blank" style="color:#ff6b00; font-weight:600; text-decoration:none;">View</a></td>
                        <td>
                            <button onclick="openDeleteModal(${p.id})" style="background:none; border:none; color:#e74c3c; cursor:pointer;">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    `;
                    documentstable.appendChild(row);
                });
            });
    }

    // --- 4. Delete Logic ---
window.openDeleteModal = function(id) {
    documentIdToDelete = id;  // ✅ store id correctly
    document.getElementById('deleteConfirmModal').classList.add('show');
}

window.closeDeleteModal = function() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
}

window.confirmDelete = function() {
    if (!documentIdToDelete) return;

    fetch('https://api.theoppty.com/api/document-delete/', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            doc_id: documentIdToDelete,   // ✅ correct id
            employee_id: emp_id
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);

        // Close modal
        closeDeleteModal();

        // Show success popup
        document.getElementById('deleteSuccessPopup').classList.add('show');

        // Refresh table
        documents_table();

        // Reset id
        documentIdToDelete = null;
    })
    .catch(err => {
        console.error(err);
        alert("Delete failed");
    });
}

window.closeDeleteSuccess = function() {
    document.getElementById('deleteSuccessPopup').classList.remove('show');
}
    // --- 5. Upload Logic & Popup Fix ---
    const docForm = document.getElementById('docUniqueUploadForm');
    const docInput = document.getElementById('docFileInput');
    const docText = document.getElementById('docFileName');

    if (docForm) {
        docForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const file = docInput.files[0];
            if(!file) { alert("Please select a file."); return; }

            const formData = new FormData();
            formData.append("doc_type", document.getElementById("docTypeSelect").value);
            formData.append("description", document.getElementById("docDescInput").value);
            formData.append("file", file);

            fetch(`https://api.theoppty.com/api/upload-documents/${emp_id}/`, {
                method: "POST",
                body: formData
            })
            .then(res => {
                if(res.ok) {
                    // Show Popup
                    document.getElementById('uploadSuccessPopup').classList.add('show');
                    // Reset Form and UI Text
                    docForm.reset();
                    if(docText) docText.innerHTML = 'Click to browse';
                    // Refresh table & progress bar
                    documents_table(); 
                } else {
                    alert("Upload failed.");
                }
            });
        });
    }

    // Fix for the OK button on Success Popup
    const uploadPopupClose = document.getElementById('uploadPopupClose');
    if (uploadPopupClose) {
        uploadPopupClose.addEventListener('click', function() {
            document.getElementById('uploadSuccessPopup').classList.remove('show');
        });
    }

    // --- 6. Visual File Name Handling ---
    if(docInput && docText) {
        docInput.addEventListener('change', function() {
            if(this.files.length > 0) {
                docText.textContent = this.files[0].name;
                docText.style.color = "#2c3e50"; // Visual feedback for selected file
            }
        });
    }

    // Initial Load
    documents_table();
});