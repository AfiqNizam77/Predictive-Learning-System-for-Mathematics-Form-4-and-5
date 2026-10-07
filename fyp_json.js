
let usersDB = {}; 
let currentUser = null; 

let currentQuestion = {};
let timerInterval;
let timeLeft = 0;
let timeTaken = 0;
let currentChatbotUses = 0;
let currentChatbotLogs = []; 
let isQuizActive = false;

const questionBank = {
  Low: {
    topic: "Basic Probability",
    text: "A bag contains 3 red marbles and 7 blue marbles. What is the probability of picking a red marble?",
    options: ["3/10", "1/3", "7/10", "3/7"],
    answer: "3/10",
    timeLimit: 120, 
    hint: "Think about the number of red marbles divided by the TOTAL number of marbles."
  },
  Moderate: {
    topic: "Graph Theory",
    text: "If a simple graph has 5 vertices and each vertex has a degree of 2, how many edges does the graph have?",
    options: ["5", "10", "2", "2.5"],
    answer: "5",
    timeLimit: 90, 
    hint: "Use the Handshaking Lemma: The sum of degrees equals twice the number of edges."
  },
  High: {
    topic: "Advanced Combinatorics",
    text: "In how many ways can a committee of 3 students be chosen from a group of 8 students?",
    options: ["336", "56", "24", "512"],
    answer: "56",
    timeLimit: 60, 
    hint: "Since order doesn't matter, use the combination formula: nCr = n! / (r!(n-r)!)."
  }
};

function switchAuthView(view) {
  document.getElementById('loginUsername').value = "";
  document.getElementById('loginPassword').value = "";
  if (view === 'login') { switchView('page-login'); } else { switchView('page-register'); }
}

function registerUser() {
  const username = document.getElementById('regUsername').value.trim();
  const pass = document.getElementById('regPassword').value;
  const name = document.getElementById('regName').value;
  const sex = document.getElementById('regSex').value; 
  const age = parseInt(document.getElementById('regAge').value); 
  const score = parseInt(document.getElementById('regScore').value);
  const homework = document.getElementById('regHomework').value;
  const attendance = parseInt(document.getElementById('regAttendance').value);
  const motivation = document.getElementById('regMotivation').value;

  if (!username || !pass || !name || !sex || isNaN(age) || isNaN(score) || !homework || isNaN(attendance) || !motivation) {
    alert("Please fill in all registration fields.");
    return;
  }

  
  if (score < 0 || score > 100) {
    alert("Invalid input: Exam score must be between 0 and 100.");
    return;
  }
  if (attendance < 0 || attendance > 100) {
    alert("Invalid input: Attendance must be between 0 and 100.");
    return;
  }

  if (usersDB[username]) {
    alert("Username already exists. Please choose another or log in.");
    return;
  }

  let profLevel = "Moderate";
  if (score > 80 && motivation === "high") profLevel = "High";
  else if (score < 50 || motivation === "low") profLevel = "Low";

  usersDB[username] = {
    username: username, password: pass, name: name, sex: sex, age: age, profLevel: profLevel,
    analytics: { questionsAnswered: 0, totalScore: 0, totalChatbotUses: 0, history: [] }
  };

  alert("Registration successful! Redirecting to Dashboard");
  currentUser = usersDB[username];
  document.getElementById('authNav').classList.remove('hidden');
  populateDashboard();
  switchView('page-dashboard');
}

function loginUser() {
  const username = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value;

  if (!username || !pass) { alert("Please enter both username and password."); return; }

  const user = usersDB[username];
  if (user && user.password === pass) {
    currentUser = user;
    document.getElementById('authNav').classList.remove('hidden');
    populateDashboard();
    switchView('page-dashboard');
  } else {
    alert("Invalid credentials. Access denied.");
  }
}

function logoutUser() {
  if (isQuizActive) {
    if (!confirm("You are in the middle of a question. Leaving now will lose progress. Confirm logout?")) return;
    clearInterval(timerInterval);
    isQuizActive = false;
  }
  currentUser = null;
  document.getElementById('authNav').classList.add('hidden');
  document.getElementById('loginUsername').value = "";
  document.getElementById('loginPassword').value = "";
  switchView('page-login');
}

