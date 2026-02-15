console.log("[BG] background.js loaded.");

chrome.runtime.onMessage.addListener((msg, sender) => {

    // 1) เปิดหน้า SaveTik
    if (msg.action === "openSaveTik") {
        chrome.tabs.create({ url: msg.url, active: false });
        return; 
    }

    // 2) สั่งดาวน์โหลด
    if (msg.action === "forceDownload") {
        console.log("[BG] Downloading:", msg.url);

        // ตั้งชื่อไฟล์เอง กันไม่ให้ได้ไฟล์ชื่อ 'get'
        const timestamp = new Date().getTime();
        const filename = `tiktok_${timestamp}.mp4`;

        // ใช้ API Downloads
        chrome.downloads.download({ 
            url: msg.url,
            filename: filename, // บังคับชื่อไฟล์
            conflictAction: "uniquify"
        }, (downloadId) => {
             // เช็ค Error เผื่อลิงก์เสีย
             if (chrome.runtime.lastError) {
                 console.error("Download failed:", chrome.runtime.lastError);
             }
        });

        // ปิดแท็บ SaveTik ที่ทำงานเสร็จแล้ว
        if (sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
        
        return;
    }
});