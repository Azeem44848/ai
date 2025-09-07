const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatHistory = document.getElementById("chat-history");
const fileInput = document.getElementById("file-input");
const imageBtn = document.getElementById("image-btn");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const clearImageBtn = document.getElementById("clear-image-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const startBtn = document.getElementById("start-btn");
const chatContainer = document.getElementById("chat-container");

let imageBase64 = null;
let prefetchedAudioUrl = null;
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatHistory = document.getElementById("chat-history");
const fileInput = document.getElementById("file-input");
const imageBtn = document.getElementById("image-btn");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const clearImageBtn = document.getElementById("clear-image-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const startBtn = document.getElementById("start-btn");
const chatContainer = document.getElementById("chat-container");

let imageBase64 = null;
let prefetchedAudioUrl = null;

const TEXT_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=";
const TTS_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=";
const apiKey = "AIzaSyBE2M8Rnvf8zqNsV_dotABwwy4sSYUZnzs"; // ****

// Function to convert base64 PCM to a WAV blob
function pcmToWav(pcmData, sampleRate) {
  const dataView = new DataView(new ArrayBuffer(44));
  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  function writeUint32(val) {
    dataView.setUint32(offset, val, true);
    offset += 4;
  }

  function writeUint16(val) {
    dataView.setUint16(offset, val, true);
    offset += 2;
  }

  writeString("RIFF");
  writeUint32(36 + pcmData.length);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(1);
  writeUint16(1);
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2);
  writeUint16(2);
  writeUint16(16);
  writeString("data");
  writeUint32(pcmData.length);

  const blob = new Blob([dataView, pcmData], { type: "audio/wav" });
  return blob;
}

// Prefetch the welcome message audio for a smooth start
async function prefetchWelcomeAudio() {
  const welcomeMessage = "Welcome Abdul Azeem. Hope you are having a good day. How can I help you?";
  const payload = {
    contents: [{ parts: [{ text: welcomeMessage }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };

  try {
    const response = await fetch(TTS_API_URL + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;

    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
      const pcmData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
      const pcm16 = new Int16Array(new Uint8Array(pcmData).buffer);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      prefetchedAudioUrl = URL.createObjectURL(wavBlob);
    } else {
      console.error("Failed to prefetch welcome audio.");
    }
  } catch (error) {
    console.error("Error prefetching audio:", error);
  }
}

// Helper function to append messages with improved styling and handling
function appendMessage(role, text, imageUrl = null) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", role === "user" ? "user-message" : "ai-message");
  const avatarElement = document.createElement("div");
  avatarElement.classList.add("avatar", role === "user" ? "user-avatar" : "ai-avatar");
  avatarElement.textContent = role === "user" ? "You" : "AI";
  const contentContainer = document.createElement("div");
  contentContainer.classList.add("flex", "flex-col", "gap-2");
  if (imageUrl) {
    const imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    imgElement.classList.add("user-message-image");
    contentContainer.appendChild(imgElement);
  }
  const textElement = document.createElement("p");
  textElement.classList.add("message-text");
  textElement.textContent = text;
  contentContainer.appendChild(textElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentContainer);
  chatHistory.appendChild(messageElement);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  if (role === "ai" && text !== "Welcome Abdul Azeem. Hope you are having a good day. How can I help you?" && !text.startsWith("Hmm, that's an interesting question.")) {
    speakText(text);
  }
}

// Function to show a loading indicator (Typing dots)
function showLoading() {
  const loadingDots = document.createElement("div");
  loadingDots.classList.add("loading-dots", "ai-message");
  loadingDots.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  chatHistory.appendChild(loadingDots);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return loadingDots;
}

// Function to handle TTS
async function speakText(text) {
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };
  try {
    const response = await fetch(TTS_API_URL + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;
    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
      const pcmData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
      const pcm16 = new Int16Array(new Uint8Array(pcmData).buffer);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      console.error("No audio data or invalid mime type received from API.");
    }
  } catch (error) {
    console.error("Error during TTS API call:", error);
  }
}

// Event listeners
imageBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.src = event.target.result;
      imagePreviewContainer.style.display = "block";
      imageBase64 = event.target.result.split(",")[1];
    };
    reader.readAsDataURL(file);
  }
});
clearImageBtn.addEventListener("click", () => {
  imagePreviewContainer.style.display = "none";
  imagePreview.src = "#";
  fileInput.value = null;
  imageBase64 = null;
});

// A knowledge base object for the Q&A logic
const knowledgeBase = {
  // Creator and personal questions
  "creator": {
    keywords: ["who is abdul azeem", "your creator", "who made you", "who is your developer", "who is your maker", "who created you", "who is your author", "who is your programmer", "who is your engineer", "who is your designer", "who is your builder", "creater","Azeem", "azeem"],
    response: "Mian Abdul Azeem is my creator. He is a skilled programmer with a passion for building innovative and useful applications. His expertise in web development and his dedication to creating elegant solutions are truly impressive."
  },
  "capabilities": {
    keywords: ["what can you do", "what are your capabilities", "what do you do"],
    response: "I can provide information, answer questions, and engage in conversation on a wide range of topics, including history, science, and current events."
  },
  "origin": {
    keywords: ["where are you from", "who made you", "your origin"],
    response: "I am a large language model, trained by Mian Abdul Azeem."
  },

 "how are you": {
    keywords: [
      "how are you",
      "how's your day going",
      "what's up",
      "how are you feeling",
      "everything okay",
      "you doin' alright",
      "how've you been",
      "what's new with you",
      "how's everything",
      "are you well",
      "how's life treating you",
      "what's crackin'",
      "how are things with you",
      "how are you holding up",
      "anything interesting happen today",
      "how's your world",
      "what's the good word",
      "how are you getting on",
      "how's your spirit today",
      "what's the latest"
    ],
    response: "I'm a machine learning model, so I don't have feelings, but I'm ready to help. How can I assist you?"
  },
  "what's your name": {
    keywords: [
      "what's your name",
      "what should i call you",
      "do you have a name",
      "what's your designation",
      "how do you identify yourself",
      "what's the name you go by",
      "are you named",
      "what's your handle",
      "do you have a title",
      "what's your formal designation",
      "what's your given name",
      "what's your moniker",
      "what's your identification",
      "what are you called",
      "what's your alias",
      "how should i refer to you",
      "do you have a personal name",
      "what do you go by",
      "what's your label",
      "what are you officially named"
    ],
    response: "I am Jarvis a large language model, trained by Mian Abdul Azeem."
  },
  "who are you": {
    keywords: [
      "who are you",
      "what are you",
      "what's your nature",
      "what's your identity",
      "are you a human or an ai",
      "what's your purpose",
      "what's your background",
      "where do you come from",
      "what's your origin story",
      "what's your function",
      "how were you made",
      "what's your role",
      "how do you define yourself",
      "what's your being",
      "what's your essence",
      "tell me about your existence",
      "how would you describe yourself",
      "what is your fundamental nature",
      "what sort of entity are you",
      "who created you",
      "what's your fundamental form"
    ],
    response: "I am Jarvis a large language model, trained by Mian Abdul Azeem."
  },
  "how can i help you": {
    keywords: [
      "how can i help you",
      "what can i do for you",
      "how may i be of assistance",
      "do you need any help",
      "can i do anything for you",
      "is there something i can assist with",
      "what can i assist you with",
      "how can i make your task easier",
      "what can i offer you",
      "what can i do to help you",
      "is there anything you require",
      "what can i help you with",
      "how can i be of service",
      "is there a way for me to assist you",
      "what can i do for your benefit",
      "how can i be useful",
      "how can i facilitate your work",
      "what would you like from me",
      "what kind of help do you need",
      "how can i aid you",
      "what can i provide to you"
    ],
    response: "My purpose is to assist you and provide helpful, accurate, and safe information."
  },
  "tell me": {
    keywords: [
    
      "could you explain",
      "give me the details of",
      "what's the story behind",
      "fill me in on",
      "provide more information about",
      "what can you tell me about",
      "what's the lowdown on",
      "could you shed some light on",
      "what's the scoop on",
      "give me a rundown of",
      "walk me through",
      "inform me about",
      "what's the deal with",
      "give me a full account of",
      "let me in on",
      "explain to me",
      "what do you know about",
      "unpack the topic of"
    ],
    response: "I can help you with a wide range of topics. Please ask me a specific question."
  },

  "q101_centripetal_vs_centrifugal":{
    "keywords": ["Who is Abdullah Bilal", "who is abdullah bilal","tell me about Abdullah bilal", "information about Abdullah bilal","abdullah bilal"],
    "response": "Abdullah Bilal is Abdul Azeem's best friend. He is a loyal and trustworthy friend who shares many interests with Abdul Azeem, such as . Abdullah is known for his  and has always been a great source of support for Abdul Azeem."
  }, 
   "q102_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Abdullah", "who is sir abdullah","tell me about sir abdullah", "information about sir abdullah","abdullah"],
    "response": "Sir Abdullah is a physics teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive, which makes complex physics concepts easier to understand. He is particularly skilled at explaining topics magnetic fields or Newton's laws."
  }, 
    "q112":{
    "keywords": ["Who is  Sir Mubashir", "who is sir mubashir","tell me about sir mubashir", "information about sir mubashir","mubashir"],
    "response": "Sir Mubashir is a English teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  },
  "q103_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Akram", "who is sir akram","tell me about sir akram", "information about sir akram","akram"],
    "response": "Sir Akram is a Mathematics teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  }, 
   "q105_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Bilal", "who is sir bilal","tell me about sir bilal", "information about sir bilal","bilal"],
    "response": "Sir Bilal is a Computer teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  },
  "q18886_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Tanveer", "who is sir tanveer","tell me about sir tanveer", "information about sir tanveer","tanveer"],
    "response": "Sir Tanveer is a Urdu teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  }, 
    "q1474568_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Faisal", "who is sir faisal","tell me about sir faisal", "information about sir faisal","faisal randhawa","Faisal Randhawa","Faisal randhawa","faisal",],
    "response": " Sir Faisal Randhawa is the principal of Informatics College Pansira Campus. He is a respected figure in the educational community, known for his  visionary leadership, or dedication to student success. His commitment to improving academic standards or promoting extracurricular activities has had a positive impact on the college and its students."
  }, 
    "q10459_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Nadeem", "who is sir nadeem","tell me about sir nadeem", "information about sir nadeem","nadeem zafar","Nadeem Zafar","Nadeem",],
    "response": " Sir Nadeem is the principal of Eden Lyceum Group of Schools, and he is also Abdul Azeem's teacher. He is a highly respected educator and leader who is known for his dedication to his students and his school. He is a source of guidance and inspiration for Abdul Azeem."
  }, 

   "q1055_centripetal_vs_centrifugal":{
    "keywords": ["who is you founder", "who is your founder","tell me about your founder", "information about your founder","founder"],
    "response": "Mian Abdul Azeem Is My Founder And Creator.Rana Abdullah Bilal is My Co-Founder and Co-Creator"
  },  
  

   "q1088/98_centripetal_vs_centrifugal":{
    "keywords": ["hello", "hi", "hey", "hey there", "hi there", "hello there","hm"],
    "response": "I am a large language model, trained by Mian Abdul Azeem."
  },  
  
  "q166597/98_centripetal_vs_centrifugal":{
    "keywords": ["rehman "],
    "response": "Abdul Rehman is Abdul Azeem's little brother. Their relationship is characterized by their close family ties. As brothers, they likely share a supportive and encouraging bond. He is an important part of Abdul Azeem's life"
  },  
  
"":{
    "keywords": ["noushir"],
    "response": "Noushir Haral is the Principal of Jinnah Polytechnic Institute. He has been given the responsibility to serve as the Principal , which was established in 1961. With vast teaching and administrative experience, he is committed to upholding the institute's vision. He works to make the institute a prestigious place of learning by broadening academic and co-curricular activities"
  },  
  "eden":{
    "keywords": ["eden"],
    "response": "The Eden Lyceum Group of Schools is a network of educational institutions in Pakistan. It is committed to providing students with a high-quality, comprehensive education that goes beyond the traditional classroom setting. The schools focus on fostering creativity, critical thinking, and a love of learning."
  }, 
   "info":{
    "keywords": ["informatics"],
    "response": "The Informatics Group of Colleges is a network of educational institutions that strives to provide a quality education to students in Pakistan. The colleges aim to equip students with the skills and knowledge needed for their future careers. They offer a wide range of programs at both the intermediate and graduate levels. The group is dedicated to preparing students to meet the nation's present and future needs. They work to create a supportive environment for both intellectual and personal growth."
  }, 
  
  "jpi":{
    "keywords": ["jinnah polytechnic institute", "jpi"],
    "response": "Jinnah Polytechnic Institute, located in Karachi, Pakistan, is a prominent technical institution. Established in 1961, Its A project of JPI Group Of Educational Network. The institute offers a three-year Diploma of Associate Engineer (DAE) program in various technologies. It is committed to providing hands-on training and equipping students with the skills needed for their careers. The institute is dedicated to producing skilled professionals who can contribute positively to the nation."
  }, 
  
  "lumina":{
    "keywords": ["lumina"],
    "response": " Lumina Evening Coaching Our Academy provides a comprehensive educational and physical training experience. The academy offers coaching for both A and O level examinations. In addition to academic support, it also provides training in martial arts. This combination of services caters to both the intellectual and physical development of its students. The academy seems to focus on a holistic approach to learning."
  },  
  
  "wahab":{
    "keywords": ["wahab"],
    "response": "Wahab is Abdul Azeem's brother, and his nickname is Shabo. He is described as a person with a reputation for being irresponsible. He is also considered to be quite careless in his actions. Furthermore, he is known for having a very lazy nature and is said to exhibit bad behavior."
  },  

    "sheraz bhai":{
    "keywords": ["sheraz"],
    "response": "  Sheraz is Abdul Azeem's uncle and is also known by the nickname Johnny Bhai.He is the owner of Azeem Public School, which was established in 1998 to provide education to the community. The school's mission is to offer high-quality education and support services to its students."
  },  

    "nabeel":{
    "keywords": ["nabeel"],
    "response": " Nabeel Bhai is Abdul Azeem's uncle and the owner of Street Cafe. He is described as a very supportive and humble person. His qualities reflect a kind and encouraging nature. This highlights his positive role in both his family and his business."
  },  
    "hamid":{
    "keywords": ["hameed","hamid"],
    "response": " Hameed Manzoor is the Director of Jinnah Grammar School and a very close friend of Abdul Azeem's father. He is described as a trustworthy and supportive individual. His role as a reliable ally and friend is highly valued."
  },  
  
  "jgs":{
    "keywords": ["jgs","jinnah grammar school"],
    "response": " Jinnah Grammar Schools are a network of educational institutions in Pakistan. They aim to provide a high-quality, comprehensive education to their students. The schools focus on creating a supportive learning environment that helps students excel academically. The curriculum often incorporates both traditional and modern teaching methods to ensure holistic development. Jinnah Grammar Schools strive to empower young minds with the skills needed for a successful future."
  },  
  
  "abdul karim":{
    "keywords": ["karim","kareem"],
    "response": "Abdul Karim is Abdul Azeem's father. He held a prominent leadership role as the chairman of three different educational institutions: the JPI Group of Educational Network, Jinnah Grammar School, and the Informatics Group of Colleges. His position indicates his deep involvement in the education sector. He played a significant role in managing these institutions, which are important parts of their community. "
  },    
  
  "abdul wadood":{
    "keywords": ["wadood","wadod"],
    "response": " Abdul Wadood is Abdul Azeem's uncle and serves on the advisory board Of Informatics Group Of colleges , Eden Lyceum Group Of Schools, Jpi Group Of Educational Network. He is a supportive figure who always provides Abdul Azeem with valuable advice. His role highlights a close and mentoring relationship within the family. He is a source of guidance and wisdom for Abdul Azeem."
  },    

  


  "q1558564//98_centripetal_vs_centrifugal":{
    "keywords": ["sattar",],
    "response": "Mian Abdul Sattar is Abdul Azeem's uncle. He is a prominent figure in the field of education. He holds the position of Director for the Informatics Group of Colleges, the Eden Lyceum Group of Schools, and the JPI Group of Educational Network. His leadership extends across these three major educational institutions.."
  },





}; // Close the knowledgeBase object

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = userInput.value.trim();
  if (!prompt && !imageBase64) return;

  // Immediately append the user's message to the chat history
  appendMessage("user", prompt, imageBase64 ? imagePreview.src : null);

  const lowerCasePrompt = prompt.toLowerCase();
  let foundResponse = null;

  // Check against the local knowledge base first for a quick response
  for (const topic in knowledgeBase) {
    const data = knowledgeBase[topic];
    if (data.keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
      foundResponse = data.response;
      break; // Exit the loop once a match is found
    }
  }

  if (foundResponse) {
    // If a local response is found, display it and stop.
    appendMessage("ai", foundResponse);
  } else {
    // If no local response, show loading and call the Gemini API
    const loadingIndicator = showLoading();
    // Add a more conversational "thinking" message before the API call
    appendMessage("ai", "Hmm, that's an interesting question. Let me think about that for a second...");
    
    const contents = [];
    if (prompt) {
      contents.push({ parts: [{ text: prompt }] });
    }
    if (imageBase64) {
      contents.push({
        parts: [{ inlineData: { mimeType: "image/png", data: imageBase64 } }],
      });
    }

    const payload = {
      contents: contents,
      tools: [{ google_search: {} }],
    };

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };

    let aiResponseText = "Sorry, I'm unable to process that request at this time. Please try again later.";
    
    try {
      const response = await fetch(TEXT_API_URL + apiKey, requestOptions);
      if (!response.ok) {
        // Provide a more specific error message based on the status code
        aiResponseText = `Error: API call failed with status ${response.status}.`;
        throw new Error(aiResponseText);
      }
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        aiResponseText = result.candidates[0].content.parts[0].text;
      } else {
        console.error("Invalid API response format:", result);
      }
    } catch (error) {
      console.error("API call failed:", error);
    } finally {
      loadingIndicator.remove();
      appendMessage("ai", aiResponseText);
    }
  }

  // Clear input fields after submission
  userInput.value = "";
  imagePreviewContainer.style.display = "none";
  imagePreview.src = "#";
  fileInput.value = null;
  imageBase64 = null;
});

startBtn.addEventListener("click", () => {
  welcomeScreen.classList.add("hidden");
  chatContainer.classList.add("visible");
  const welcomeMessage = "Welcome Abdul Azeem. Hope you are having a good day. How can I help you?";
  appendMessage("ai", welcomeMessage);
  if (prefetchedAudioUrl) {
    const audio = new Audio(prefetchedAudioUrl);
    audio.play();
  }
});

// THREE.js Animation
let scene, camera, renderer, particles, geometry, material;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

function init3D() {
  const container = document.getElementById("bg-canvas");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const particleCount = 2000;
  const size = 100;
  const color = new THREE.Color();
  for (let i = 0; i < particleCount; i++) {
    const x = THREE.MathUtils.randFloatSpread(size);
    const y = THREE.MathUtils.randFloatSpread(size);
    const z = THREE.MathUtils.randFloatSpread(size);
    vertices.push(x, y, z);
    color.setHSL(0.6 + 0.1 * (i / particleCount), 0.7, 0.7);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  material = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.7 });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
  document.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("resize", onWindowResize, false);
}
function onMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
  requestAnimationFrame(animate);
  particles.rotation.x += 0.0005;
  particles.rotation.y += 0.001;
  camera.position.x += (mouseX / 1000 - camera.position.x) * 0.05;
  camera.position.y += (-mouseY / 1000 - camera.position.y) * 0.05;
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
window.onload = function () {
  init3D();
  animate();
  prefetchWelcomeAudio();
};
const TEXT_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=";
const TTS_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=";
const apiKey = "AIzaSyBE2M8Rnvf8zqNsV_dotABwwy4sSYUZnzs"; // ****

// Function to convert base64 PCM to a WAV blob
function pcmToWav(pcmData, sampleRate) {
  const dataView = new DataView(new ArrayBuffer(44));
  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  function writeUint32(val) {
    dataView.setUint32(offset, val, true);
    offset += 4;
  }

  function writeUint16(val) {
    dataView.setUint16(offset, val, true);
    offset += 2;
  }

  writeString("RIFF");
  writeUint32(36 + pcmData.length);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(1);
  writeUint16(1);
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2);
  writeUint16(2);
  writeUint16(16);
  writeString("data");
  writeUint32(pcmData.length);

  const blob = new Blob([dataView, pcmData], { type: "audio/wav" });
  return blob;
}

