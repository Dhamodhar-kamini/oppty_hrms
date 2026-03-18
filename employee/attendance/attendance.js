document.addEventListener("DOMContentLoaded", () => {
    const emp_id = localStorage.getItem('employee_id');
    
    // --- ENSURE THIS POINTS TO YOUR LIVE BACKEND ---
    const API_BASE_URL = "http://127.0.0.1:8000";

    // 1. CONFIGURATION & STATE
    fetch(`${API_BASE_URL}/api/employee/dashboard/${emp_id}/`)
        .then(res => res.json())
        .then(data => {
            document.querySelectorAll("#pname").forEach(el => el.innerText = data.name || "Employee");
            document.querySelectorAll("#role").forEach(el => el.innerText = data.role || "Employee");
            document.querySelectorAll("#employee_id").forEach(el => el.innerText = data.employee_id || emp_id);
        }).catch(err => console.error("Profile Fetch Error:", err));

    const SHIFT_START_HR = 10; 
    const SHIFT_END_HR = 19;   
    const TOTAL_HOURS = SHIFT_END_HR - SHIFT_START_HR; 
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const STORAGE_KEY_HISTORY = "att_history_log";
    const TIMELINE_KEY = `timeline_${emp_id}_${todayStr}`;
    const DAILY_LOGS_KEY = `daily_logs_${emp_id}_${todayStr}`;
    const BREAK_LOGS_KEY = `break_logs_${emp_id}_${todayStr}`;
    const USAGE_KEY = `break_usage_${emp_id}_${todayStr}`;

    let workTimerInterval = null;
    let breakTimerInterval = null;
    let workStartTime = null;
    let breakStartTime = null;
    let punchInTimeStr = null;
    let totalWorkMs = 0;
    let baselineWeeklyMs = 0;
    let baselineMonthlyMs = 0;

    const LIMITS = { lunch: 45 * 60, normal: 15 * 60 };

    // Initialize from LocalStorage (Fast UI Load)
    let usage = JSON.parse(localStorage.getItem(USAGE_KEY));
    if (!usage || typeof usage !== 'object') usage = { lunch: 0, normal: 0 };
    usage.lunch = parseInt(usage.lunch) || 0;
    usage.normal = parseInt(usage.normal) || 0;
    
    let totalBreakMs = (usage.lunch + usage.normal) * 1000;
    let timelineSessions = JSON.parse(localStorage.getItem(TIMELINE_KEY)) || [];
    let dailyLogs = JSON.parse(localStorage.getItem(DAILY_LOGS_KEY)) || [];
    let breakLogs = JSON.parse(localStorage.getItem(BREAK_LOGS_KEY)) || [];

    let isWorking = false;
    let isOnBreak = false;
    let currentBreakType = "lunch"; 
    let editingDateKey = null; 

    // 2. DYNAMIC BREAK CIRCLE INJECTION
    const breakWrap = document.querySelector(".bm-timer-circle-wrap");
    if (breakWrap) {
        breakWrap.innerHTML = `
            <svg width="180" height="180" class="bm-progress-ring">
                <circle class="bm-progress-ring-bg" cx="90" cy="90" r="80" />
                <circle class="bm-progress-ring-fill" id="bmTimerProgress" cx="90" cy="90" r="80" />
            </svg>
            <div class="bm-timer-content">
                <div class="bm-timer-text" id="bmTimerDisplay">00:00:00</div>
                <div class="bm-timer-label">Total Duration</div>
            </div>
        `;
    }

    // 3. DOM ELEMENTS
    const punchBtn = document.getElementById("punchBtn");
    const timerDisplay = document.getElementById("timerDisplay");
    const productionDisplay = document.getElementById("productionDisplay");
    const statusMsg = document.getElementById("punchStatusMsg");
    const dateDisplay = document.getElementById("currentDateDisplay");

    const bmEls = {
        timerDisplay: document.getElementById("bmTimerDisplay"), 
        btnIn: document.getElementById("bmBtnIn"),
        btnOut: document.getElementById("bmBtnOut"),
        breakSelect: document.getElementById("bmBreakTypeSelect"),
        statusBadge: document.getElementById("bmStatusBadge"),
        limitWarning: document.getElementById("bmLimitWarning"),
        logTable: document.getElementById("bmLogTableBody"),
        emptyState: document.getElementById("bmEmptyState"),
        lunchUsed: document.getElementById("bmLunchUsed"),
        lunchBar: document.getElementById("bmLunchBar"),
        normalUsed: document.getElementById("bmNormalUsed"),
        normalBar: document.getElementById("bmNormalBar"),
        totalTime: document.getElementById("bmTotalTime"),
        remainingTime: document.getElementById("bmRemainingTime"),
    };

    const metricEls = {
        todayVal: document.getElementById("todayVal"),
        barToday: document.getElementById("barToday"),
        breakVal: document.getElementById("breakVal"),
        barBreak: document.getElementById("barBreak"),
        timelineTrack: document.getElementById("timelineTrack"),
        mainLogBody: document.getElementById("logTableBody")
    };

    const calEls = {
        grid: document.getElementById("daysGrid"),
        label: document.getElementById("calMonthYear"),
        prev: document.getElementById("prevMonth"),
        next: document.getElementById("nextMonth"),
        viewBtn: document.getElementById("viewAttBtn"),
        modal: document.getElementById("attModal"),
        closeBtn: document.getElementById("attCloseBtn"),
        bottomCloseBtn: document.getElementById("attCloseBtnBottom"),
        tableBody: document.getElementById("attTableBody"),
        monthSelect: document.getElementById("navMonthSelect"),
        yearSelect: document.getElementById("navYearSelect")
    };

    let currentDate = new Date(); 
    const attendanceCache = {};

    // 4. HELPER FUNCTIONS
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function formatHrMin(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}hr ${m}min`;
    }

    function pad(n) { return n < 10 ? "0" + n : n; }

    function updateHeaderTime() {
        const now = new Date();
        if (dateDisplay) {
            dateDisplay.innerText = now.toLocaleString("en-GB", {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
    }
    setInterval(updateHeaderTime, 1000);
    updateHeaderTime();

    function loadDailyLogs() {
        if (metricEls.mainLogBody) metricEls.mainLogBody.innerHTML = "";
        dailyLogs.forEach(log => {
            const row = `<tr><td>${log.time}</td><td><strong>${log.status}</strong></td><td>${log.note}</td></tr>`;
            if(metricEls.mainLogBody) metricEls.mainLogBody.innerHTML = row + metricEls.mainLogBody.innerHTML;
        });
    }

    function addMainLog(status, note, save = true) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        const row = `<tr><td>${timeStr}</td><td><strong>${status}</strong></td><td>${note}</td></tr>`;
        if (metricEls.mainLogBody) metricEls.mainLogBody.innerHTML = row + metricEls.mainLogBody.innerHTML;
        if (save) {
            dailyLogs.push({ time: timeStr, status, note });
            localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(dailyLogs));
        }
    }

    function convertTo24(time12) {
        if (!time12 || time12 === "-") return "";
        const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return "";
        let [ , h, m, modifier ] = match;
        h = parseInt(h, 10);
        if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
        if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
    }

    function updateMetricsUI(displayMs) {
        if(timerDisplay) timerDisplay.innerText = formatTime(displayMs);
        const formattedActiveTime = formatHrMin(displayMs);

        if(productionDisplay) productionDisplay.innerText = `Active : ${formattedActiveTime}`;
        if(metricEls.todayVal) metricEls.todayVal.innerText = formattedActiveTime;
        if(metricEls.barToday) metricEls.barToday.style.width = Math.min((displayMs / (8 * 3600000)) * 100, 100) + '%';
        
        const currentWeekMs = baselineWeeklyMs + displayMs;
        const currentMonthMs = baselineMonthlyMs + displayMs;
        
        const wHrs = Math.floor(currentWeekMs / 3600000);
        const wMins = Math.floor((currentWeekMs % 3600000) / 60000);
        const mHrs = Math.floor(currentMonthMs / 3600000);
        const mMins = Math.floor((currentMonthMs % 3600000) / 60000);
        
        const weekValEl = document.getElementById("weekVal");
        const monthValEl = document.getElementById("monthVal");
        const weekBar = document.querySelector(".blue-fill");
        const monthBar = document.querySelector(".purple-fill");

        if (weekValEl) {
            weekValEl.innerText = `${wHrs}hr ${wMins}min`;
            const sibling = weekValEl.nextElementSibling;
            if (sibling && sibling.classList.contains('target')) sibling.style.display = 'none';
        }
        if (monthValEl) {
            monthValEl.innerText = `${mHrs}hr ${mMins}min`;
            const sibling = monthValEl.nextElementSibling;
            if (sibling && sibling.classList.contains('target')) sibling.style.display = 'none';
        }

        if (weekBar) weekBar.style.width = Math.min((currentWeekMs / (40 * 3600000)) * 100, 100) + "%"; 
        if (monthBar) monthBar.style.width = Math.min((currentMonthMs / (160 * 3600000)) * 100, 100) + "%";

        const progress = document.getElementById("timerProgress");
        if (progress) {
            const radius = 70;
            const circumference = 2 * Math.PI * radius;
            const percent = Math.min(displayMs / (8 * 3600000), 1);
            progress.style.strokeDasharray = circumference;
            progress.style.strokeDashoffset = circumference - (percent * circumference);
        }
    }

    function saveTimelineSession() { localStorage.setItem(TIMELINE_KEY, JSON.stringify(timelineSessions)); }
    function closeLastSession(endTime) {
        if (timelineSessions.length > 0) {
            let last = timelineSessions[timelineSessions.length - 1];
            if (!last.end) last.end = endTime;
        }
    }

    function drawTimeline() {
        if (!metricEls.timelineTrack) return;
        metricEls.timelineTrack.innerHTML = ""; 
        let displaySessions = [...timelineSessions];
        if (isWorking || isOnBreak) {
            displaySessions.push({ type: isOnBreak ? 'break' : 'work', start: isOnBreak ? breakStartTime : workStartTime, end: Date.now() });
        }

        displaySessions.forEach(sess => {
            if (!sess.start || !sess.end) return;
            let sDate = new Date(sess.start);
            let eDate = new Date(sess.end);
            let sDec = sDate.getHours() + (sDate.getMinutes() / 60) + (sDate.getSeconds() / 3600);
            let eDec = eDate.getHours() + (eDate.getMinutes() / 60) + (eDate.getSeconds() / 3600);
            let sPct = ((sDec - SHIFT_START_HR) / TOTAL_HOURS) * 100;
            let widthPct = ((eDec - sDec) / TOTAL_HOURS) * 100;

            if (sPct < 0) { widthPct += sPct; sPct = 0; }
            if (sPct + widthPct > 100) widthPct = 100 - sPct;
            if (widthPct <= 0 || sPct >= 100) return;

            let div = document.createElement("div");
            div.className = sess.type === 'break' ? "timeline-segment yellow" : "timeline-segment green";
            div.style.left = sPct + "%";
            div.style.width = widthPct + "%";
            metricEls.timelineTrack.appendChild(div);
        });
    }

    function calculateTotalWorkFromTimeline() {
        let total = 0;
        timelineSessions.forEach(s => { if (s.type === 'work' && s.end && s.start) total += (s.end - s.start); });
        return total;
    }

    // 5. WORK TIMER LOGIC
    function startWorkTimer() {
        if (workTimerInterval) clearInterval(workTimerInterval);
        isWorking = true;
        isOnBreak = false;

        punchBtn.innerText = "Punch Out";
        punchBtn.classList.add("mode-out");
        statusMsg.innerHTML = `<i class="fa-solid fa-clock"></i> Currently working...`;
        statusMsg.style.color = "#ff6b00";

        if(bmEls.btnIn) bmEls.btnIn.disabled = false;
        if(bmEls.breakSelect) bmEls.breakSelect.disabled = false;

        workTimerInterval = setInterval(() => {
            const totalDisplayMs = totalWorkMs + (Date.now() - workStartTime);
            updateMetricsUI(totalDisplayMs);
            drawTimeline();
        }, 1000);
    }

    function pauseWorkTimer() {
        if (workTimerInterval) clearInterval(workTimerInterval);
        if (isWorking) {
            totalWorkMs += Date.now() - workStartTime;
            closeLastSession(Date.now());
            saveTimelineSession();
        }
        isWorking = false;
    }

// --- 6. BREAK TIMER LOGIC (ONE-TIME USE ENFORCEMENT) ---

let completedBreaks = { lunch: false, normal: false };

function checkBreakAvailability() {
    if (!bmEls.breakSelect || !bmEls.btnIn) return;
    
    const selectedType = bmEls.breakSelect.value.toLowerCase().trim();
    
    // Check usage. If > 0, it means break was taken.
    completedBreaks.lunch = (usage.lunch > 0);
    completedBreaks.normal = (usage.normal > 0);

    if (completedBreaks[selectedType]) {
        bmEls.btnIn.disabled = true;
        bmEls.btnIn.innerHTML = `<i class="fa-solid fa-ban"></i> Break Finished`;
        bmEls.btnIn.style.opacity = "0.6";
        bmEls.statusBadge.textContent = "Used Today";
        bmEls.statusBadge.className = "bm-badge bm-badge-danger";
    } else {
        // Only allow "Break In" if the user is currently Punched In and not already on a break
        bmEls.btnIn.disabled = !isWorking || isOnBreak;
        bmEls.btnIn.style.opacity = (isWorking && !isOnBreak) ? "1" : "0.6";
        bmEls.btnIn.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Break In`;
        
        if (!isOnBreak) {
            bmEls.statusBadge.textContent = "Available";
            bmEls.statusBadge.className = "bm-badge bm-badge-success";
        }
    }
}

