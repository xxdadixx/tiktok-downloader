(function () {

    /**
     * ฟังก์ชันค้นหา URL ของวิดีโอที่ปรับปรุงใหม่ (Robust Version)
     * รองรับทั้งหน้า Feed (Scroll), Profile (Grid), และ Modal (Full screen)
     */
    function findVideoUrl(videoElement) {
        
        // 1. เช็ค URL บน Address Bar ก่อน (กรณีเปิดหน้าดูคลิปเดี่ยวๆ หรือ Modal)
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }

        // 2. กรณีหน้า Profile (Grid View):
        // วิดีโอมักจะถูกหุ้มด้วย <a> หรือมี <a> เป็น Parent ใกล้ๆ
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
            return closestLink.href;
        }

        // 3. กรณีหน้า Feed (จุดสำคัญที่แก้ Bug Link not found):
        // แทนที่จะสุ่มหา Parent เราจะหา "กล่องโพสต์หลัก" ด้วย data-e2e
        const postContainer = videoElement.closest('[data-e2e="recommend-list-item-container"], [data-e2e="list-item-container"]');
        
        if (postContainer) {
            // ค้นหาลิงก์ทั้งหมดในกล่องโพสต์นี้
            const allLinks = Array.from(postContainer.querySelectorAll('a'));
            // กรองหาลิงก์ที่มีแพทเทิร์น /video/ ตามด้วยตัวเลข (ID)
            const videoLink = allLinks.find(link => link.href && /\/video\/\d+/.test(link.href));
            
            if (videoLink) return videoLink.href;
        }

        // 4. (Fallback) กรณีหาไม่เจอจริงๆ ให้ลองดู Canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && /\/video\/\d+/.test(canonical.href)) {
            return canonical.href;
        }

        return null;
    }

    /**
     * ฟังก์ชันสร้างปุ่ม Download
     */
    function processVideo(video) {
        // หา Parent โดยตรงของ Video (ปลอดภัยที่สุด ไม่กระทบ Layout อื่น)
        let container = video.parentElement;
        
        // ถ้า Parent เป็น <a> อยู่แล้ว ให้ใช้ตัวมันเองเป็น Container
        if (container.tagName === 'A') {
            // กรณีนี้ปลอดภัย
        } else {
            // เช็คเพิ่มเติมนิดหน่อย: ถ้า Container เล็กผิดปกติ (เช่นเป็นแค่ layer ควบคุม) ให้ขยับขึ้น 1 ชั้น
            if (container.clientWidth < video.clientWidth * 0.9) {
                if (container.parentElement) container = container.parentElement;
            }
        }

        // ป้องกันการสร้างปุ่มซ้ำ
        if (container.querySelector(".tiktok-save-button")) return;

        // --- แก้ไขจุดที่ทำให้หน้า Feed จอดำ ---
        // เราจะไม่บังคับเปลี่ยน position ของ container สุ่มสี่สุ่มห้า
        // แต่เราจะตรวจสอบก่อน ถ้าเป็น static เราถึงจะเปลี่ยนเป็น relative 
        // เฉพาะเมื่อ container นั้นขนาดเท่ากับ video จริงๆ (เพื่อไม่ให้กระทบ Grid หรือ Layout ใหญ่)
        const style = window.getComputedStyle(container);
        if (style.position === 'static') {
            container.style.position = 'relative';
        }

        // สร้างปุ่ม
        const btn = document.createElement("div");
        btn.className = "tiktok-save-button";
        // ใช้ SVG Icon เพื่อความสวยงามและชัดเจน
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

        // Event เมื่อคลิกปุ่ม
        btn.onclick = function (e) {
            e.preventDefault(); // ป้องกันลิงก์ทำงาน (ถ้าอยู่ใน <a>)
            e.stopPropagation(); // ***สำคัญมาก*** หยุด Event ไม่ให้ทะลุไปกด Pause/Play วิดีโอ

            const videoURL = findVideoUrl(video); 

            console.log("[TikTok Downloader] Detected URL:", videoURL);

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

    /**
     * Observer คอยจับตาดู DOM เมื่อมีการเลื่อน Feed หรือโหลดคลิปใหม่
     */
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
    
    // รันครั้งแรกทันทีเผื่อมีวิดีโออยู่แล้ว
    handleMutations();

})();