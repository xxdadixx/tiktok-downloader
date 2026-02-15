(function () {

    // ฟังก์ชันค้นหา URL แบบแม่นยำ โดยเช็คจำนวน ID เพื่อป้องกันการหยิบผิดคลิป
    function findVideoUrl(videoElement) {
        
        // 1. เช็ค URL ของหน้าเว็บ (กรณีเปิดหน้าคลิปเดี่ยวๆ)
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }

        // 2. เช็คว่าตัววิดีโอถูกหุ้มด้วยลิงก์อยู่แล้วหรือไม่ (กรณีหน้า Profile Grid)
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
             return closestLink.href;
        }

        let current = videoElement;
        
        // 3. ไต่ระดับหา Parent ขึ้นไปเรื่อยๆ (สูงสุด 15 ชั้น)
        for (let i = 0; i < 15; i++) {
            // หยุดถ้าไม่มี Parent หรือหลุดไปถึง Body
            if (!current.parentElement || current.tagName === 'BODY') break;
            
            const parent = current.parentElement;

            // --- ค้นหาลิงก์วิดีโอทั้งหมดในชั้นนี้ ---
            // แปลง NodeList เป็น Array เพื่อใช้ filter
            const allLinks = Array.from(parent.querySelectorAll('a'));
            
            // กรองเอาเฉพาะลิงก์ที่เป็นลิงก์วิดีโอ (ต้องมี /video/ และตัวเลข ID)
            const videoLinks = allLinks.filter(link => link.href && /\/video\/(\d+)/.test(link.href));
            
            if (videoLinks.length > 0) {
                // เก็บ Video ID ที่ไม่ซ้ำกัน เพื่อตรวจสอบว่าเราอยู่ใน "Post เดียว" หรือ "Feed รวม"
                const uniqueIds = new Set();
                let targetUrl = null;

                videoLinks.forEach(link => {
                    const match = link.href.match(/\/video\/(\d+)/);
                    if (match && match[1]) {
                        uniqueIds.add(match[1]);
                        targetUrl = link.href; // เก็บ URL ล่าสุดไว้
                    }
                });

                // --- [จุดตัดสินใจสำคัญ] ---
                
                // กรณี A: เจอ ID มากกว่า 1 ตัวในกล่องเดียว 
                // (เช่น เจอทั้งคลิป A และคลิป B อยู่ด้วยกัน)
                // แปลว่าเราหลุดออกมาที่ "Main Feed Container" แล้ว
                if (uniqueIds.size > 1) {
                    console.log("[TikTok Downloader] Stopped: Found multiple video IDs. Avoided downloading wrong video.");
                    break; // หยุดทันที! ห้ามหาต่อ เดี๋ยวจะได้ลิงก์ผิด
                }

                // กรณี B: เจอแค่ 1 ID เท่านั้น
                // แปลว่านี่คือ "Post Container" ของคลิปนั้นจริงๆ
                if (uniqueIds.size === 1) {
                    return targetUrl;
                }
            }

            // ขยับขึ้นไปหาชั้นถัดไป
            current = parent;
        }

        // 4. (ทางเลือกสุดท้าย) ถ้าหาไม่เจอจริงๆ ลองดู Canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && /\/video\/\d+/.test(canonical.href)) {
            return canonical.href;
        }

        return null;
    }

    function processVideo(video) {
        let container = video.parentElement;
        
        // Logic หา Container สำหรับวางปุ่ม (UI)
        for (let i = 0; i < 5; i++) {
            if (!container || !container.parentElement) break;
            const rect = container.getBoundingClientRect();
            const videoRect = video.getBoundingClientRect();
            // ถ้า Container ใหญ่เกินไป (เริ่มหลุดกรอบ Video) ให้หยุด
            if (rect.width > videoRect.width * 1.5 || rect.height > videoRect.height * 1.5) {
                break;
            }
            container = container.parentElement;
        }

        if (container.querySelector(".tiktok-save-button")) return;

        container.style.position = "relative";
        
        const btn = document.createElement("div");
        btn.className = "tiktok-save-button";
        btn.innerText = "↓";

        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();

            const videoURL = findVideoUrl(video); 

            console.log("[TikTok Downloader] Target URL:", videoURL);

            if (videoURL) {
                const target = "https://savetik.co/?video=" + encodeURIComponent(videoURL);
                chrome.runtime.sendMessage({
                    action: "openSaveTik",
                    url: target
                });
            } else {
                alert("Error: Link not found. Please try opening the video in full screen mode.");
            }
        };

        container.appendChild(btn);
    }

    function handleMutations() {
        const videos = document.querySelectorAll("video");
        videos.forEach(video => {
            processVideo(video);
        });
    }

    const observer = new MutationObserver(() => {
        handleMutations();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    handleMutations();

})();