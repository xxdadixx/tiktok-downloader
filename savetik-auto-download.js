(function () {

    const timer = setInterval(() => {

        // หา <a> ที่มีข้อความ Download MP4 HD
        const hdButton = [...document.querySelectorAll("a")]
            .find(a => a.textContent.trim().includes("Download MP4 HD"));

        if (!hdButton) return;

        clearInterval(timer);

        // ลิงก์จริงของไฟล์วิดีโอ
        const downloadURL = hdButton.href;

        console.log("Auto-download HD:", downloadURL);

        chrome.runtime.sendMessage({
            action: "forceDownload",
            url: downloadURL
        });


    }, 500);

})();
