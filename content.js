(function () {

    /**
     * ฟังก์ชันสำหรับค้นหา URL ของวิดีโอจาก DOM Element
     * รองรับ: Feed, For You Page, Profile Grid, Modal/Theater Mode
     */
    function findVideoUrl(videoElement) {
        
        // 1. ตรวจสอบ URL บน Address Bar ก่อน (กรณีเปิดหน้าดูคลิปเดี่ยวๆ)
        // Regex: ต้องมี /video/ ตามด้วยตัวเลข ID
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }

        // 2. กรณีหน้า Profile หรือ Grid View บางที video จะถูกหุ้มด้วย <a> โดยตรง
        // ให้ลองหา <a> ที่ใกล้ตัว video ที่สุดก่อน
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
            return closestLink.href;
        }

        // 3. เริ่มกระบวนการไต่ DOM (Traversal) สำหรับหน้า Feed
        let current = videoElement;
        
        // วนลูปไต่ขึ้นไปหา Parent เรื่อยๆ (กำหนด Max ไว้ 12 ชั้น กันหลุดไปไกลถึง Body)
        for (let i = 0; i < 12; i++) {
            // ถ้าไม่มี Parent หรือหลุดไปถึง Body ให้หยุด
            if (!current.parentElement || current.tagName === 'BODY') break;
            
            const parent = current.parentElement;

            // --- ค้นหาลิงก์ในชั้นนี้ (Scope: Parent ปัจจุบัน) ---
            // เราหา <a> ทั้งหมดที่มี href ประกอบด้วย "/video/"
            const candidateLinks = parent.querySelectorAll('a[href*="/video/"]');
            
            for (const link of candidateLinks) {
                // ตรวจสอบความถูกต้องด้วย Regex อีกครั้งเพื่อให้ชัวร์
                // ต้องเป็นรูปแบบ: .../video/1234567890... (ต้องมีตัวเลข)
                // เพื่อป้องกันลิงก์ที่เป็นแค่ Hashtag หรือ User Profile ที่อาจมีคำว่า video ปนมา
                if (link.href && /\/video\/\d+/.test(link.href)) {
                    
                    // เจอแล้ว! คืนค่าทันที
                    // การคืนค่าทันทีที่เจอในชั้นที่ต่ำที่สุด (Closest) จะช่วยการันตีว่า
                    // เราได้ลิงก์ของคลิปนี้จริงๆ ไม่ใช่ลิงก์ของคลิปอื่นที่อยู่ไกลออกไป
                    return link.href;
                }
            }

            // ถ้ายังไม่เจอในชั้นนี้ ให้ขยับขึ้นไปหาชั้นถัดไป
            current = parent;
        }

        // 4. (Fallback) กรณีหาไม่เจอจริงๆ ลองดู Canonical URL ใน Head
        // TikTok มักจะอัปเดต Canonical Link ตามคลิปที่เล่นอยู่ (ในบางกรณี)
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && /\/video\/\d+/.test(canonical.href)) {
            // เช็คเพิ่มเติมว่าเราไม่ได้อยู่หน้า Feed รวม (เพราะ Canonical ของหน้า Feed อาจไม่ตรงกับคลิป)
            // แต่มักจะใช้ได้ดีใน Modal Mode
            return canonical.href;
        }

        // หาไม่เจอจริงๆ
        return null;
    }

    function processVideo(video) {
        // ... (โค้ดส่วนการสร้างปุ่ม UI ของคุณ คงเดิมไว้ตรงนี้) ...
        
        let container = video.parentElement;
        
        // Logic การหา Container ปุ่ม (UI Layout)
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
        btn.innerText = "↓"; // หรือ Icon SVG

        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();

            // เรียกใช้ฟังก์ชันที่เราเขียนใหม่
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
    
    // เรียกครั้งแรกเผื่อโหลดเสร็จแล้ว
    handleMutations();

})();