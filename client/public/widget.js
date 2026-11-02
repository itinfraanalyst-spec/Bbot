(function() {
    function initWidget() {
        // Find script tag robustly (supports async, defer, dynamically injected, modules)
        let scriptTag = document.currentScript;
        if (!scriptTag) {
            scriptTag = document.querySelector('script[data-bot-key]');
        }
        if (!scriptTag) {
            const scripts = document.querySelectorAll('script');
            for (let s of scripts) {
                if (s.src && s.src.includes('widget.js')) {
                    scriptTag = s;
                    break;
                }
            }
        }

        if (!scriptTag) {
            console.error("bbot Widget: Could not find widget script tag.");
            return;
        }

        const botKey = scriptTag.getAttribute("data-bot-key");
        let apiBase = scriptTag.getAttribute("data-api-base") || (scriptTag.src ? new URL(scriptTag.src).origin : "http://localhost:8000");
        const scriptOrigin = scriptTag.src ? new URL(scriptTag.src).origin : apiBase;

        if (window.location.protocol === "https:" && apiBase.startsWith("http://") && !apiBase.includes("localhost") && !apiBase.includes("127.0.0.1")) {
            console.warn("bbot Widget: Hosting page is HTTPS but data-api-base is HTTP. Browsers block mixed-content requests. Serve your bot API over HTTPS.");
        }

        if (!botKey) {
            console.error("bbot Widget: data-bot-key attribute is required on the script tag.");
            return;
        }

        // Avoid duplicate initialization
        if (document.getElementById("bbot-widget-container")) {
            return;
        }

        let config = null;
        let conversationId = null;
        let selectedLanguage = "en";
        const storageKey = `bbot_chat_session_${botKey}`;

        const SPEECH_LANG_MAP = {
            en: 'en-US',
            hi: 'hi-IN',
            hinglish: 'hi-IN',
            bn: 'bn-IN',
            te: 'te-IN',
            mr: 'mr-IN',
            ta: 'ta-IN',
            gu: 'gu-IN',
            kn: 'kn-IN',
            pa: 'pa-IN',
            ml: 'ml-IN'
        };

        const LANG_OPTIONS = [
            { code: 'en', label: '🇬🇧 English' },
            { code: 'hi', label: '🇮🇳 हिन्दी' },
            { code: 'hinglish', label: '🗣️ Hinglish' },
            { code: 'gu', label: '🇮🇳 ગુજરાતી' },
            { code: 'bn', label: '🇮🇳 বাংলা' },
            { code: 'mr', label: '🇮🇳 मराठी' },
            { code: 'te', label: '🇮🇳 తెలుగు' },
            { code: 'ta', label: '🇮🇳 தமிழ்' },
            { code: 'kn', label: '🇮🇳 ಕನ್ನಡ' },
            { code: 'pa', label: '🇮🇳 ਪੰਜਾਬੀ' },
            { code: 'ml', label: '🇮🇳 മലയാളം' }
        ];

        // Web Audio Synthesized Chime (Ding!) - No external MP3 required
        function playChime() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                if (ctx.state === "suspended") {
                    ctx.resume();
                }

                // Friendly two-tone chime (E5 -> B5 / 659Hz -> 987Hz)
                const playTone = (freq, startTime, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, startTime);
                    
                    gain.gain.setValueAtTime(0.001, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };

                const now = ctx.currentTime;
                playTone(659.25, now, 0.18);        // Note 1
                playTone(880.00, now + 0.1, 0.35);  // Note 2
            } catch (err) {
                // Audio autoplay policy or unsupported
            }
        }

        // Session Persistence Helpers (Item 2)
        function loadSavedSession() {
            try {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    return JSON.parse(data);
                }
            } catch (e) {}
            return null;
        }

        function saveMessageToSession(text, isUser) {
            try {
                const session = loadSavedSession() || { conversationId: conversationId, messages: [] };
                session.conversationId = conversationId;
                session.messages.push({ text, isUser });
                localStorage.setItem(storageKey, JSON.stringify(session));
            } catch (e) {}
        }

        function clearSavedSession() {
            try {
                localStorage.removeItem(storageKey);
            } catch (e) {}
        }

        // Create UI Elements
        const container = document.createElement("div");
        container.id = "bbot-widget-container";
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.zIndex = "2147483647"; // Max z-index to stay above other website elements
        container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

        // Inject Animation and Mobile Fullscreen Styles (Item 5)
        if (!document.getElementById("bbot-widget-styles")) {
            const styleTag = document.createElement("style");
            styleTag.id = "bbot-widget-styles";
            styleTag.innerHTML = `
                @keyframes bbot-pulse-ring {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 0; }
                    100% { transform: scale(0.95); opacity: 0; }
                }
                @keyframes bbot-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes bbot-mic-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
                    70% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                #bbot-mic-btn:hover {
                    opacity: 0.9;
                    background-color: #f3f4f6 !important;
                }
                #bbot-bubble-button:hover .bbot-badge {
                    transform: scale(1.15);
                }
                #bbot-reset-btn:hover {
                    opacity: 1 !important;
                    transform: rotate(180deg) scale(1.1);
                }
                #bbot-close:hover {
                    opacity: 1 !important;
                    transform: scale(1.15);
                }
                /* Mobile Responsiveness / Fullscreen Mode (Item 5) */
                @media (max-width: 480px) {
                    #bbot-widget-container {
                        bottom: 12px !important;
                        right: 12px !important;
                    }
                    #bbot-chat-window {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        max-width: 100vw !important;
                        height: 100vh !important;
                        max-height: 100vh !important;
                        border-radius: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        z-index: 2147483647 !important;
                    }
                    #bbot-cloud-popup {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(styleTag);
        }

        // Pulse Ring Element behind bubble
        const pulseRing = document.createElement("div");
        pulseRing.id = "bbot-pulse-ring";
        pulseRing.style.position = "absolute";
        pulseRing.style.bottom = "-2px";
        pulseRing.style.right = "-2px";
        pulseRing.style.width = "68px";
        pulseRing.style.height = "68px";
        pulseRing.style.borderRadius = "50%";
        pulseRing.style.border = "3px solid #C87514";
        pulseRing.style.animation = "bbot-pulse-ring 2.8s cubic-bezier(0.24, 0, 0.38, 1) infinite";
        pulseRing.style.pointerEvents = "none";
        pulseRing.style.zIndex = "1";

        // Bubble Button
        const bubble = document.createElement("div");
        bubble.id = "bbot-bubble-button";
        bubble.style.position = "relative";
        bubble.style.width = "64px";
        bubble.style.height = "64px";
        bubble.style.display = "flex";
        bubble.style.alignItems = "center";
        bubble.style.justifyContent = "center";
        bubble.style.cursor = "pointer";
        bubble.style.borderRadius = "50%";
        bubble.style.backgroundColor = "#ffffff";
        bubble.style.boxShadow = "0 8px 24px rgba(200, 117, 20, 0.28), 0 2px 8px rgba(0,0,0,0.12)";
        bubble.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        bubble.style.zIndex = "2";
        bubble.style.animation = "bbot-float 3.5s ease-in-out infinite";
        
        bubble.onmouseenter = () => {
            bubble.style.transform = "scale(1.1) translateY(-2px)";
            bubble.style.boxShadow = "0 12px 28px rgba(200, 117, 20, 0.4), 0 4px 12px rgba(0,0,0,0.18)";
        };
        bubble.onmouseleave = () => {
            bubble.style.transform = "scale(1) translateY(0)";
            bubble.style.boxShadow = "0 8px 24px rgba(200, 117, 20, 0.28), 0 2px 8px rgba(0,0,0,0.12)";
        };

        // Inner Avatar & Status Badge
        bubble.innerHTML = `
            <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FFF9F2 0%, #FFFFFF 100%); border: 2.5px solid #C87514; box-sizing: border-box;">
                <img src="${scriptOrigin}/bbot.png" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" alt="Chat" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23C87514\\'><path d=\\'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z\\'/></svg>'" />
            </div>
            <!-- Online Green Status Indicator Dot -->
            <div class="bbot-badge" style="position: absolute; bottom: 1px; right: 1px; width: 14px; height: 14px; background-color: #22c55e; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 8px rgba(34, 197, 94, 0.7); transition: transform 0.2s ease;"></div>
        `;

        // External Speech Bubble / Cloud Callout
        const cloudPopup = document.createElement("div");
        cloudPopup.id = "bbot-cloud-popup";
        cloudPopup.style.position = "absolute";
        cloudPopup.style.bottom = "12px";
        cloudPopup.style.right = "80px";
        cloudPopup.style.backgroundColor = "#ffffff";
        cloudPopup.style.color = "#1B1E22";
        cloudPopup.style.padding = "10px 16px";
        cloudPopup.style.borderRadius = "18px";
        cloudPopup.style.border = "1.5px solid #C87514";
        cloudPopup.style.boxShadow = "0 8px 24px rgba(200, 117, 20, 0.22), 0 3px 10px rgba(0,0,0,0.12)";
        cloudPopup.style.fontSize = "13px";
        cloudPopup.style.fontWeight = "600";
        cloudPopup.style.lineHeight = "1.4";
        cloudPopup.style.whiteSpace = "nowrap";
        cloudPopup.style.pointerEvents = "auto";
        cloudPopup.style.cursor = "pointer";
        cloudPopup.style.opacity = "0";
        cloudPopup.style.transform = "translateX(10px) scale(0.95)";
        cloudPopup.style.transition = "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
        cloudPopup.style.zIndex = "10";
        cloudPopup.innerHTML = `
            <span style="color: #C87514; font-weight: 800; font-size: 14px;">bbot:</span> How can I help you? 💬
            <!-- Little Speech Cloud Tail pointing to the bot button -->
            <div style="position: absolute; right: -7px; top: 50%; transform: translateY(-50%) rotate(45deg); width: 12px; height: 12px; background-color: #ffffff; border-top: 1.5px solid #C87514; border-right: 1.5px solid #C87514;"></div>
        `;

        // Show cloud on bubble hover
        bubble.addEventListener("mouseenter", () => {
            if (!isOpen) {
                cloudPopup.style.opacity = "1";
                cloudPopup.style.transform = "translateX(0) scale(1)";
            }
        });
        bubble.addEventListener("mouseleave", () => {
            cloudPopup.style.opacity = "0";
            cloudPopup.style.transform = "translateX(10px) scale(0.95)";
        });

        // Clicking the cloud opens the chat window too
        cloudPopup.onclick = () => {
            bubble.click();
        };

        // Chat Window
        const chatWindow = document.createElement("div");
        chatWindow.id = "bbot-chat-window";
        chatWindow.style.display = "none";
        chatWindow.style.width = "380px";
        chatWindow.style.maxWidth = "calc(100vw - 40px)";
        chatWindow.style.height = "600px";
        chatWindow.style.maxHeight = "calc(100vh - 120px)";
        chatWindow.style.backgroundColor = "#f9fafb";
        chatWindow.style.border = "1px solid rgba(0,0,0,0.08)";
        chatWindow.style.borderRadius = "20px";
        chatWindow.style.boxShadow = "0 20px 40px -10px rgba(0,0,0,0.25)";
        chatWindow.style.flexDirection = "column";
        chatWindow.style.overflow = "hidden";
        chatWindow.style.position = "absolute";
        chatWindow.style.bottom = "85px";
        chatWindow.style.right = "0";
        chatWindow.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        chatWindow.style.opacity = "0";
        chatWindow.style.transform = "translateY(20px)";

        // Header with Language Selector, Clear/Reset button (Item 3), and Close button
        const header = document.createElement("div");
        header.style.padding = "14px 16px";
        header.style.background = "linear-gradient(135deg, #E39A3D 0%, #C87514 50%, #A85F12 100%)";
        header.style.color = "#fff";
        header.style.fontWeight = "600";
        header.style.fontSize = "16px";
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.gap = "8px";
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <div style="width: 10px; height: 10px; background-color: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80; flex-shrink: 0;"></div>
                <span id="bbot-title" style="letter-spacing: 0.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Chat Support</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <!-- Language Selector Dropdown -->
                <select id="bbot-lang-select" title="Change conversation language" style="background: rgba(255, 255, 255, 0.22); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 6px; padding: 4px 6px; font-size: 11px; font-weight: 600; cursor: pointer; outline: none; transition: background 0.2s;">
                    ${LANG_OPTIONS.map(l => `<option value="${l.code}" style="color: #111;" ${l.code === selectedLanguage ? 'selected' : ''}>${l.label}</option>`).join('')}
                </select>
                <!-- Clear / Reset Chat Button (Item 3) -->
                <button id="bbot-reset-btn" title="Clear chat history" style="background: none; border: none; color: #ffffff; opacity: 0.85; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease; outline: none;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                </button>
                <!-- Close Button -->
                <span id="bbot-close" title="Close chat" style="cursor: pointer; font-size: 26px; line-height: 1; opacity: 0.85; transition: all 0.2s; user-select: none;">&times;</span>
            </div>
        `;

        // Wire language select change
        const langSelect = header.querySelector("#bbot-lang-select");
        if (langSelect) {
            langSelect.onchange = (e) => {
                selectedLanguage = e.target.value;
            };
        }

        // Messages Area
        const messagesArea = document.createElement("div");
        messagesArea.style.flex = "1";
        messagesArea.style.padding = "16px";
        messagesArea.style.overflowY = "auto";
        messagesArea.style.display = "flex";
        messagesArea.style.flexDirection = "column";
        messagesArea.style.gap = "10px";
        messagesArea.style.backgroundColor = "#f9fafb";

        // Input Area
        const inputArea = document.createElement("div");
        inputArea.style.padding = "14px 16px";
        inputArea.style.borderTop = "1px solid #e5e7eb";
        inputArea.style.backgroundColor = "#ffffff";
        inputArea.style.display = "flex";
        inputArea.style.gap = "8px";
        inputArea.style.alignItems = "center";

        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.placeholder = "Type your message...";
        inputField.style.flex = "1";
        inputField.style.padding = "10px 14px";
        inputField.style.border = "1px solid #d1d5db";
        inputField.style.borderRadius = "8px";
        inputField.style.outline = "none";
        inputField.style.fontSize = "14px";
        inputField.style.boxSizing = "border-box";

        // Microphone Voice Input Button
        const micBtn = document.createElement("button");
        micBtn.id = "bbot-mic-btn";
        micBtn.type = "button";
        micBtn.title = "Voice Input (Speech-to-Text)";
        micBtn.style.padding = "9px 10px";
        micBtn.style.backgroundColor = "transparent";
        micBtn.style.color = "#6b7280";
        micBtn.style.border = "1px solid #d1d5db";
        micBtn.style.borderRadius = "8px";
        micBtn.style.cursor = "pointer";
        micBtn.style.display = "flex";
        micBtn.style.alignItems = "center";
        micBtn.style.justifyContent = "center";
        micBtn.style.transition = "all 0.2s ease";
        micBtn.innerHTML = `
            <svg id="bbot-mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
        `;

        // Speech Recognition setup
        let isListening = false;
        let recognition = null;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRec) {
            recognition = new SpeechRec();
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onstart = () => {
                isListening = true;
                micBtn.style.backgroundColor = "#fee2e2";
                micBtn.style.borderColor = "#ef4444";
                micBtn.style.color = "#ef4444";
                micBtn.style.animation = "bbot-mic-pulse 1.2s infinite";
                inputField.placeholder = "Listening... Speak now";
            };

            recognition.onresult = (event) => {
                let transcript = "";
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                inputField.value = transcript;
            };

            recognition.onerror = (err) => {
                console.warn("bbot speech recognition error:", err);
                stopListening();
            };

            recognition.onend = () => {
                stopListening();
            };
        }

        function stopListening() {
            isListening = false;
            micBtn.style.backgroundColor = "transparent";
            micBtn.style.borderColor = "#d1d5db";
            micBtn.style.color = "#6b7280";
            micBtn.style.animation = "none";
            inputField.placeholder = "Type your message...";
        }

        micBtn.onclick = () => {
            if (!SpeechRec) {
                alert("Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
                return;
            }
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    const locale = SPEECH_LANG_MAP[selectedLanguage] || 'en-US';
                    recognition.lang = locale;
                    recognition.start();
                } catch (err) {
                    console.error("Speech recognition start failed:", err);
                }
            }
        };

        const sendBtn = document.createElement("button");
        sendBtn.innerText = "Send";
        sendBtn.style.padding = "10px 18px";
        sendBtn.style.backgroundColor = "#C87514";
        sendBtn.style.color = "#fff";
        sendBtn.style.border = "none";
        sendBtn.style.borderRadius = "8px";
        sendBtn.style.cursor = "pointer";
        sendBtn.style.fontWeight = "600";
        sendBtn.style.fontSize = "14px";

        inputArea.appendChild(inputField);
        inputArea.appendChild(micBtn);
        inputArea.appendChild(sendBtn);

        chatWindow.appendChild(header);
        chatWindow.appendChild(messagesArea);
        chatWindow.appendChild(inputArea);

        container.appendChild(chatWindow);
        container.appendChild(pulseRing);
        container.appendChild(bubble);
        container.appendChild(cloudPopup);

        function mount() {
            if (document.body) {
                document.body.appendChild(container);
            } else {
                window.addEventListener("DOMContentLoaded", () => document.body.appendChild(container));
            }
        }
        mount();

        // Logic
        let isOpen = false;

        bubble.onclick = () => {
            isOpen = !isOpen;
            if (isOpen) {
                cloudPopup.style.opacity = "0";
                cloudPopup.style.transform = "translateX(10px) scale(0.95)";
                chatWindow.style.display = "flex";
                setTimeout(() => {
                    chatWindow.style.opacity = "1";
                    chatWindow.style.transform = "translateY(0)";
                }, 10);
                if (!config) {
                    initBot();
                }
            } else {
                chatWindow.style.opacity = "0";
                chatWindow.style.transform = "translateY(20px)";
                setTimeout(() => {
                    chatWindow.style.display = "none";
                }, 300);
            }
        };

        header.querySelector("#bbot-close").onclick = () => {
            isOpen = false;
            chatWindow.style.opacity = "0";
            chatWindow.style.transform = "translateY(20px)";
            setTimeout(() => {
                chatWindow.style.display = "none";
            }, 300);
        };

        // Clear Chat / Reset Action (Item 3)
        header.querySelector("#bbot-reset-btn").onclick = () => {
            if (confirm("Clear conversation history and start fresh?")) {
                clearSavedSession();
                conversationId = null;
                messagesArea.innerHTML = "";
                addMessage("Hi there! How can I help you today?", false, false);
                renderStarterQuestions();
            }
        };

        // Scroll helper: only auto-scroll if user is near bottom
        let userHasScrolledUp = false;
        messagesArea.addEventListener("scroll", () => {
            const distanceFromBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
            userHasScrolledUp = distanceFromBottom > 60;
        });

        function scrollToBottom(force = false) {
            if (force || !userHasScrolledUp) {
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }

        function addMessage(text, isUser = false, save = true) {
            const msgDiv = document.createElement("div");
            msgDiv.style.maxWidth = "85%";
            msgDiv.style.padding = "10px 14px";
            msgDiv.style.borderRadius = "10px";
            msgDiv.style.fontSize = "14px";
            msgDiv.style.lineHeight = "1.4";
            msgDiv.style.wordBreak = "break-word";
            
            if (isUser) {
                const accent = config ? config.accent : "#C87514";
                msgDiv.style.backgroundColor = (accent.startsWith("var") ? "#C87514" : accent);
                msgDiv.style.color = "#fff";
                msgDiv.style.alignSelf = "flex-end";
                msgDiv.style.borderBottomRightRadius = "2px";
            } else {
                msgDiv.style.backgroundColor = "#fff";
                msgDiv.style.color = "#111827";
                msgDiv.style.border = "1px solid #e5e7eb";
                msgDiv.style.alignSelf = "flex-start";
                msgDiv.style.borderBottomLeftRadius = "2px";
            }
            
            const accentColor = config && config.accent && !config.accent.startsWith("var") ? config.accent : "#C87514";
            
            // Format Process / Workflow flowcharts safely
            let formattedText = text;
            try {
                // Render Mermaid Diagrams if present
                formattedText = formattedText.replace(/```mermaid\s*([\s\S]*?)```/gi, (match, code) => {
                    const uniqueId = 'm_' + Math.random().toString(36).substring(2, 9);
                    setTimeout(async () => {
                        try {
                            if (!window.mermaid) {
                                const m = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
                                window.mermaid = m.default;
                                window.mermaid.initialize({
                                    startOnLoad: false,
                                    securityLevel: 'loose',
                                    theme: 'neutral',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                    flowchart: { htmlLabels: true, curve: 'basis', padding: 16 }
                                });
                            }
                            let cleanCode = code.trim().replace(/(-->|--|==>|-\.->|->)\s*\|([^|\n\r]+)\|\s*>/g, '$1|$2| ').replace(/\|\s*>\s*/g, '| ');
                            if (!cleanCode.match(/^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/m)) {
                                cleanCode = 'graph TD\n' + cleanCode;
                            }
                            const { svg } = await window.mermaid.render('rnd_' + uniqueId, cleanCode);
                            const el = document.getElementById(uniqueId);
                            if (el) {
                                el.innerHTML = svg;
                                const svgEl = el.querySelector('svg');
                                if (svgEl) {
                                    svgEl.removeAttribute('height');
                                    svgEl.style.minWidth = '100%';
                                    svgEl.style.height = 'auto';
                                }
                            }
                        } catch (err) {
                            const el = document.getElementById(uniqueId);
                            if (el) el.innerHTML = '<pre style="font-size: 11px; color: #64748b; overflow-x: auto; text-align: left;">' + code + '</pre>';
                        }
                    }, 50);
                    return '<div id="' + uniqueId + '" style="margin: 8px 0; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; text-align: left;"><div style="font-size: 11px; color: #94a3b8;">Rendering diagram...</div></div>';
                });

                formattedText = formattedText.replace(/```(?:process|flow|pipeline|workflow)\s*([\s\S]*?)```/gi, (match, blockContent) => {
                    const lines = blockContent.trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('graph ') && !l.startsWith('flowchart '));
                    const steps = [];
                    for (const line of lines) {
                        const prefixMatch = line.match(/^(?:Step\s*\d+[:.]?|\d+[.:)]|\[Step\s*\d+\])\s*(.*)$/i);
                        if (prefixMatch) {
                            const txt = prefixMatch[1].trim();
                            let title = txt, desc = '';
                            if (txt.includes('->')) {
                                const sp = txt.split(/->\s*(.*)/);
                                title = sp[0].trim(); desc = sp[1]?.trim() || '';
                            } else if (txt.includes(':')) {
                                const sp = txt.split(/:\s*(.*)/);
                                title = sp[0].trim(); desc = sp[1]?.trim() || '';
                            }
                            title = title.replace(/\*\*/g, '').trim();
                            desc = desc.replace(/\*\*/g, '').trim();
                            if (title) steps.push({ num: steps.length + 1, title, desc });
                            continue;
                        }
                        if (line.includes('-->') || line.includes('->')) {
                            const arrowParts = line.split(/(?:-->|->)/).map(s => s.trim()).filter(Boolean);
                            for (const p of arrowParts) {
                                const m = p.match(/(?:[A-Za-z0-9_]+)?\s*\[(.*?)\]/) || p.match(/(?:[A-Za-z0-9_]+)?\s*\((.*?)\)/);
                                const t = m ? m[1].trim() : p.replace(/^[A-Za-z0-9_]+\[?/, '').replace(/\]?$/, '').trim();
                                if (t && !steps.some(s => s.title.toLowerCase() === t.toLowerCase())) {
                                    steps.push({ num: steps.length + 1, title: t, desc: '' });
                                }
                            }
                            continue;
                        }
                        let title = line, desc = '';
                        if (line.includes('->')) {
                            const sp = line.split(/->\s*(.*)/);
                            title = sp[0].trim(); desc = sp[1]?.trim() || '';
                        } else if (line.includes(':')) {
                            const sp = line.split(/:\s*(.*)/);
                            title = sp[0].trim(); desc = sp[1]?.trim() || '';
                        }
                        title = title.replace(/\*\*/g, '').trim();
                        desc = desc.replace(/\*\*/g, '').trim();
                        if (title) steps.push({ num: steps.length + 1, title, desc });
                    }
                    if (steps.length >= 2) {
                        let html = '<div style="margin: 8px 0; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">';
                        html += '<div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;"><span>🔄</span> Process Flow (' + steps.length + ' Steps)</div>';
                        html += '<div style="display: flex; flex-direction: column; gap: 6px;">';
                        steps.forEach((s, idx) => {
                            html += '<div style="display: flex; align-items: flex-start; gap: 8px; background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">';
                            html += '<span style="background: ' + accentColor + '; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 1px;">' + s.num + '</span>';
                            html += '<div style="flex: 1;"><div style="font-size: 12px; font-weight: 600; color: #1e293b;">' + s.title + '</div>';
                            if (s.desc) html += '<div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.3;">' + s.desc + '</div>';
                            html += '</div></div>';
                            if (idx < steps.length - 1) {
                                html += '<div style="text-align: center; font-size: 13px; color: ' + accentColor + '; font-weight: bold; margin: -2px 0; line-height: 1;">↓</div>';
                            }
                        });
                        html += '</div></div>';
                        return html;
                    }
                    return match;
                });
            } catch (e) {}

            msgDiv.innerHTML = formattedText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>');

            messagesArea.appendChild(msgDiv);
            scrollToBottom(true);

            if (save && text && text !== "typing...") {
                saveMessageToSession(text, isUser);
            }

            return msgDiv;
        }

        function parseCategories(questions) {
            const categories = {};
            let hasExplicit = false;

            // Check if any question has explicit category prefix
            questions.forEach(q => {
                const trimmed = q.trim();
                if (/^\[(.*?)\]\s*(.*)$/.test(trimmed) || /^([^:\n\r]{2,30}):\s*(.*)$/.test(trimmed)) {
                    hasExplicit = true;
                }
            });

            questions.forEach(q => {
                let trimmed = q.trim();
                if (!trimmed) return;

                if (hasExplicit) {
                    // Pattern 1: [Category] Question
                    const bracketMatch = trimmed.match(/^\[(.*?)\]\s*(.*)$/) || trimmed.match(/^\((.*?)\)\s*(.*)$/);
                    if (bracketMatch && bracketMatch[1] && bracketMatch[2]) {
                        const cat = bracketMatch[1].trim();
                        if (!categories[cat]) categories[cat] = [];
                        categories[cat].push(bracketMatch[2].trim());
                        return;
                    }

                    // Pattern 2: Category: Question
                    const colonMatch = trimmed.match(/^([^:\n\r]{2,30}):\s*(.*)$/);
                    if (colonMatch && !trimmed.startsWith("http") && colonMatch[1] && colonMatch[2]) {
                        const cat = colonMatch[1].trim();
                        if (!categories[cat]) categories[cat] = [];
                        categories[cat].push(colonMatch[2].trim());
                        return;
                    }
                }

                // Pattern 3: Smart keyword grouping
                const lower = trimmed.toLowerCase();
                let cat = "💡 General Questions";
                if (lower.includes("pay") || lower.includes("salary") || lower.includes("money") || lower.includes("earning") || lower.includes("wallet") || lower.includes("bank") || lower.includes("payout")) {
                    cat = "💳 Payments & Earnings";
                } else if (lower.includes("profile") || lower.includes("register") || lower.includes("signup") || lower.includes("account") || lower.includes("login") || lower.includes("kyc")) {
                    cat = "👤 Profile & Registration";
                } else if (lower.includes("audit") || lower.includes("job") || lower.includes("apply") || lower.includes("city") || lower.includes("work")) {
                    cat = "💼 Audit Jobs";
                }

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(trimmed);
            });

            return categories;
        }

        function renderStarterQuestions() {
            if (!config || !config.starter_questions || config.starter_questions.length === 0) return;
            
            // Remove any existing starter questions container so they move to the end
            const existing = document.getElementById("bbot-starter-questions");
            if (existing) existing.remove();

            const accent = config.accent && config.accent.startsWith("var") ? "#C87514" : (config.accent || "#C87514");
            const sqContainer = document.createElement("div");
            sqContainer.id = "bbot-starter-questions";
            sqContainer.style.display = "flex";
            sqContainer.style.flexDirection = "column";
            sqContainer.style.gap = "8px";
            sqContainer.style.marginTop = "10px";
            sqContainer.style.marginBottom = "6px";
            sqContainer.style.alignSelf = "flex-start";
            sqContainer.style.maxWidth = "96%";
            sqContainer.style.width = "100%";

            const categories = parseCategories(config.starter_questions);
            const categoryKeys = Object.keys(categories);

            // If only 1 category, show questions directly
            if (categoryKeys.length <= 1) {
                renderQuestionsList(config.starter_questions, null);
                return;
            }

            // Function to render Topic / Heading buttons
            function renderCategoryHeadings() {
                sqContainer.innerHTML = "";

                const headerLabel = document.createElement("div");
                headerLabel.style.display = "flex";
                headerLabel.style.alignItems = "center";
                headerLabel.style.gap = "6px";
                headerLabel.style.fontSize = "12px";
                headerLabel.style.fontWeight = "700";
                headerLabel.style.color = "#4b5563";
                headerLabel.style.marginBottom = "4px";
                headerLabel.innerHTML = `<span>📂</span> <span>Select a Topic:</span>`;
                sqContainer.appendChild(headerLabel);

                const pillsWrap = document.createElement("div");
                pillsWrap.style.display = "flex";
                pillsWrap.style.flexWrap = "wrap";
                pillsWrap.style.gap = "6px";

                categoryKeys.forEach(catName => {
                    const count = categories[catName].length;
                    const catBtn = document.createElement("button");
                    catBtn.style.display = "inline-flex";
                    catBtn.style.alignItems = "center";
                    catBtn.style.gap = "6px";
                    catBtn.style.padding = "7px 12px";
                    catBtn.style.borderRadius = "14px";
                    catBtn.style.border = `1.5px solid ${accent}`;
                    catBtn.style.backgroundColor = "#ffffff";
                    catBtn.style.color = "#1f2937";
                    catBtn.style.cursor = "pointer";
                    catBtn.style.fontSize = "12px";
                    catBtn.style.fontWeight = "600";
                    catBtn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                    catBtn.style.transition = "all 0.2s ease";

                    catBtn.innerHTML = `<span>${catName}</span> <span style="background: ${accent}; color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 10px; font-weight: 700;">${count}</span>`;

                    catBtn.onmouseenter = () => {
                        catBtn.style.transform = "translateY(-1px)";
                        catBtn.style.boxShadow = `0 4px 10px rgba(200, 117, 20, 0.2)`;
                        catBtn.style.borderColor = accent;
                    };
                    catBtn.onmouseleave = () => {
                        catBtn.style.transform = "translateY(0)";
                        catBtn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                    };
                    catBtn.onclick = () => {
                        renderQuestionsList(categories[catName], catName);
                    };

                    pillsWrap.appendChild(catBtn);
                });

                // Option to view all questions
                const viewAllBtn = document.createElement("button");
                viewAllBtn.style.padding = "7px 12px";
                viewAllBtn.style.borderRadius = "14px";
                viewAllBtn.style.border = "1px dashed #9ca3af";
                viewAllBtn.style.backgroundColor = "#f9fafb";
                viewAllBtn.style.color = "#4b5563";
                viewAllBtn.style.cursor = "pointer";
                viewAllBtn.style.fontSize = "12px";
                viewAllBtn.style.fontWeight = "500";
                viewAllBtn.style.transition = "all 0.15s ease";
                viewAllBtn.innerText = "💬 View All";
                viewAllBtn.onclick = () => {
                    const allQs = [];
                    categoryKeys.forEach(k => allQs.push(...categories[k]));
                    renderQuestionsList(allQs, "All Questions");
                };
                pillsWrap.appendChild(viewAllBtn);

                sqContainer.appendChild(pillsWrap);
                messagesArea.appendChild(sqContainer);
                scrollToBottom(true);
            }

            // Function to render Questions under a selected Heading
            function renderQuestionsList(questionList, activeCategoryTitle) {
                sqContainer.innerHTML = "";

                if (activeCategoryTitle) {
                    const navBar = document.createElement("div");
                    navBar.style.display = "flex";
                    navBar.style.justifyContent = "space-between";
                    navBar.style.alignItems = "center";
                    navBar.style.width = "100%";
                    navBar.style.marginBottom = "4px";

                    const titleSpan = document.createElement("span");
                    titleSpan.style.fontSize = "12px";
                    titleSpan.style.fontWeight = "700";
                    titleSpan.style.color = "#1f2937";
                    titleSpan.innerText = activeCategoryTitle;

                    const backBtn = document.createElement("button");
                    backBtn.style.background = "none";
                    backBtn.style.border = "none";
                    backBtn.style.color = accent;
                    backBtn.style.cursor = "pointer";
                    backBtn.style.fontSize = "11px";
                    backBtn.style.fontWeight = "700";
                    backBtn.style.padding = "2px 6px";
                    backBtn.style.display = "flex";
                    backBtn.style.alignItems = "center";
                    backBtn.style.gap = "4px";
                    backBtn.innerHTML = `← Back to Topics`;
                    backBtn.onclick = renderCategoryHeadings;

                    navBar.appendChild(titleSpan);
                    navBar.appendChild(backBtn);
                    sqContainer.appendChild(navBar);
                }

                const qWrap = document.createElement("div");
                qWrap.style.display = "flex";
                qWrap.style.flexWrap = "wrap";
                qWrap.style.gap = "6px";

                questionList.forEach(sq => {
                    const btn = document.createElement("button");
                    btn.innerText = sq;
                    btn.style.padding = "6px 12px";
                    btn.style.borderRadius = "16px";
                    btn.style.border = `1px solid ${accent}`;
                    btn.style.backgroundColor = "#fff";
                    btn.style.color = accent;
                    btn.style.cursor = "pointer";
                    btn.style.fontSize = "12px";
                    btn.style.lineHeight = "1.3";
                    btn.style.textAlign = "left";
                    btn.style.transition = "all 0.15s ease";
                    btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";

                    btn.onmouseenter = () => {
                        btn.style.backgroundColor = accent;
                        btn.style.color = "#fff";
                    };
                    btn.onmouseleave = () => {
                        btn.style.backgroundColor = "#fff";
                        btn.style.color = accent;
                    };
                    btn.onclick = () => {
                        inputField.value = sq;
                        sendMessage();
                    };
                    qWrap.appendChild(btn);
                });

                sqContainer.appendChild(qWrap);
                messagesArea.appendChild(sqContainer);
                scrollToBottom(true);
            }

            renderCategoryHeadings();
        }

        async function initBot() {
            try {
                const res = await fetch(`${apiBase}/api/public/bots/${botKey}/init`);
                if (res.ok) {
                    config = await res.json();
                    header.querySelector("#bbot-title").innerText = config.name;
                    
                    const accent = config.accent && config.accent.startsWith("var") ? "#C87514" : (config.accent || "#C87514");
                    header.style.backgroundColor = accent;
                    header.style.background = accent === "#C87514" ? "linear-gradient(135deg, #E39A3D 0%, #C87514 50%, #A85F12 100%)" : accent;
                    sendBtn.style.backgroundColor = accent;

                    // Restore Session if available (Item 2)
                    const savedSession = loadSavedSession();
                    if (savedSession && savedSession.messages && savedSession.messages.length > 0) {
                        conversationId = savedSession.conversationId || null;
                        messagesArea.innerHTML = "";
                        savedSession.messages.forEach(msg => {
                            addMessage(msg.text, msg.isUser, false);
                        });
                    } else {
                        addMessage("Hi there! How can I help you today?", false, false);
                    }
                    renderStarterQuestions();
                } else {
                    addMessage("Error initializing bot. Please check integration settings.", false, false);
                }
            } catch (e) {
                console.error("bbot init error:", e);
                let msg = "Network error. Could not reach server at " + apiBase;
                if (window.location.protocol === "https:" && apiBase.startsWith("http://")) {
                    msg += " (Browser blocked insecure HTTP request from HTTPS page)";
                }
                addMessage(msg, false, false);
            }
        }

        async function sendMessage() {
            const text = inputField.value.trim();
            if (!text) return;
            
            // Remove previous starter questions while generating
            const existingSq = document.getElementById("bbot-starter-questions");
            if (existingSq) existingSq.remove();

            inputField.value = "";
            userHasScrolledUp = false; // Reset on new question
            addMessage(text, true, true);

            const replyDiv = addMessage("typing...", false, false);
            let fullReply = "";

            try {
                const res = await fetch(`${apiBase}/api/public/bots/${botKey}/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: text, 
                        conversation_id: conversationId,
                        language: selectedLanguage 
                    })
                });

                if (!res.ok) {
                    replyDiv.innerText = "Error: Failed to fetch response.";
                    renderStarterQuestions();
                    return;
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                replyDiv.innerHTML = "";
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.replace("data: ", "").trim();
                            if (dataStr === "[DONE]") break;
                            if (!dataStr) continue;
                            
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.conversation_id) conversationId = data.conversation_id;
                                if (data.error) {
                                    fullReply = `<span style="color:red">Error: ${data.error}</span>`;
                                    replyDiv.innerHTML = fullReply;
                                } else if (data.chunk) {
                                    fullReply += data.chunk;
                                    replyDiv.innerHTML = fullReply
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br/>');
                                    scrollToBottom(false);
                                }
                            } catch (e) {}
                        }
                    }
                }
                
                if (buffer.trim()) {
                    const lines = buffer.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.replace("data: ", "").trim();
                            if (dataStr && dataStr !== "[DONE]") {
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.error) {
                                        fullReply = `<span style="color:red">Error: ${data.error}</span>`;
                                        replyDiv.innerHTML = fullReply;
                                    } else if (data.chunk) {
                                        fullReply += data.chunk;
                                        replyDiv.innerHTML = fullReply
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\n/g, '<br/>');
                                        scrollToBottom(false);
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                }

                // Save full assistant response into session persistence (Item 2)
                if (fullReply) {
                    saveMessageToSession(fullReply, false);
                }

                // Play Audio Chime / Ding upon completion (Item 4)
                playChime();

                // Place starter questions at the end of the newly generated answer
                renderStarterQuestions();

            } catch (e) {
                console.error("bbot message error:", e);
                replyDiv.innerText = "Error sending message.";
                renderStarterQuestions();
            }
        }

        sendBtn.onclick = sendMessage;
        inputField.onkeypress = (e) => {
            if (e.key === "Enter") sendMessage();
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWidget);
    } else {
        initWidget();
    }
})();
