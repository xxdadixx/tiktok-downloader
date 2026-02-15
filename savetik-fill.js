(function () {

    const params = new URLSearchParams(window.location.search);
    const videoURL = params.get("video");
    if (!videoURL) return;

    const timer = setInterval(() => {
        const input = document.querySelector("input[type='text'], input");

        if (input) {
            input.value = videoURL;

            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            clearInterval(timer);

            const btn = document.querySelector("button");
            if (btn) btn.click();   // ถ้าไม่อยาก auto-click ให้ลบ 3 บรรทัดนี้
        }
    }, 300);

})();
