(function () {

    // แจ้ง background ว่าตอนนี้อยู่หน้า Savetik Download
    function notify() {
        chrome.runtime.sendMessage({
            action: "savetikActive",
            url: window.location.href
        });
    }

    // แจ้งตอนโหลดหน้า
    notify();

    // แจ้งทุกครั้งที่ URL เปลี่ยนด้วย pushState / replaceState
    const pushState = history.pushState;
    history.pushState = function () {
        pushState.apply(history, arguments);
        notify();
    };

    const replaceState = history.replaceState;
    history.replaceState = function () {
        replaceState.apply(history, arguments);
        notify();
    };

    // แจ้งเมื่อผู้ใช้เลื่อนหน้า (ป้องกัน SPA เปลี่ยน UI)
    window.addEventListener("popstate", notify);

})();
