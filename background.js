// เก็บข้อมูลชั่วคราวระหว่างรอเปลี่ยนหน้าไปยัง SaveTik
let downloadQueue = {};

chrome.runtime.onMessage.addListener((msg, sender) => {

    // 1) รับคำสั่งเปิด SaveTik และเก็บ Metadata ไว้
    if (msg.action === "openSaveTik") {
        // บันทึกข้อมูลโดยใช้ URL เป็น key
        downloadQueue[msg.url] = {
            username: msg.username || "user",
            videoId: msg.videoId || "video"
        };
        chrome.tabs.create({ url: msg.url, active: false });
        return; 
    }

    // 2) สั่งดาวน์โหลดจริง (เมื่อ Savetik ทำงานเสร็จ)
    if (msg.action === "forceDownload") {
        // ค้นหา metadata จากข้อมูลที่ส่งมาจาก Savetik หรือจากคิวที่เก็บไว้
        const originalUrl = sender.tab.url; // URL ของหน้า Savetik ที่มี ?video=...
        const params = new URLSearchParams(new URL(originalUrl).search);
        const videoKey = originalUrl;
        
        const metadata = downloadQueue[videoKey] || { username: "tiktok", videoId: "video" };

        const timestamp = new Date().getTime();
        // สร้างเลขสุ่ม 6 หลัก
        const random6 = Math.floor(100000 + Math.random() * 900000);
        
        // รูปแบบ: Username หรือ ID_timestamp_เลขสุ่ม6หลัก.mp4
        const userIdentifier = metadata.username !== "user" ? metadata.username : metadata.videoId;
        const filename = `${userIdentifier}_${timestamp}_${random6}.mp4`;

        chrome.downloads.download({ 
            url: msg.url,
            filename: filename,
            conflictAction: "uniquify"
        }, () => {
             if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
             // ล้างข้อมูลในคิวออก
             delete downloadQueue[videoKey];
        });

        if (sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
        
        return;
    }
});