function updateBreakCircleUI(additionalSeconds = 0) {
    let type = "lunch";
    if (bmEls.breakSelect) type = bmEls.breakSelect.value.toLowerCase().trim();
    
    const limitSec = LIMITS[type] || LIMITS.lunch;
    const usedSec = (usage[type] || 0) + additionalSeconds;

    if (bmEls.timerDisplay) bmEls.timerDisplay.textContent = formatTime(usedSec * 1000);

    const breakProgress = document.getElementById("bmTimerProgress");
    if (breakProgress) {
        breakProgress.classList.remove("lunch-fill", "normal-fill", "overtime-fill");
        breakProgress.classList.add(type === "lunch" ? "lunch-fill" : "normal-fill");

        const radius = 80;
        const circumference = 2 * Math.PI * radius; 
        const percent = Math.min(usedSec / limitSec, 1);
        breakProgress.style.strokeDasharray = circumference;
        breakProgress.style.strokeDashoffset = circumference - (percent * circumference);

        if (usedSec > limitSec) {
            breakProgress.classList.add("overtime-fill");
            if (bmEls.timerDisplay) bmEls.timerDisplay.style.color = "#d32f2f";
            if (bmEls.limitWarning) bmEls.limitWarning.style.display = "block";
        } else {
            if (bmEls.timerDisplay) bmEls.timerDisplay.style.color = "#333";
            if (bmEls.limitWarning) bmEls.limitWarning.style.display = "none";
        }
    }
}