function navTo(page) {
  if (isQuizActive) {
    if (!confirm("Quiz in progress. Leaving will lose current data. Confirm exit?")) return;
    clearInterval(timerInterval);
    isQuizActive = false;
  }
  if (!currentUser) { alert("Please log in first."); switchView('page-login'); return; }
  if (page === 'home') goToDashboard();
  else if (page === 'performance') viewAnalytics();
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populateDashboard() {
  document.getElementById('welcomeMessage').innerText = `Welcome, ${currentUser.name}`;
  document.getElementById('tagSex').innerText = `Gender: ${currentUser.sex}`;
  document.getElementById('tagAge').innerText = `Age: ${currentUser.age} YRS`;
  document.getElementById('focusTopicDisplay').innerText = questionBank[currentUser.profLevel].topic;
  
  const aiCard = document.getElementById('aiAnalysisCard');
  document.getElementById('profLevelDisplay').innerText = `Tier: ${currentUser.profLevel}`;
  aiCard.className = 'ai-analysis-card glass-panel';
  
  if (currentUser.profLevel === 'Low') aiCard.classList.add('level-low');
  else if (currentUser.profLevel === 'Moderate') aiCard.classList.add('level-moderate');
  else if (currentUser.profLevel === 'High') aiCard.classList.add('level-high');
}

function goToDashboard() {
  isQuizActive = false;
  document.getElementById('resultModal').classList.add('hidden');
  document.getElementById('timeoutModal').classList.add('hidden');
  populateDashboard(); 
  switchView('page-dashboard');
}

function nextQuestion() {
  document.getElementById('resultModal').classList.add('hidden');
  document.getElementById('timeoutModal').classList.add('hidden');
  startQuiz();
}

function startQuiz() {
  if (!currentUser) return;
  isQuizActive = true;
  currentChatbotUses = 0;
  currentChatbotLogs = []; 
  timeTaken = 0; 
  
  document.getElementById('chatLog').innerHTML = `<div class="chat-message ai-message">System Online. I am your AI Tutor. Ask for hints, but note: each use deducts marks!</div>`;
  currentQuestion = questionBank[currentUser.profLevel];
  timeLeft = currentQuestion.timeLimit;
  
  document.getElementById('questionTopic').innerText = currentQuestion.topic;
  document.getElementById('questionText').innerText = currentQuestion.text;
  
  const optionsDiv = document.getElementById('optionsContainer');
  optionsDiv.innerHTML = "";
  currentQuestion.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(opt);
    optionsDiv.appendChild(btn);
  });
  switchView('page-quiz');
  startTimer();
}

function startTimer() {
  document.getElementById('timerDisplay').innerHTML = `${timeLeft}`;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeTaken++; 
    document.getElementById('timerDisplay').innerHTML = `${timeLeft}`;
    if (timeLeft <= 0) { clearInterval(timerInterval); handleTimeout(); }
  }, 1000);
}

function checkAnswer(selectedOption) {
  isQuizActive = false;
  clearInterval(timerInterval);
  const isCorrect = selectedOption === currentQuestion.answer;
  
  let score = isCorrect ? 100 : 0;
  let deduction = currentChatbotUses * 15;
  let finalScore = Math.max(0, score - deduction);

  currentUser.analytics.questionsAnswered++;
  currentUser.analytics.totalScore += finalScore;
  currentUser.analytics.totalChatbotUses += currentChatbotUses;
  currentUser.analytics.history.push({
    topic: currentQuestion.topic, score: finalScore, isCorrect: isCorrect, timeTaken: timeTaken, deduction: deduction, chatbotLogs: currentChatbotLogs
  });

  let analysisText = "";
  if (isCorrect && currentChatbotUses === 0) {
    analysisText = "Correct Answer! Moving on to the next difficulty.";
    if (currentUser.profLevel === "Low") currentUser.profLevel = "Moderate";
    else if (currentUser.profLevel === "Moderate") currentUser.profLevel = "High";
  } else if (!isCorrect) {
    analysisText = "Incorrect Answer. Adjusting difficulty to reinforce fundamental concepts.";
    if (currentUser.profLevel === "High") currentUser.profLevel = "Moderate";
    else if (currentUser.profLevel === "Moderate") currentUser.profLevel = "Low";
  } else {
    analysisText = "Correct Answer! but AI dependency detected. Try to solve it on your own next time.";
  }

  document.getElementById('resultTitle').innerText = isCorrect ? "CORRECT ANSWER!" : "INCORRECT";
  document.getElementById('resultTitle').style.color = isCorrect ? "var(--success)" : "var(--danger)";
  document.getElementById('resultScore').innerText = finalScore;
  document.getElementById('resultDeductions').innerText = deduction;
  document.getElementById('resultTime').innerText = timeTaken;
  document.getElementById('resultChat Uses').innerText = currentChatbotUses;
  document.getElementById('resultAnalysis').innerText = analysisText;
  document.getElementById('resultModal').classList.remove('hidden');
}

