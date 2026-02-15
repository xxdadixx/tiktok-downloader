(function () {

    function insertButton() {
        if (document.getElementById("tiktok-save-button")) return;

        const video = document.querySelector("video");
        if (!video) return;

        // หา container ใหญ่สุด
        let container = video;
        for (let i = 0; i < 5; i++) {
            if (container.parentElement) container = container.parentElement;
        }

        const rect = container.getBoundingClientRect();
        if (rect.width < 300 || rect.height < 300) {
            const candidates = [...document.querySelectorAll("div")].filter(div => div.contains(video));
            container = candidates.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
        }

        container.style.position = "relative";

        const btn = document.createElement("div");
        btn.id = "tiktok-save-button";
        btn.innerText = "↓";

        // ✅ แก้ onclick ตรงนี้เท่านั้น
        btn.onclick = function () {
            const videoURL = window.location.href;
            const target = "https://savetik.co/?video=" + encodeURIComponent(videoURL);

            chrome.runtime.sendMessage({
                action: "openSaveTik",
                url: target
            });
        };

        container.appendChild(btn);
    }

    const observer = new MutationObserver(() => {
        if (window.location.href.includes("/video/")) {
            insertButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