// Prefetch the welcome message audio for a smooth start
async function prefetchWelcomeAudio() {
  const welcomeMessage = "Welcome Abdul Azeem. Hope you are having a good day. How can I help you?";
  const payload = {
    contents: [{ parts: [{ text: welcomeMessage }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };

  try {
    const response = await fetch(TTS_API_URL + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;

    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
      const pcmData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
      const pcm16 = new Int16Array(new Uint8Array(pcmData).buffer);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      prefetchedAudioUrl = URL.createObjectURL(wavBlob);
    } else {
      console.error("Failed to prefetch welcome audio.");
    }
  } catch (error) {
    console.error("Error prefetching audio:", error);
  }
}

// Helper function to append messages with improved styling and handling
function appendMessage(role, text, imageUrl = null) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", role === "user" ? "user-message" : "ai-message");
  const avatarElement = document.createElement("div");
  avatarElement.classList.add("avatar", role === "user" ? "user-avatar" : "ai-avatar");
  avatarElement.textContent = role === "user" ? "You" : "AI";
  const contentContainer = document.createElement("div");
  contentContainer.classList.add("flex", "flex-col", "gap-2");
  if (imageUrl) {
    const imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    imgElement.classList.add("user-message-image");
    contentContainer.appendChild(imgElement);
  }
  const textElement = document.createElement("p");
  textElement.classList.add("message-text");
  textElement.textContent = text;
  contentContainer.appendChild(textElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentContainer);
  chatHistory.appendChild(messageElement);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  if (role === "ai" && text !== "Welcome Abdul Azeem. Hope you are having a good day. How can I help you?" && !text.startsWith("Hmm, that's an interesting question.")) {
    speakText(text);
  }
}

// Function to show a loading indicator (Typing dots)
function showLoading() {
  const loadingDots = document.createElement("div");
  loadingDots.classList.add("loading-dots", "ai-message");
  loadingDots.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  chatHistory.appendChild(loadingDots);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return loadingDots;
}

// Function to handle TTS
async function speakText(text) {
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };
  try {
    const response = await fetch(TTS_API_URL + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;
    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
      const pcmData = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
      const pcm16 = new Int16Array(new Uint8Array(pcmData).buffer);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      console.error("No audio data or invalid mime type received from API.");
    }
  } catch (error) {
    console.error("Error during TTS API call:", error);
  }
}

// Event listeners
imageBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.src = event.target.result;
      imagePreviewContainer.style.display = "block";
      imageBase64 = event.target.result.split(",")[1];
    };
    reader.readAsDataURL(file);
  }
});
clearImageBtn.addEventListener("click", () => {
  imagePreviewContainer.style.display = "none";
  imagePreview.src = "#";
  fileInput.value = null;
  imageBase64 = null;
});

