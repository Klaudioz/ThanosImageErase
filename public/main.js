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

            const response = await fetch("/upload", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                uploadStatus.textContent = "Upload successful!";
                uploadStatus.className = "success";
                
                // Display the uploaded image
                currentFilename = result.filename;
                displayedImage.src = `/public/uploads/${result.filename}`;
                displayedImage.style.display = "block";
                displayedImage.style.opacity = "1";
                displayedImage.style.transform = "scale(1)";
                deleteButton.classList.remove("hidden");
            } else {
                uploadStatus.textContent = result.error || "Upload failed";
                uploadStatus.className = "error";
            }
        } catch (error) {
            uploadStatus.textContent = "Upload failed";
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
            const response = await fetch(`/delete/${currentFilename}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                displayedImage.style.display = "none";
                currentFilename = null;
                deleteButton.classList.add("hidden");
            }
        } catch (error) {
            console.error('Error deleting image:', error);
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
        const duration = 2000; // Increased from 1000ms to 2000ms
        const startTime = performance.now();
        const maxDisplacementScale = 1500; // Adjusted for smoother effect

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

            // Smoother scale animation
            const scaleFactor = 1 + 0.15 * easedProgress;
            displayedImage.style.transform = `scale(${scaleFactor})`;

            // Smoother opacity transition
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
