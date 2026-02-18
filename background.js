chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "openSaveTik") {
        const data = {};
        data[msg.url] = {
            username: msg.username || "user",
            videoId: msg.videoId || "video"
        };
        // ใช้ storage แทนตัวแปรธรรมดาเพื่อให้ Chrome จำค่าได้แม่นยำขึ้น
        chrome.storage.local.set(data, () => {
            chrome.tabs.create({ url: msg.url, active: false });
        });
        return true; 
    }

    if (msg.action === "forceDownload") {
        const videoKey = sender.tab.url;
        
        chrome.storage.local.get([videoKey], (result) => {
            const metadata = result[videoKey] || { username: "tiktok", videoId: "video" };
            const timestamp = new Date().getTime();
            const random6 = Math.floor(100000 + Math.random() * 900000);
            const userIdentifier = metadata.username !== "user" ? metadata.username : metadata.videoId;
            const filename = `${userIdentifier}_${timestamp}_${random6}.mp4`;

            chrome.downloads.download({ 
                url: msg.url,
                filename: filename,
                conflictAction: "uniquify"
            });

            chrome.storage.local.remove(videoKey);
            if (sender.tab?.id) chrome.tabs.remove(sender.tab.id);
        });
        return true;
    }
});