chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveAsPdf') {
    saveAsPdf(request.data);
  } else if (request.action === 'saveAsPng') {
    saveAsPng(request.data);
  } else if (request.action === 'sendEmail') {
    sendEmail(request.data);
  }
});

function saveAsPdf(data) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: 'conversation.pdf'
  });
}

function saveAsPng(data) {
  // 使用html2canvas库将文本转换为PNG
  // 需要引入html2canvas库
  html2canvas(document.body).then(canvas => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: 'conversation.png'
      });
    });
  });
}

function sendEmail(data) {
  const mailtoLink = `mailto:?subject=Deepseek Conversation&body=${encodeURIComponent(data)}`;
  window.open(mailtoLink);
}