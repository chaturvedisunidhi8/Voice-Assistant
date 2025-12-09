// app.js (front-end voice + call to backend, not directly to LLM)

// URL of  Python backend
const BACKEND_URL = "http://localhost:5000/ask";

const micBtn = document.getElementById("micBtn");
const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const latencyEl = document.getElementById("latency");

// top controls in chat header
const clearBtn = document.getElementById("clearBtn");
const pauseToggleBtn = document.getElementById("pauseToggleBtn");
const pillIcon = pauseToggleBtn.querySelector(".pill-icon");
const pillText = pauseToggleBtn.querySelector(".pill-text");

let recognition;
let listening = false;

// Female Indian-accent English voice selection
let preferredVoice = null;

if ("speechSynthesis" in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;

    // 1) female + Indian English (lang en-IN)
    preferredVoice =
      voices.find(
        (v) =>
          /^en[-_]IN$/i.test(v.lang) && /female/i.test(v.name)
      ) ||
      // 2) female + name hints India
      voices.find(
        (v) =>
          /female/i.test(v.name) &&
          /(india|indian|हिन्दी|हिंदी)/i.test(v.name) &&
          /en/i.test(v.lang)
      ) ||
      // 3) any female English voice
      voices.find(
        (v) => /female/i.test(v.name) && /^en[-_]/i.test(v.lang)
      ) ||
      // 4) any English voice
      voices.find((v) => /^en[-_]/i.test(v.lang)) ||
      // 5) absolute fallback
      voices[0];

    console.log("Using voice:", preferredVoice?.name, preferredVoice?.lang);
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Speech recognition (speech-to-text)
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-IN";          // listen as Indian English
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add("active");
    statusEl.textContent = "Listening… speak now.";
  };

  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove("active");
    statusEl.textContent = "Tap the mic and start speaking…";
  };

  recognition.onerror = () => {
    listening = false;
    micBtn.classList.remove("active");
    statusEl.textContent = "Error with microphone, try again.";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage("user", transcript);
    callBackend(transcript);
  };
} else {
  statusEl.textContent = "Speech recognition not supported in this browser.";
}

// Mic button
micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (listening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// Text send
sendBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  textInput.value = "";
  callBackend(text);
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Clear chat
clearBtn.addEventListener("click", () => {
  messagesEl.innerHTML = "";
});

// Pause / Resume voice toggle
let isPaused = false;

pauseToggleBtn.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;

  if (!isPaused) {
    window.speechSynthesis.pause();
    isPaused = true;
    pillIcon.textContent = "▶";
    pillText.textContent = "Resume";
  } else {
    window.speechSynthesis.resume();
    isPaused = false;
    pillIcon.textContent = "⏸";
    pillText.textContent = "Pause";
  }
});

// Add message bubble
function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "bot");
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Call Python backend
async function callBackend(prompt) {
  const start = performance.now();
  addMessage("bot", "Thinking…");

  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const answer =
      data.answer || data.error || "Sorry, I could not generate a response.";

    messagesEl.lastChild.textContent = answer;

    const elapsed = Math.round(performance.now() - start);
    latencyEl.textContent = `Latency: ${elapsed} ms `;

    speakText(answer);
  } catch (e) {
    messagesEl.lastChild.textContent = "Error talking to backend.";
  }
}

// Text-to-speech: female Indian-accent English if available 
function speakText(text) {
  if (!("speechSynthesis" in window)) return;

  // reset pause state on new message
  if (isPaused) {
    isPaused = false;
    pillIcon.textContent = "⏸";
    pillText.textContent = "Pause";
  }

  // stop any previous speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  } else {
    utterance.lang = "en-IN"; // request Indian English
  }

  utterance.rate = 1;      // natural speed
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