function handleTimeout() {
  isQuizActive = false;
  currentUser.analytics.questionsAnswered++;
  currentUser.analytics.totalChatbotUses += currentChatbotUses;
  currentUser.analytics.history.push({ 
    topic: currentQuestion.topic, score: 0, isCorrect: false, timeTaken: currentQuestion.timeLimit, deduction: currentChatbotUses * 15, chatbotLogs: currentChatbotLogs
  });
  
  if (currentUser.profLevel === "High") currentUser.profLevel = "Moderate";
  else if (currentUser.profLevel === "Moderate") currentUser.profLevel = "Low";

  document.getElementById('timeoutHint').innerText = currentQuestion.hint;
  document.getElementById('timeoutModal').classList.remove('hidden');
}

function viewAnalytics() {
  if (!currentUser) return;
  const stats = currentUser.analytics;

  document.getElementById('statTotalQ').innerText = stats.questionsAnswered;
  let avg = stats.questionsAnswered === 0 ? 0 : Math.round(stats.totalScore / stats.questionsAnswered);
  document.getElementById('statAvgScore').innerText = `${avg}%`;
  document.getElementById('statChatbotUses').innerText = stats.totalChatbotUses;

  const historyList = document.getElementById('historyList');
  const chartBox = document.getElementById('performanceChartBox');
  const chartBars = document.getElementById('chartBars');
  const scoreChartBox = document.getElementById('scoreChartBox');
  const scoreChartBars = document.getElementById('scoreChartBars');
  
  historyList.innerHTML = ""; chartBars.innerHTML = ""; scoreChartBars.innerHTML = "";

  if (stats.history.length === 0) {
    historyList.innerHTML = "<li style='justify-content: center; color: #718096;'>No data matrices available. Complete a mission first.</li>";
    chartBox.style.display = "none"; scoreChartBox.style.display = "none";
  } else {
    chartBox.style.display = "block"; scoreChartBox.style.display = "block";
    
    let maxTime = Math.max(...stats.history.map(item => item.timeTaken));
    if (maxTime < 10) maxTime = 10; 
    let maxChat = Math.max(...stats.history.map(item => item.chatbotLogs.length));
    if (maxChat < 3) maxChat = 3; 

    stats.history.forEach((item, index) => {
      const li = document.createElement('li');
      let chatbotInfo = "";
      if (item.chatbotLogs && item.chatbotLogs.length > 0) {
        chatbotInfo = `<div style="font-size: 13.5px; margin-top: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 12px; border-radius: 8px; width: 100%; box-sizing: border-box;">
          <strong style="color: #b45309;">AI Interventions: ${item.chatbotLogs.length}</strong> <span style="color: var(--danger);">(Penalty: -${item.deduction} pts)</span><br>
          <span style="font-size: 12px; color: #78350f; font-family: monospace;">Timeline (seconds): [${item.chatbotLogs.join(", ")}]</span>
        </div>`;
      } else {
        chatbotInfo = `<div style="font-size: 13px; color: var(--success); margin-top: 8px; font-weight: 700;">+ Pure Skills without any help (0 Penalties)</div>`;
      }

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <span style="font-weight: 800; font-size: 1.1rem; color: var(--primary-dark);">M-${index + 1}: <span style="font-weight: 600; color: #475569;">${item.topic}</span></span> 
          <span style="font-size: 1.2rem;">Score: <strong style="color: ${item.isCorrect ? 'var(--success)' : 'var(--danger)'}">${item.score}%</strong> ${item.isCorrect ? '[PASS]' : '[FAIL]'}</span>
        </div>
        ${chatbotInfo}
      `;
      historyList.appendChild(li);

      // Graph 1: Time
      const barHeightPercentage = Math.max((item.timeTaken / maxTime) * 100, 5); 
      const barWrapper = document.createElement('div');
      barWrapper.className = 'bar-wrapper';
      const bar = document.createElement('div');
      bar.className = `bar ${item.isCorrect ? 'correct' : 'incorrect'}`;
      bar.style.height = `${barHeightPercentage}%`;
      bar.innerText = `${item.timeTaken}s`; 
      const barLabel = document.createElement('div');
      barLabel.className = 'bar-label';
      barLabel.innerText = `Q${index + 1}`;
      barWrapper.appendChild(bar); barWrapper.appendChild(barLabel); chartBars.appendChild(barWrapper);
      
      // Graph 2: Dual Bar (Score & Chatbot)
      const dualWrapper = document.createElement('div');
      dualWrapper.className = 'dual-bar-wrapper';
      const group = document.createElement('div');
      group.className = 'bars-group';
      
      const scoreBar = document.createElement('div');
      scoreBar.className = 'bar-score';
      scoreBar.style.height = `${Math.max(item.score, 5)}%`;
      scoreBar.innerText = item.score;

      const chatBar = document.createElement('div');
      chatBar.className = 'bar-chat';
      chatBar.style.height = `${item.chatbotLogs.length === 0 ? 5 : Math.max((item.chatbotLogs.length / maxChat) * 100, 5)}%`;
      chatBar.innerText = item.chatbotLogs.length;

      const dualLabel = document.createElement('div');
      dualLabel.className = 'bar-label';
      dualLabel.innerText = `Q${index + 1}`;

      group.appendChild(scoreBar); group.appendChild(chatBar);
      dualWrapper.appendChild(group); dualWrapper.appendChild(dualLabel);
      scoreChartBars.appendChild(dualWrapper);
    });
  }
  switchView('page-analytics');
}

function handleChatKeyPress(event) { if (event.key === 'Enter') sendMessage(); }

function sendMessage() {
  const inputField = document.getElementById('chatInput');
  const message = inputField.value.trim();
  if (message === '') return; 
  appendMessage(message, 'user-message');
  inputField.value = ''; 
  setTimeout(() => { generateAIResponse(message.toLowerCase()); }, 600);
}

function generateAIResponse(userText) {
  currentChatbotUses++;
  const timestamp = timeTaken + "s";
  currentChatbotLogs.push(timestamp);
  
  let aiResponse = "";
  const stopWords = ['answer', 'solution', 'what is it', 'tell me', 'cheat', currentQuestion.answer.toLowerCase()];
  const isAskingForAnswer = stopWords.some(word => userText.includes(word));

  if (isAskingForAnswer) {
    aiResponse = "I can't give you the answer but I can give you a hint : " + currentQuestion.hint;
  } else if (userText.includes('formula') || userText.includes('equation')) {
    aiResponse = `Analyzing equations for ${currentQuestion.topic}... ${currentQuestion.hint}`;
  } else if (userText.includes('stuck') || userText.includes('help') || userText.includes('how')) {
    aiResponse = `Initiating step-by-step breakdown. ${currentQuestion.hint}`;
  } else {
    aiResponse = `${currentQuestion.hint} How does that apply to the current dataset?`;
  }
  appendMessage(aiResponse, 'ai-message');
}

function appendMessage(text, className) {
  const chatLog = document.getElementById('chatLog');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${className}`;
  msgDiv.innerText = text;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight; 
}

function toggleChatbot() {
  document.getElementById('chatbotSidebar').classList.toggle('collapsed');
}

window.onload = () => { switchAuthView('login'); };