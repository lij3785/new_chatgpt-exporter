function extractConversation() {
  const conversationElements = document.querySelectorAll('.conversation-item'); // 根据实际页面结构调整选择器
  const conversationText = Array.from(conversationElements).map(el => el.innerText).join('\n\n');
  return conversationText;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractConversation') {
    const conversation = extractConversation();
    sendResponse({ conversation });
  }
});