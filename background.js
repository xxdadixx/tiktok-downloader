console.log("[BG] background.js loaded.");

let currentSaveTikTab = null;

// รับข้อความจากทุก content script
chrome.runtime.onMessage.addListener((msg, sender) => {

    // 1) Tab ของหน้า SaveTik
    if (msg.action === "savetikActive") {
        currentSaveTikTab = sender.tab.id;
        console.log("[BG] SaveTik active tab =", currentSaveTikTab);
        return;
    }

    // 2) เปิดหน้า SaveTik แบบ background tab
    if (msg.action === "openSaveTik") {
        chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
            console.log("[BG] SaveTik opened in background tab =", tab.id);
            currentSaveTikTab = tab.id;
        });
        return;
    }

    // 3) เปิดลิงก์ดาวน์โหลดแบบ background tab แล้วปิด SaveTik
    if (msg.action === "forceDownload") {
        chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
            console.log("[BG] Forced download tab (background) =", tab.id);

            if (currentSaveTikTab !== null) {
                chrome.tabs.remove(currentSaveTikTab);
                currentSaveTikTab = null;
            }
        });
        return;
    }
});
