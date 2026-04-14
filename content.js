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

    function findVideoUrl(videoElement) {
        if (/\/video\/\d+/.test(window.location.href)) {
            return window.location.href;
        }
        const closestLink = videoElement.closest('a');
        if (closestLink && /\/video\/\d+/.test(closestLink.href)) {
            return closestLink.href;
        }
        return null;
    }

    /**
     * ฟังก์ชันสร้างปุ่ม Download
     */
    function processVideo(video) {
        
        // ✅ 1. WHITELIST: เช็คก่อนเลยว่าเป็น "หน้า Profile" หรือไม่?
        // ถ้าเป็น Grid ในหน้า Profile (user-post-item) ให้สร้างปุ่มได้เลย ไม่ต้องสน Feed Filter
        const isProfileGrid = video.closest('[data-e2e="user-post-item"], [data-e2e="user-post-item-list"]');
        
        if (!isProfileGrid) {
            // 🛑 2. BLACKLIST (Feed Filter):
            // ถ้าไม่ใช่หน้า Profile ให้เช็คว่าเป็นหน้า Feed (For You) หรือไม่
            // ถ้าใช่ ให้หยุดทำงาน (ไม่สร้างปุ่ม)
            const isFeed = video.closest('[data-e2e="recommend-list-item-container"]');
            if (isFeed) return;

            // 🛑 3. URL CHECK (Fallback):
            // ถ้าไม่ใช่ Profile และ URL ก็ไม่มี /video/ (อาจจะเป็นหน้า Home แบบอื่น) ให้กันเหนียวไว้
            if (!window.location.href.includes("/video/") && !window.location.href.includes("@")) {
                return;
            }
        }

        // --- ส่วนหา Container และสร้างปุ่ม ---
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

    // --- MAIN LOOP ---
    setInterval(() => {
        document.querySelectorAll("video").forEach(processVideo);
    }, 500);

    // Observer
    const observer = new MutationObserver(() => {
        
        // 🔥 CLEANUP SYSTEM (ฉบับแก้ไข):
        // จะสั่งลบปุ่มทิ้ง "เฉพาะเมื่อ"
        // 1. URL ไม่มีคำว่า /video/ (ไม่ใช่หน้าดูคลิป)
        // 2. AND (และ) URL ไม่มีเครื่องหมาย @ (ไม่ใช่หน้า Profile)
        // = แปลว่าเป็นหน้า Feed หรือหน้าแรกจริงๆ ถึงจะลบ
        const isVideoPage = window.location.href.includes("/video/");
        const isProfilePage = window.location.href.includes("@");

        if (!isVideoPage && !isProfilePage) {
            const allButtons = document.querySelectorAll(".tiktok-save-button");
            if (allButtons.length > 0) {
                allButtons.forEach(btn => btn.remove());
            }
            return; 
        }

        // ถ้าเงื่อนไขถูกต้อง (เป็นหน้าดูคลิป หรือ หน้า Profile) ให้ทำงานต่อ
        document.querySelectorAll("video").forEach(processVideo);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();