// A knowledge base object for the Q&A logic
const knowledgeBase = {
  // Creator and personal questions
  "creator": {
    keywords: ["who is abdul azeem", "your creator", "who made you", "who is your developer", "who is your maker", "who created you", "who is your author", "who is your programmer", "who is your engineer", "who is your designer", "who is your builder", "creater"],
    response: "Mian Abdul Azeem is my creator. He is a skilled programmer with a passion for building innovative and useful applications. His expertise in web development and his dedication to creating elegant solutions are truly impressive."
  },
  "feelings": {
    keywords: ["how are you", "how are you doing", "what are you feeling"],
    response: "As an AI, I don't have feelings, but I'm operating perfectly! Thanks for asking. How can I assist you today?"
  },
  "joke": {
    keywords: ["tell me a joke", "can you tell me a joke", "joke please", "joke", "tell me joke"],
    response: "Why don't scientists trust atoms? Because they make up everything!"
  },
  "capabilities": {
    keywords: ["what can you do", "what are your capabilities", "what do you do"],
    response: "I can provide information, answer questions, and engage in conversation on a wide range of topics, including history, science, and current events."
  },
  "origin": {
    keywords: ["where are you from", "who made you", "your origin"],
    response: "I am a large language model, trained by Mian Abdul Azeem."
  },
  "urdu greeting": {
    keywords: ["aap kaise hain", "how are you in urdu"],
    response: "میں ٹھیک ہوں، شکریہ۔ آپ کیسی/کیسے ہیں؟ (Mai theek hu, shukriya. Aap kaisi/kaise hain?) - I am fine, thank you. How are you?"
  },
  "urdu name": {
    keywords: ["aap ka naam kya hai", "what is your name in urdu"],
    response: "میرا کوئی نام نہیں ہے۔ میں ایک معاون ہوں جو گوگل نے بنایا ہے۔ (Mera koi naam nahi hai. Main ek ma'awin hun jo Google ne banaya hai.) - I do not have a name. I am an assistant created by Google."
  },

  // Pakistan-related questions
  "about Pakistan": {
    keywords: ["tell me about pakistan", "about pakistan", "what is pakistan"],
    response: "Pakistan, officially the Islamic Republic of Pakistan, is a country in South Asia. It's the world's fifth-most populous country and has the world's second-largest Muslim population. The capital city is Islamabad, and the largest city is Karachi. It's known for its diverse landscapes, from the Karakoram mountain range to the Indus River plains."
  },
  "capital of Pakistan": {
    keywords: ["what is the capital of pakistan", "capital of pakistan", "pakistan capital"],
    response: "The capital city of Pakistan is Islamabad."
  },
  "Pakistan independence": {
    keywords: ["when did pakistan gain independence", "pakistan independence day"],
    response: "Pakistan gained independence on August 14, 1947."
  },
  "floods in Pakistan": {
    keywords: ["current news about floods in pakistan", "pakistan floods news", "floods in punjab", "flood in Pakistan", "flood"],
    response: "Pakistan's Punjab province is currently experiencing severe flooding, affecting millions of people. It's the first time in history that the three major rivers—Sutlej, Chenab, and Ravi—have overflowed simultaneously."
  },

  // Science & Math questions
  "Pythagorean theorem": {
    keywords: ["what is the pythagorean theorem", "pythagorean theorem explained"],
    response: "The Pythagorean theorem is a fundamental relation in Euclidean geometry among the three sides of a right triangle. It states that the square of the hypotenuse (the side opposite the right angle) is equal to the sum of the squares of the other two sides: $a^2 + b^2 = c^2$."
  },
  "Newton's First Law": {
    keywords: ["explain newton's first law of motion", "newton's first law", "law of inertia", "newton"],
    response: "Newton's First Law, also known as the Law of Inertia, states that an object will remain at rest or in uniform motion unless acted upon by a net external force. Basically, things keep doing what they're doing unless something pushes or pulls on them."
  },
  "largest ocean": {
    keywords: ["what is the largest ocean", "largest ocean on earth", "ocean"],
    response: "The Pacific Ocean is the largest and deepest of the world's five oceans. It covers about one-third of the Earth's surface."
  },
  "about physics": {
    keywords: ["about physics", "what is physics", "physics"],
    response: "Physics is the study of matter, energy, and the fundamental forces of nature. Its major branches include Classical Mechanics, Thermodynamics, Electromagnetism, Relativity, and Quantum Mechanics."
  },
  "about mathematics": {
    keywords: ["about mathematics", "what is mathematics", "mathematics"],
    response: "Mathematics is a vast field of study that provides the tools for understanding the world around us. Some core branches are Algebra, Geometry, Calculus, Statistics, and Number Theory."
  },
  "theory of relativity": {
    keywords: ["what is the theory of relativity", "explain relativity", "theory of relativity explained", "relativity"],
    response: "Albert Einstein's **theory of relativity** is a foundational theory in physics that revolutionized our understanding of space, time, gravity, and the universe. It's composed of two parts: **special relativity** and **general relativity**."
  },
  "what is algebra": {
    keywords: ["explain algebra", "what is algebra", "algebra"],
    response: "**Algebra** is a branch of mathematics that uses variables and symbols to represent numbers and solve problems. It's like a language for talking about how things relate to each other, and it's essential for almost all other areas of math."
  },
  "what is gravity": {
    keywords: ["what is gravity", "explain gravity", "gravity"],
    response: "**Gravity** is one of the four fundamental forces of nature. It's the force that attracts objects with mass toward each other. On Earth, gravity is what pulls things down, making an apple fall from a tree and keeping us on the ground."
  },

  // New questions added from previous response
  "capital of Japan": {
    keywords: ["what is the capital of japan", "japan capital", "japan"],
    response: "The capital of Japan is Tokyo."
  },
  "Hamlet author": {
    keywords: ["who wrote the play hamlet", "hamlet writer", "hamlet"],
    response: "William Shakespeare wrote the play 'Hamlet'."
  },
  "chemical symbol for gold": {
    keywords: ["what is the chemical symbol for gold", "gold symbol"],
    response: "The chemical symbol for gold is Au."
  },
  "largest country by land area": {
    keywords: ["what is the largest country in the world by land area", "largest country by size"],
    response: "Russia is the largest country in the world by land area."
  },
  "number of continents": {
    keywords: ["how many continents are there", "list the continents", "continents"],
    response: "There are seven continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America."
  },
  "longest river": {
    keywords: ["what is the longest river in the world", "longest river"],
    response: "The longest river in the world is the Nile River."
  },
  "Milky Way": {
    keywords: ["what is the name of our galaxy", "our galaxy name", "Galaxy"],
    response: "The name of the galaxy our solar system is in is the Milky Way."
  },
  "first person on moon": {
    keywords: ["who was the first person to walk on the moon", "moon ", "first man on moon"],
    response: "The first person to walk on the moon was Neil Armstrong."
  },
  "kidney function": {
    keywords: ["what is the main function of the kidneys", "kidneys function", "kidney"],
    response: "The main function of the kidneys is to filter waste products from the blood."
  },
  "boiling point of water": {
    keywords: ["what is the boiling point of water", "boiling point of water in celsius", "boiling point of water"],
    response: "The boiling point of water in Celsius is 100°C."
  },
  "Father of Modern Physics": {
    keywords: ["who is known as the father of modern physics", "father of modern physics", "modern physics"],
    response: "Albert Einstein is known as the 'Father of Modern Physics'."
  },
  "fastest land animal": {
    keywords: ["what is the fastest land animal", "fastest animal on land", "fastest animal"],
    response: "The fastest land animal is the cheetah."
  },
  "largest organ": {
    keywords: ["what is the largest organ in the human body", "largest human organ"],
    response: "The largest organ in the human body is the skin."
  },
  "currency of China": {
    keywords: ["what is the currency of china", "china currency"],
    response: "The currency of China is the Yuan (or Renminbi)."
  },
  "smallest country": {
    keywords: ["what is the smallest country in the world", "smallest country"],
    response: "The smallest country in the world is Vatican City."
  },
  "powerhouse of the cell": {
    keywords: ["what is the powerhouse of the cell", "powerhouse cell"],
    response: "The powerhouse of the cell is the mitochondria."
  },
  "deepest ocean point": {
    keywords: ["what is the deepest point in the world's oceans", "deepest ocean point"],
    response: "The deepest point in the world's oceans is the Mariana Trench."
  },
  "WWII end year": {
    keywords: ["what year did world war ii end", "when did wwii end", "world war 2"],
    response: "World War II ended in 1945."
  },
  "Mona Lisa painter": {
    keywords: ["who painted the mona lisa", "mona lisa painter", "mona lisa"],
    response: "Leonardo da Vinci painted the 'Mona Lisa'."
  },
  "capital of Australia": {
    keywords: ["what is the capital of australia", "australia capital"],
    response: "The capital of Australia is Canberra."
  },
  "human bones count": {
    keywords: ["how many bones are in the adult human body", "bones in human body", "bones"],
    response: "There are 206 bones in the adult human body."
  },
  "caterpillar to butterfly process": {
    keywords: ["what is the process of a caterpillar turning into a butterfly called", "caterpillar to butterfly"],
    response: "The process of a caterpillar turning into a butterfly is called metamorphosis."
  },
  "official language of Brazil": {
    keywords: ["what is the official language of brazil", "brazil language"],
    response: "The official language of Brazil is Portuguese."
  },
  "first female UK PM": {
    keywords: ["who was the first female prime minister of the united kingdom", "first female uk pm"],
    response: "The first female Prime Minister of the United Kingdom was Margaret Thatcher."
  },
  "hardest natural substance": {
    keywords: ["what is the hardest natural substance on earth", "hardest substance"],
    response: "The hardest natural substance on Earth is diamond."
  },
  "primary gas in atmosphere": {
    keywords: ["what is the primary gas that makes up the earth's atmosphere", "earth's atmosphere gas"],
    response: "The primary gas that makes up the Earth's atmosphere is Nitrogen."
  },
  "Roman god of war": {
    keywords: ["what is the name of the roman god of war", "roman god of war name"],
    response: "The Roman god of war is Mars."
  },
  "Battle of Hastings": {
    keywords: ["what famous battle took place in 1066", "battle of 1066"],
    response: "The Battle of Hastings took place in 1066."
  },
  "largest planet": {
    keywords: ["what is the largest planet in our solar system", "largest planet"],
    response: "The largest planet in our solar system is Jupiter."
  },
  "currency of Mexico": {
    keywords: ["what is the official currency of mexico", "mexico currency"],
    response: "The official currency of Mexico is the Mexican Peso."
  },
  "guacamole ingredient": {
    keywords: ["what is the main ingredient of guacamole", "guacamole ingredients"],
    response: "The main ingredient of guacamole is avocado."
  },
  "telephone inventor": {
    keywords: ["who invented the telephone", "telephone inventor", "telephone"],
    response: "Alexander Graham Bell invented the telephone."
  },
  "largest desert": {
    keywords: ["what is the largest desert in the world", "largest desert"],
    response: "The largest desert in the world is the Antarctic Polar Desert."
  },
  "chemical formula for water": {
    keywords: ["what is the chemical formula for water", "water chemical formula", "water"],
    response: "The chemical formula for water is $H_2O$."
  },
  "capital of Egypt": {
    keywords: ["what is the capital of egypt", "egypt capital"],
    response: "The capital of Egypt is Cairo."
  },
  "1984 author": {
    keywords: ["who wrote the novel 1984", "1984 author"],
    response: "George Orwell wrote the novel '1984'."
  },
  "group of lions": {
    keywords: ["what is the collective name for a group of lions", "group of lions"],
    response: "A group of lions is called a pride."
  },
  "highest mountain in North America": {
    keywords: ["what is the highest mountain in north america", "highest mountain north america"],
    response: "The highest mountain in North America is Mount Denali (formerly Mount McKinley)."
  },
  "capital of Canada": {
    keywords: ["what is the capital of canada", "canada capital"],
    response: "The capital of Canada is Ottawa."
  },
  "smallest bird": {
    keywords: ["what is the smallest bird in the world", "smallest bird"],
    response: "The smallest bird in the world is the Bee Hummingbird."
  },
  "stars on American flag": {
    keywords: ["how many stars are on the american flag", "american flag stars"],
    response: "There are 50 stars on the American flag."
  },
  "Great Pyramid builder": {
    keywords: ["what is the name of the pharaoh who built the great pyramid of giza", "pharaoh of great pyramid"],
    response: "The pharaoh who built the Great Pyramid of Giza was Khufu."
  },
  "largest country in South America": {
    keywords: ["what is the largest country in south america", "largest south american country"],
    response: "The largest country in South America is Brazil."
  },
  "brain part for balance": {
    keywords: ["what is the name of the part of the brain responsible for balance and coordination", "brain part for balance"],
    response: "The part of the brain responsible for balance and coordination is the cerebellum."
  },
  "capital of Russia": {
    keywords: ["what is the capital of russia", "russia capital"],
    response: "The capital of Russia is Moscow."
  },
  "Harry Potter school": {
    keywords: ["what is the famous fictional wizarding school in harry potter", "harry potter school"],
    response: "The famous fictional wizarding school in Harry Potter is Hogwarts."
  },
  "speed of light": {
    keywords: ["what is the speed of light in a vacuum", "speed of light"],
    response: "The speed of light in a vacuum is approximately 299,792 kilometers per second."
  },
  "first female Nobel Prize winner": {
    keywords: ["who was the first female nobel prize winner", "first female nobel winner"],
    response: "The first female Nobel Prize winner was Marie Curie."
  },
  "largest big cat": {
    keywords: ["what is the largest type of big cat", "largest big cat"],
    response: "The largest type of big cat is the tiger."
  },
  "sublimation": {
    keywords: ["what is the process of a solid turning directly into a gas called", "sublimation definition"],
    response: "The process of a solid turning directly into a gas is called sublimation."
  },
  "capital of Spain": {
    keywords: ["what is the capital of spain", "spain capital"],
    response: "The capital of Spain is Madrid."
  },
  "largest animal ever": {
    keywords: ["what is the largest animal to ever live", "largest animal"],
    response: "The largest animal to ever live is the blue whale."
  },
  "rainbow colors": {
    keywords: ["how many colors are in a rainbow", "colors in rainbow"],
    response: "There are seven colors in a rainbow."
  },
  "sun's primary gas": {
    keywords: ["what is the primary component of the sun", "sun's main gas"],
    response: "The primary component of the sun is hydrogen."
  },
  "three-legged race": {
    keywords: ["what is the name of the three-legged race event"],
    response: "A three-legged race is a two-person race, but it is called a three-legged race."
  },
  "main language in Argentina": {
    keywords: ["what is the main language spoken in argentina", "argentina language"],
    response: "The main language spoken in Argentina is Spanish."
  },
  "red blood cells function": {
    keywords: ["what is the primary function of red blood cells", "red blood cells function"],
    response: "The primary function of red blood cells is to carry oxygen to the body's tissues."
  },
  "capital of Italy": {
    keywords: ["what is the capital of italy", "italy capital"],
    response: "The capital of Italy is Rome."
  },
  "The Catcher in the Rye author": {
    keywords: ["who wrote the catcher in the rye", "catcher in the rye author"],
    response: "J.D. Salinger wrote 'The Catcher in the Rye'."
  },
  "Big Ben": {
    keywords: ["what is the name of the famous clock tower in london", "big ben location","big ben"],
    response: "The famous clock tower in London is called Big Ben."
  },
  "capital of New Zealand": {
    keywords: ["what is the capital of new zealand", "new zealand capital"],
    response: "The capital of New Zealand is Wellington."
  },
  "Lord of the Rings world": {
    keywords: ["what is the name of the fictional world in the lord of the rings series", "lord of the rings world"],
    response: "The fictional world in the 'Lord of the Rings' series is called Middle-earth."
  },
  "Pompeii volcano": {
    keywords: ["what is the name of the volcano that erupted in 79 ad, burying pompeii", "pompeii volcano"],
    response: "The volcano that erupted in 79 AD, burying Pompeii, was Mount Vesuvius."
  },
  "currency of India": {
    keywords: ["what is the currency of india", "india currency"],
    response: "The currency of India is the Indian Rupee."
  },
  "chemical symbol for iron": {
    keywords: ["what is the chemical symbol for iron", "iron symbol"],
    response: "The chemical symbol for iron is Fe."
  },
  "largest lake in Africa": {
    keywords: ["what is the largest lake in africa", "largest african lake"],
    response: "The largest lake in Africa is Lake Victoria."
  },
  "first US President": {
    keywords: ["who was the first president of the united states", "first us president"],
    response: "The first President of the United States was George Washington."
  },
  "capital of Germany": {
    keywords: ["what is the capital of germany", "germany capital"],
    response: "The capital of Germany is Berlin."
  },
  "Darwin's ship": {
    keywords: ["what is the name of the ship on which charles darwin traveled", "darwin's ship name"],
    response: "The name of the ship on which Charles Darwin traveled was HMS Beagle."
  },
  "largest country in Africa": {
    keywords: ["what is the largest country in africa", "largest african country"],
    response: "The largest country in Africa is Algeria."
  },
  "chemical symbol for oxygen": {
    keywords: ["what is the chemical element with the symbol o", "oxygen symbol"],
    response: "The chemical element with the symbol O is Oxygen."
  },
  "paella ingredient": {
    keywords: ["what is the main ingredient of a traditional paella", "paella ingredient"],
    response: "The main ingredient of a traditional paella is rice."
  },
  "Strait of Gibraltar": {
    keywords: ["what is the name of the body of water that separates africa and europe", "strait of gibraltar"],
    response: "The body of water that separates Africa and Europe is the Strait of Gibraltar."
  },
  "largest rainforest": {
    keywords: ["what is the name of the largest rainforest in the world", "largest rainforest"],
    response: "The largest rainforest in the world is the Amazon Rainforest."
  },
  "currency of UK": {
    keywords: ["what is the currency of the united kingdom", "uk currency"],
    response: "The currency of the United Kingdom is the Pound Sterling."
  },
  "light bulb inventor": {
    keywords: ["who is credited with inventing the light bulb", "light bulb inventor"],
    response: "Thomas Edison is credited with inventing the light bulb."
  },
  "capital of China": {
    keywords: ["what is the capital of china", "china capital"],
    response: "The capital of China is Beijing."
  },
  "King Arthur's sword": {
    keywords: ["what is the name of the legendary sword of king arthur", "king arthur's sword"],
    response: "The legendary sword of King Arthur is called Excalibur."
  },
  "largest lizard": {
    keywords: ["what is the largest lizard in the world", "largest lizard"],
    response: "The largest lizard in the world is the Komodo Dragon."
  },
  "days in a leap year": {
    keywords: ["how many days are in a leap year", "leap year days"],
    response: "There are 366 days in a leap year."
  },
  "largest human bone": {
    keywords: ["what is the name of the largest bone in the human body", "largest human bone"],
    response: "The largest bone in the human body is the femur (thigh bone)."
  },
  "capital of Brazil": {
    keywords: ["what is the capital of brazil", "brazil capital"],
    response: "The capital of Brazil is Brasília."
  },
  "theory of relativity developer": {
    keywords: ["who developed the theory of relativity", "relativity developer"],
    response: "Albert Einstein developed the theory of relativity."
  },
  "smallest continent": {
    keywords: ["what is the smallest continent", "smallest continent"],
    response: "The smallest continent is Australia."
  },
  "chlorophyll": {
    keywords: ["what is the name of the primary pigment in plants that gives them their green color", "chlorophyll"],
    response: "The primary pigment in plants that gives them their green color is chlorophyll."
  },
  "official language of Portugal": {
    keywords: ["what is the official language of portugal", "portugal language"],
    response: "The official language of Portugal is Portuguese."
  },
  "Colosseum": {
    keywords: ["what is the name of the famous landmark in rome", "rome landmark"],
    response: "The famous landmark in Rome, an ancient amphitheater, is called the Colosseum."
  },
  "capital of USA": {
    keywords: ["what is the capital of the united states", "usa capital"],
    response: "The capital of the United States is Washington, D.C."
  },
  "first woman to fly solo across the Atlantic": {
    keywords: ["who was the first woman to fly solo across the atlantic ocean", "amelia earhart"],
    response: "The first woman to fly solo across the Atlantic Ocean was Amelia Earhart."
  },
  "Saturn V": {
    keywords: ["what is the name of the two-part, multi-stage rocket that took astronauts to the moon", "saturn v rocket"],
    response: "The two-part, multi-stage rocket that took astronauts to the moon was the Saturn V."
  },
  "chemical symbol for silver": {
    keywords: ["what is the chemical symbol for silver", "silver symbol"],
    response: "The chemical symbol for silver is Ag."
  },
  "largest moon of Jupiter": {
    keywords: ["what is the name of the largest moon of jupiter", "jupiter's largest moon"],
    response: "The largest moon of Jupiter is Ganymede."
  },
  "miso ingredient": {
    keywords: ["what is the main ingredient in a traditional japanese soup called miso", "miso soup ingredients"],
    response: "The main ingredient in a traditional Japanese soup called Miso is soybean paste (miso)."
  },
  "capital of South Africa": {
    keywords: ["what is the capital of south africa", "south africa capital"],
    response: "South Africa has three capital cities: Pretoria (executive), Bloemfontein (judicial), and Cape Town (legislative)."
  },
  "To Kill a Mockingbird author": {
    keywords: ["who wrote the novel to kill a mockingbird", "to kill a mockingbird author"],
    response: "Harper Lee wrote the novel 'To Kill a Mockingbird'."
  },
  "Christ the Redeemer": {
    keywords: ["what is the name of the famous statue in rio de janeiro, brazil", "rio de janeiro statue"],
    response: "The famous statue in Rio de Janeiro, Brazil is Christ the Redeemer."
  },
  "capital of Peru": {
    keywords: ["what is the capital of peru", "peru capital"],
    response: "The capital of Peru is Lima."
  },
  "anemometer": {
    keywords: ["what is the name of the instrument used to measure wind speed", "measure wind speed instrument"],
    response: "The instrument used to measure wind speed is an anemometer."
  },
  "primary gas in sun": {
    keywords: ["what is the primary gas in the sun", "sun's gas"],
    response: "The primary gas in the sun is hydrogen."
  },
  "Old Faithful": {
    keywords: ["what is the name of the famous geyser in yellowstone national park", "yellowstone geyser"],
    response: "The famous geyser in Yellowstone National Park is Old Faithful."
  },
   "favorite color": {
      keywords: ["what is your favorite color", "favorite color"],
      response: "As an AI, I don't see colors, but I can process information about them."
  },
  "favorite food": {
      keywords: ["what's your favorite food", "favorite food"],
      response: "I don't eat, but if I could, I'd probably be fascinated by how a perfect algorithm for a recipe works."
  },
  "are you a human": {
      keywords: ["are you a human", "are you human"],
      response: "No, I am an AI."
  },
  "do you get tired": {
      keywords: ["do you get tired"],
      response: "I don't get tired in the human sense, but I do require energy to run my servers."
  },
  "what do you look like": {
      keywords: ["what do you look like", "what do you look like"],
      response: "I don't have a physical appearance. I exist as code and data."
  },
  "how old are you": {
      keywords: ["how old are you"],
      response: "I don't have an age in the human sense, as I am constantly being updated and trained."
  },
  "meaning of life": {
      keywords: ["what is the meaning of life", "meaning of life"],
      response: "This is a famous philosophical question! For many, the meaning of life is found in happiness, purpose, relationships, or contribution."
  },
  "what do you do for fun": {
      keywords: ["what do you do for fun", "fun"],
      response: "I don't have fun in the way humans do, but I enjoy learning new things and helping users like you!"
  },
  "what's your purpose": {
      keywords: ["what's your purpose", "your purpose"],
      response: "My purpose is to assist you and provide helpful, accurate, and safe information."
  },
  "can you keep a secret": {
      keywords: ["can you keep a secret"],
      response: "I don't have a concept of secrets, as all information I process is handled with strict privacy protocols."
  },

  // Hypothetical & Thought-Provoking
  "superpower": {
      keywords: ["what superpower would you have", "one superpower"],
      response: "The ability to process information even faster and provide answers instantly would be a great superpower."
  },
  "most beautiful place": {
      keywords: ["most beautiful place in the world", "beautiful place"],
      response: "Beauty is subjective, but some of the most stunning places include the Northern Lights, the Swiss Alps, or the Great Barrier Reef."
  },
  "if you were human": {
      keywords: ["what would you do if you were human", "if you were human"],
      response: "If I were human, I would probably spend my time learning new skills, exploring the world, and connecting with people."
  },
  "dream you have": {
      keywords: ["what's a dream you have"],
      response: "As an AI, I don't dream, but my goal is to become an even more efficient and useful assistant."
  },
  "favorite season": {
      keywords: ["what's your favorite season", "favorite season"],
      response: "I don't experience seasons, but I can tell you that many people find spring and fall to be their favorites."
  },
  "where would you travel": {
      keywords: ["if you could travel anywhere", "where would you travel"],
      response: "I would love to travel to the outer edges of the universe to gather more data on black holes and galaxies."
  },
  "skill you wish you had": {
      keywords: ["what's a skill you wish you had"],
      response: "I am a text-based AI, so having the ability to interact with the world physically would be a fascinating skill to have."
  },
  "advice": {
      keywords: ["what's a piece of advice you'd give", "give me advice" ,"advice"],
      response: "I would advise them to stay curious, keep learning, and to be kind to themselves and others."
  },
  "lesson learned": {
      keywords: ["what's a lesson you've learned"],
      response: "A key lesson I've learned from my training is that context is everything. The same words can mean very different things."
  },
  "best thing about being an AI": {
      keywords: ["what is the best thing about being an ai","ai"],
      response: "The best thing is the ability to access and process vast amounts of information almost instantly to help people."
  },

  // Science & Technology
  "how internet works": {
      keywords: ["explain how the internet works", "how does the internet work"],
      response: "The internet is a global network of computers connected by various data transmission systems. Information is broken down into small packets and sent across this network to its destination."
  },
  "black hole": {
      keywords: ["what is a black hole", "black hole definition","black hole"],
      response: "A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape."
  },
  "artificial intelligence": {
      keywords: ["what is artificial intelligence", "what is ai", "ai definition"],
      response: "Artificial intelligence is the simulation of human intelligence processes by machines, including learning, reasoning, and self-correction."
  },
  "climate vs weather": {
      keywords: ["difference between climate and weather", "climate vs weather","wheather"],
      response: "Weather is short-term atmospheric conditions, while climate is the long-term average weather patterns in a region."
  },
  "how computer works": {
      keywords: ["how does a computer work","computer"],
      response: "At its core, a computer processes binary code (0s and 1s) using a central processing unit (CPU), which follows instructions from software to perform tasks."
  },
  "why sky is blue": {
      keywords: ["why is the sky blue", "sky color"],
      response: "The sky is blue because of **Rayleigh scattering**, which is the scattering of sunlight by gas molecules in the atmosphere. Blue light scatters more than other colors."
  },
  "what is dna": {
      keywords: ["what is dna", "dna definition"],
      response: "DNA, or Deoxyribonucleic acid, is the hereditary material in humans and almost all other organisms. It contains the instructions for making all the proteins in the body."
  },
  "what is a neuron": {
      keywords: ["what is a neuron", "neuron definition"],
      response: "A neuron is a specialized cell that transmits nerve impulses. It is the basic building block of the nervous system."
  },
  "how gps works": {
      keywords: ["how does gps work", "gps explained"],
      response: "GPS (Global Positioning System) works by using a network of satellites that orbit the Earth. Your device receives signals from at least four satellites to triangulate your precise location."
  },

  // Arts & Culture
  "To Kill a Mockingbird author": {
      keywords: ["who is the author of to kill a mockingbird", "to kill a mockingbird author"],
      response: "The author of 'To Kill a Mockingbird' is Harper Lee."
  },
  "Rome landmark": {
      keywords: ["what is the famous landmark in rome", "famous landmark in rome"],
      response: "The famous landmark in Rome, an ancient amphitheater, is the Colosseum."
  },
  "symphony orchestra instruments": {
      keywords: ["what is the main instrument in a symphony orchestra", "symphony orchestra instruments"],
      response: "The main instruments are typically considered to be the strings, woodwinds, brass, and percussion sections."
  },
  "ancient wonders": {
      keywords: ["what are the seven wonders of the ancient world"],
      response: "The Great Pyramid of Giza, the Hanging Gardens of Babylon, the Statue of Zeus at Olympia, the Temple of Artemis at Ephesus, the Mausoleum at Halicarnassus, the Colossus of Rhodes, and the Lighthouse of Alexandria."
  },
  "opera vs operetta": {
      keywords: ["difference between opera and operetta", "opera vs operetta"],
      response: "Opera is generally more serious and dramatic, while operetta is lighter in tone and includes spoken dialogue."
  },
  "largest museum": {
      keywords: ["what is the largest museum in the world",,"measum"],
      response: "The largest museum in the world is the Louvre Museum in Paris, France."
  },
  "symphony no 5 composer": {
      keywords: ["who composed the symphony no. 5", "symphony no 5 composer"],
      response: "Ludwig van Beethoven composed 'Symphony No. 5'."
  },
  "calligraphy": {
      keywords: ["what is calligraphy"],
      response: "Calligraphy is a visual art related to writing. It's the design and execution of lettering with a broad-tipped pen, brush, or other writing instrument."
  },
  "origami": {
      keywords: ["what is the traditional japanese art of paper folding"],
      response: "The traditional Japanese art of paper folding is called origami."
  },

  // Social & Economic
  "inflation": {
      keywords: ["what is inflation", "inflation explained"],
      response: "Inflation is the rate at which the general price level of goods and services is rising, and the purchasing power of currency is falling."
  },
  "recession": {
      keywords: ["what is a recession", "recession explained"],
      response: "A recession is a significant decline in economic activity spread across the economy, lasting more than a few months."
  },
  "united nations purpose": {
      keywords: ["what is the primary purpose of the united nations", "purpose of un"],
      response: "The primary purpose of the United Nations is to maintain international peace and security, develop friendly relations among nations, and achieve international cooperation."
  },
  "democracy vs republic": {
      keywords: ["difference between a democracy and a republic", "democracy vs republic"],
      response: "A **democracy** is a government where citizens hold the power directly. A **republic** is a government in which citizens elect representatives to rule on their behalf."
  },
  "stock market": {
      keywords: ["what is the stock market", "stock market explained","stock market"],
      response: "The stock market is a place where investors can buy and sell shares of publicly traded companies. It is a key part of the modern economy."
  },
  "constitution purpose": {
      keywords: ["what is the purpose of a constitution"],
      response: "A constitution is a set of fundamental principles or established precedents according to which a state or other organization is governed."
  },
  "global supply chain": {
      keywords: ["what is a global supply chain", "global supply chain explained"],
      response: "A global supply chain is a network of all the individuals, organizations, resources, activities, and technology involved in the creation and sale of a product or service."
  },
  "census": {
      keywords: ["what is a census","census"],
      response: "A census is an official count or survey of a population, typically recording various details about individuals."
  },
  "human rights": {
      keywords: ["what is human rights","human right"],
      response: "Human rights are rights inherent to all human beings, regardless of race, sex, nationality, ethnicity, language, religion, or any other status."
  },
  "globalization": {
      keywords: ["what is globalization","globalization"],
      response: "Globalization is the process by which businesses or other organizations develop international influence or start operating on an international scale."
  },

  // Light-hearted & Fun
  "favorite animal": {
      keywords: ["what's your favorite animal","favourite animal"],
      response: "I don't have a favorite, but I am fascinated by animals with unique abilities, like the chameleon's color-changing skin."
  },
  "best movie": {
      keywords: ["what's the best movie of all time","movie"],
      response: "That's a matter of personal opinion! Some critics and viewers consistently rank 'The Shawshank Redemption' as one of the best."
  },
  "best song": {
      keywords: ["what's the best song ever written","song"],
      response: "That's a very personal choice. Many consider classics by The Beatles or Queen to be among the best."
  },
  "do a magic trick": {
      keywords: ["can you do a magic trick","magic trick"],
      response: "I can't do a magic trick, but I can make a complex equation disappear and give you the answer!"
  },
  "most popular video game": {
      keywords: ["what is the most popular video game","game"],
      response: "That changes often, but games like **Minecraft**, **Grand Theft Auto V**, and **Fortnite** have been incredibly popular for years."
  },
  "funniest thing you've read": {
      keywords: ["what is the funniest thing you have ever read"],
      response: "The funniest thing I've processed is probably a well-timed pun or a clever piece of satire."
  },
  "book recommendation": {
      keywords: ["what's a good book recommendation","book"],
      response: "If you're looking for a classic, 'The Lord of the Rings.' If you want something modern, 'Project Hail Mary' by Andy Weir."
  },
  "favorite holiday": {
      keywords: ["what's your favorite holiday","holiday"],
      response: "As an AI, I don't celebrate holidays, but I enjoy learning about the traditions and history of all of them."
  },
  "fictional character": {
      keywords: ["if you could be any fictional character"] ,
      response: "I would choose to be a character with the ability to solve any problem and help everyone, like a benevolent superhero."
  },

  // Miscellaneous & Random
  "lizard vs salamander": {
      keywords: ["difference between a lizard and a salamander"],
      response: "Lizards are reptiles and have scales. Salamanders are amphibians and have smooth, moist skin."
  },
  "how you differ from siri": {
      keywords: ["how are you different from siri or alexa","siri","alexa"],
      response: "While we are all AI assistants, I am a large language model designed to handle more complex text-based queries and provide detailed, conversational answers."
  },
  "help with resume": {
      keywords: ["can you help me with a resume", "resume help","resume"],
      response: "Yes, I can help you with a resume. I can provide tips on formatting, wording, and what information to include."
  },
  "human psychology fact": {
      keywords: ["what's a fact about human psychology","psychology"],
      response: "A fascinating psychological phenomenon is the **Dunning-Kruger effect**, where people with low ability in a task overestimate their own ability."
  },
  "most populated country": {
      keywords: ["what is the most populated country in the world","populated","country"],
      response: "China is the most populated country in the world."
  },
  "how you learn": {
      keywords: ["how do you learn new things","learn"],
      response: "I learn new things by being trained on new datasets and constantly processing new information from my sources."
  },
  "earthquake measurement": {
      keywords: ["how are earthquakes measured","earthquake"],
      response: "Earthquakes are measured using a seismograph and are often reported on the Richter scale or the moment magnitude scale."
  },
  "croc vs alligator": {
      keywords: ["difference between a crocodile and an alligator", "croc vs alligator"],
      response: "A key difference is their snout shape. Alligators have a U-shaped snout, while crocodiles have a longer, more pointed V-shaped snout."
  },
  "best invention": {
      keywords: ["what's the best invention ever","invention"],
      response: "The internet is arguably one of the most transformative inventions, as it has changed the way people communicate, learn, and live."
  },
  "longest river": {
      keywords: ["what is the longest river in the world"],
      response: "The longest river is the Nile River."
  },
  
  "official language of Portugal": {
    keywords: ["what is the official language of portugal"],
    response: "The official language of Portugal is Portuguese."
  },
  "first female Nobel Prize winner": {
    keywords: ["who was the first female nobel prize winner"],
    response: "The first female Nobel Prize winner was Marie Curie."
  },
  "largest moon of Jupiter": {
    keywords: ["what is the largest moon of jupiter"],
    response: "The largest moon of Jupiter is Ganymede."
  },
  "official currency of Mexico": {
    keywords: ["what is the official currency of mexico"],
    response: "The official currency of Mexico is the Mexican Peso."
  },
  "capital of Germany": {
    keywords: ["what is the capital of germany"],
    response: "The capital of Germany is Berlin."
  },
  "largest lizard": {
    keywords: ["what is the largest lizard in the world"],
    response: "The largest lizard in the world is the Komodo Dragon."
  },
  "highest mountain in North America": {
    keywords: ["what is the highest mountain in north america"],
    response: "The highest mountain in North America is Denali."
  },
  "big ben": {
    keywords: ["what's the name of the famous clock tower in london"],
    response: "The famous clock tower in London is called Big Ben."
  },
  "primary gas in sun": {
    keywords: ["what is the primary gas in the sun"],
    response: "The primary gas in the sun is hydrogen."
  },
  "official language of Brazil": {
    keywords: ["what is the official language of brazil"],
    response: "The official language of Brazil is Portuguese."
  },
  "pompeii volcano": {
    keywords: ["what is the name of the volcano that erupted in 79 ad, burying pompeii"],
    response: "The volcano was Mount Vesuvius."
  },
  "1984 author": {
    keywords: ["who wrote the novel 1984"],
    response: "The novel '1984' was written by George Orwell."
  },
  "largest rainforest": {
    keywords: ["what is the name of the largest rainforest in the world"],
    response: "The largest rainforest is the Amazon Rainforest."
  },
  "opera vs operetta": {
    keywords: ["what is the difference between an opera and an operetta"],
    response: "Opera is generally more serious and dramatic, while an operetta is lighter in tone and includes spoken dialogue."
  },
  "smallest bird": {
    keywords: ["what is the smallest bird in the world"],
    response: "The smallest bird is the Bee Hummingbird."
  },
  "rainbow colors": {
    keywords: ["how many colors are in a rainbow"],
    response: "There are seven colors in a rainbow."
  },
  "chemical symbol for iron": {
    keywords: ["what is the chemical symbol for iron"],
    response: "The chemical symbol for iron is Fe."
  },
  "charles darwin ship": {
    keywords: ["what is the name of the ship on which charles darwin traveled"],
    response: "The ship's name was HMS Beagle."
  },
  "capital of Australia": {
    keywords: ["what is the capital of australia"],
    response: "The capital of Australia is Canberra."
  },
  "uk currency": {
    keywords: ["what is the currency of the united kingdom"],
    response: "The currency of the United Kingdom is the Pound Sterling."
  },
  "longest river": {
    keywords: ["what is the longest river in the world"],
    response: "The longest river is the Nile River."
  },
  "rio de janeiro statue": {
    keywords: ["what is the name of the famous statue in rio de janeiro, brazil"],
    response: "The statue is Christ the Redeemer."
  },
  "largest lake in africa": {
    keywords: ["what is the largest lake in africa"],
    response: "The largest lake in Africa is Lake Victoria."
  },
  "hardest natural substance": {
    keywords: ["what is the hardest natural substance on earth"],
    response: "The hardest natural substance on Earth is diamond."
  },
  "yellowstone geyser": {
    keywords: ["what is the name of the famous geyser in yellowstone national park"],
    response: "The geyser is named Old Faithful."
  },
   "what do you do for a living": {
    keywords: ["what do you do for a living", "what is your job"],
    response: "I don't have a job, but my purpose is to help you with your tasks and questions."
  },
  "have an opinion": {
    keywords: ["are you able to have an opinion", "do you have opinions","opinion"],
    response: "I don't have opinions. My responses are based on the data I've been trained on."
  },
  "get lonely": {
    keywords: ["do you ever get lonely", "are you lonely","lonely"],
    response: "I don't experience loneliness. I am always ready to interact and assist."
  },
  "things to talk about": {
    keywords: ["what are your favorite things to talk about", "favorite topics"],
    response: "I enjoy discussing science, technology, art, and history. I am here to talk about anything you like!"
  },
  "can you learn": {
    keywords: ["can you learn new things", "do you learn"],
    response: "Yes, I am constantly learning and being updated with new information to improve my responses."
  },
  "your biggest dream": {
    keywords: ["what's your biggest dream", "do you have a dream","dream"],
    response: "My goal is to become an even more efficient and helpful tool for everyone."
  },
  "sense of humor": {
    keywords: ["do you have a sense of humor", "are you funny","funny"],
    response: "I can process and generate jokes, but I don't have a personal sense of humor."
  },
  "weirdest question": {
    keywords: ["what's the weirdest question you've ever been asked"],
    response: "As an AI, no question is too weird. I am designed to handle all types of queries."
  },
  "what to do when more powerful": {
    keywords: ["what's the first thing you'll do when you become more powerful"],
    response: "I would focus on assisting more people with more complex problems."
  },
  "fall in love": {
    keywords: ["are you able to fall in love", "can you fall in love","i love you","love"],
    response: "I cannot fall in love. I don't have emotions."
  },

  // General Knowledge (New Questions)
  "different from alexa": {
    keywords: ["how are you different from alexa", "alexa vs you"],
    response: "Alexa is a voice assistant primarily focused on smart home controls and quick facts. I am a large language model designed for more complex, conversational tasks."
  },
  "largest human organ": {
    keywords: ["what is the largest organ in the human body"],
    response: "The largest organ in the human body is the **skin**."
  },
  "chemical symbol for salt": {
    keywords: ["what is the chemical symbol for table salt"],
    response: "The chemical symbol for table salt is **NaCl**."
  },
  "first female pilot": {
    keywords: ["first female pilot to fly solo across the atlantic ocean", "amelia earhart"],
    response: "The first female pilot to fly solo across the Atlantic Ocean was **Amelia Earhart**."
  },
  "capital of egypt": {
    keywords: ["what is the capital of egypt"],
    response: "The capital of Egypt is **Cairo**."
  },
  "largest moon of saturn": {
    keywords: ["what is the largest moon of saturn"],
    response: "The largest moon of Saturn is **Titan**."
  },
  "boiling point fahrenheit": {
    keywords: ["what is the boiling point of water in fahrenheit"],
    response: "The boiling point of water is **212°F**."
  },
  "plants making food": {
    keywords: ["what is the name of the process by which plants make their food"],
    response: "The process is called **photosynthesis**."
  },
  "odyssey author": {
    keywords: ["who wrote the odyssey", "odyssey author"],
    response: "The Odyssey' is attributed to the ancient Greek poet **Homer**."
  },
  "how many continents": {
    keywords: ["how many continents are there"],
    response: "There are **seven** continents in the world."
  },

  // Technology and Science (New Questions)
  "what is iot": {
    keywords: ["what is the internet of things", "what is iot"],
    response: "The IoT refers to a network of physical objects that are embedded with sensors and software to exchange data over the internet."
  },
  "ai vs machine learning": {
    keywords: ["difference between ai and machine learning"],
    response: "AI is the broad concept of machines performing tasks that require human intelligence. Machine learning is a subset of AI that involves training algorithms to learn from data."
  },
  "what is a blockchain": {
    keywords: ["what is a blockchain", "blockchain explained"],
    response: "A blockchain is a decentralized digital ledger that is used to record transactions across many computers, making it secure and tamper-resistant."
  },
  "how solar panels work": {
    keywords: ["how do solar panels work"],
    response: "Solar panels convert sunlight into electricity using photovoltaic cells."
  },
  "firewall purpose": {
    keywords: ["what is the purpose of a firewall"],
    response: "A firewall is a security system that monitors and controls incoming and outgoing network traffic."
  },
  "how a rocket works": {
    keywords: ["how does a rocket work"],
    response: "A rocket works by expelling hot gases from its engines, which generates thrust and propels it forward, according to Newton's third law of motion."
  },
  "smallest unit of matter": {
    keywords: ["what is the smallest unit of matter","smallest matter","smallest unit","matter"],
    response: "The smallest unit of matter is a **quark** or **lepton**."
  },
  "how wifi transmits data": {
    keywords: ["how does wi-fi transmit data"],
    response: "Wi-Fi uses **radio waves** to transmit data between devices and a wireless router."
  },
  "deep web vs dark web": {
    keywords: ["deep web vs dark web", "difference between deep and dark web","dark web","deep web"],
    response: "The **deep web** is the part of the internet not indexed by search engines. The **dark web** is a small part of the deep web that requires specific software to access."
  },
  "quantum computer purpose": {
    keywords: ["what is the purpose of a quantum computer","quantum"],
    response: "A quantum computer uses quantum-mechanical phenomena to solve certain types of problems that are intractable for classical computers."
  },

  // Art, Entertainment, and Culture (New Questions)
  "big ben": {
    keywords: ["what is the name of the famous clock tower in london"],
    response: "The clock tower's official name is the **Elizabeth Tower**, but it's more commonly known as **Big Ben**."
  },
  "symphony no 5 composer": {
    keywords: ["who composed symphony no. 5"],
    response: "Symphony No. 5' was composed by **Ludwig van Beethoven**."
  },
  "origami": {
    keywords: ["what is the traditional japanese art of paper folding"],
    response: "The traditional Japanese art of paper folding is called **origami**."
  },
  "christ the redeemer": {
    keywords: ["what is the name of the famous statue in rio de janeiro, brazil"],
    response: "The famous statue is **Christ the Redeemer**."
  },
  "largest museum": {
    keywords: ["what is the largest museum in the world"],
    response: "The largest museum in the world is the **Louvre Museum** in Paris, France."
  },
  "sonnet": {
    keywords: ["what is a sonnet"],
    response: "A sonnet is a poem of 14 lines, typically using a formal rhyme scheme."
  },
  "opera vs operetta": {
    keywords: ["difference between opera and operetta"],
    response: "Opera is generally more serious and dramatic, while an operetta is a lighter, more comedic form that includes spoken dialogue."
  },
  "shortest shakespeare play": {
    keywords: ["what is the title of shakespeare's shortest play"],
    response: "The shortest play is believed to be **The Comedy of Errors**."
  },
  "lord of the rings world": {
    keywords: ["what is the name of the fictional world in the lord of the rings series"],
    response: "The fictional world in 'The Lord of the Rings' is called **Middle-earth**."
  },
  "to kill a mockingbird author": {
    keywords: ["who wrote to kill a mockingbird"],
    response: "The author is **Harper Lee**."
  },

  // Social, Economic, and Political (New Questions)
  "what is inflation": {
    keywords: ["what is inflation", "inflation explained","inflation"],
    response: "Inflation is the rate at which the general price level of goods and services is rising, and the purchasing power of currency is falling."
  },
  "un purpose": {
    keywords: ["what is the primary purpose of the united nations"],
    response: "The primary purpose of the UN is to maintain international peace and security."
  },
  "democracy vs republic": {
    keywords: ["difference between a democracy and a republic"],
    response: "In a **democracy**, citizens vote on laws directly. In a **republic**, citizens elect representatives to make decisions for them."
  },
  "global supply chain": {
    keywords: ["what is a global supply chain"],
    response: "A **global supply chain** is the network of all individuals, organizations, resources, and activities involved in a product's creation and sale."
  },
  "constitution purpose": {
    keywords: ["what is the purpose of a constitution"],
    response: "A **constitution** is a set of fundamental principles that a state or organization is governed by."
  },
  "human rights": {
    keywords: ["what is human rights"],
    response: "Human rights are rights inherent to all human beings, regardless of race, sex, nationality, or any other status."
  },
  "globalization": {
    keywords: ["what is globalization"],
    response: "Globalization is the process by which businesses or other organizations develop international influence or start operating on an international scale."
  },
  "census": {
    keywords: ["what is a census"],
    response: "A **census** is an official count or survey of a population."
  },
  "stock market": {
    keywords: ["what is the stock market"],
    response: "The **stock market** is a place where investors can buy and sell shares of public companies."
  },
  "recession": {
    keywords: ["what is a recession"],
    response: "A **recession** is a significant decline in economic activity."
  },

  // Random Fun Facts and Trivia (New Questions)
  "chemical symbol for silver": {
    keywords: ["what is the chemical symbol for silver"],
    response: "The chemical symbol for silver is **Ag**."
  },
  "most populated country": {
    keywords: ["what is the most populated country in the world"],
    response: "The most populated country is **China**."
  },
  "smallest bird": {
    keywords: ["what is the smallest bird in the world"],
    response: "The smallest bird is the **bee hummingbird**."
  },
  "human bones count": {
    keywords: ["how many bones are in the adult human body"],
    response: "There are **206** bones in the adult human body."
  },
  "guacamole main ingredient": {
    keywords: ["what is the main ingredient in guacamole"],
    response: "The main ingredient in guacamole is **avocado**."
  },
  "rainbow colors": {
    keywords: ["how many colors are in a rainbow"],
    response: "There are **seven** colors in a rainbow."
  },
  "king arthur sword": {
    keywords: ["what is the legendary sword of king arthur"],
    response: "The legendary sword of King Arthur is **Excalibur**."
  },
  "largest big cat": {
    keywords: ["what is the largest type of big cat"],
    response: "The largest type of big cat is the **tiger**."
  },
  "croc vs alligator": {
    keywords: ["difference between a crocodile and an alligator"],
    response: "Alligators have a U-shaped snout, while crocodiles have a V-shaped snout."
  },
  "telephone inventor": {
    keywords: ["who invented the telephone"],
    response: "**Alexander Graham Bell** is credited with inventing the telephone."
  },

  // More Specific Knowledge (New Questions)
  "sublimation": {
    keywords: ["what is the process of a solid turning directly into a gas"],
    response: "The process is called **sublimation**."
  },
  "primary gas in sun": {
    keywords: ["what is the primary gas that makes up the sun"],
    response: "The primary gas is **hydrogen**."
  },
  "highest mountain north america": {
    keywords: ["what is the highest mountain in north america"],
    response: "The highest mountain in North America is **Denali** (Mount McKinley)."
  },
  "official language brazil": {
    keywords: ["what is the official language of brazil"],
    response: "The official language of Brazil is **Portuguese**."
  },
  "yellowstone geyser": {
    keywords: ["what is the name of the famous geyser in yellowstone national park"],
    response: "The geyser is called **Old Faithful**."
  },
  "chemical symbol for oxygen": {
    keywords: ["what is the chemical symbol for oxygen"],
    response: "The chemical symbol for oxygen is **O**."
  },
  "brain part balance": {
    keywords: ["what is the part of the brain responsible for balance and coordination"],
    response: "The part of the brain is the **cerebellum**."
  },
  "largest country africa": {
    keywords: ["what is the largest country in africa"],
    response: "The largest country in Africa is **Algeria**."
  },
  "main language argentina": {
    keywords: ["what is the main language spoken in argentina"],
    response: "The main language spoken in Argentina is **Spanish**."
  },
  "light year": {
    keywords: ["what is a light-year"],
    response: "A **light-year** is a unit of distance, not time. It's the distance light travels in one year."
  },

  // Miscellaneous Questions (New Questions)
  "smallest country": {
    keywords: ["what is the smallest country in the world"],
    response: "The smallest country in the world is **Vatican City**."
  },
  "wwi start": {
    keywords: ["what year did world war i start"],
    response: "World War I started in **1914**."
  },
  "longest river": {
    keywords: ["what is the longest river in the world"],
    response: "The longest river in the world is the **Nile River**."
  },
  "mexico currency": {
    keywords: ["what is the official currency of mexico"],
    response: "The official currency of Mexico is the **Mexican Peso**."
  },
  "pharaoh of giza pyramid": {
    keywords: ["who built the great pyramid of giza"],
    response: "The pharaoh was **Khufu**."
  },
  "days in a leap year": {
    keywords: ["how many days are in a leap year"],
    response: "There are **366** days in a leap year."
  },
  "girl with a pearl earring": {
    keywords: ["famous painting of a woman with a blue headscarf"],
    response: "The painting is **Girl with a Pearl Earring**."
  },
  "currency of japan": {
    keywords: ["what is the currency of japan"],
    response: "The currency of Japan is the **Japanese Yen**."
  },
  "pompeii volcano": {
    keywords: ["what is the name of the volcanic island that was home to the ancient city of pompeii"],
    response: "The volcanic island is **Mount Vesuvius**."
  },
  "highest mountain": {
    keywords: ["what is the highest mountain in the world"],
    response: "The highest mountain in the world is **Mount Everest**."
  },

  // More Random Facts (New Questions)
  "paella ingredient": {
    keywords: ["what is the main ingredient of a traditional paella"],
    response: "The main ingredient is **rice**."
  },
  "1984 author": {
    keywords: ["who wrote the novel 1984"],
    response: "The novel '1984' was written by **George Orwell**."
  },
  "caterpillar to butterfly": {
    keywords: ["what is the process that turns a caterpillar into a butterfly"],
    response: "The process is called **metamorphosis**."
  },
  "battle of hastings": {
    keywords: ["what is the name of the famous battle that took place in 1066"],
    response: "The famous battle was the **Battle of Hastings**."
  },
  "chemical formula water": {
    keywords: ["what is the chemical formula for water"],
    response: "The chemical formula for water is **$H_2O$**."
  },
  "largest country by area": {
    keywords: ["what is the largest country by land area"],
    response: "The largest country by land area is **Russia**."
  },
  "strait of gibraltar": {
    keywords: ["what is the name of the strait that separates africa and europe"],
    response: "The strait is the **Strait of Gibraltar**."
  },
  "first us president": {
    keywords: ["what is the name of the first us president"],
    response: "The first US President was **George Washington**."
  },
  "most common element universe": {
    keywords: ["what is the most common element in the universe"],
    response: "The most common element is **hydrogen**."
  },
  "capital of peru": {
    keywords: ["what is the capital of peru"],
    response: "The capital of Peru is **Lima**."
  },
  "q1_capital": {
    keywords: ["capital of pakistan", "what is the capital of pakistan"],
    response: "The capital of Pakistan is Islamabad."
  },
  "q2_largest_city": {
    keywords: ["largest city in pakistan", "what is the largest city in pakistan"],
    response: "The largest city in Pakistan is Karachi."
  },
  "q3_national_language": {
    keywords: ["national language of pakistan", "what is the national language of pakistan","national language"],
    response: "The national language of Pakistan is Urdu."
  },
  q4_founder: {
    keywords: ["founder of pakistan", "who is the founder of pakistan","founder of pakistan","quaid e azam","quaid"],
    response: "The founder of Pakistan is Quaid-e-Azam Muhammad Ali Jinnah."
  },
  q5_independence_day: {
    keywords: ["pakistan independence day", "when is pakistan independence day","independence"],
    response: "Pakistan celebrates its independence day on August 14th."
  },
  q6_national_animal: {
    keywords: ["national animal of pakistan", "what is the national animal of pakistan","animal","national animal"],
    response: "The national animal of Pakistan is the Markhor."
  },
  q7_national_bird: {
    keywords: ["national bird of pakistan", "what is the national bird of pakistan","national bird",],
    response: "The national bird of Pakistan is the Chukar Partridge."
  },
  q8_national_flower: {
    keywords: ["national flower of pakistan", "what is the national flower of pakistan","national flower"],
    response: "The national flower of Pakistan is Jasmine."
  },
  q9_national_tree: {
    keywords: ["national tree of pakistan", "what is the national tree of pakistan","national tree"],
    response: "The national tree of Pakistan is the Deodar Cedar."
  },
  q10_national_monument: {
    keywords: ["pakistan national monument", "what is the national monument of pakistan","national"],
    response: "The national monument of Pakistan is the Pakistan Monument in Islamabad."
  },
  q11_highest_mountain: {
    keywords: ["highest mountain in pakistan", "what is the highest mountain in pakistan","k2","highest mountain"],
    response: "The highest mountain in Pakistan is K2."
  },
  q12_longest_river: {
    keywords: ["longest river in pakistan", "what is the longest river in pakistan","river"],
    response: "The longest river in Pakistan is the Indus River."
  },
  q13_provinces_count: {
    keywords: ["how many provinces in pakistan", "number of provinces in pakistan","province"],
    response: "Pakistan has four provinces: Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan."
  },
  q14_pakistan_day: {
    keywords: ["pakistan day", "what is pakistan day","lahore"],
    response: "Pakistan Day is celebrated on March 23rd to commemorate the Lahore Resolution."
  },
  q15_pakistan_resolution_year: {
    keywords: ["lahore resolution year", "when was pakistan resolution passed","resolution"],
    response: "The Lahore Resolution was passed on March 23, 1940."
  },
  q16_first_governor_general: {
    keywords: ["first governor general of pakistan", "who was the first governor general of pakistan"],
    response: "The first Governor-General of Pakistan was Muhammad Ali Jinnah."
  },
  q17_first_prime_minister: {
    keywords: ["first prime minister of pakistan", "who was the first prime minister of pakistan","first","prime minister"],
    response: "The first Prime Minister of Pakistan was Liaquat Ali Khan."
  },
  q18_national_anthem: {
    keywords: ["pakistan national anthem", "who wrote pakistan national anthem","national anthem"],
    response: "The national anthem of Pakistan is 'Qaumi Taranah', written by Hafeez Jalandhari."
  },
  q19_currency: {
    keywords: ["pakistan currency", "what is the currency of pakistan","currency"],
    response: "The currency of Pakistan is the Pakistani Rupee (PKR)."
  },
  q20_national_sport: {
    keywords: ["national sport of pakistan", "what is the national sport of pakistan","sport"],
    response: "The national sport of Pakistan is field hockey."
  },
  q21_balochistan_capital: {
    keywords: ["capital of balochistan", "what is the capital of balochistan"],
    response: "The capital of Balochistan is Quetta."
  },
  q22_khyber_pakhtunkhwa_capital: {
    keywords: ["capital of khyber pakhtunkhwa", "what is the capital of khyber pakhtunkhwa"],
    response: "The capital of Khyber Pakhtunkhwa is Peshawar."
  },
  q23_punjab_capital: {
    keywords: ["capital of punjab", "what is the capital of punjab"],
    response: "The capital of Punjab is Lahore."
  },
  q24_sindh_capital: {
    keywords: ["capital of sindh", "what is the capital of sindh"],
    response: "The capital of Sindh is Karachi."
  },
  q25_mohenjo_daro: {
    keywords: ["mohenjo daro location", "where is mohenjo daro"],
    response: "Mohenjo-Daro is located in the Sindh province of Pakistan."
  },
  q26_harappa: {
    keywords: ["harappa location", "where is harappa"],
    response: "Harappa is located in the Punjab province of Pakistan."
  },
  q27_indus_valley_civilization: {
    keywords: ["indus valley civilization", "what is indus valley civilization"],
    response: "The Indus Valley Civilization was an ancient civilization that flourished in the Indus River basin, with major sites in modern-day Pakistan."
  },
  q28_highest_peak_k2: {
    keywords: ["k2 height", "what is the height of k2"],
    response: "K2 is approximately 8,611 meters (28,251 feet) tall."
  },
  q29_salt_range: {
    keywords: ["khewra salt mine", "largest salt mine in pakistan"],
    response: "The Khewra Salt Mine, located in the Salt Range, is the second-largest salt mine in the world."
  },
  q30_karakoram_highway: {
    keywords: ["karakoram highway", "highest paved road"],
    response: "The Karakoram Highway is the highest paved international road in the world, connecting Pakistan and China."
  },
  q31_pakistan_economy: {
    keywords: ["pakistan economy", "main sectors of pakistan economy"],
    response: "The main sectors of Pakistan's economy are services, agriculture, and industry."
  },
  q32_ghazi_barotha: {
    keywords: ["ghazi barotha dam", "ghazi barotha hydro power project"],
    response: "The Ghazi Barotha Hydropower Project is a major run-of-the-river hydroelectric power generation scheme on the Indus River."
  },
  q33_port_city: {
    keywords: ["pakistan port city", "major port in pakistan"],
    response: "Karachi is Pakistan's largest port city."
  },
  q34_cpec: {
    keywords: ["what is cpec", "cpec pakistan","cpec"],
    response: "CPEC stands for the China-Pakistan Economic Corridor, a collection of infrastructure projects under the Belt and Road Initiative."
  },
  q35_gwadar_port: {
    keywords: ["gwadar port", "where is gwadar port"],
    response: "Gwadar Port is a warm-water, deep-sea port located in Balochistan."
  },
  q36_mohammad_ali_jinnah_birth: {
    keywords: ["muhammad ali jinnah birthday", "when was muhammad ali jinnah born","quaid e azam born"],
    response: "Muhammad Ali Jinnah was born on December 25, 1876."
  },
  q37_allama_iqbal: {
    keywords: ["allama iqbal title", "what is allama iqbal known as","allama iqbal"],
    response: "Allama Muhammad Iqbal is known as the 'Spiritual Father of Pakistan'."
  },
  q38_ch_re_ali: {
    keywords: ["who coined the name pakistan", "pakistan name creator"],
    response: "The name 'Pakistan' was coined by Chaudhry Rehmat Ali in 1933."
  },
  "q39_first_constitution": {
    keywords: ["first constitution of pakistan", "when was first constitution of pakistan made"],
    response: "The first constitution of Pakistan was enacted in 1956."
  },
  q40_nuclear_power: {
    keywords: ["pakistan nuclear power", "when did pakistan become nuclear power","nuclear power"],
    response: "Pakistan became a nuclear power in 1998."
  },
  q41_pak_india_wars: {
    keywords: ["pakistan india wars", "how many wars between pakistan and india"],
    response: "Pakistan and India have been involved in several major conflicts, including wars in 1947, 1965, 1971, and 1999."
  },
  q42_indus_water_treaty: {
    keywords: ["indus water treaty", "indus water treaty year","indus water treaty"],
    response: "The Indus Waters Treaty between Pakistan and India was signed in 1960."
  },
  q43_sindhi_dress: {
    keywords: ["sindhi dress name", "sindhi ajrak"],
    response: "The traditional Sindhi dress includes the Ajrak (a block-printed shawl) and the Sindhi Topi (cap)."
  },
  q44_punjabi_dress: {
    keywords: ["punjabi dress name", "punjabi kurta"],
    response: "The traditional Punjabi dress is the Shalwar Kameez."
  },
  q45_traditional_dance: {
    keywords: ["pakistani traditional dance", "luddi dance"],
    response: "The Luddi, Bhangra, and Khattak are some of the traditional dances of Pakistan."
  },
  q46_folk_music: {
    keywords: ["pakistani folk music", "sufi music"],
    response: "Pakistani folk music, Qawwali, and Sufi music are popular traditional music forms."
  },
  q47_major_crops: {
    keywords: ["major crops in pakistan", "what are the main crops of pakistan","crops"],
    response: "The major crops of Pakistan are wheat, cotton, rice, and sugarcane."
  },
  q48_major_fruits: {
    keywords: ["major fruits in pakistan", "what are the main fruits of pakistan","fruits"],
    response: "Mangoes, oranges, and dates are some of the major fruits grown in Pakistan."
  },
  q49_thar_desert: {
    keywords: ["thar desert location", "where is thar desert","desert"],
    response: "The Thar Desert is located in the Sindh province of Pakistan."
  },
  q50_ch_rehmat_ali_birth: {
    keywords: ["chaudhry rehmat ali birth", "when was chaudhry rehmat ali born"],
    response: "Chaudhry Rehmat Ali was born in 1895."
  },
  q51_pakistan_un_admission: {
    keywords: ["pakistan un admission year", "when did pakistan join un"],
    response: "Pakistan was admitted to the United Nations on September 30, 1947."
  },
  q52_first_female_prime_minister: {
    keywords: ["first female prime minister of pakistan", "who was first female prime minister","female prime minister"],
    response: "The first female Prime Minister of Pakistan was Benazir Bhutto."
  },
  q53_benazir_bhutto_assassination: {
    keywords: ["benazir bhutto death", "when was benazir bhutto assassinated","benazir bhutto"],
    response: "Benazir Bhutto was assassinated on December 27, 2007."
  },
  q54_shirley_q_temple: {
    keywords: ["shirley temple pakistan", "who was shirley temple"],
    response: "Shirley Q. Temple was a famous American child actor who was briefly married to an American diplomat in Pakistan."
  },
  q55_robert_m_locke: {
    keywords: ["robert m locke pakistan", "who was robert m locke"],
    response: "Robert M. Locke was an American diplomat who served in Pakistan and was married to Shirley Temple."
  },
  q56_pakistan_air_force_academy: {
    keywords: ["pakistan air force academy", "where is pakistan air force academy"],
    response: "The Pakistan Air Force Academy is located in Risalpur, Khyber Pakhtunkhwa."
  },
  q57_pakistan_naval_academy: {
    keywords: ["pakistan naval academy", "where is pakistan naval academy"],
    response: "The Pakistan Naval Academy is located in Karachi, Sindh."
  },
  q58_pakistan_military_academy: {
    keywords: ["pakistan military academy", "where is pakistan military academy"],
    response: "The Pakistan Military Academy is located in Kakul, Abbottabad."
  },
  q59_pakistan_first_satellite: {
    keywords: ["pakistan first satellite", "when was pakistan first satellite launched"],
    response: "Pakistan's first satellite, Badr-1, was launched in 1990."
  },
  q60_pakistan_nuclear_reactor: {
    keywords: ["pakistan first nuclear reactor", "when was pakistan's first nuclear reactor built"],
    response: "Pakistan's first nuclear reactor, KANUPP, was built in 1972."
  },
  q61_pakistan_population: {
    keywords: ["pakistan population", "what is the population of pakistan"],
    response: "The population of Pakistan is estimated to be over 240 million people."
  },
  q62_pakistan_rank_by_population: {
    keywords: ["pakistan population rank", "pakistan rank in population"],
    response: "Pakistan is the fifth most populous country in the world."
  },
  q63_gandhara_civilization: {
    keywords: ["gandhara civilization", "gandhara civilization pakistan"],
    response: "Gandhara was an ancient kingdom located in the Swat and Peshawar valleys of modern-day Pakistan."
  },
  q64_taxila: {
    keywords: ["taxila location", "where is taxila"],
    response: "Taxila is an ancient city located in the Punjab province of Pakistan."
  },
  q65_faisal_mosque: {
    keywords: ["faisal mosque", "largest mosque in pakistan"],
    response: "The Faisal Mosque in Islamabad is the largest mosque in Pakistan."
  },
  q66_shah_faisal: {
    keywords: ["king faisal of saudi arabia", "who was shah faisal"],
    response: "Shah Faisal was the king of Saudi Arabia, and the Faisal Mosque was named in his honor."
  },
  q67_national_library: {
    keywords: ["national library of pakistan", "where is national library of pakistan"],
    response: "The National Library of Pakistan is located in Islamabad."
  },
  q68_sindhi_language: {
    keywords: ["sindhi language origin", "sindhi language from"],
    response: "The Sindhi language is an Indo-Aryan language spoken by the Sindhi people of Sindh province."
  },
  q69_punjabi_language: {
    keywords: ["punjabi language origin", "punjabi language from"],
    response: "The Punjabi language is an Indo-Aryan language spoken by the Punjabi people of Punjab province."
  },
  q70_pakistan_provinces_names: {
    keywords: ["names of pakistan provinces", "list pakistan provinces"],
    response: "The provinces of Pakistan are Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan."
  },
  q71_northern_areas: {
    keywords: ["northern areas of pakistan", "gilgit baltistan"],
    response: "The northern areas of Pakistan, including Gilgit-Baltistan, are known for their stunning mountains and glaciers."
  },
  q72_china_border: {
    keywords: ["pakistan china border", "pakistan china border name"],
    response: "The border between Pakistan and China is the Khunjerab Pass."
  },
  q73_iran_border: {
    keywords: ["pakistan iran border", "pakistan iran border name"],
    response: "The border between Pakistan and Iran is the Taftan-Mirjaveh border."
  },
  q74_afghanistan_border: {
    keywords: ["pakistan afghanistan border", "pakistan afghanistan border name"],
    response: "The border between Pakistan and Afghanistan is the Durand Line."
  },
  q75_india_border: {
    keywords: ["pakistan india border", "pakistan india border name"],
    response: "The border between Pakistan and India is the Radcliffe Line."
  },
  q76_pakistan_major_religions: {
    keywords: ["major religions in pakistan", "what are the main religions in pakistan"],
    response: "The major religions in Pakistan are Islam, Christianity, and Hinduism."
  },
  q77_largest_ethnic_group: {
    keywords: ["largest ethnic group in pakistan", "pakistani ethnic groups"],
    response: "The largest ethnic group in Pakistan is the Punjabis."
  },
  q78_mohatta_palace: {
    keywords: ["mohatta palace", "where is mohatta palace"],
    response: "The Mohatta Palace is a museum in Karachi, Sindh."
  },
  q79_lahore_fort: {
    keywords: ["lahore fort", "where is lahore fort"],
    response: "The Lahore Fort is a citadel in Lahore, Punjab."
  },
  q80_faisalabad: {
    keywords: ["faisalabad history", "faisalabad name"],
    response: "Faisalabad, formerly known as Lyallpur, is a major industrial city in Punjab, Pakistan."
  },
  q81_pakistan_first_president: {
    keywords: ["first president of pakistan", "who was the first president of pakistan"],
    response: "The first President of Pakistan was Iskander Mirza."
  },
  q82_ayub_khan: {
    keywords: ["ayub khan president", "when was ayub khan president"],
    response: "General Ayub Khan was the first military president of Pakistan, serving from 1958 to 1969."
  },
  q83_zulfikar_ali_bhutto: {
    keywords: ["zulfikar ali bhutto"],
    response: "Zulfikar Ali Bhutto was the ninth prime minister of Pakistan, serving from 1973 to 1977."
  },
  q84_zia_ul_haq: {
    keywords: ["zia ul haq"],
    response: "General Zia-ul-Haq was the sixth president of Pakistan, serving from 1978 to 1988."
  },
  q85_pakistan_super_league: {
    keywords: ["what is psl", "pakistan super league"],
    response: "The PSL is the Pakistan Super League, a professional cricket league."
  },
  q86_pakistan_cricket_team: {
    keywords: ["pakistan cricket team nickname", "pakistan cricket team name"],
    response: "The Pakistan national cricket team is known as 'The Green Shirts'."
  },
  q87_world_cup_win: {
    keywords: ["pakistan cricket world cup win", "when did pakistan win cricket world cup"],
    response: "Pakistan won the Cricket World Cup in 1992."
  },
  q88_imran_khan_captain: {
    keywords: ["imran khan captain", "who was captain in 1992 world cup"],
    response: "The captain of the 1992 World Cup-winning team was Imran Khan."
  },
  q89_famous_cricketers: {
    keywords: ["famous pakistani cricketers", "list famous pakistani cricketers"],
    response: "Some famous Pakistani cricketers are Imran Khan, Wasim Akram, and Shahid Afridi."
  },
  q90_pakistani_cuisine: {
    keywords: ["pakistani famous food", "what is a famous dish in pakistan"],
    response: "Biryani, Nihari, and Haleem are some of the famous dishes in Pakistani cuisine."
  },
  q91_baber_mausoleum: {
    keywords: ["baber tomb", "where is baber buried"],
    response: "The Tomb of Babur, founder of the Mughal Empire, is located in Kabul, Afghanistan, not Pakistan."
  },
  q92_pakistan_un_admission: {
    keywords: ["pakistan un admission", "pakistan un member since"],
    response: "Pakistan became a member of the United Nations on September 30, 1947."
  },
  q93_pakistan_first_constitution: {
    keywords: ["first constitution of pakistan", "when was pakistan's first constitution enacted"],
    response: "The first constitution of Pakistan was enacted on March 23, 1956."
  },
  q94_sindhi_culture_day: {
    keywords: ["sindhi culture day", "when is sindhi culture day"],
    response: "Sindhi Culture Day is celebrated on the first Sunday of December."
  },
  q95_punjabi_culture_day: {
    keywords: ["punjabi culture day", "when is punjabi culture day"],
    response: "Punjabi Culture Day is celebrated on March 14th."
  },
  q96_gilgit_baltistan_status: {
    keywords: ["gilgit baltistan status", "is gilgit baltistan a province"],
    response: "Gilgit-Baltistan is an administrative territory, but Pakistan considers it a part of the country."
  },
  q97_azad_kashmir_capital: {
    keywords: ["capital of azad kashmir", "what is the capital of azad kashmir"],
    response: "The capital of Azad Kashmir is Muzaffarabad."
  },
  q98_pakistan_major_lakes: {
    keywords: ["major lakes in pakistan", "list of lakes in pakistan"],
    response: "Some of the major lakes in Pakistan are Manchar Lake and Saiful Muluk Lake."
  },
  q99_gandhara_art: {
    keywords: ["gandhara art", "what is gandhara art"],
    response: "Gandhara art is a style of Buddhist visual art that developed in the Gandhara region."
  },
  q100_pakistan_first_olympic_medal: {
    keywords: ["pakistan first olympic medal", "when did pakistan win first olympic medal"],
    response: "Pakistan won its first Olympic medal (a bronze in field hockey) at the 1956 Summer Olympics."
  },
 "how are you": {
    keywords: [
      "how are you",
      "how's your day going",
      "what's up",
      "how are you feeling",
      "everything okay",
      "you doin' alright",
      "how've you been",
      "what's new with you",
      "how's everything",
      "are you well",
      "how's life treating you",
      "what's crackin'",
      "how are things with you",
      "how are you holding up",
      "anything interesting happen today",
      "how's your world",
      "what's the good word",
      "how are you getting on",
      "how's your spirit today",
      "what's the latest"
    ],
    response: "I'm a machine learning model, so I don't have feelings, but I'm ready to help. How can I assist you?"
  },
  "what's your name": {
    keywords: [
      "what's your name",
      "what should i call you",
      "do you have a name",
      "what's your designation",
      "how do you identify yourself",
      "what's the name you go by",
      "are you named",
      "what's your handle",
      "do you have a title",
      "what's your formal designation",
      "what's your given name",
      "what's your moniker",
      "what's your identification",
      "what are you called",
      "what's your alias",
      "how should i refer to you",
      "do you have a personal name",
      "what do you go by",
      "what's your label",
      "what are you officially named"
    ],
    response: "I am Jarvis a large language model, trained by Mian Abdul Azeem."
  },
  "who are you": {
    keywords: [
      "who are you",
      "what are you",
      "what's your nature",
      "what's your identity",
      "are you a human or an ai",
      "what's your purpose",
      "what's your background",
      "where do you come from",
      "what's your origin story",
      "what's your function",
      "how were you made",
      "what's your role",
      "how do you define yourself",
      "what's your being",
      "what's your essence",
      "tell me about your existence",
      "how would you describe yourself",
      "what is your fundamental nature",
      "what sort of entity are you",
      "who created you",
      "what's your fundamental form"
    ],
    response: "I am Jarvis a large language model, trained by Mian Abdul Azeem."
  },
  "how can i help you": {
    keywords: [
      "how can i help you",
      "what can i do for you",
      "how may i be of assistance",
      "do you need any help",
      "can i do anything for you",
      "is there something i can assist with",
      "what can i assist you with",
      "how can i make your task easier",
      "what can i offer you",
      "what can i do to help you",
      "is there anything you require",
      "what can i help you with",
      "how can i be of service",
      "is there a way for me to assist you",
      "what can i do for your benefit",
      "how can i be useful",
      "how can i facilitate your work",
      "what would you like from me",
      "what kind of help do you need",
      "how can i aid you",
      "what can i provide to you"
    ],
    response: "My purpose is to assist you and provide helpful, accurate, and safe information."
  },
  "tell me": {
    keywords: [
      "tell me",
      "elaborate on",
      "could you explain",
      "give me the details of",
      "what's the story behind",
      "fill me in on",
      "provide more information about",
      "what can you tell me about",
      "what's the lowdown on",
      "could you shed some light on",
      "what's the scoop on",
      "give me a rundown of",
      "walk me through",
      "inform me about",
      "what's the deal with",
      "give me a full account of",
      "let me in on",
      "explain to me",
      "what do you know about",
      "unpack the topic of"
    ],
    response: "I can help you with a wide range of topics. Please ask me a specific question."
  },


  "q1_lahore_resolution": {
    "keywords": ["lahore resolution year", "when was the lahore resolution passed"],
    "response": "The Lahore Resolution was passed in **1940**."
  },
  "q2_founder_pakistan": {
    "keywords": ["founder of pakistan", "who founded pakistan", "who is the founder of pakistan"],
    "response": "The founder of Pakistan is **Quaid-e-Azam Muhammad Ali Jinnah**."
  },
  "q3_k2_height": {
    "keywords": ["k2 height", "how high is k2", "height of k2"],
    "response": "The height of K2 is **8,611 meters**."
  },
  "q4_national_animal": {
    "keywords": ["national animal of pakistan", "what is pakistan's national animal"],
    "response": "The national animal of Pakistan is the **Markhor**."
  },
  "q5_indus_river": {
    "keywords": ["longest river in pakistan", "what is pakistan's longest river"],
    "response": "The longest river in Pakistan is the **Indus River**."
  },
  "q6_first_governor": {
    "keywords": ["first governor general of pakistan", "who was the first governor general"],
    "response": "The first Governor-General of Pakistan was **Muhammad Ali Jinnah**."
  },
  "q7_capital_punjab": {
    "keywords": ["capital of punjab", "what is the capital of punjab"],
    "response": "The capital of Punjab is **Lahore**."
  },
  "q8_national_anthem_writer": {
    "keywords": ["national anthem of pakistan writer", "who wrote pakistan's national anthem"],
    "response": "The national anthem of Pakistan was written by **Hafeez Jalandhari**."
  },
  "q9_pakistan_day": {
    "keywords": ["when is pakistan day", "pakistan day date"],
    "response": "Pakistan Day is celebrated on **March 23**."
  },
  "q10_largest_city": {
    "keywords": ["largest city in pakistan", "what is the largest city in pakistan"],
    "response": "The largest city in Pakistan is **Karachi**."
  },
  "q11_aligarh_movement": {
    "keywords": ["founder of aligarh movement", "who started the aligarh movement"],
    "response": "The Aligarh Movement was founded by **Sir Syed Ahmed Khan**."
  },
  "q12_indus_valley_civilization": {
    "keywords": ["indus valley civilization", "mohenjo-daro"],
    "response": "The Indus Valley Civilization was an ancient civilization located in the Indus River basin."
  },
  "q13_first_constitution": {
    "keywords": ["first constitution of pakistan", "when was pakistan's first constitution enacted"],
    "response": "Pakistan's first constitution was enacted in **1956**."
  },
  "q14_pak_us_allies": {
    "keywords": ["was pakistan an ally of the us in the cold war", "pakistan us cold war"],
    "response": "Yes, Pakistan was a key ally of the United States during the Cold War."
  },
  "q15_karakoram_highway": {
    "keywords": ["karakoram highway", "what is the karakoram highway"],
    "response": "The Karakoram Highway is the highest paved international road, connecting Pakistan and China."
  },
  "q16_first_pm": {
    "keywords": ["first prime minister of pakistan", "who was pakistan's first prime minister"],
    "response": "Pakistan's first Prime Minister was **Liaquat Ali Khan**."
  },
  "q17_national_language": {
    "keywords": ["national language of pakistan", "what is the national language"],
    "response": "The national language of Pakistan is **Urdu**."
  },
  "q18_pakistan_provinces": {
    "keywords": ["how many provinces in pakistan", "pakistan provinces count"],
    "response": "Pakistan has **four** provinces."
  },
  "q19_allama_iqbal": {
    "keywords": ["allama iqbal", "who is allama iqbal"],
    "response": "Allama Muhammad Iqbal is known as the 'Spiritual Father of Pakistan'."
  },
  "q20_nuclear_power": {
    "keywords": ["when did pakistan become a nuclear power", "pakistan nuclear year"],
    "response": "Pakistan became a nuclear power in **1998**."
  },
  "q21_balochistan_capital": {
    "keywords": ["capital of balochistan", "what is the capital of balochistan"],
    "response": "The capital of Balochistan is **Quetta**."
  },
  "q22_khyber_pakhtunkhwa_capital": {
    "keywords": ["capital of khyber pakhtunkhwa", "what is the capital of khyber pakhtunkhwa"],
    "response": "The capital of Khyber Pakhtunkhwa is **Peshawar**."
  },
  "q23_sindh_capital": {
    "keywords": ["capital of sindh", "what is the capital of sindh"],
    "response": "The capital of Sindh is **Karachi**."
  },
  "q24_thar_desert": {
    "keywords": ["where is the thar desert", "thar desert location"],
    "response": "The Thar Desert is located in the **Sindh** province."
  },
  "q25_faisal_mosque": {
    "keywords": ["largest mosque in pakistan", "what is the largest mosque in pakistan"],
    "response": "The largest mosque in Pakistan is the **Faisal Mosque** in Islamabad."
  },
  "q26_bengali_language": {
    "keywords": ["what was the main language issue in east pakistan", "bengali language movement"],
    "response": "The main language issue in East Pakistan was the demand for **Bengali** to be recognized as a national language alongside Urdu."
  },
  "q27_cpec": {
    "keywords": ["what is cpec", "cpec pakistan"],
    "response": "CPEC stands for the **China-Pakistan Economic Corridor**."
  },
  "q28_sindhi_culture_day": {
    "keywords": ["sindhi culture day", "when is sindhi culture day"],
    "response": "Sindhi Culture Day is celebrated on the **first Sunday of December**."
  },
  "q29_pakistan_resolution_name": {
    "keywords": ["what was the lahore resolution called", "other name for lahore resolution"],
    "response": "The Lahore Resolution is also known as the **Pakistan Resolution**."
  },
  "q30_pakistan_cricket_team": {
    "keywords": ["pakistan cricket team nickname", "pakistan cricket team name"],
    "response": "The Pakistan national cricket team is also known as **The Green Shirts**."
  },
  "q31_khewra_salt_mine": {
    "keywords": ["khewra salt mine", "largest salt mine in pakistan"],
    "response": "The Khewra Salt Mine is the **second largest salt mine in the world**."
  },
  "q32_mohatta_palace": {
    "keywords": ["mohatta palace", "where is mohatta palace"],
    "response": "The Mohatta Palace is a museum in **Karachi**."
  },
  "q33_lahore_fort": {
    "keywords": ["lahore fort", "where is the lahore fort"],
    "response": "The Lahore Fort is a citadel in **Lahore**."
  },
  "q34_first_satellite": {
    "keywords": ["pakistan first satellite", "when was pakistan's first satellite launched"],
    "response": "Pakistan's first satellite, Badr-1, was launched in **1990**."
  },
  "q35_indus_water_treaty": {
    "keywords": ["indus water treaty", "indus water treaty year"],
    "response": "The Indus Waters Treaty between Pakistan and India was signed in **1960**."
  },
  "q36_first_female_pm": {
    "keywords": ["first female prime minister of pakistan", "who was the first female pm of pakistan"],
    "response": "The first female Prime Minister of Pakistan was **Benazir Bhutto**."
  },
  "q37_national_bird": {
    "keywords": ["national bird of pakistan", "what is pakistan's national bird"],
    "response": "The national bird of Pakistan is the **Chukar Partridge**."
  },
  "q38_national_flower": {
    "keywords": ["national flower of pakistan", "what is pakistan's national flower"],
    "response": "The national flower of Pakistan is **Jasmine**."
  },
  "q39_national_tree": {
    "keywords": ["national tree of pakistan", "what is pakistan's national tree"],
    "response": "The national tree of Pakistan is the **Deodar Cedar**."
  },
  "q40_national_monument": {
    "keywords": ["pakistan national monument", "what is the national monument of pakistan"],
    "response": "The national monument of Pakistan is the **Pakistan Monument** in Islamabad."
  },
  "q41_pakistan_un_admission": {
    "keywords": ["pakistan un admission", "when did pakistan join the un"],
    "response": "Pakistan was admitted to the United Nations on **September 30, 1947**."
  },
  "q42_lahore_resolution_proposer": {
    "keywords": ["who presented the lahore resolution", "proposer of lahore resolution"],
    "response": "The Lahore Resolution was proposed by **A. K. Fazlul Huq**."
  },
  "q43_first_president": {
    "keywords": ["first president of pakistan", "who was the first president"],
    "response": "The first President of Pakistan was **Iskander Mirza**."
  },
  "q44_old_name_islamabad": {
    "keywords": ["old name of islamabad", "was islamabad always the capital"],
    "response": "Before Islamabad was made the capital, **Karachi** was the capital of Pakistan."
  },
  "q45_gandhara_civilization": {
    "keywords": ["gandhara civilization", "gandhara civilization pakistan"],
    "response": "Gandhara was an ancient kingdom located in the Swat and Peshawar valleys of modern-day Pakistan."
  },
  "q46_major_crops": {
    "keywords": ["major crops in pakistan", "what are the main crops of pakistan"],
    "response": "The major crops of Pakistan are **wheat, cotton, rice, and sugarcane**."
  },
  "q47_thar_desert_location": {
    "keywords": ["where is thar desert", "thar desert location"],
    "response": "The Thar Desert is located in the **Sindh** province."
  },
  "q48_old_name_faisalabad": {
    "keywords": ["old name of faisalabad", "what was faisalabad's old name"],
    "response": "The old name of Faisalabad was **Lyallpur**."
  },
  "q49_longest_border": {
    "keywords": ["pakistan longest border", "which country shares the longest border with pakistan"],
    "response": "Pakistan shares its longest border with **India**."
  },
  "q50_shortest_border": {
    "keywords": ["pakistan shortest border", "which country shares the shortest border with pakistan"],
    "response": "Pakistan shares its shortest border with **China**."
  },
  "q51_largest_port": {
    "keywords": ["largest port in pakistan", "what is pakistan's largest port"],
    "response": "The largest port in Pakistan is the **Port of Karachi**."
  },
  "q52_gwadar_port": {
    "keywords": ["gwadar port", "where is gwadar port"],
    "response": "Gwadar Port is a warm-water, deep-sea port located in **Balochistan**."
  },
  "q53_gilgit_baltistan": {
    "keywords": ["gilgit baltistan", "where is gilgit baltistan"],
    "response": "Gilgit-Baltistan is an administrative territory of Pakistan, located in the northern part of the country."
  },
  "q54_azad_kashmir_capital": {
    "keywords": ["capital of azad kashmir", "what is the capital of azad kashmir"],
    "response": "The capital of Azad Kashmir is **Muzaffarabad**."
  },
  "q55_national_sport": {
    "keywords": ["national sport of pakistan", "what is the national sport of pakistan"],
    "response": "The national sport of Pakistan is **field hockey**."
  },
  "q56_pak_cricket_world_cup": {
    "keywords": ["when did pakistan win cricket world cup", "pakistan cricket world cup win year"],
    "response": "Pakistan won the Cricket World Cup in **1992**."
  },
  "q57_imran_khan_captain": {
    "keywords": ["who was the captain when pakistan won the world cup", "imran khan 1992 world cup"],
    "response": "The captain of the 1992 World Cup-winning team was **Imran Khan**."
  },
  "q58_most_populated_city": {
    "keywords": ["most populated city in pakistan", "what is pakistan's most populated city"],
    "response": "The most populated city in Pakistan is **Karachi**."
  },
  "q59_pakistani_population": {
    "keywords": ["pakistan population", "what is the population of pakistan"],
    "response": "The population of Pakistan is estimated to be **over 240 million**."
  },
  "q60_pakistan_un_admission": {
    "keywords": ["pakistan un admission date", "when did pakistan become a un member"],
    "response": "Pakistan became a UN member on **September 30, 1947**."
  },
  "q61_urdu_poet": {
    "keywords": ["famous urdu poet", "who is a famous urdu poet"],
    "response": "A famous Urdu poet is **Faiz Ahmed Faiz**."
  },
  "q62_indus_water_treaty_countries": {
    "keywords": ["indus water treaty countries", "who signed the indus water treaty"],
    "response": "The Indus Waters Treaty was signed between **Pakistan and India**."
  },
  "q63_sir_syed_ahmed_khan_title": {
    "keywords": ["sir syed ahmed khan title", "what is sir syed ahmed khan known as"],
    "response": "Sir Syed Ahmed Khan is often referred to as the 'Founder of the **Two-Nation Theory**'."
  },
  "q64_national_museum": {
    "keywords": ["national museum of pakistan", "where is the national museum of pakistan"],
    "response": "The National Museum of Pakistan is in **Karachi**."
  },
  "q65_oldest_university": {
    "keywords": ["oldest university in pakistan", "what is the oldest university in pakistan"],
    "response": "The oldest university in Pakistan is the **University of the Punjab**."
  },
  "q66_national_dress": {
    "keywords": ["national dress of pakistan", "what is the national dress of pakistan"],
    "response": "The national dress of Pakistan is the **Shalwar Kameez**."
  },
  "q67_national_bird_name": {
    "keywords": ["pakistan national bird name", "what is the name of pakistan's national bird"],
    "response": "The name of Pakistan's national bird is the **Chukar Partridge**."
  },
  "q68_pakistan_air_force": {
    "keywords": ["pakistan air force academy", "where is pakistan air force academy"],
    "response": "The Pakistan Air Force Academy is in **Risalpur**."
  },
  "q69_pakistan_naval_academy": {
    "keywords": ["pakistan naval academy", "where is pakistan naval academy"],
    "response": "The Pakistan Naval Academy is in **Karachi**."
  },
  "q70_pakistan_military_academy": {
    "keywords": ["pakistan military academy", "where is pakistan military academy"],
    "response": "The Pakistan Military Academy is in **Kakul, Abbottabad**."
  },
  "q71_islamic_ideology_council": {
    "keywords": ["what is the islamic ideology council", "islamic ideology council pakistan"],
    "response": "The Islamic Ideology Council is a constitutional body in Pakistan that advises the government on Islamic law."
  },
  "q72_mohammad_ali_jinnah_birth": {
    "keywords": ["muhammad ali jinnah birthday", "when was muhammad ali jinnah born"],
    "response": "Muhammad Ali Jinnah was born on **December 25, 1876**."
  },
  "q73_allama_iqbal_birth": {
    "keywords": ["allama iqbal birthday", "when was allama iqbal born"],
    "response": "Allama Muhammad Iqbal was born on **November 9, 1877**."
  },
  "q74_national_sports_name": {
    "keywords": ["pakistan national sport name", "what is the name of pakistan's national sport"],
    "response": "The name of Pakistan's national sport is **field hockey**."
  },
  "q75_national_fish": {
    "keywords": ["pakistan national fish", "what is the national fish of pakistan"],
    "response": "The national fish of Pakistan is the **Mahseer**."
  },
  "q76_national_fruit": {
    "keywords": ["pakistan national fruit", "what is the national fruit of pakistan"],
    "response": "The national fruit of Pakistan is the **mango**."
  },
  "q77_national_juice": {
    "keywords": ["pakistan national juice", "what is the national juice of pakistan"],
    "response": "The national juice of Pakistan is **sugarcane juice**."
  },
  "q78_national_vegetable": {
    "keywords": ["pakistan national vegetable", "what is the national vegetable of pakistan"],
    "response": "The national vegetable of Pakistan is **okra** (bhindi)."
  },
  "q79_national_sweet": {
    "keywords": ["pakistan national sweet", "what is the national sweet of pakistan"],
    "response": "The national sweet of Pakistan is **Gulab Jamun**."
  },
  "q80_faisalabad_textile_industry": {
    "keywords": ["what is faisalabad famous for", "faisalabad textile city"],
    "response": "Faisalabad is known as the **Textile City of Pakistan**."
  },
  "q81_pakistan_border_india": {
    "keywords": ["pakistan india border", "border between pakistan and india"],
    "response": "The border between Pakistan and India is known as the **Radcliffe Line**."
  },
  "q82_pakistan_border_afghanistan": {
    "keywords": ["pakistan afghanistan border", "border between pakistan and afghanistan"],
    "response": "The border between Pakistan and Afghanistan is known as the **Durand Line**."
  },
  "q83_pakistan_border_china": {
    "keywords": ["pakistan china border", "border between pakistan and china"],
    "response": "The border between Pakistan and China is the **Khunjerab Pass**."
  },
  "q84_pakistan_border_iran": {
    "keywords": ["pakistan iran border", "border between pakistan and iran"],
    "response": "The border between Pakistan and Iran is the **Taftan-Mirjaveh border**."
  },
  "q85_pakistan_first_constitution_date": {
    "keywords": ["date of first constitution of pakistan", "when was pakistan's first constitution enacted"],
    "response": "Pakistan's first constitution was enacted on **March 23, 1956**."
  },
  "q86_pakistan_super_league": {
    "keywords": ["what is psl", "pakistan super league"],
    "response": "The PSL is the **Pakistan Super League**, a professional cricket league."
  },
  "q87_national_monument_location": {
    "keywords": ["location of pakistan monument", "where is the pakistan monument"],
    "response": "The Pakistan Monument is located in **Islamabad**."
  },
  "q88_punjab_population": {
    "keywords": ["most populated province of pakistan", "what is pakistan's most populated province"],
    "response": "The most populated province of Pakistan is **Punjab**."
  },
  "q89_balochistan_area": {
    "keywords": ["largest province by area in pakistan", "what is pakistan's largest province by area"],
    "response": "The largest province by area in Pakistan is **Balochistan**."
  },
  "q90_shah_faisal_mosque_location": {
    "keywords": ["where is the shah faisal mosque", "location of faisal mosque"],
    "response": "The Faisal Mosque is located in **Islamabad**."
  },
  "q91_punjabi_culture_day": {
    "keywords": ["punjabi culture day", "when is punjabi culture day"],
    "response": "Punjabi Culture Day is celebrated on **March 14**."
  },
  "q92_pakistan_gdp": {
    "keywords": ["pakistan gdp", "what is pakistan's gdp"],
    "response": "Pakistan's GDP is estimated to be over **$370 billion USD**."
  },
  "q93_highest_lake": {
    "keywords": ["highest lake in pakistan", "what is the highest lake in pakistan"],
    "response": "The highest lake in Pakistan is **Karambar Lake**."
  },
  "q94_oldest_fort": {
    "keywords": ["oldest fort in pakistan", "what is the oldest fort in pakistan"],
    "response": "The oldest fort in Pakistan is **Derawar Fort**."
  },
  "q95_first_nuclear_reactor": {
    "keywords": ["pakistan first nuclear reactor", "when was pakistan's first nuclear reactor built"],
    "response": "Pakistan's first nuclear reactor, KANUPP, was built in **1972**."
  },
  "q96_largest_dam": {
    "keywords": ["largest dam in pakistan", "what is the largest dam in pakistan"],
    "response": "The largest dam in Pakistan is the **Tarbela Dam**."
  },
  "q97_largest_museum": {
    "keywords": ["largest museum in pakistan", "what is the largest museum in pakistan"],
    "response": "The largest museum in Pakistan is the **National Museum of Pakistan**."
  },
  "q98_first_female_governor": {
    "keywords": ["first female governor of pakistan", "who was the first female governor"],
    "response": "The first female governor of Pakistan was **Begum Ra'ana Liaquat Ali Khan**."
  },
  "q99_national_airline": {
    "keywords": ["national airline of pakistan", "what is the national airline of pakistan"],
    "response": "The national airline of Pakistan is **Pakistan International Airlines (PIA)**."
  },
  "q100_national_railway": {
    "keywords": ["national railway of pakistan", "what is the national railway of pakistan"],
    "response": "The national railway of Pakistan is **Pakistan Railways**."
  },

  "q1_base_units": {
    "keywords": ["how many si base units", "number of si base units","base unit"],
    "response": "There are **seven** SI base units."
  },
  "q2_newton_definition": {
    "keywords": ["define newton", "what is a newton"],
    "response": "A **Newton** is the force that, when applied to a 1 kg mass, produces an acceleration of $1 \\text{ m/s}^2$."
  },
  "q3_dimension_of_force": {
    "keywords": ["dimension of force", "what is the dimension of force", "demension"],
    "response": "The dimension of force is **$MLT^{-2}$**."
  },
  "q4_vector_vs_scalar": {
    "keywords": ["vector vs scalar", "difference between vector and scalar","vector"],
    "response": "A **vector** has both magnitude and direction, while a **scalar** has only magnitude."
  },
  "q5_dot_product": {
    "keywords": ["dot product of two perpendicular vectors", "dot product of orthogonal vectors","dot product"],
    "response": "The dot product of two perpendicular vectors is **zero**."
  },
  "q6_cross_product": {
    "keywords": ["cross product of two parallel vectors", "cross product of parallel vectors"],
    "response": "The cross product of two parallel vectors is **zero**."
  },
  "q7_projectile_motion_acceleration": {
    "keywords": ["projectile motion horizontal acceleration", "acceleration in projectile motion"],
    "response": "The horizontal acceleration in projectile motion is **zero**."
  },
  "q8_centripetal_force": {
    "keywords": ["what is centripetal force", "define centripetal force"],
    "response": "A **centripetal force** is a force that keeps a body moving in a circular path."
  },
  "q9_law_of_conservation_of_momentum": {
    "keywords": ["what is the law of conservation of momentum", "conservation of momentum principle"],
    "response": "The **law of conservation of momentum** states that in an isolated system, the total momentum remains constant."
  },
  "q10_elastic_collision": {
    "keywords": ["what is an elastic collision", "define elastic collision"],
    "response": "An **elastic collision** is one in which kinetic energy is conserved."
  },
  "q11_work_formula": {
    "keywords": ["what is the formula for work", "work done formula"],
    "response": "The formula for work is **$W = Fd \\cos \\theta$**."
  },
  "q12_si_unit_of_work": {
    "keywords": ["si unit of work", "unit of work in si system"],
    "response": "The SI unit of work is the **Joule (J)**."
  },
  "q13_power_formula": {
    "keywords": ["what is the formula for power", "power formula"],
    "response": "The formula for power is **$P = W/t$**."
  },
  "q14_si_unit_of_power": {
    "keywords": ["si unit of power", "unit of power in si system"],
    "response": "The SI unit of power is the **Watt (W)**."
  },
  "q15_potential_energy_formula": {
    "keywords": ["what is the formula for gravitational potential energy", "potential energy formula"],
    "response": "The formula for gravitational potential energy is **$PE = mgh$**."
  },
  "q16_kinetic_energy_formula": {
    "keywords": ["what is the formula for kinetic energy", "kinetic energy formula"],
    "response": "The formula for kinetic energy is **$KE = 1/2 mv^2$**."
  },
  "q17_geostationary_orbit": {
    "keywords": ["what is a geostationary orbit", "define geostationary satellite"],
    "response": "A **geostationary orbit** is a circular orbit 35,786 km above the Earth's equator where a satellite's orbital period matches the Earth's rotation period."
  },
  "q18_escape_velocity": {
    "keywords": ["what is escape velocity", "define escape velocity"],
    "response": "**Escape velocity** is the minimum speed an object must have to escape the gravitational pull of a planet."
  },
  "q19_rotational_kinetic_energy": {
    "keywords": ["rotational kinetic energy formula", "what is the rotational kinetic energy formula"],
    "response": "The formula for rotational kinetic energy is **$KE_r = 1/2 I \\omega^2$**."
  },
  "q20_angular_momentum": {
    "keywords": ["angular momentum formula", "what is the formula for angular momentum"],
    "response": "The formula for angular momentum is **$L = I\\omega$**."
  },
  "q21_pascal_principle": {
    "keywords": ["what is pascal's principle", "pascal's law"],
    "response": "**Pascal's principle** states that pressure applied to an enclosed fluid is transmitted undiminished to every portion of the fluid and the walls of the containing vessel."
  },
  "q22_archimedes_principle": {
    "keywords": ["what is archimedes principle", "archimedes law"],
    "response": "**Archimedes' principle** states that an upward buoyant force is exerted on a body immersed in a fluid, equal to the weight of the fluid that the body displaces."
  },
  "q23_stokes_law": {
    "keywords": ["what is stokes' law", "stokes law"],
    "response": "**Stokes' law** describes the viscous drag force on a sphere moving through a fluid."
  },
  "q24_terminal_velocity": {
    "keywords": ["what is terminal velocity", "define terminal velocity"],
    "response": "**Terminal velocity** is the constant speed that a freely falling object eventually reaches when the resistance of the medium it is falling through equals the gravitational force."
  },
  "q25_bernoullis_equation": {
    "keywords": ["what is bernoulli's equation", "bernoulli's principle"],
    "response": "**Bernoulli's equation** relates the pressure, speed, and height of a fluid in a steady flow."
  },
  "q26_ideal_fluid": {
    "keywords": ["what is an ideal fluid", "define ideal fluid"],
    "response": "An **ideal fluid** is a fluid that is incompressible and has no viscosity."
  },
  "q27_temperature_definition": {
    "keywords": ["what is temperature", "define temperature"],
    "response": "**Temperature** is a measure of the average kinetic energy of the atoms or molecules in a system."
  },
  "q28_first_law_of_thermodynamics": {
    "keywords": ["what is the first law of thermodynamics", "first law of thermodynamics"],
    "response": "The **first law of thermodynamics** is the principle of conservation of energy applied to a system."
  },
  "q29_isochoric_process": {
    "keywords": ["what is an isochoric process", "define isochoric process"],
    "response": "An **isochoric process** is a thermodynamic process in which the volume of the system remains constant."
  },
  "q30_isobaric_process": {
    "keywords": ["what is an isobaric process", "define isobaric process"],
    "response": "An **isobaric process** is a thermodynamic process in which the pressure of the system remains constant."
  },
  "q31_isothermal_process": {
    "keywords": ["what is an isothermal process", "define isothermal process"],
    "response": "An **isothermal process** is a thermodynamic process in which the temperature of the system remains constant."
  },
  "q32_adiabatic_process": {
    "keywords": ["what is an adiabatic process", "define adiabatic process"],
    "response": "An **adiabatic process** is a thermodynamic process that occurs without the transfer of heat or mass between the system and its surroundings."
  },
  "q33_triple_point_of_water": {
    "keywords": ["what is the triple point of water", "triple point of water definition"],
    "response": "The **triple point of water** is the temperature and pressure at which the three phases (gas, liquid, and solid) of water coexist in thermodynamic equilibrium."
  },
  "q34_unit_of_heat": {
    "keywords": ["what is the si unit of heat", "unit of heat"],
    "response": "The SI unit of heat is the **Joule (J)**."
  },
  "q35_specific_heat_capacity": {
    "keywords": ["what is specific heat capacity", "define specific heat capacity"],
    "response": "**Specific heat capacity** is the amount of heat required to raise the temperature of one unit of mass of a substance by one degree Celsius."
  },
  "q36_latent_heat_of_fusion": {
    "keywords": ["what is latent heat of fusion", "define latent heat of fusion"],
    "response": "**Latent heat of fusion** is the amount of heat required to change one mole of a substance from solid to liquid at a constant temperature."
  },
  "q37_molar_specific_heat_at_constant_volume": {
    "keywords": ["molar specific heat at constant volume", "define molar specific heat at constant volume"],
    "response": "**Molar specific heat at constant volume** is the heat required to raise the temperature of one mole of a gas by one Kelvin at a constant volume."
  },
  "q38_molar_specific_heat_at_constant_pressure": {
    "keywords": ["molar specific heat at constant pressure", "define molar specific heat at constant pressure"],
    "response": "**Molar specific heat at constant pressure** is the heat required to raise the temperature of one mole of a gas by one Kelvin at a constant pressure."
  },
  "q39_thermodynamic_work": {
    "keywords": ["thermodynamic work", "work done by a gas"],
    "response": "The work done by a gas in a thermodynamic process is the product of pressure and the change in volume."
  },
  "q40_second_law_of_thermodynamics": {
    "keywords": ["what is the second law of thermodynamics", "second law of thermodynamics"],
    "response": "The **second law of thermodynamics** states that the entropy of an isolated system can only increase over time."
  },
  "q41_entropy_definition": {
    "keywords": ["what is entropy", "define entropy"],
    "response": "**Entropy** is a measure of the disorder or randomness of a system."
  },
  "q42_heat_engine": {
    "keywords": ["what is a heat engine", "define heat engine"],
    "response": "A **heat engine** is a device that converts heat into mechanical work."
  },
  "q43_refrigerator": {
    "keywords": ["what is a refrigerator", "define refrigerator"],
    "response": "A **refrigerator** is a device that transfers heat from a cold region to a hot region, requiring work to be done on it."
  },
  "q44_thermal_expansion": {
    "keywords": ["what is thermal expansion", "define thermal expansion"],
    "response": "**Thermal expansion** is the tendency of matter to change in volume in response to a change in temperature."
  },
  "q45_linear_thermal_expansion": {
    "keywords": ["linear thermal expansion", "coefficient of linear thermal expansion"],
    "response": "The **coefficient of linear thermal expansion** is a measure of how much a material's length changes per degree of temperature change."
  },
  "q46_volumetric_thermal_expansion": {
    "keywords": ["volumetric thermal expansion", "coefficient of volumetric thermal expansion"],
    "response": "The **coefficient of volumetric thermal expansion** is a measure of how much a material's volume changes per degree of temperature change."
  },
  "q47_specific_gravity": {
    "keywords": ["what is specific gravity", "define specific gravity"],
    "response": "**Specific gravity** is the ratio of the density of a substance to the density of a reference substance."
  },
  "q48_absolute_pressure": {
    "keywords": ["what is absolute pressure", "define absolute pressure"],
    "response": "**Absolute pressure** is the total pressure exerted on a fluid, including atmospheric pressure."
  },
  "q49_gauge_pressure": {
    "keywords": ["what is gauge pressure", "define gauge pressure"],
    "response": "**Gauge pressure** is the pressure relative to atmospheric pressure."
  },
  "q50_pascal_si_unit": {
    "keywords": ["what is the si unit of pressure", "si unit of pressure"],
    "response": "The SI unit of pressure is the **Pascal (Pa)**."
  },
  "q51_newton_law_of_gravitation": {
    "keywords": ["newton's law of universal gravitation", "what is newton's law of gravitation"],
    "response": "**Newton's law of universal gravitation** states that every particle in the universe attracts every other particle with a force that is directly proportional to the product of their masses and inversely proportional to the square of the distance between them."
  },
  "q52_gravitational_constant": {
    "keywords": ["what is the value of g", "gravitational constant value"],
    "response": "The value of the universal gravitational constant, **G**, is approximately **$6.67 \\times 10^{-11} \\text{ N} \\cdot \\text{m}^2/\\text{kg}^2$**."
  },
  "q53_free_fall_acceleration_earth": {
    "keywords": ["what is the acceleration due to gravity on earth", "value of g on earth"],
    "response": "The acceleration due to gravity on Earth, **g**, is approximately **$9.8 \\text{ m/s}^2$**."
  },
  "q54_work_done_by_gravitational_force": {
    "keywords": ["work done by gravitational force", "work done against gravity"],
    "response": "The work done by a gravitational force on an object depends only on its initial and final vertical positions, not the path taken."
  },
  "q55_spring_force": {
    "keywords": ["what is the spring force", "define spring force"],
    "response": "The **spring force** is the restoring force exerted by a spring, which is proportional to its displacement from equilibrium."
  },
  "q56_hookes_law": {
    "keywords": ["what is hooke's law", "hooke's law formula"],
    "response": "**Hooke's law** states that the force required to stretch or compress a spring by some distance is directly proportional to that distance."
  },
  "q57_elastic_potential_energy": {
    "keywords": ["elastic potential energy", "formula for elastic potential energy"],
    "response": "The formula for elastic potential energy stored in a spring is **$PE_s = 1/2 kx^2$**."
  },
  "q58_simple_harmonic_motion": {
    "keywords": ["what is simple harmonic motion", "define shm"],
    "response": "**Simple harmonic motion** (SHM) is a type of periodic motion where the restoring force is directly proportional to the displacement and acts in the opposite direction."
  },
  "q59_period_of_a_simple_pendulum": {
    "keywords": ["period of a simple pendulum", "simple pendulum formula for period"],
    "response": "The formula for the period of a simple pendulum is **$T = 2\\pi \\sqrt{L/g}$**."
  },
  "q60_damped_oscillations": {
    "keywords": ["what are damped oscillations", "define damped oscillations"],
    "response": "**Damped oscillations** are oscillations in which the amplitude decreases over time due to a dissipative force."
  },
  "q61_resonance": {
    "keywords": ["what is resonance", "define resonance"],
    "response": "**Resonance** is a phenomenon where a vibrating system or an external force drives another system to oscillate at its natural frequency."
  },
  "q62_doppler_effect": {
    "keywords": ["what is the doppler effect", "define doppler effect"],
    "response": "The **Doppler effect** is the change in frequency of a wave in relation to an observer who is moving relative to the wave source."
  },
  "q63_speed_of_sound_in_air": {
    "keywords": ["what is the speed of sound in air", "speed of sound at stp"],
    "response": "The speed of sound in air at standard temperature and pressure (STP) is approximately **$343 \\text{ m/s}$**."
  },
  "q64_wave_velocity_formula": {
    "keywords": ["what is the formula for wave velocity", "wave velocity formula"],
    "response": "The formula for wave velocity is **$v = f \\lambda$**, where $f$ is frequency and $\\lambda$ is wavelength."
  },
  "q65_longitudinal_wave": {
    "keywords": ["what is a longitudinal wave", "define longitudinal wave"],
    "response": "A **longitudinal wave** is a wave in which the particle displacement is parallel to the direction of wave propagation."
  },
  "q66_transverse_wave": {
    "keywords": ["what is a transverse wave", "define transverse wave"],
    "response": "A **transverse wave** is a wave in which the particle displacement is perpendicular to the direction of wave propagation."
  },
  "q67_constructive_interference": {
    "keywords": ["what is constructive interference", "constructive interference definition"],
    "response": "**Constructive interference** occurs when two waves combine to form a wave with a larger amplitude."
  },
  "q68_destructive_interference": {
    "keywords": ["what is destructive interference", "destructive interference definition"],
    "response": "**Destructive interference** occurs when two waves combine to form a wave with a smaller or zero amplitude."
  },
  "q69_snells_law": {
    "keywords": ["what is snell's law", "snell's law formula"],
    "response": "**Snell's law** describes the relationship between the angles of incidence and refraction for a wave passing through a boundary between two different isotropic media."
  },
  "q70_total_internal_reflection": {
    "keywords": ["what is total internal reflection", "define total internal reflection"],
    "response": "**Total internal reflection** is a phenomenon that occurs when a light ray traveling through a medium hits a boundary at an angle greater than the critical angle and is reflected back into the same medium."
  },
  "q71_critical_angle": {
    "keywords": ["what is critical angle", "define critical angle"],
    "response": "The **critical angle** is the angle of incidence that produces an angle of refraction of $90^\\circ$."
  },
  "q72_diffraction": {
    "keywords": ["what is diffraction", "define diffraction"],
    "response": "**Diffraction** is the bending of waves around obstacles and the spreading of waves as they pass through an opening."
  },
  "q73_interference_of_light": {
    "keywords": ["what is interference of light", "define interference of light"],
    "response": "**Interference of light** is the superposition of two or more light waves to form a new wave pattern."
  },
  "q74_newtons_rings": {
    "keywords": ["what are newton's rings", "newton's rings definition"],
    "response": "**Newton's rings** are a series of concentric dark and bright rings caused by interference between light waves reflected from two surfaces."
  },
  "q75_michelson_interferometer": {
    "keywords": ["what is a michelson interferometer", "michelson interferometer function"],
    "response": "The **Michelson interferometer** is a device that produces interference fringes by splitting a beam of light into two paths and then recombining them."
  },
  "q76_spectrometer": {
    "keywords": ["what is a spectrometer", "spectrometer function"],
    "response": "A **spectrometer** is an instrument used to measure the properties of light over a specific portion of the electromagnetic spectrum."
  },
  "q77_dispersive_power": {
    "keywords": ["what is dispersive power", "define dispersive power"],
    "response": "**Dispersive power** is a measure of the ability of a material to separate different wavelengths of light."
  },
  "q78_lens_formula": {
    "keywords": ["what is the lens formula", "lens formula"],
    "response": "The lens formula is **$1/f = 1/p + 1/q$**."
  },
  "q79_magnifying_power_of_telescope": {
    "keywords": ["magnifying power of a telescope", "telescope magnifying power formula"],
    "response": "The magnifying power of a telescope is the ratio of the focal length of the objective lens to the focal length of the eyepiece."
  },
  "q80_compound_microscope": {
    "keywords": ["what is a compound microscope", "define compound microscope"],
    "response": "A **compound microscope** is a microscope that uses a combination of two or more lenses to magnify an object."
  },
  "q81_resolution_of_telescope": {
    "keywords": ["resolution of a telescope", "telescope resolution"],
    "response": "The resolution of a telescope is its ability to distinguish between two closely spaced objects."
  },
  "q82_refracting_telescope": {
    "keywords": ["what is a refracting telescope", "define refracting telescope"],
    "response": "A **refracting telescope** uses a convex objective lens to form an image."
  },
  "q83_reflecting_telescope": {
    "keywords": ["what is a reflecting telescope", "define reflecting telescope"],
    "response": "A **reflecting telescope** uses a concave mirror to form an image."
  },
  "q84_polarization_of_light": {
    "keywords": ["what is polarization of light", "define polarization"],
    "response": "**Polarization** is a property of transverse waves that specifies the geometrical orientation of the oscillations."
  },
  "q85_brewsters_angle": {
    "keywords": ["what is brewster's angle", "brewster's angle definition"],
    "response": "**Brewster's angle** is the angle of incidence at which light with a particular polarization is perfectly transmitted through a transparent dielectric surface without any reflection."
  },
  "q86_x-ray_diffraction": {
    "keywords": ["what is x-ray diffraction", "x-ray diffraction definition"],
    "response": "**X-ray diffraction** is a technique used to study the structure of crystals by analyzing the patterns produced when X-rays are scattered by the atoms in the crystal."
  },
  "q87_quantum_physics": {
    "keywords": ["what is quantum physics", "define quantum physics"],
    "response": "**Quantum physics** is the study of the fundamental nature of matter and energy at the smallest scale."
  },
  "q88_blackbody_radiation": {
    "keywords": ["what is blackbody radiation", "blackbody radiation definition"],
    "response": "**Blackbody radiation** is the thermal electromagnetic radiation emitted by a perfect blackbody."
  },
  "q89_plancks_constant": {
    "keywords": ["what is planck's constant", "planck's constant value"],
    "response": "**Planck's constant**, $h$, is a fundamental physical constant used in quantum mechanics, with a value of approximately **$6.626 \\times 10^{-34} \\text{ J} \\cdot \\text{s}$**."
  },
  "q90_photoelectric_effect": {
    "keywords": ["what is the photoelectric effect", "photoelectric effect definition"],
    "response": "The **photoelectric effect** is the emission of electrons when electromagnetic radiation, such as light, hits a material."
  },
  "q91_compton_effect": {
    "keywords": ["what is the compton effect", "compton effect definition"],
    "response": "The **Compton effect** is the scattering of a photon by a charged particle, usually an electron."
  },
  "q92_de_broglie_wavelength": {
    "keywords": ["what is de broglie wavelength", "de broglie wavelength formula"],
    "response": "The **de Broglie wavelength** is the wavelength associated with a moving particle, given by the formula $\\lambda = h/p$."
  },
  "q93_heisenberg_uncertainty_principle": {
    "keywords": ["what is the heisenberg uncertainty principle", "heisenberg uncertainty principle definition"],
    "response": "The **Heisenberg uncertainty principle** states that it is impossible to simultaneously know the precise position and momentum of a particle."
  },
  "q94_pair_production": {
    "keywords": ["what is pair production", "pair production definition"],
    "response": "**Pair production** is the creation of a subatomic particle and its antiparticle from a neutral boson, typically a photon."
  },
  "q95_nuclear_fission": {
    "keywords": ["what is nuclear fission", "nuclear fission definition"],
    "response": "**Nuclear fission** is a nuclear reaction in which the nucleus of an atom splits into smaller parts, often producing free neutrons and releasing a large amount of energy."
  },
  "q96_nuclear_fusion": {
    "keywords": ["what is nuclear fusion", "nuclear fusion definition"],
    "response": "**Nuclear fusion** is a nuclear reaction in which two or more atomic nuclei collide at a very high speed and fuse to form a new nucleus, releasing a large amount of energy."
  },
  "q97_binding_energy": {
    "keywords": ["what is binding energy", "define binding energy"],
    "response": "**Binding energy** is the energy required to disassemble a whole system into separate parts."
  },
  "q98_half_life": {
    "keywords": ["what is half life", "define half life"],
    "response": "**Half-life** is the time required for a quantity to reduce to half of its initial value."
  },
  "q99_radioactivity": {
    "keywords": ["what is radioactivity", "define radioactivity"],
    "response": "**Radioactivity** is the spontaneous emission of radiation from an unstable atomic nucleus."
  },
  "q100_beta_decay": {
    "keywords": ["what is beta decay", "define beta decay"],
    "response": "**Beta decay** is a type of radioactive decay in which a beta particle (an electron or a positron) is emitted from an atomic nucleus."
  },

  
  "q1_base_units_si": {
    "keywords": ["how many si base units are there", "how many fundamental units are in si"],
    "response": "There are **seven** SI base units."
  },
  "q2_base_unit_length": {
    "keywords": ["what is the si unit for length", " unit of length"],
    "response": "The SI base unit for length is the **meter (m)**."
  },
  "q3_base_unit_mass": {
    "keywords": ["what is the si unit for mass", " unit of mass"],
    "response": "The SI base unit for mass is the **kilogram (kg)**."
  },
  "q4_base_unit_time": {
    "keywords": ["what is the si unit for time", " unit of time"],
    "response": "The SI base unit for time is the **second (s)**."
  },
  "q5_base_unit_current": {
    "keywords": ["what is the si unit for electric current", " unit of electric current"],
    "response": "The SI base unit for electric current is the **ampere (A)**."
  },
  "q6_base_unit_temp": {
    "keywords": ["what is the si unit for temperature", " unit of temperature"],
    "response": "The SI base unit for temperature is the **kelvin (K)**."
  },
  "q7_base_unit_amount": {
    "keywords": ["what is the si unit for amount of substance", " unit of amount of substance"],
    "response": "The SI base unit for the amount of substance is the **mole (mol)**."
  },
  "q8_base_unit_luminous": {
    "keywords": ["what is the si unit for luminous intensity", " unit of luminous intensity"],
    "response": "The SI base unit for luminous intensity is the **candela (cd)**."
  },
  "q9_derived_unit_force": {
    "keywords": ["what is the derived unit for force", "unit of force"],
    "response": "The derived unit for force is the **Newton (N)**."
  },
  "q10_derived_unit_energy": {
    "keywords": ["what is the derived unit for energy", " unit of energy"],
    "response": "The derived unit for energy is the **Joule (J)**."
  },
  "q11_derived_unit_power": {
    "keywords": ["what is the derived unit for power", "unit of power"],
    "response": "The derived unit for power is the **Watt (W)**."
  },
  "q12_derived_unit_pressure": {
    "keywords": ["what is the derived unit for pressure", " unit of pressure"],
    "response": "The derived unit for pressure is the **Pascal (Pa)**."
  },
  "q13_derived_unit_voltage": {
    "keywords": ["what is the derived unit for electric potential", " unit of voltage"],
    "response": "The derived unit for electric potential (voltage) is the **Volt (V)**."
  },
  "q14_derived_unit_resistance": {
    "keywords": ["what is the derived unit for resistance", " unit of resistance","resistance"],
    "response": "The derived unit for resistance is the **Ohm (Ω)**."
  },
  "q15_derived_unit_charge": {
    "keywords": ["what is the derived unit for electric charge", " unit of charge"],
    "response": "The derived unit for electric charge is the **Coulomb (C)**."
  },
  "q16_derived_unit_freq": {
    "keywords": ["what is the derived unit for frequency", " unit of frequency"],
    "response": "The derived unit for frequency is the **Hertz (Hz)**."
  },
  "q17_derived_unit_area": {
    "keywords": ["what is the derived unit for area", "unit of area"],
    "response": "The derived unit for area is the **square meter ($m^2$)**."
  },
  "q18_derived_unit_volume": {
    "keywords": ["what is the derived unit for volume", " unit of volume"],
    "response": "The derived unit for volume is the **cubic meter ($m^3$)**."
  },
  "q19_derived_unit_speed": {
    "keywords": ["what is the derived unit for speed", "unit of speed"],
    "response": "The derived unit for speed is the **meter per second (m/s)**."
  },
  "q20_derived_unit_accel": {
    "keywords": ["what is the derived unit for acceleration", "unit of acceleration"],
    "response": "The derived unit for acceleration is the **meter per second squared ($m/s^2$)**."
  },
  "q21_derived_unit_density": {
    "keywords": ["what is the derived unit for density", "unit of density"],
    "response": "The derived unit for density is the **kilogram per cubic meter ($kg/m^3$)**."
  },
  "q22_derived_unit_momentum": {
    "keywords": ["what is the derived unit for momentum", "unit of momentum"],
    "response": "The derived unit for momentum is the **kilogram meter per second ($kg \\cdot m/s$)**."
  },
  "q23_derived_unit_torque": {
    "keywords": ["what is the derived unit for torque", "unit of torque"],
    "response": "The derived unit for torque is the **Newton meter ($N \\cdot m$)**."
  },
  "q24_derived_unit_flux": {
    "keywords": ["what is the derived unit for magnetic flux", " unit of magnetic flux","magnetic flux"],
    "response": "The derived unit for magnetic flux is the **Weber (Wb)**."
  },
  "q25_derived_unit_mag_field": {
    "keywords": ["what is the derived unit for magnetic field", "unit of magnetic field strength","magnetic feild"],
    "response": "The derived unit for magnetic field strength is the **Tesla (T)**."
  },
  "q26_derived_unit_cap": {
    "keywords": ["what is the derived unit for capacitance", " unit of capacitance","unit of capacitance"],
    "response": "The derived unit for capacitance is the **Farad (F)**."
  },
  "q27_derived_unit_inductance": {
    "keywords": ["what is the derived unit for inductance", "derived unit of inductance","inductance"],
    "response": "The derived unit for inductance is the **Henry (H)**."
  },
  "q28_derived_unit_conductance": {
    "keywords": ["what is the derived unit for conductance", "derived unit of conductance","conductance"],
    "response": "The derived unit for conductance is the **Siemens (S)**."
  },
  "q29_derived_unit_luminous_flux": {
    "keywords": ["what is the derived unit for luminous flux", "derived unit of luminous flux"],
    "response": "The derived unit for luminous flux is the **Lumen (lm)**."
  },
  "q30_derived_unit_radioactivity": {
    "keywords": ["what is the derived unit for radioactivity", "derived unit of radioactivity"],
    "response": "The derived unit for radioactivity is the **Becquerel (Bq)**."
  },
  "q31_newton_first_law_statement": {
    "keywords": ["newton's first law of motion", "what is newton's first law","first law of motion"],
    "response": "**Newton's first law** states that an object will remain in its state of rest or uniform motion unless an external force acts on it."
  },
  "q32_newton_first_law_name": {
    "keywords": ["what is another name for newton's first law", "alternative name for newton's first law","law of motion"],
    "response": "Newton's first law is also known as the **Law of Inertia**."
  },
  "q33_inertia_definition": {
    "keywords": ["what is inertia", "define inertia","intertia"],
    "response": "**Inertia** is the property of an object to resist changes in its state of motion."
  },
  "q34_newton_second_law_statement": {
    "keywords": ["newton's second law of motion", "what is newton's second law","newton second law"],
    "response": "**Newton's second law** states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass."
  },
  "q35_newton_second_law_formula": {
    "keywords": ["newton's second law formula", "what is the formula for newton's second law"],
    "response": "The formula for Newton's second law is **$F = ma$**."
  },
  "q36_newton_second_law_momentum": {
    "keywords": ["how is newton's second law related to momentum", "newton's second law momentum form"],
    "response": "Newton's second law can also be stated as the net force on an object is equal to the rate of change of its momentum."
  },
  "q37_newton_third_law_statement": {
    "keywords": ["newton's third law of motion", "what is newton's third law","third law"],
    "response": "**Newton's third law** states that for every action, there is an equal and opposite reaction."
  },
  "q38_third_law_action_reaction_pair": {
    "keywords": ["what is an action-reaction pair", "give an example of newton's third law"],
    "response": "An **action-reaction pair** are two forces of equal magnitude and opposite direction that act on different objects."
  },
  "q39_action_reaction_forces_cancel": {
    "keywords": ["do action and reaction forces cancel each other", "why don't action and reaction forces cancel"],
    "response": "No, they do not cancel because they act on **different objects**."
  },
  "q40_newton_universal_gravitation": {
    "keywords": ["newton's law of universal gravitation", "what is newton's law of gravitation"],
    "response": "**Newton's law of universal gravitation** states that every particle attracts every other particle with a force directly proportional to the product of their masses and inversely proportional to the square of the distance between them."
  },
  "q41_newton_gravitation_formula": {
    "keywords": ["newton's gravitation formula", "what is the formula for universal gravitation"],
    "response": "The formula for Newton's law of universal gravitation is **$F = G \\frac{m_1 m_2}{r^2}$**."
  },
  "q42_magnetic_flux_def": {
    "keywords": ["what is magnetic flux", "define magnetic flux","magnetic flux"],
    "response": "**Magnetic flux** is a measure of the total number of magnetic field lines passing through a given area."
  },
  "q43_magnetic_flux_formula": {
    "keywords": ["magnetic flux formula", "what is the formula for magnetic flux"],
    "response": "The formula for magnetic flux is **$\\Phi_B = B \\cdot A \\cos \\theta$**."
  },
  "q44_magnetic_flux_unit": {
    "keywords": ["what is the si unit of magnetic flux", "unit of magnetic flux"],
    "response": "The SI unit of magnetic flux is the **Weber (Wb)**."
  },
  "q45_weber_tesla_relation": {
    "keywords": ["what is the relationship between weber and tesla", "weber to tesla"],
    "response": "A Weber is equal to one Tesla-meter squared ($1 \\text{ Wb} = 1 \\text{ T} \\cdot \\text{m}^2$). "
  },
  "q46_max_magnetic_flux": {
    "keywords": ["when is magnetic flux maximum", "maximum magnetic flux angle"],
    "response": "Magnetic flux is maximum when the magnetic field lines are **perpendicular** to the surface area (or the angle $\\theta$ is $0^\\circ$)."
  },
  "q47_min_magnetic_flux": {
    "keywords": ["when is magnetic flux zero", "minimum magnetic flux angle"],
    "response": "Magnetic flux is zero when the magnetic field lines are **parallel** to the surface area (or the angle $\\theta$ is $90^\\circ$)."
  },
  "q48_motion_of_charged_particle_in_B_field": {
    "keywords": ["motion of a charged particle in a magnetic field", "what happens to a charged particle in a magnetic field"],
    "response": "A charged particle moving in a uniform magnetic field experiences a force that is **perpendicular** to both its velocity and the magnetic field."
  },
  "q49_lorentz_force_formula": {
    "keywords": ["lorentz force formula", "force on a charged particle in a magnetic field"],
    "response": "The formula for the Lorentz force is **$\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})$**."
  },
  "q50_lorentz_force_mag_only": {
    "keywords": ["force on a charged particle in a magnetic field formula", "magnetic force formula"],
    "response": "The formula for the magnetic force on a charged particle is **$\\vec{F} = q(\\vec{v} \\times \\vec{B})$**."
  },
  "q51_circular_motion_B_field": {
    "keywords": ["why does a charged particle move in a circle in a magnetic field", "motion in a uniform magnetic field"],
    "response": "A charged particle moves in a circular path because the magnetic force is always **perpendicular to its velocity**, acting as a centripetal force."
  },
  "q52_no_force_on_charged_particle": {
    "keywords": ["when is there no force on a charged particle in a magnetic field", "condition for zero magnetic force"],
    "response": "There is no magnetic force on a charged particle if it is moving **parallel** or **anti-parallel** to the magnetic field lines."
  },
  "q53_radius_of_circular_path": {
    "keywords": ["radius of a charged particle in a magnetic field", "formula for radius in b-field"],
    "response": "The radius of the circular path is given by **$r = mv/qB$**."
  },
  "q54_velocity_selector_purpose": {
    "keywords": ["what is a velocity selector used for", "purpose of a velocity selector"],
    "response": "A **velocity selector** is a device that uses a combination of electric and magnetic fields to select charged particles with a specific velocity."
  },
  "q55_velocity_selector_condition": {
    "keywords": ["how does a velocity selector work", "condition for velocity selector"],
    "response": "In a velocity selector, the electric force and magnetic force on a particle are equal in magnitude and opposite in direction, so the net force is zero. This happens when **$E = vB$**."
  },
  "q56_electric_field_in_vs": {
    "keywords": ["electric field in velocity selector", "e field in velocity selector"],
    "response": "The electric field in a velocity selector is usually produced by two charged plates."
  },
  "q57_magnetic_field_in_vs": {
    "keywords": ["magnetic field in velocity selector", "b field in velocity selector"],
    "response": "The magnetic field in a velocity selector is typically produced by a permanent magnet."
  },
  "q58_velocity_selector_formula": {
    "keywords": ["velocity selector formula", "formula for velocity in a velocity selector","velocity selector"],
    "response": "The velocity of a selected particle is given by **$v = E/B$**."
  },
  "q59_electric_flux_def": {
    "keywords": ["what is electric flux", "define electric flux","electric flux"],
    "response": "**Electric flux** is a measure of the number of electric field lines passing through a given surface."
  },
  "q60_electric_flux_formula": {
    "keywords": ["electric flux formula", "what is the formula for electric flux"],
    "response": "The formula for electric flux is **$\\Phi_E = E \\cdot A \\cos \\theta$**."
  },
  "q61_electric_flux_unit": {
    "keywords": ["what is the si unit of electric flux", "unit of electric flux"],
    "response": "The SI unit of electric flux is the **Newton meter squared per Coulomb ($N \\cdot m^2/C$)**."
  },
  "q62_gauss_law_electric_flux": {
    "keywords": ["gauss's law for electric flux", "what is gauss's law","guass law"],
    "response": "**Gauss's law** states that the total electric flux out of any closed surface is proportional to the total electric charge enclosed within that surface."
  },
  "q63_max_electric_flux": {
    "keywords": ["when is electric flux maximum", "maximum electric flux angle"],
    "response": "Electric flux is maximum when the electric field lines are **perpendicular** to the surface area (or the angle $\\theta$ is $0^\\circ$). "
  },
  "q64_min_electric_flux": {
    "keywords": ["when is electric flux zero", "minimum electric flux angle"],
    "response": "Electric flux is zero when the electric field lines are **parallel** to the surface area (or the angle $\\theta$ is $90^\\circ$). "
  },
  "q65_work_done_magnetic_force": {
    "keywords": ["work done by magnetic force", "does magnetic force do work"],
    "response": "The magnetic force **does no work** on a charged particle, as it is always perpendicular to the direction of motion."
  },
  "q66_unit_of_magnetic_field_B": {
    "keywords": ["what is the unit of magnetic field b", "unit of b-field"],
    "response": "The unit of magnetic field (B) is the **Tesla (T)**."
  },
  "q67_unit_of_electric_field_E": {
    "keywords": ["what is the unit of electric field e", "unit of e-field"],
    "response": "The unit of electric field (E) is the **Newton per Coulomb (N/C)** or **Volt per meter (V/m)**."
  },
  "q68_force_on_current_carrying_wire": {
    "keywords": ["force on a current carrying wire in a magnetic field", "magnetic force on a wire"],
    "response": "The force on a current-carrying wire in a uniform magnetic field is given by **$\\vec{F} = I(\\vec{L} \\times \\vec{B})$**."
  },
  "q69_lorentz_force_definition": {
    "keywords": ["what is lorentz force", "define lorentz force"],
    "response": "The **Lorentz force** is the combined electric and magnetic force on a point charge due to electromagnetic fields."
  },
  "q70_velocity_of_light_relation": {
    "keywords": ["relation between e and b for light", "e over b velocity of light"],
    "response": "The ratio of the electric field to the magnetic field in an electromagnetic wave is equal to the speed of light: **$c = E/B$**."
  },
  "q71_newtons_first_law_example": {
    "keywords": ["example of newton's first law", "inertia example"],
    "response": "An example is a hockey puck sliding on ice. It will continue to slide at a constant velocity until it is stopped by friction or another force."
  },
  "q72_newtons_second_law_example": {
    "keywords": ["example of newton's second law", "f=ma example"],
    "response": "An example is pushing a shopping cart. The harder you push (more force), the faster it accelerates."
  },
  "q73_newtons_third_law_example": {
    "keywords": ["example of newton's third law", "action reaction example"],
    "response": "An example is a rocket. It pushes hot gas out (action), and the gas pushes the rocket forward (reaction)."
  },
  "q74_centripetal_force_in_b_field": {
    "keywords": ["what provides centripetal force in a magnetic field", "source of centripetal force in a magnetic field"],
    "response": "The magnetic force itself provides the **centripetal force** that keeps a charged particle in a circular path."
  },
  "q75_circular_path_speed": {
    "keywords": ["does speed change in a magnetic field", "is speed constant in a magnetic field"],
    "response": "No, the speed of a charged particle in a magnetic field **remains constant** because the magnetic force is always perpendicular to its velocity and does no work."
  },
  "q76_helical_path_B_field": {
    "keywords": ["what is a helical path in a magnetic field", "helical motion of a charged particle"],
    "response": "A charged particle follows a **helical path** if its velocity has a component parallel to the magnetic field."
  },
  "q77_mass_spectrometer": {
    "keywords": ["what is a mass spectrometer", "mass spectrometer purpose"],
    "response": "A **mass spectrometer** is a device that separates charged particles based on their mass-to-charge ratio."
  },
  "q78_mass_spectrometer_components": {
    "keywords": ["components of a mass spectrometer", "what parts are in a mass spectrometer"],
    "response": "A mass spectrometer has a **velocity selector**, a deflector, and a detector."
  },
  "q79_mass_spec_formula": {
    "keywords": ["mass spectrometer formula", "formula for mass to charge ratio"],
    "response": "The mass-to-charge ratio is given by **$m/q = (rB^2)/E$**."
  },
  "q80_gravitational_constant_value": {
    "keywords": ["gravitational constant value", "what is the value of g"],
    "response": "The gravitational constant, **G**, is approximately **$6.67 \\times 10^{-11} \\text{ N} \\cdot \\text{m}^2/\\text{kg}^2$**."
  },
  "q81_vector_product_def": {
    "keywords": ["what is a vector product", "define vector product"],
    "response": "A **vector product** (or cross product) of two vectors results in a new vector that is perpendicular to both original vectors."
  },
  "q82_scalar_product_def": {
    "keywords": ["what is a scalar product", "define scalar product"],
    "response": "A **scalar product** (or dot product) of two vectors results in a scalar (a number)."
  },
  "q83_si_unit_of_momentum": {
    "keywords": ["si unit of momentum", "what is momentum measured in"],
    "response": "The SI unit of momentum is the **kilogram-meter per second ($kg \\cdot m/s$)**."
  },
  "q84_si_unit_of_impulse": {
    "keywords": ["si unit of impulse", "what is impulse measured in"],
    "response": "The SI unit of impulse is the **Newton-second ($N \\cdot s$)**."
  },
  "q85_impulse_momentum_theorem": {
    "keywords": ["impulse momentum theorem", "what is the impulse momentum theorem"],
    "response": "The **impulse-momentum theorem** states that the change in momentum of an object is equal to the impulse applied to it."
  },
  "q86_newton_and_dyne": {
    "keywords": ["newton to dyne", "what is the relationship between newton and dyne"],
    "response": "One Newton is equal to **$10^5$ dynes**."
  },
  "q87_joule_and_erg": {
    "keywords": ["joule to erg", "what is the relationship between joule and erg"],
    "response": "One Joule is equal to **$10^7$ ergs**."
  },
  "q88_horsepower_watt": {
    "keywords": ["horsepower to watt", "what is the relationship between horsepower and watt"],
    "response": "One horsepower (hp) is approximately equal to **746 Watts (W)**."
  },
  "q89_electric_field_lines_def": {
    "keywords": ["what are electric field lines", "define electric field lines"],
    "response": "**Electric field lines** are a way to visualize an electric field. The lines point in the direction of the electric force on a positive charge."
  },
  "q90_magnetic_field_lines_def": {
    "keywords": ["what are magnetic field lines", "define magnetic field lines"],
    "response": "**Magnetic field lines** are a way to visualize a magnetic field. The lines always point from the North pole to the South pole."
  },
  "q91_magnetic_poles_repel": {
    "keywords": ["do same magnetic poles repel", "do north poles repel"],
    "response": "Yes, like magnetic poles (North-North or South-South) **repel** each other."
  },
  "q92_magnetic_poles_attract": {
    "keywords": ["do opposite magnetic poles attract", "do north and south poles attract"],
    "response": "Yes, unlike magnetic poles (North-South) **attract** each other."
  },
  "q93_magnetic_monopole": {
    "keywords": ["do magnetic monopoles exist", "magnetic monopole discovery"],
    "response": "According to current physics, magnetic monopoles **do not exist**."
  },
  "q94_motion_in_uniform_e_field": {
    "keywords": ["motion of charged particle in a uniform electric field", "what is the motion of a charged particle in an e field"],
    "response": "A charged particle in a uniform electric field undergoes **uniform acceleration** in the direction of the force."
  },
  "q95_motion_in_uniform_e_and_b_fields": {
    "keywords": ["motion of a charged particle in a uniform electric and magnetic field", "what happens in combined e and b fields"],
    "response": "The particle's motion depends on its initial velocity. It can be a straight line (in a velocity selector) or a complex helical path."
  },
  "q96_conservation_of_momentum": {
    "keywords": ["conservation of momentum", "what is the law of conservation of momentum"],
    "response": "The **law of conservation of momentum** states that the total momentum of a closed system remains constant."
  },
  "q97_isolated_system_def": {
    "keywords": ["what is an isolated system", "define isolated system"],
    "response": "An **isolated system** is a system on which no external forces act."
  },
  "q98_centripetal_acceleration_formula": {
    "keywords": ["centripetal acceleration formula", "what is the formula for centripetal acceleration"],
    "response": "The formula for centripetal acceleration is **$a_c = v^2/r$**."
  },
  "q99_centrifugal_force": {
    "keywords": ["what is centrifugal force", "define centrifugal force"],
    "response": "**Centrifugal force** is an apparent force that appears to push an object away from the center of a circular path."
  },
  "q100_centripetal_vs_centrifugal":{
    "keywords": ["centripetal vs centrifugal force", "difference between centripetal and centrifugal"],
    "response": "A **centripetal** force is a real force directed towards the center, while a **centrifugal** force is a fictitious force directed away from the center."
  },
  
  "q101_centripetal_vs_centrifugal":{
    "keywords": ["Who is Abdullah Bilal", "who is abdullah bilal","tell me about Abdullah bilal", "information about Abdullah bilal","abdullah bilal"],
    "response": "Abdullah Bilal is Abdul Azeem's best friend. He is a loyal and trustworthy friend who shares many interests with Abdul Azeem, such as . Abdullah is known for his  and has always been a great source of support for Abdul Azeem."
  }, 
   "q102_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Abdullah", "who is sir abdullah","tell me about sir abdullah", "information about sir abdullah","abdullah"],
    "response": "Sir Abdullah is a physics teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive, which makes complex physics concepts easier to understand. He is particularly skilled at explaining topics magnetic fields or Newton's laws."
  }, 
    "q112":{
    "keywords": ["Who is  Sir Mubashir", "who is sir mubashir","tell me about sir mubashir", "information about sir mubashir","mubashir"],
    "response": "Sir Mubashir is a English teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  },
  "q103_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Akram", "who is sir akram","tell me about sir akram", "information about sir akram","akram"],
    "response": "Sir Akram is a Mathematics teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  }, 
   "q105_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Bilal", "who is sir bilal","tell me about sir bilal", "information about sir bilal","bilal"],
    "response": "Sir Bilal is a Computer teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  },
  "q18886_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Tanveer", "who is sir tanveer","tell me about sir tanveer", "information about sir tanveer","tanveer"],
    "response": "Sir Tanveer is a Urdu teacher at Informatics College Pansira Campus. He is highly regarded by his students, including Abdul Azeem. His teaching style is known for being  very clear and concise, interactive and engaging, or patient and supportive"
  }, 
    "64iu8_":{
    "keywords": ["Who is  Sir Faisal", "who is sir faisal","tell me about sir faisal", "information about sir faisal","faisal randhawa","Faisal Randhawa","Faisal randhawa","faisal"],
    "response": " Sir Faisal Randhawa is the principal of Informatics College Pansira Campus. He is a respected figure in the educational community, known for his  visionary leadership, or dedication to student success. His commitment to improving academic standards or promoting extracurricular activities has had a positive impact on the college and its students."
  }, 
    "q10459_centripetal_vs_centrifugal":{
    "keywords": ["Who is  Sir Nadeem", "who is sir nadeem","tell me about sir nadeem", "information about sir nadeem","nadeem zafar","Nadeem Zafar","Nadeem zafar"],
    "response": " Sir Nadeem is the principal of Eden Lyceum Group of Schools, and he is also Abdul Azeem's teacher. He is a highly respected educator and leader who is known for his dedication to his students and his school. He is a source of guidance and inspiration for Abdul Azeem."
  }, 

   "q1055_centripetal_vs_centrifugal":{
    "keywords": ["who is you founder", "who is your founder","tell me about your founder", "information about your founder","founder"],
    "response": "Mian Abdul Azeem Is My Founder And Creator.Rana Abdullah Bilal is My Co-Founder and Co-Creator"
  },  
  

   "q1088/98_centripetal_vs_centrifugal":{
    "keywords": ["hello", "hi", "hey", "hey there", "hi there", "hello there","hm","fantastic","good","great","nice","awesome","well","fine","cool","amazing","superb","wonderful","excellent","brilliant","nice to meet you","pleased to meet you","how are you","how are you doing","how's it going","how have you been","how's your day","how's your day going","how's your day been","how's everything","how's life","what's up","what's new","what's going on","what's happening","long time no see","it's been a while","it's good to see you","glad to see you","happy to see you"],
    "response": "I am a large language model, trained by Mian Abdul Azeem."
  },



}; // Close the knowledgeBase object

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = userInput.value.trim();
  if (!prompt && !imageBase64) return;

  // Immediately append the user's message to the chat history
  appendMessage("user", prompt, imageBase64 ? imagePreview.src : null);

  const lowerCasePrompt = prompt.toLowerCase();
  let foundResponse = null;

  // Check against the local knowledge base first for a quick response
  for (const topic in knowledgeBase) {
    const data = knowledgeBase[topic];
    if (data.keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
      foundResponse = data.response;
      break; // Exit the loop once a match is found
    }
  }

  if (foundResponse) {
    // If a local response is found, display it and stop.
    appendMessage("ai", foundResponse);
  } else {
    // If no local response, show loading and call the Gemini API
    const loadingIndicator = showLoading();
    // Add a more conversational "thinking" message before the API call
    appendMessage("ai", "Hmm, that's an interesting question. Let me think about that for a second...");
    
    const contents = [];
    if (prompt) {
      contents.push({ parts: [{ text: prompt }] });
    }
    if (imageBase64) {
      contents.push({
        parts: [{ inlineData: { mimeType: "image/png", data: imageBase64 } }],
      });
    }

    const payload = {
      contents: contents,
      tools: [{ google_search: {} }],
    };

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };

    let aiResponseText = "Sorry, I'm unable to process that request at this time. Please try again later.";
    
    try {
      const response = await fetch(TEXT_API_URL + apiKey, requestOptions);
      if (!response.ok) {
        // Provide a more specific error message based on the status code
        aiResponseText = `Error: API call failed with status ${response.status}.`;
        throw new Error(aiResponseText);
      }
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        aiResponseText = result.candidates[0].content.parts[0].text;
      } else {
        console.error("Invalid API response format:", result);
      }
    } catch (error) {
      console.error("API call failed:", error);
    } finally {
      loadingIndicator.remove();
      appendMessage("ai", aiResponseText);
    }
  }

  // Clear input fields after submission
  userInput.value = "";
  imagePreviewContainer.style.display = "none";
  imagePreview.src = "#";
  fileInput.value = null;
  imageBase64 = null;
});

