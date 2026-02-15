(function () {

    function getVideoMetadata(videoElement) {
        const videoURL = findVideoUrl(videoElement);
        if (!videoURL) return { url: null };

        // 1. ดึง Video ID จาก URL (ตัวเลขหลัง /video/)
        const videoIdMatch = videoURL.match(/\/video\/(\d+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

        // 2. ดึง Username
        let username = "user";

        // ลองหาจาก DOM Selector ของ TikTok
        const userElement = document.querySelector('[data-e2e="browse-user-proxy"], [data-e2e="video-author-uniqueid"], [data-e2e="user-title"]');

        if (userElement && userElement.textContent) {
            username = userElement.textContent.trim().replace('@', '');
        } else {
            // ถ้าหาใน DOM ไม่เจอ ให้ลองดึงจาก URL (รูปแบบ tiktok.com/@username)
            const urlMatch = window.location.href.match(/@([a-zA-Z0-9._-]+)/);
            if (urlMatch) {
                username = urlMatch[1];
            }
        }

        return {
            url: videoURL,
            videoId: videoId,
            username: username
        };
    }
    /**
     * ฟังก์ชันค้นหา URL ของวิดีโอ (ใช้ Logic เดิมที่แม่นยำแล้ว)
     */
    function findVideoUrl(videoElement) {
        // 1. เช็ค URL บน Address Bar (กรณีเปิดหน้าคลิปเดี่ยว/Modal)
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }

        // 2. เช็คกรณีหน้า Profile/Modal
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
            return closestLink.href;
        }

        // 3. Fallback: Canonical URL
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

        // --- 🛑 FEED FILTER ---
        // ป้องกันไม่ให้ปุ่มไปโผล่ในหน้า Feed รวม (For You) เพราะอาจเกะกะ
        // ให้โผล่เฉพาะตอนกดเข้ามาดูคลิป (Modal/Detail) ตามโจทย์ "เมื่อกดเข้าไปดู"
        const isFeedVideo = video.closest('[data-e2e="recommend-list-item-container"], [data-e2e="list-item-container"]');
        if (isFeedVideo) return;

        // หา Container: ใช้ Parent โดยตรงเพื่อความปลอดภัย
        let container = video.parentElement;

        // ถ้า Parent เป็น <a> ใช้ตัวมันเองเลย
        if (container.tagName === 'A') {
            // OK
        } else {
            // ถ้า Container เล็กไป (เช่นเป็น Layer ควบคุม) ขยับขึ้น 1 ชั้น
            if (container.clientWidth < video.clientWidth * 0.9) {
                if (container.parentElement) container = container.parentElement;
            }
        }

        // ป้องกันสร้างซ้ำ
        if (container.querySelector(".tiktok-save-button")) return;

        // ⚠️ CRITICAL FIX (แก้ปัญหาภาพค้าง):
        // ลบส่วนที่สั่ง container.style.position = 'relative' ออกไป!
        // การไม่ไปยุ่งกับ style ของ container เดิม จะทำให้ video player ทำงานได้ปกติ 100%
        // (ปกติ wrapper ของ video จะเป็น positioned element อยู่แล้ว ปุ่มเราจะเกาะได้เอง)

        // สร้างปุ่ม
        const btn = document.createElement("div");
        btn.className = "tiktok-save-button";
        // ไอคอนลูกศร
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

        // Event Click
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation(); // ห้ามทะลุไป Pause วิดีโอ

            const metadata = getVideoMetadata(video); 
            console.log("[TikTok Downloader] Detected URL:", metadata);

            if (metadata.url) {
                const target = "https://savetik.co/?video=" + encodeURIComponent(metadata.url);
                chrome.runtime.sendMessage({
                    action: "openSaveTik",
                    url: target, // นี่คือ URL ของ Savetik
                    originalVideoUrl: metadata.url, // ส่ง URL วิดีโอต้นฉบับไปเป็น Key
                    username: metadata.username,
                    videoId: metadata.videoId
                });
            } else {
                alert("Could not find video link. Please try opening the video in full screen.");
            }
        };

        container.appendChild(btn);
    }

    // Observer
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