if (bmEls.breakSelect) {
    bmEls.breakSelect.addEventListener("change", () => {
        if (!isOnBreak) {
            updateBreakCircleUI(0);
            checkBreakAvailability(); 
        }
    });
}

// BREAK IN
if (bmEls.btnIn) {
    bmEls.btnIn.addEventListener("click", async (e) => {
        e.preventDefault(); 
        const selectedType = bmEls.breakSelect.value.toLowerCase().trim();

        // 1. ONE-TIME CHECK: If usage is > 0, stop here.
        if (usage[selectedType] > 0) return alert(`You have already completed your ${selectedType} break for today.`);
        
        if (!isWorking) return alert("You must be actively punched in to start a break.");
        
        const ogText = bmEls.btnIn.innerHTML;
        bmEls.btnIn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        bmEls.btnIn.disabled = true;

        currentBreakType = selectedType;

        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-break/start/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: emp_id, break_type: currentBreakType })
            });

            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(errData.error || "Failed to start break on server.");
            }

            pauseWorkTimer();
            statusMsg.innerHTML = `<i class="fa-solid fa-mug-hot"></i> On Break...`;
            statusMsg.style.color = "#FF5B1E";
            isOnBreak = true;
            breakStartTime = Date.now();

            timelineSessions.push({ type: 'break', start: breakStartTime, end: null });
            saveTimelineSession();

            bmEls.btnIn.style.display = "none";
            bmEls.btnOut.style.display = "flex";
            bmEls.breakSelect.disabled = true;
            punchBtn.disabled = true;
            
            const typeLabel = currentBreakType === "lunch" ? "Lunch Break" : "Normal Break";
            bmEls.statusBadge.textContent = `On ${typeLabel}`;
            bmEls.statusBadge.className = "bm-badge bm-badge-primary";
            addMainLog("Break Started", typeLabel);

            if (breakTimerInterval) clearInterval(breakTimerInterval);
            breakTimerInterval = setInterval(() => {
                const currentBreakMs = Date.now() - breakStartTime;
                updateBreakCircleUI(Math.floor(currentBreakMs / 1000)); 
                drawTimeline();
            }, 1000);

        } catch (err) {
            console.error("Break Start Error:", err);
            alert(`Error: ${err.message}`);
            checkBreakAvailability();
        } finally {
            bmEls.btnIn.innerHTML = ogText;
        }
    });
}