startBtn.addEventListener("click", () => {
  welcomeScreen.classList.add("hidden");
  chatContainer.classList.add("visible");
  const welcomeMessage = "Welcome Abdul Azeem. Hope you are having a good day. How can I assist you Today?";
  appendMessage("ai", welcomeMessage);
  if (prefetchedAudioUrl) {
    const audio = new Audio(prefetchedAudioUrl);
    audio.play();
  }
});

// THREE.js Animation
let scene, camera, renderer, particles, geometry, material;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

function init3D() {
  const container = document.getElementById("bg-canvas");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const particleCount = 2000;
  const size = 100;
  const color = new THREE.Color();
  for (let i = 0; i < particleCount; i++) {
    const x = THREE.MathUtils.randFloatSpread(size);
    const y = THREE.MathUtils.randFloatSpread(size);
    const z = THREE.MathUtils.randFloatSpread(size);
    vertices.push(x, y, z);
    color.setHSL(0.6 + 0.1 * (i / particleCount), 0.7, 0.7);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  material = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.7 });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
  document.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("resize", onWindowResize, false);
}
function onMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
  requestAnimationFrame(animate);
  particles.rotation.x += 0.0005;
  particles.rotation.y += 0.001;
  camera.position.x += (mouseX / 1000 - camera.position.x) * 0.05;
  camera.position.y += (-mouseY / 1000 - camera.position.y) * 0.05;
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
window.onload = function () {
  init3D();
  animate();
  prefetchWelcomeAudio();

};


