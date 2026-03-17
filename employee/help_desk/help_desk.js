document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. WhatsApp Dynamic Link ---

    const waNumber = "919491209900"; // Replace with company number
    const waMessage = "Hello sir";

    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
    
    const waCard = document.getElementById("whatsapp-card");
    if(waCard) {
        waCard.href = waLink;
    }

    // --- 2. FAQ Accordion Logic ---
    const accordions = document.querySelectorAll(".accordion-header");

    accordions.forEach(acc => {
        acc.addEventListener("click", function() {
            // Toggle active class on header
            this.classList.toggle("active");

            // Toggle panel content
            const panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                // Close other open panels (Optional - currently allows multiple open)
                document.querySelectorAll(".accordion-content").forEach(p => p.style.maxHeight = null);
                document.querySelectorAll(".accordion-header").forEach(h => h.classList.remove("active"));
                
                // Re-add active class to clicked one
                this.classList.add("active");
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });
});

// --- 3. Quick Action Popup (Toast Notification) ---
function handleQuickAction(actionName) {
    showToast(`Request initiated: ${actionName}`);
    
    // Simulate backend call
    console.log(`Sending request for: ${actionName}`);
}

function showToast(message) {
    const container = document.getElementById("toast-container");

    // Create toast element
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s ease forwards";
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}