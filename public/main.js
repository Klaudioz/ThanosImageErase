document.addEventListener("DOMContentLoaded", () => {
    // Theme Toggle Functionality
    const themeToggle = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;
    const themeIcon = themeToggle.querySelector("i");

    // Get theme from localStorage or default to dark
    const currentTheme = localStorage.getItem("theme") || "dark";
    htmlElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(currentTheme);

    function updateThemeIcon(theme) {
        themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }

    themeToggle.addEventListener("click", () => {
        const currentTheme = htmlElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        
        htmlElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme);
    });

    // Selecting DOM Elements
    const deleteButton = document.getElementById("delete-image");
    const displayedImage = document.getElementById("displayed-image");
    const dissolveFilter = document.getElementById("dissolve-filter");
    const displacementMap = dissolveFilter.querySelector("feDisplacementMap");
    const bigNoise = dissolveFilter.querySelector('feTurbulence[result="bigNoise"]');
    const safariWarning = document.querySelector(".safari-warning");
    const mainContainer = document.querySelector(".container");
    const uploadContainer = document.getElementById("upload-container");
    const uploadStatus = document.getElementById("upload-status");

    let isAnimating = false;
    let currentFilename = null;

    // Check if the browser is Safari
    function isSafariBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
    }

    if (isSafariBrowser()) {
        mainContainer.classList.add("hidden");
        safariWarning.classList.remove("hidden");
        return;
    }

    // Drag and Drop handlers
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        uploadContainer.classList.add('drag-over');
    }

    function unhighlight() {
        uploadContainer.classList.remove('drag-over');
    }

    async function uploadFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            uploadStatus.textContent = "Please drop an image file";
            uploadStatus.className = "error";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            uploadStatus.textContent = "Uploading...";
            uploadStatus.className = "";

            const response = await fetch("https://thanos-snap.replit.app/upload", {
                method: "POST",
                body: formData,
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                uploadStatus.textContent = "Upload successful!";
                uploadStatus.className = "success";
                
                currentFilename = result.filename;
                displayedImage.src = `https://thanos-snap.replit.app/public/uploads/${result.filename}`;
                displayedImage.style.display = "block";
                displayedImage.style.opacity = "1";
                displayedImage.style.transform = "scale(1)";
                deleteButton.classList.remove("hidden");
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error) {
            uploadStatus.textContent = `Upload failed: ${error.message}`;
            uploadStatus.className = "error";
            console.error("Upload error:", error);
        }
    }

    async function handleDrop(e) {
        preventDefaults(e);
        unhighlight();

        const dt = e.dataTransfer;
        const file = dt.files[0];
        
        if (file) {
            await uploadFile(file);
        }
    }

    async function deleteImage() {
        if (!currentFilename) return;

        try {
            const response = await fetch(`https://thanos-snap.replit.app/delete/${currentFilename}`, {
                method: 'DELETE',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                displayedImage.style.display = "none";
                currentFilename = null;
                deleteButton.classList.add("hidden");
            } else {
                throw new Error(result.error || "Delete failed");
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            uploadStatus.textContent = `Delete failed: ${error.message}`;
            uploadStatus.className = "error";
        }
    }

    // Event Listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight);
    });

    uploadContainer.addEventListener('drop', handleDrop);
    deleteButton.addEventListener('click', () => {
        if (isAnimating) return;
        
        isAnimating = true;
        const duration = 2000;
        const startTime = performance.now();
        const maxDisplacementScale = 1500;

        function easeInOutCubic(t) {
            return t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);

            const scale = easedProgress * maxDisplacementScale;
            displacementMap.setAttribute("scale", scale);

            const scaleFactor = 1 + 0.15 * easedProgress;
            displayedImage.style.transform = `scale(${scaleFactor})`;

            if (progress < 0.6) {
                displayedImage.style.opacity = 1;
            } else {
                const opacityProgress = (progress - 0.6) / 0.4;
                displayedImage.style.opacity = 1 - easeInOutCubic(opacityProgress);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                deleteImage();
                isAnimating = false;
            }
        }

        deleteButton.classList.add("hidden");
        requestAnimationFrame(animate);
    });
});
