document.addEventListener("DOMContentLoaded", () => {
    // Selecting DOM Elements
    const deleteButton = document.getElementById("delete-image");
    const displayedImage = document.getElementById("displayed-image");
    const dissolveFilter = document.getElementById("dissolve-filter");
    const displacementMap = dissolveFilter.querySelector("feDisplacementMap");
    const bigNoise = dissolveFilter.querySelector('feTurbulence[result="bigNoise"]');
    const safariWarning = document.querySelector(".safari-warning");
    const mainContainer = document.querySelector(".container");
    const uploadForm = document.getElementById("upload-form");
    const uploadStatus = document.getElementById("upload-status");
    const fileInput = document.getElementById("file-input");
    const uploadContainer = document.getElementById("upload-container");
    const previewContainer = document.querySelector(".preview-container");
    const previewImage = document.getElementById("preview-image");

    let isAnimating = false;
    let currentFilename = null;

    function isSafariBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
    }

    if (isSafariBrowser()) {
        mainContainer.classList.add("hidden");
        safariWarning.classList.remove("hidden");
        return;
    }

    // Preview functionality
    function showPreview(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        showPreview(file);
    });

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

    function handleDrop(e) {
        preventDefaults(e);
        unhighlight();

        const dt = e.dataTransfer;
        const file = dt.files[0];

        if (file && file.type.startsWith('image/')) {
            fileInput.files = dt.files;
            showPreview(file);
        } else {
            uploadStatus.textContent = "Please drop an image file";
            uploadStatus.className = "error";
        }
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
    });

    uploadContainer.addEventListener('drop', handleDrop, false);

    function setRandomSeed() {
        const randomSeed = Math.floor(Math.random() * 1000);
        bigNoise.setAttribute("seed", randomSeed);
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    const maxDisplacementScale = 2000;

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
                // Reset the preview
                previewContainer.style.display = 'none';
                previewImage.src = '';
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            uploadStatus.textContent = "Error deleting image";
            uploadStatus.className = "error";
        }
    }

    deleteButton.addEventListener("click", async () => {
        if (isAnimating || displayedImage.style.display === "none") return;
        isAnimating = true;

        setRandomSeed();
        deleteButton.classList.add("hidden");

        const duration = 1000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            const displacementScale = easedProgress * maxDisplacementScale;
            displacementMap.setAttribute("scale", displacementScale);

            const scaleFactor = 1 + 0.1 * easedProgress;
            displayedImage.style.transform = `scale(${scaleFactor})`;

            let opacity = progress < 0.5 ? 1 : 1 - ((progress - 0.5) / 0.5);
            displayedImage.style.opacity = opacity;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(async () => {
                    await deleteImage();
                    displayedImage.style.transform = "scale(1)";
                    displayedImage.style.opacity = "1";
                    displacementMap.setAttribute("scale", "0");
                    isAnimating = false;
                }, 0);
            }
        }

        requestAnimationFrame(animate);
    });

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        
        if (!file) {
            uploadStatus.textContent = "Please select a file";
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
                displayedImage.src = `/static/uploads/${result.filename}`;
                displayedImage.style.display = "block";
                deleteButton.classList.remove("hidden");
                
                // Reset form and preview
                uploadForm.reset();
                previewContainer.style.display = 'none';
                previewImage.src = '';
            } else {
                uploadStatus.textContent = result.error || "Upload failed";
                uploadStatus.className = "error";
            }
        } catch (error) {
            uploadStatus.textContent = "Upload failed";
            uploadStatus.className = "error";
            console.error("Upload error:", error);
        }
    });
});
