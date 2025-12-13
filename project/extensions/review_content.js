chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "loadReview") {
        const user_id = msg.user_id;
        // 使用 GET 參數傳給 Flask API
        const url = `https://two025fall-computernetwork-aiv7.onrender.com/show_review?user_id=${user_id}`;
        window.location.href = url;  // 直接載入頁面
    }
});