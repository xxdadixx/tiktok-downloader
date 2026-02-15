(function () {

    function findVideoUrl(videoElement) {
        // 1. ถ้าเป็นหน้าคลิปเดี่ยว (URL Bar มี /video/) ให้ใช้ URL นั้นเลย
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }

        let current = videoElement;
        
        // 2. ไต่ระดับหา Parent ขึ้นไปเรื่อยๆ (สูงสุด 10 ชั้น)
        for (let i = 0; i < 10; i++) {
            if (!current.parentElement || current.tagName === 'BODY') break;
            
            const parent = current.parentElement;

            // --- [จุดสำคัญที่เพิ่มเข้ามา] Safety Stop ---
            // เช็คว่าใน Parent นี้มีวิดีโออยู่กี่ตัว?
            // ปกติ 1 โพสต์จะมีวิดีโอ 1-2 ตัว (ตัวหลัก + ตัวเบลอพื้นหลัง)
            // แต่ถ้าเจอมากกว่า 2 ตัว (เช่น 3, 4, 5...) แสดงว่าเราหลุดออกมาที่ "Feed รวม" แล้ว
            const videosInParent = parent.querySelectorAll('video');
            if (videosInParent.length > 2) {
                console.log("Stopping search: Reached main feed container.");
                break; // หยุดทันที! ห้ามหาต่อ เดี๋ยวไปเจอลิงก์ของคลิปอื่น
            }

            // 3. ค้นหาลิงก์ในชั้นนี้ (ที่ปลอดภัย)
            const links = parent.querySelectorAll('a');
            for (const link of links) {
                // ต้องเป็นลิงก์ที่มีรูปแบบ /video/12345... เท่านั้น
                if (link.href && /\/video\/\d+/.test(link.href)) {
                    return link.href;
                }
            }

            // ขยับขึ้นไปหาชั้นถัดไป
            current = parent;
        }

        // 4. ถ้าหาไม่เจอจริงๆ ในขอบเขตของตัวเอง ให้ return null (ดีกว่าส่งลิงก์ผิดไปโหลด)
        return null;
    }

    function processVideo(video) {
        let container = video.parentElement;
        
        // Logic หา Container วางปุ่ม (เหมือนเดิม)
        for (let i = 0; i < 5; i++) {
            if (!container || !container.parentElement) break;
            const rect = container.getBoundingClientRect();
            const videoRect = video.getBoundingClientRect();
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
                // แจ้งเตือนถ้าหาลิงก์ไม่เจอ (ดีกว่าไปโหลดคลิปอื่นมาให้)
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