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
  const welcomeMessage = "Welcome Hope you are having a good day. How can I Asist you today?";
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
  if (role === "ai" && text !== "Welcome Hope you are having a good day. How can I Asist you today?" && !text.startsWith("Hmm, that's an interesting question.")) {
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
    "keywords": ["hello","hey there", "hi there", "hello there"],
    "response": "I am a large language model, trained by Mian Abdul Azeem."
  },  
  
  "q166597/98":{
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
  const welcomeMessage = "Welcome Hope you are having a good day. How can I Asist you today?";
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




