(function () {

    function getVideoMetadata(videoElement) {
        const videoURL = findVideoUrl(videoElement);
        if (!videoURL) return { url: null };

        const videoIdMatch = videoURL.match(/\/video\/(\d+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

        let username = "user";
        const userElement = document.querySelector('[data-e2e="browse-user-proxy"], [data-e2e="video-author-uniqueid"], [data-e2e="user-title"]');

        if (userElement && userElement.textContent) {
            username = userElement.textContent.trim().replace('@', '');
        } else {
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
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
            return closestLink.href;
        }
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
        // 1. เช็ค URL: ถ้าไม่ใช่หน้า Video ให้จบการทำงาน
        if (!window.location.href.includes("/video/")) return;

        // 2. กรอง Container: ป้องกันปุ่มไปโผล่ในจุดที่ไม่ใช่
        const isFeedOrGrid = video.closest([
            '[data-e2e="recommend-list-item-container"]', 
            '[data-e2e="list-item-container"]',
            '[data-e2e="user-post-item"]',
            '[data-e2e="user-post-item-list"]',
            '.DivItemContainer'
        ].join(','));

        if (isFeedOrGrid) return;

        // หา Container
        let container = video.parentElement;
        if (container.querySelector(".tiktok-save-button")) return;

        if (container.tagName === 'A') {
            // OK
        } else {
            if (container.clientWidth < video.clientWidth * 0.9) {
                if (container.parentElement) container = container.parentElement;
            }
        }

        if (container.querySelector(".tiktok-save-button")) return;

        // สร้างปุ่ม
        const btn = document.createElement("div");
        btn.className = "tiktok-save-button";
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();

            const metadata = getVideoMetadata(video);
            console.log("[TikTok Downloader] Extracting Metadata:", metadata);

            if (metadata.url) {
                const target = "https://savetik.co/?video=" + encodeURIComponent(metadata.url);
                chrome.runtime.sendMessage({
                    action: "openSaveTik",
                    url: target,
                    originalVideoUrl: metadata.url,
                    username: metadata.username,
                    videoId: metadata.videoId
                });
            } else {
                alert("Could not find video link. Please try opening the video in full screen.");
            }
        };

        container.appendChild(btn);
    }

    function removeAllButtons() {
        const allButtons = document.querySelectorAll(".tiktok-save-button");
        if (allButtons.length > 0) {
            allButtons.forEach(btn => btn.remove());
        }
    }

    // --- MAIN LOGIC LOOP ---
    // ใช้ setInterval เพื่อตรวจสอบ URL ตลอดเวลา แก้ปัญหา URL เปลี่ยนช้า
    setInterval(() => {
        // ถ้า URL มีคำว่า /video/ (แสดงว่าอยู่ในหน้าดูคลิป)
        if (window.location.href.includes("/video/")) {
            // สั่งสแกนหา Video เพื่อแปะปุ่ม
            document.querySelectorAll("video").forEach(processVideo);
        } else {
            // ถ้า URL ไม่มี /video/ (กลับมาหน้า Feed แล้ว)
            // สั่งลบปุ่มทิ้งทั้งหมดทันที (แก้ปุ่มค้าง)
            removeAllButtons();
        }
    }, 500); // ทำงานทุกๆ 0.5 วินาที

    // Observer
    const observer = new MutationObserver(() => {
        // 🔥 CLEANUP SYSTEM: กฎเหล็ก
        // ถ้า URL ปัจจุบัน "ไม่มี" คำว่า /video/ แสดงว่าเราไม่ได้ดูคลิปอยู่ (กลับมาหน้า Feed/Profile แล้ว)
        // ให้สั่ง "ลบปุ่มทิ้งทั้งหมด" ทันที เพื่อแก้ปัญหาปุ่มค้าง
        if (!window.location.href.includes("/video/")) {
            const allButtons = document.querySelectorAll(".tiktok-save-button");
            if (allButtons.length > 0) {
                allButtons.forEach(btn => btn.remove());
                // console.log("Cleanup buttons on feed/profile");
            }
            return; // จบการทำงาน ไม่ไปสร้างปุ่มเพิ่ม
        }

        // ถ้า URL ถูกต้อง ก็ทำงานปกติ
        document.querySelectorAll("video").forEach(processVideo);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();