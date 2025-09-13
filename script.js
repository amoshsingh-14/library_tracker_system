// Elements
const currentTimeEl = document.getElementById("current-time");
const checkInBtn = document.getElementById("checkInBtn");
const checkOutBtn = document.getElementById("checkOutBtn");
const currentStatusEl = document.getElementById("currentStatus");
const timerDisplay = document.getElementById("timerDisplay");
const sessionsList = document.getElementById("sessionsList");
const exportBtn = document.getElementById("exportBtn");

const todayStudyEl = document.getElementById("todayStudy");
const weekStudyEl = document.getElementById("weekStudy");
const totalStudyEl = document.getElementById("totalStudy");
const goalProgressEl = document.getElementById("goalProgress");
const goalBarEl = document.getElementById("goalBar");

let currentSession = null;
let allSessions = [];
let timerInterval = null;

const STORAGE_KEY = "libraryStudySessions";
const STORAGE_CURRENT_SESSION_KEY = "libraryCurrentSession";
const DAILY_GOAL_SECONDS = 4 * 3600;

// Init
init();
function init() {
  loadData();
  updateClock();
  setInterval(updateClock, 1000);
  updateUI();
  checkInBtn.onclick = checkIn;
  checkOutBtn.onclick = checkOut;
  exportBtn.onclick = exportData;
}

// Clock
function updateClock() {
  const now = new Date();
  currentTimeEl.textContent = now.toLocaleString();
}

// Data handling
function loadData() {
  const sessionsJson = localStorage.getItem(STORAGE_KEY);
  if (sessionsJson) {
    allSessions = JSON.parse(sessionsJson).map(s => ({
      ...s,
      entryTime: new Date(s.entryTime),
      exitTime: s.exitTime ? new Date(s.exitTime) : null,
    }));
  }
  const currentJson = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
  if (currentJson) {
    const cs = JSON.parse(currentJson);
    currentSession = { id: cs.id, entryTime: new Date(cs.entryTime) };
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
  if (currentSession) {
    localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(currentSession));
  } else {
    localStorage.removeItem(STORAGE_CURRENT_SESSION_KEY);
  }
}

// Session
function checkIn() {
  if (currentSession) return showNotification("Already active!", "error");
  const now = new Date();
  currentSession = { id: "session-" + now.getTime(), entryTime: now };
  saveData();
  showNotification("Session started! 🎯", "success");
  updateUI();
}
function checkOut() {
  if (!currentSession) return showNotification("No active session!", "error");
  const now = new Date();
  const duration = Math.floor((now - currentSession.entryTime) / 1000);
  if (duration <= 0) return showNotification("Too short!", "error");
  allSessions.push({ id: currentSession.id, entryTime: currentSession.entryTime, exitTime: now, durationSeconds: duration });
  currentSession = null;
  saveData();
  showNotification(`Session saved (${formatDuration(duration)}) 📚`, "success");
  updateUI();
}
function deleteSession(id) {
  if (!confirm("Delete this session?")) return;
  allSessions = allSessions.filter(s => s.id !== id);
  saveData();
  updateUI();
  showNotification("Session deleted.", "info");
}

// UI
function updateUI() {
  updateCurrentSessionDisplay();
  renderSessions();
  updateStatistics();
}
function updateCurrentSessionDisplay() {
  if (currentSession) {
    currentStatusEl.innerHTML = `<div class="text-center"><p class="text-green-600 font-semibold">Session Active</p><p class="text-sm text-gray-600">Started: ${currentSession.entryTime.toLocaleString()}</p></div>`;
    checkInBtn.disabled = true; checkOutBtn.disabled = false;
    startTimer();
  } else {
    currentStatusEl.innerHTML = "<p class='text-gray-600'>No active session</p>";
    checkInBtn.disabled = false; checkOutBtn.disabled = true;
    stopTimer(); timerDisplay.textContent = "00:00:00";
  }
}
function renderSessions() {
  sessionsList.innerHTML = "";
  if (allSessions.length === 0) {
    sessionsList.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">No sessions yet.</td></tr>`;
    return;
  }
  [...allSessions].sort((a,b)=>b.entryTime-a.entryTime).forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.entryTime.toLocaleDateString()}</td>
      <td>${s.entryTime.toLocaleTimeString()}</td>
      <td>${s.exitTime? s.exitTime.toLocaleTimeString() : "In Progress"}</td>
      <td>${formatDuration(s.durationSeconds)}</td>
      <td><button class="text-red-500" onclick="deleteSession('${s.id}')"><i class="fas fa-trash"></i></button></td>
    `;
    sessionsList.appendChild(tr);
  });
}
function updateStatistics() {
  const today = new Date().toDateString();
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  let todaySecs=0, weekSecs=0, totalSecs=0;
  allSessions.forEach(s=>{
    if(!s.durationSeconds) return;
    totalSecs+=s.durationSeconds;
    if(s.entryTime.toDateString()===today) todaySecs+=s.durationSeconds;
    if(s.entryTime>=startOfWeek) weekSecs+=s.durationSeconds;
  });
  todayStudyEl.textContent=formatDuration(todaySecs);
  weekStudyEl.textContent=formatDuration(weekSecs);
  totalStudyEl.textContent=formatDuration(totalSecs);
  const progress=Math.min(100,Math.floor(todaySecs/DAILY_GOAL_SECONDS*100));
  goalProgressEl.textContent=progress+"%";
  goalBarEl.style.width=progress+"%";
}

// Timer
function startTimer(){ stopTimer(); timerInterval=setInterval(()=>{const now=new Date(); const sec=Math.floor((now-currentSession.entryTime)/1000); timerDisplay.textContent=formatDuration(sec);},1000);}
function stopTimer(){ if(timerInterval) clearInterval(timerInterval); }

// Helpers
function formatDuration(sec){ if(!sec) return "0h 0m"; const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60; return `${h}h ${m}m ${s? s+"s":""}`;}
function exportData(){ if(allSessions.length===0) return showNotification("No data to export","error"); let csv="Date,Entry,Exit,Duration\n"; allSessions.forEach(s=>{csv+=`${s.entryTime.toLocaleDateString()},${s.entryTime.toLocaleTimeString()},${s.exitTime?s.exitTime.toLocaleTimeString():""},${formatDuration(s.durationSeconds)}\n`;}); const blob=new Blob([csv],{type:"text/csv"}); const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="study_sessions.csv"; link.click();}
function showNotification(msg,type){const c=document.getElementById("notificationContainer"); const n=document.createElement("div"); n.className=`notification ${type}`; n.textContent=msg; c.appendChild(n); setTimeout(()=>n.classList.add("show"),50); setTimeout(()=>{n.classList.remove("show"); setTimeout(()=>n.remove(),300);},3000);}
