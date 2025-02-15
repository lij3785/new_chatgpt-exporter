document.addEventListener('DOMContentLoaded', function() {
  const buttons = {
    'exportPDF': '导出为 PDF',
    'exportPNG': '导出为 PNG',
    'sendEmail': '发送邮件'
  };

  Object.entries(buttons).forEach(([action, text]) => {
    document.getElementById(action).addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.includes('chatgpt.com')) {
          alert('请在 Chatgpt Chat 页面使用此扩展');
          return;
        }

        // 注入依赖库
        await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['lib/html2pdf.bundle.min.js', 'lib/html2canvas.min.js']
        });

        // 执行导出功能
        await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: async (action) => {
            // 获取对话内容
            function getChatContent() {
              // 获取所有对话组
              const chatContainer = document.querySelector('[class="flex flex-col text-sm md:pb-9"]');
			  console.log("enter here")
			  console.log(chatContainer)
              if (!chatContainer) {
                throw new Error('未找到对话内容');
              }

              // 获取所有用户和机器人的消息
              const messages = [];
              let currentNode = chatContainer.firstElementChild;

              while (currentNode) {
                // 检查是否是消息节点
				
                const userMessage = currentNode.querySelector('[data-message-author-role="user"]');
                const botMessage = currentNode.querySelector('[data-message-author-role="assistant"]');

                if (userMessage || botMessage) {
                  messages.push({
                    type: userMessage ? 'user' : 'bot',
                    element: userMessage || botMessage
                  });
                }

                currentNode = currentNode.nextElementSibling;
              }

              // 创建容器
              const container = document.createElement('div');
              container.style.cssText = `
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                background-color: white;
                font-family: Arial, sans-serif;
              `;

              // 添加标题和时间戳
              container.innerHTML = `
                <h1 style="text-align: center; margin-bottom: 20px;">Chatgpt Chat 对话记录</h1>
                <div style="text-align: center; margin-bottom: 30px; color: #666;">
                  ${new Date().toLocaleString()}
                </div>
              `;

              // 处理每条消息
              messages.forEach(({type, element}) => {
                const messageDiv = document.createElement('div');
                messageDiv.style.cssText = `
                  margin-bottom: 20px;
                  padding: 15px;
                  border-radius: 8px;
                  border: 1px solid #e5e7eb;
                  background-color: ${type === 'user' ? '#f9fafb' : 'white'};
                `;

                // 添加角色标识
                const roleDiv = document.createElement('div');
                roleDiv.style.cssText = `
                  font-weight: bold;
                  margin-bottom: 8px;
                  color: ${type === 'user' ? '#2563eb' : '#059669'};
                `;
                roleDiv.textContent = type === 'user' ? '👤 User' : '🤖 Assistant';
                messageDiv.appendChild(roleDiv);

                // 添加消息内容
                const contentDiv = document.createElement('div');
                contentDiv.style.cssText = `
                  line-height: 1.6;
                  white-space: pre-wrap;
                  word-break: break-word;
                `;

                if (type === 'user') {
                  contentDiv.textContent = element.textContent;
                } else {
                  // 克隆机器人回复内容，保持格式
                  const botContent = element.cloneNode(true);
                  
                  // 处理代码块
                  botContent.querySelectorAll('pre').forEach(pre => {
                    pre.style.cssText = `
                      background-color: #f4f4f4;
                      padding: 10px;
                      border-radius: 4px;
                      overflow-x: auto;
                      font-family: monospace;
                      margin: 10px 0;
                    `;
                  });

                  // 处理内联代码
                  botContent.querySelectorAll('code').forEach(code => {
                    code.style.cssText = `
                      background-color: #f4f4f4;
                      padding: 2px 4px;
                      border-radius: 2px;
                      font-family: monospace;
                    `;
                  });

                  contentDiv.appendChild(botContent);
                }

                messageDiv.appendChild(contentDiv);
                container.appendChild(messageDiv);
              });

              return container;
            }

            // 显示加载提示
            function showLoading(message) {
              const loadingDiv = document.createElement('div');
              loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                border-radius: 8px;
                z-index: 9999;
              `;
              loadingDiv.textContent = message;
              document.body.appendChild(loadingDiv);
              return loadingDiv;
            }

            // 执行导出
            async function executeExport() {
              const loadingDiv = showLoading(
                action === 'exportPDF' ? '正在生成 PDF...' :
                action === 'exportPNG' ? '正在生成图片...' :
                '正在处理...'
              );

              try {
                const content = getChatContent();
                const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
                const fileName = `chatgpt-chat-${timestamp}`;

                if (action === 'exportPDF') {
                  const opt = {
                    margin: [0.5, 0.5],
                    filename: `${fileName}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                      scale: 2,
                      useCORS: true,
                      logging: true
                    },
                    jsPDF: { 
                      unit: 'in',
                      format: 'a4',
                      orientation: 'portrait'
                    }
                  };

                  await html2pdf().set(opt).from(content).save();
                } 
                else if (action === 'exportPNG') {
                  const canvas = await html2canvas(content, {
                    scale: 2,
                    useCORS: true,
                    logging: true
                  });

                  const link = document.createElement('a');
                  link.download = `${fileName}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                } 
                else if (action === 'sendEmail') {
                  const emailContent = content.innerText;
                  const mailtoLink = `mailto:?subject=Chatgpt Chat 对话记录 - ${new Date().toLocaleDateString()}&body=${encodeURIComponent(emailContent)}`;
                  window.location.href = mailtoLink;
                }
              } catch (error) {
                console.error('导出错误:', error);
                alert('导出失败: ' + error.message);
              } finally {
                loadingDiv.remove();
              }
            }

            await executeExport();
          },
          args: [action]
        });
      } catch (error) {
        console.error('执行操作失败:', error);
        alert('操作失败: ' + error.message);
      }
    });
  });
});