// BREAK OUT
if (bmEls.btnOut) {
    bmEls.btnOut.addEventListener("click", async (e) => {
        e.preventDefault(); 
        if (!isOnBreak) return; 
        
        const ogText = bmEls.btnOut.innerHTML;
        bmEls.btnOut.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        bmEls.btnOut.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-break/end/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: emp_id, break_type: currentBreakType })
            });

            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(errData.error || "Failed to end break on server.");
            }

            clearInterval(breakTimerInterval);
            const endTime = Date.now();
            const durationMs = endTime - breakStartTime;
            const durationSec = Math.floor(durationMs / 1000);

            // Update local tracking
            totalBreakMs += durationMs;
            
            // 2. FORCE UPDATE: Set usage, force at least 1 second if it was instant, to lock the button
            const finalDur = durationSec > 0 ? durationSec : 1;
            usage[currentBreakType] = (usage[currentBreakType] || 0) + finalDur;
            localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
            
            closeLastSession(endTime); 
            isOnBreak = false;
            breakStartTime = null; 
            workStartTime = Date.now(); 
            
            timelineSessions.push({ type: 'work', start: workStartTime, end: null });
            saveTimelineSession();

            startWorkTimer(); 
            addMainLog("Break Ended", "Resumed Work");

            bmEls.btnIn.style.display = "flex";
            bmEls.btnOut.style.display = "none";
            bmEls.breakSelect.disabled = false;
            punchBtn.disabled = false;

            updateBreakCircleUI(0);
            checkBreakAvailability(); // This will now disable the button because usage > 0
            bmAddToHistoryLog(currentBreakType, endTime - durationMs, endTime, durationSec);
            bmUpdateProgressStats();

        } catch (err) {
            console.error("Break End Error:", err);
            alert(`Error: ${err.message}`);
        } finally {
            bmEls.btnOut.innerHTML = ogText;
            bmEls.btnOut.disabled = false;
        }
    });
}
    // 7. MAIN PUNCH BUTTON LOGIC
    if (punchBtn) {
        punchBtn.addEventListener("click", (e) => {
            e.preventDefault(); 
            const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            if (!isWorking && !isOnBreak && totalWorkMs === 0) {
               fetch(`${API_BASE_URL}/api/employee-attendence/create/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: emp_id })
                })
                .then(res => res.json())
                .then(() => {
                    isWorking = true;   
                    // Refresh the page immediately after successfully punching in
                    window.location.reload();
                })
                .catch(err => console.error("Punch In Error:", err));
                
                workStartTime = Date.now();
                punchInTimeStr = nowStr;
                totalWorkMs = 0; 
                
                timelineSessions.push({ type: 'work', start: workStartTime, end: null });
                saveTimelineSession();
                startWorkTimer();
                addMainLog("Punch In", "Shift Started");
            }
            else if (isWorking) {
                fetch(`${API_BASE_URL}/api/employee-attendence/checkout/`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: emp_id })
                });

                pauseWorkTimer(); 
                punchBtn.innerText = "Shift Completed";
                punchBtn.disabled = true;

                statusMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Punch out recorded`;
                statusMsg.style.color = "#4caf50";

                if (bmEls.btnIn) bmEls.btnIn.disabled = true;
                if (bmEls.btnOut) bmEls.btnOut.disabled = true;
                if (bmEls.breakSelect) bmEls.breakSelect.disabled = true;

                addMainLog("Punch Out", "Shift Ended");
                saveCalendarHistory('Present', punchInTimeStr, nowStr);
                
                updateMetricsUI(totalWorkMs);
                drawTimeline();
            }
        });
    }

    // PAGE LOAD & SYNC
    window.addEventListener("load", () => {
    loadDailyLogs();
    loadBreakLogs();
    bmUpdateProgressStats(); 
    updateBreakCircleUI(0); 
    loadHistoryTable(); 

    fetch(`${API_BASE_URL}/api/attendence-status/${emp_id}/`)
    .then(res => res.json())
    .then(data => {
        
        // --- START OF MODIFICATION: STRICT BACKEND SYNC ---
        
        // 1. HARD RESET: Clear everything local first.
        usage = { lunch: 0, normal: 0 };
        breakLogs = [];
        if (bmEls.logTable) bmEls.logTable.innerHTML = "";

        // 2. GET HISTORY FROM BACKEND
        const serverBreaks = data.today_breaks || []; 
        
        if (Array.isArray(serverBreaks) && serverBreaks.length > 0) {
            serverBreaks.forEach(b => {
                // A. Normalize Type
                const rawType = (b.break_type || "").toLowerCase();
                let bType = "";
                if (rawType.includes("lunch")) bType = "lunch";
                else if (rawType.includes("normal")) bType = "normal";

                // B. Only process if it is a COMPLETED break
                if (bType && b.end_time && b.start_time) {
                   const s = new Date(b.start_time).getTime();
                   const e = new Date(b.end_time).getTime();
                   
                   // C. Get Duration (use backend or calculate)
                   let dur = b.duration ? parseInt(b.duration) : Math.floor((e - s) / 1000);
                   
                   // CRITICAL: Force usage > 0.
                   const safeDur = dur > 0 ? dur : 1;

                   usage[bType] = (usage[bType] || 0) + safeDur;
                   
                   // D. Add to visual table
                   bmAddToHistoryLog(bType, s, e, safeDur);
                }
            });
        }
        
        // 3. SAVE SYNCED STATE
        localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
        
        // 4. UPDATE UI & BUTTONS
        bmUpdateProgressStats(); 
        checkBreakAvailability(); 

        // --- END OF MODIFICATION ---

        const isPunchedIn = data.status === "punched_in";
        const isOnActiveBreak = data.break_info && data.break_info.is_on_break;

        if (isPunchedIn) {
            punchBtn.innerText = "Punch Out";
            punchBtn.classList.add("mode-out");
            
            if (isOnActiveBreak) {
                isWorking = false;
                isOnBreak = true;
                
                totalWorkMs = calculateTotalWorkFromTimeline();
                updateMetricsUI(totalWorkMs);
                
                currentBreakType = (data.break_info.break_type || "").toLowerCase();
                if(currentBreakType.includes("lunch")) currentBreakType = "lunch";
                else if(currentBreakType.includes("normal")) currentBreakType = "normal";

                breakStartTime = new Date(data.break_info.start_time).getTime();
                
                statusMsg.innerHTML = `<i class="fa-solid fa-mug-hot"></i> On Break...`;
                statusMsg.style.color = "#FF5B1E";
                
                bmEls.btnIn.style.display = "none";
                bmEls.btnOut.style.display = "flex";
                bmEls.breakSelect.value = currentBreakType;
                bmEls.breakSelect.disabled = true;
                punchBtn.disabled = true;
                
                const typeLabel = currentBreakType === "lunch" ? "Lunch Break" : "Normal Break";
                bmEls.statusBadge.textContent = `On ${typeLabel}`;
                bmEls.statusBadge.className = "bm-badge bm-badge-primary";
                
                if (breakTimerInterval) clearInterval(breakTimerInterval);
                breakTimerInterval = setInterval(() => {
                    const currentBreakMs = Date.now() - breakStartTime;
                    updateBreakCircleUI(Math.floor(currentBreakMs / 1000));
                    drawTimeline();
                }, 1000);

            } else {
                isWorking = true;
                isOnBreak = false;
                
                if (timelineSessions.length > 0) {
                    let lastSession = timelineSessions[timelineSessions.length - 1];
                    if (lastSession.type === 'work' && !lastSession.end) {
                        workStartTime = lastSession.start;
                    } else {
                        workStartTime = Date.now();
                    }
                    totalWorkMs = calculateTotalWorkFromTimeline();
                } else {
                    workStartTime = new Date(data.checkin).getTime();
                    totalWorkMs = 0;
                    timelineSessions.push({ type: 'work', start: workStartTime, end: null });
                    saveTimelineSession();
                }
                startWorkTimer();
            }

        } else if (data.status === "punched_out") {
            punchBtn.innerText = "Shift Completed";
            statusMsg.innerHTML = `<i class="fa-solid fa-fingerprint"></i> Shift Completed `;
            punchBtn.disabled = true;

            if (bmEls.btnIn) bmEls.btnIn.disabled = true;
            if (bmEls.btnOut) bmEls.btnOut.disabled = true;
            if (bmEls.breakSelect) bmEls.breakSelect.disabled = true;
            
            totalWorkMs = calculateTotalWorkFromTimeline();
            updateMetricsUI(totalWorkMs);
            drawTimeline(); 

        } else {
            punchBtn.innerText = "Punch In";
            isWorking = false;
            
            // Cleanup
            if (bmEls.btnIn) bmEls.btnIn.disabled = true;
            if (bmEls.btnOut) bmEls.btnOut.disabled = true;
            if (bmEls.breakSelect) bmEls.breakSelect.disabled = true;
            
            timelineSessions = []; localStorage.removeItem(TIMELINE_KEY);
            // Usage is already reset by the sync block above
            dailyLogs = []; localStorage.removeItem(DAILY_LOGS_KEY);
            totalWorkMs = 0;
            
            updateMetricsUI(0);
            updateBreakCircleUI(0);
            drawTimeline();
            bmUpdateProgressStats();
        }

        // Final check
        checkBreakAvailability();
    })
    .catch(err => console.error("Status fetch error:", err));
});

    // 8. STATS & BREAK HISTORY HELPERS
    function bmUpdateProgressStats() {
        const totalSec = (usage.lunch || 0) + (usage.normal || 0);
        
        const lunchMins = Math.floor((usage.lunch || 0) / 60);
        const lunchPct = Math.min(((usage.lunch || 0) / LIMITS.lunch) * 100, 100);
        if(bmEls.lunchUsed) bmEls.lunchUsed.textContent = lunchMins;
        if(bmEls.lunchBar) {
            bmEls.lunchBar.style.width = `${lunchPct}%`;
            bmEls.lunchBar.style.backgroundColor = lunchPct >= 100 ? "#d32f2f" : "#FF5B1E";
        }

        const normalMins = Math.floor((usage.normal || 0) / 60);
        const normalPct = Math.min(((usage.normal || 0) / LIMITS.normal) * 100, 100);
        if(bmEls.normalUsed) bmEls.normalUsed.textContent = normalMins;
        if(bmEls.normalBar) {
            bmEls.normalBar.style.width = `${normalPct}%`;
            bmEls.normalBar.style.backgroundColor = normalPct >= 100 ? "#d32f2f" : "#00C853";
        }

        const totalBreakMins = Math.floor(totalSec / 60);
        if(metricEls.breakVal) metricEls.breakVal.innerText = `${totalBreakMins}m`;
        if(metricEls.barBreak) metricEls.barBreak.style.width = Math.min((totalBreakMins / 60) * 100, 100) + '%';
        
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        if(bmEls.totalTime) bmEls.totalTime.textContent = `${h}h ${m}m`;
        
        const remaining = Math.max(0, ((LIMITS.lunch + LIMITS.normal) / 60) - totalBreakMins);
        if(bmEls.remainingTime) {
            bmEls.remainingTime.textContent = `${remaining}m`;
            const dotContainer = bmEls.remainingTime.parentElement;
            if (dotContainer) {
                const dot = dotContainer.querySelector('.bm-dot');
                if (dot) {
                    dot.style.backgroundColor = remaining <= 0 ? "#d32f2f" : "#00C853";
                }
            }
        }
    }

    function loadBreakLogs() {
        if (bmEls.logTable) {
            bmEls.logTable.innerHTML = "";
            if (breakLogs.length === 0 && bmEls.emptyState) {
                bmEls.logTable.appendChild(bmEls.emptyState);
                bmEls.emptyState.style.display = "table-row";
            } else {
                breakLogs.forEach(log => {
                    const row = document.createElement("tr");
                    row.innerHTML = `<td><span style="font-weight:500">${log.typeLabel}</span></td><td>${log.start}</td><td>${log.end}</td><td style="font-family:monospace; font-weight:600">${log.dur}</td><td>${log.statusHtml}</td>`;
                    bmEls.logTable.prepend(row);
                });
            }
        }
    }

    function bmAddToHistoryLog(type, start, end, duration) {
        if (bmEls.emptyState) bmEls.emptyState.style.display = "none";
        const startDate = new Date(start);
        const endDate = new Date(end);
        const timeStartStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const timeEndStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const durStr = formatTime(duration * 1000);
        const typeLabel = type === "lunch" ? "Lunch Break" : "Normal Break";
        const limitSec = LIMITS[type];
        let statusHtml = '<span class="bm-badge bm-badge-success">On Time</span>';
        if (duration > limitSec) statusHtml = '<span class="bm-badge bm-badge-danger">Overtime</span>';

        const logItem = { typeLabel, start: timeStartStr, end: timeEndStr, dur: durStr, statusHtml };
        breakLogs.push(logItem);
        localStorage.setItem(BREAK_LOGS_KEY, JSON.stringify(breakLogs));

        const row = document.createElement("tr");
        row.innerHTML = `<td><span style="font-weight:500">${typeLabel}</span></td><td>${timeStartStr}</td><td>${timeEndStr}</td><td style="font-family:monospace; font-weight:600">${durStr}</td><td>${statusHtml}</td>`;
        bmEls.logTable.prepend(row);
    }

    // 9. CALENDAR, MODAL & HISTORY LOGIC 
    function saveCalendarHistory(status, inTime, outTime) {
        const todayKey = new Date().toLocaleDateString('en-CA');
        let history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || {};
        history[todayKey] = { date: todayKey, status: status, inTime: inTime, outTime: outTime };
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        renderCalendar();
    }
    
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        if (calEls.label) calEls.label.innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (calEls.grid) {
            calEls.grid.innerHTML = "";
            const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || {};
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const todayKey = new Date().toLocaleDateString('en-CA');

            for (let i = 0; i < firstDay; i++) {
                const div = document.createElement("div");
                div.classList.add("day-cell", "faded");
                calEls.grid.appendChild(div);
            }
            for (let i = 1; i <= daysInMonth; i++) {
                const div = document.createElement("div");
                div.classList.add("day-cell");
                div.innerText = i;
                const mStr = String(month + 1).padStart(2, '0');
                const dStr = String(i).padStart(2, '0');
                const dateKey =`${year}-${mStr}-${dStr}`;
                if (dateKey === todayKey) div.classList.add("today");
                if (history[dateKey]) div.classList.add("present");
                calEls.grid.appendChild(div);
            }
        }
    }

    if (calEls.prev) calEls.prev.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    if (calEls.next) calEls.next.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

    function initDropdowns() {
        if (!calEls.monthSelect || !calEls.yearSelect) return;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calEls.monthSelect.innerHTML = "";
        monthNames.forEach((m, index) => calEls.monthSelect.appendChild(new Option(m, index)));
        const currentYear = new Date().getFullYear();
        calEls.yearSelect.innerHTML = "";
        for (let y = currentYear - 5; y <= currentYear + 5; y++) calEls.yearSelect.appendChild(new Option(y, y));
        calEls.monthSelect.value = new Date().getMonth();
        calEls.yearSelect.value = currentYear;
        calEls.monthSelect.addEventListener("change", loadHistoryTable);
        calEls.yearSelect.addEventListener("change", loadHistoryTable);
    }

    async function loadHistoryTable() {
        let year = new Date().getFullYear();
        let month = new Date().getMonth();

        if (calEls.yearSelect && calEls.monthSelect) {
            year = parseInt(calEls.yearSelect.value, 10);
            month = parseInt(calEls.monthSelect.value, 10);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-attendence-history/${emp_id}/`);
            const data = await res.json();
            const reqRes = await fetch(`${API_BASE_URL}/api/admin/attendance-requests/`);
            const allRequests = await reqRes.json();
            
            baselineWeeklyMs = 0;
            baselineMonthlyMs = 0;
            const now = new Date();
            const todayStrLocal = now.toLocaleDateString('en-CA');
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const dayOfWeek = now.getDay() || 7; 
            const startOfWeek = new Date(now);
            startOfWeek.setHours(0,0,0,0);
            startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23,59,59,999);

            data.forEach(item => {
                if (item.date === todayStrLocal) return; 
                if (item.checkin && item.checkout) {
                    const cIn = new Date(item.checkin);
                    const cOut = new Date(item.checkout);
                    const dur = cOut - cIn;
                    if (dur > 0) {
                        if (cIn.getMonth() === currentMonth && cIn.getFullYear() === currentYear) baselineMonthlyMs += dur;
                        if (cIn >= startOfWeek && cIn <= endOfWeek) baselineWeeklyMs += dur;
                    }
                }
            });
            updateMetricsUI(totalWorkMs);

            const pendingDates = new Set();
            if (Array.isArray(allRequests)) {
                allRequests.forEach(req => { if (req.employee == emp_id && req.status === 'Pending') pendingDates.add(req.date); });
            }

            if(calEls.tableBody) calEls.tableBody.innerHTML = "";
            const attendanceMap = {};
            data.forEach(item => { attendanceMap[item.date] = item; });
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, month, day);
                const offset = dateObj.getTimezoneOffset();
                const localDateObj = new Date(dateObj.getTime() - (offset*60*1000));
                const dateStr = localDateObj.toISOString().split("T")[0];
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const tr = document.createElement("tr");

                if (pendingDates.has(dateStr)) {
                    tr.innerHTML = `<td>${formattedDate}</td><td colspan="5" style="text-align:center; color:#ff6b00; font-weight:600; background-color: #fff8f5;"><i class="fa-solid fa-clock-rotate-left"></i> Update Requested (Pending)</td>`;
                    if(calEls.tableBody) calEls.tableBody.appendChild(tr);
                    continue; 
                }

                const record = attendanceMap[dateStr];
                let status = "-", inTime = "-", outTime = "-", durationStr = "-"; 

                if (record && (record.checkin || record.checkout)) {
                    status = record.status || "Present";
                    if (record.checkin) inTime = new Date(record.checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    if (record.checkout) outTime = new Date(record.checkout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    if (record.checkin && record.checkout) {
                        const diffMs = new Date(record.checkout) - new Date(record.checkin);
                        if(diffMs > 0) durationStr = formatHrMin(diffMs); 
                    }
                } else if (record && record.status && record.status.toLowerCase() === "absent") {
                    status = "Absent";
                }

                attendanceCache[dateStr] = { status, inTime, outTime };

                let badgeHtml = `<span style="color:#999; font-weight:bold;">-</span>`;
                if (status.toLowerCase() === "present") badgeHtml = `<span class="status-badge status-present">Present</span>`;
                else if (status.toLowerCase() === "absent") badgeHtml = `<span class="status-badge status-absent">Absent</span>`;
                else if (status !== "-") badgeHtml = `<span class="status-badge">${status}</span>`;

                tr.innerHTML = `<td>${formattedDate}</td><td>${badgeHtml}</td><td style="font-family:monospace;">${inTime}</td><td style="font-family:monospace;">${outTime}</td><td style="font-family:monospace; font-weight:600; color:#4caf50;">${durationStr}</td><td><button class="btn-edit-row" data-date="${dateStr}"><i class="fa-solid fa-pen"></i></button></td>`;
                if(calEls.tableBody) calEls.tableBody.appendChild(tr);
            }
        } catch (e) { console.error("Fetch error:", e); }
    }

    if (calEls.viewBtn) calEls.viewBtn.addEventListener("click", () => { initDropdowns(); loadHistoryTable(); calEls.modal.classList.add("show"); });
    const closeHistoryModal = () => calEls.modal.classList.remove("show");
    if (calEls.closeBtn) calEls.closeBtn.addEventListener("click", closeHistoryModal);
    if (calEls.bottomCloseBtn) calEls.bottomCloseBtn.addEventListener("click", closeHistoryModal);
    if (calEls.modal) calEls.modal.addEventListener("click", (e) => { if (e.target === calEls.modal) closeHistoryModal(); });

    // 10. EDIT MODAL LOGIC
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-edit-row");
        if (!btn) return;
        editingDateKey = btn.dataset.date;
        const record = attendanceCache[editingDateKey] || { status: "-", inTime: "-", outTime: "-" };

        const inTimeInput = document.getElementById("editInTime");
        const outTimeInput = document.getElementById("editOutTime");
        const statusInput = document.getElementById("editStatus");
        
        if (inTimeInput) inTimeInput.value = convertTo24(record.inTime);
        if (outTimeInput) outTimeInput.value = convertTo24(record.outTime);
        if (statusInput) statusInput.value = record.status !== "-" ? record.status : "Present";

        closeHistoryModal(); 

        const editModal = document.getElementById("editModal");
        if (editModal) {
            document.body.appendChild(editModal); 
            editModal.style.display = "flex";
            editModal.style.visibility = "visible";
            editModal.style.opacity = "1";
            editModal.style.zIndex = "9999999";
            setTimeout(() => editModal.classList.add("show"), 10);
        }
    });

    const saveEditBtn = document.getElementById("saveEditBtn");
    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", (e) => {
            e.preventDefault(); 
            if (!editingDateKey) return;
            const inTimeInput = document.getElementById("editInTime");
            const outTimeInput = document.getElementById("editOutTime");
            const reasonInput = document.getElementById("editReason");

            if(!reasonInput || !reasonInput.value) return alert("Please provide a reason for this change.");

            const updatePayload = {
                employee: parseInt(emp_id),
                date: editingDateKey,
                clock_in: inTimeInput && inTimeInput.value ? inTimeInput.value : null,   
                clock_out: outTimeInput && outTimeInput.value ? outTimeInput.value : null, 
                reason: reasonInput.value
            };

            fetch(`${API_BASE_URL}/api/attendance-request/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload)
            })
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(data => {
                alert("Attendance correction request submitted successfully. Pending Admin approval.");
                closeEditModal();
                loadHistoryTable(); 
                if(calEls.modal) calEls.modal.classList.add("show");
                if(reasonInput) reasonInput.value = ""; 
            })
            .catch(err => {
                console.error("Failed to submit request:", err);
                alert("Failed to submit request. Please try again.");
            });
        });
    }

    const cancelEditBtn = document.getElementById("cancelEditBtn");
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", (e) => { e.preventDefault(); closeEditModal(); if(calEls.modal) calEls.modal.classList.add("show"); });

    function closeEditModal() {
        const editModal = document.getElementById("editModal");
        if (editModal) { editModal.classList.remove("show"); editModal.style.display = "none"; }
    }
    renderCalendar();

    // 11. CSS INJECTION
    const style = document.createElement('style');
    style.innerHTML = `
        .bm-timer-circle-wrap { position: relative; width: 180px; height: 180px; margin: 0 auto; display: flex; justify-content: center; align-items: center; }
        .bm-progress-ring { position: absolute; top: 0; left: 0; transform: rotate(-90deg); }
        .bm-progress-ring-bg { fill: none; stroke: #f1f1f1; stroke-width: 8; }
        .bm-progress-ring-fill { fill: none; stroke-width: 8; stroke-linecap: round; stroke-dasharray: 502.6; stroke-dashoffset: 502.6; transition: stroke-dashoffset 0.4s linear, stroke 0.3s ease; }
        .bm-timer-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .lunch-fill { stroke: #FF5B1E; }
        .normal-fill { stroke: #00C853; }
        .overtime-fill { stroke: #d32f2f !important; }
        .timeline-segment { position: absolute; height: 100%; top: 0; transition: width 0.5s linear; }
        .timeline-segment.green { background-color: #4caf50 !important; }
        .timeline-segment.yellow { background-color: #ffb300 !important; }
        .dot.green { background-color: #4caf50 !important; width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .dot.yellow { background-color: #ffb300 !important; width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    `;
    document.head.appendChild(style);
});