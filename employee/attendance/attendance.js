document.addEventListener("DOMContentLoaded", async () => {
    const emp_id = localStorage.getItem("employee_id");
    const API_BASE_URL = "https://api.theoppty.com";

    if (!emp_id) {
        console.error("employee_id not found");
        return;
    }

    const SHIFT_START_HR = 10;
    const SHIFT_END_HR = 19;
    const TOTAL_HOURS = SHIFT_END_HR - SHIFT_START_HR;
    const LIMITS = { lunch: 45 * 60, normal: 15 * 60 };

    let liveSyncInterval = null;
    let baselineWeeklySeconds = 0;
    let baselineMonthlySeconds = 0;
    let currentDate = new Date();
    let attendanceCache = {};
    let allAttendanceHistory = [];
    let pendingRequestDates = new Set();
    let latestAttendanceState = null;
    let editingDateKey = null;

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

    function pad(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function formatTimeFromSeconds(seconds) {
        seconds = Math.max(parseInt(seconds || 0), 0);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function formatHrMinFromSeconds(seconds) {
        seconds = Math.max(parseInt(seconds || 0), 0);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}hr ${m}min`;
    }

    function convertTo24(time12) {
        if (!time12 || time12 === "-") return "";
        const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return "";
        let [, h, m, modifier] = match;
        h = parseInt(h, 10);
        if (modifier.toUpperCase() === "PM" && h < 12) h += 12;
        if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${m}`;
    }

    function updateHeaderTime() {
        const now = new Date();
        if (dateDisplay) {
            dateDisplay.innerText = now.toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        }
    }

    async function apiFetch(url, options = {}) {
        const response = await fetch(url, options);
        const text = await response.text();
        let data = {};

        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || "Request failed");
        }

        return data;
    }

    async function fetchProfile() {
        try {
            const data = await apiFetch(`${API_BASE_URL}/api/employee/dashboard/${emp_id}/`);
            document.querySelectorAll("#pname").forEach(el => el.innerText = data.name || "Employee");
            document.querySelectorAll("#role").forEach(el => el.innerText = data.role || "Employee");
            document.querySelectorAll("#employee_id").forEach(el => el.innerText = data.employee_id || emp_id);
        } catch (err) {
            console.error("Profile Fetch Error:", err);
        }
    }

    function updateMetricsUI(workSeconds) {
        if (timerDisplay) timerDisplay.innerText = formatTimeFromSeconds(workSeconds);

        const formattedActiveTime = formatHrMinFromSeconds(workSeconds);
        if (productionDisplay) productionDisplay.innerText = `Active : ${formattedActiveTime}`;
        if (metricEls.todayVal) metricEls.todayVal.innerText = formattedActiveTime;

        if (metricEls.barToday) {
            metricEls.barToday.style.width = Math.min((workSeconds / (8 * 3600)) * 100, 100) + "%";
        }

        const currentWeekSeconds = baselineWeeklySeconds + workSeconds;
        const currentMonthSeconds = baselineMonthlySeconds + workSeconds;

        const weekValEl = document.getElementById("weekVal");
        const monthValEl = document.getElementById("monthVal");
        const weekBar = document.querySelector(".blue-fill");
        const monthBar = document.querySelector(".purple-fill");

        if (weekValEl) {
            weekValEl.innerText = formatHrMinFromSeconds(currentWeekSeconds);
            const sibling = weekValEl.nextElementSibling;
            if (sibling && sibling.classList.contains("target")) sibling.style.display = "none";
        }

        if (monthValEl) {
            monthValEl.innerText = formatHrMinFromSeconds(currentMonthSeconds);
            const sibling = monthValEl.nextElementSibling;
            if (sibling && sibling.classList.contains("target")) sibling.style.display = "none";
        }

        if (weekBar) {
            weekBar.style.width = Math.min((currentWeekSeconds / (40 * 3600)) * 100, 100) + "%";
        }

        if (monthBar) {
            monthBar.style.width = Math.min((currentMonthSeconds / (160 * 3600)) * 100, 100) + "%";
        }

        const progress = document.getElementById("timerProgress");
        if (progress) {
            const radius = 70;
            const circumference = 2 * Math.PI * radius;
            const percent = Math.min(workSeconds / (8 * 3600), 1);
            progress.style.strokeDasharray = circumference;
            progress.style.strokeDashoffset = circumference - (percent * circumference);
        }
    }

    function renderMainLogs(logs) {
        if (!metricEls.mainLogBody) return;
        metricEls.mainLogBody.innerHTML = "";

        if (!Array.isArray(logs) || logs.length === 0) {
            metricEls.mainLogBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center;color:#999;">No logs available</td>
                </tr>
            `;
            return;
        }

        logs.forEach(log => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${log.display_time || "-"}</td>
                <td><strong>${log.event || "-"}</strong></td>
                <td>${log.note || "-"}</td>
            `;
            metricEls.mainLogBody.appendChild(row);
        });
    }

    function renderBreakHistory(todayBreaks) {
        if (!bmEls.logTable) return;

        bmEls.logTable.innerHTML = "";

        if (!Array.isArray(todayBreaks) || todayBreaks.length === 0) {
            if (bmEls.emptyState) {
                bmEls.logTable.appendChild(bmEls.emptyState);
                bmEls.emptyState.style.display = "table-row";
            }
            return;
        }

        if (bmEls.emptyState) bmEls.emptyState.style.display = "none";

        const rows = [...todayBreaks].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

        rows.forEach(item => {
            const durationSec = parseInt(item.duration || 0);
            const type = (item.break_type || "normal").toLowerCase();
            const limitSec = LIMITS[type] || LIMITS.normal;

            let statusHtml = `<span class="bm-badge bm-badge-success">On Time</span>`;
            if (!item.end_time) {
                statusHtml = `<span class="bm-badge bm-badge-primary">Active</span>`;
            } else if (durationSec > limitSec) {
                statusHtml = `<span class="bm-badge bm-badge-danger">Overtime</span>`;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><span style="font-weight:500">${item.label || type}</span></td>
                <td>${item.display_start || "-"}</td>
                <td>${item.display_end || "-"}</td>
                <td style="font-family:monospace; font-weight:600">${formatTimeFromSeconds(durationSec)}</td>
                <td>${statusHtml}</td>
            `;
            bmEls.logTable.appendChild(row);
        });
    }

    function drawTimelineFromServer(timeline) {
        if (!metricEls.timelineTrack) return;
        metricEls.timelineTrack.innerHTML = "";

        if (!Array.isArray(timeline)) return;

        timeline.forEach(sess => {
            if (!sess.start || !sess.end) return;

            const sDate = new Date(sess.start);
            const eDate = new Date(sess.end);

            let sDec = sDate.getHours() + (sDate.getMinutes() / 60) + (sDate.getSeconds() / 3600);
            let eDec = eDate.getHours() + (eDate.getMinutes() / 60) + (eDate.getSeconds() / 3600);

            let sPct = ((sDec - SHIFT_START_HR) / TOTAL_HOURS) * 100;
            let widthPct = ((eDec - sDec) / TOTAL_HOURS) * 100;

            if (sPct < 0) {
                widthPct += sPct;
                sPct = 0;
            }

            if (sPct + widthPct > 100) {
                widthPct = 100 - sPct;
            }

            if (widthPct <= 0 || sPct >= 100) return;

            const div = document.createElement("div");
            div.className = sess.type === "break" ? "timeline-segment yellow" : "timeline-segment green";
            div.style.left = sPct + "%";
            div.style.width = widthPct + "%";
            metricEls.timelineTrack.appendChild(div);
        });
    }

    function updateBreakProgressStats(usage) {
        usage = usage || { lunch: 0, normal: 0 };

        const lunchSec = parseInt(usage.lunch || 0);
        const normalSec = parseInt(usage.normal || 0);
        const totalSec = lunchSec + normalSec;

        const lunchMins = Math.floor(lunchSec / 60);
        const lunchPct = Math.min((lunchSec / LIMITS.lunch) * 100, 100);
        if (bmEls.lunchUsed) bmEls.lunchUsed.textContent = lunchMins;
        if (bmEls.lunchBar) {
            bmEls.lunchBar.style.width = `${lunchPct}%`;
            bmEls.lunchBar.style.backgroundColor = lunchPct >= 100 ? "#d32f2f" : "#FF5B1E";
        }

        const normalMins = Math.floor(normalSec / 60);
        const normalPct = Math.min((normalSec / LIMITS.normal) * 100, 100);
        if (bmEls.normalUsed) bmEls.normalUsed.textContent = normalMins;
        if (bmEls.normalBar) {
            bmEls.normalBar.style.width = `${normalPct}%`;
            bmEls.normalBar.style.backgroundColor = normalPct >= 100 ? "#d32f2f" : "#00C853";
        }

        const totalBreakMins = Math.floor(totalSec / 60);
        if (metricEls.breakVal) metricEls.breakVal.innerText = `${totalBreakMins}m`;
        if (metricEls.barBreak) metricEls.barBreak.style.width = Math.min((totalBreakMins / 60) * 100, 100) + "%";

        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        if (bmEls.totalTime) bmEls.totalTime.textContent = `${h}h ${m}m`;

        const remaining = Math.max(0, ((LIMITS.lunch + LIMITS.normal) / 60) - totalBreakMins);
        if (bmEls.remainingTime) {
            bmEls.remainingTime.textContent = `${remaining}m`;
            const dotContainer = bmEls.remainingTime.parentElement;
            if (dotContainer) {
                const dot = dotContainer.querySelector(".bm-dot");
                if (dot) dot.style.backgroundColor = remaining <= 0 ? "#d32f2f" : "#00C853";
            }
        }
    }

    function updateBreakCircleUI() {
        if (!bmEls.breakSelect || !bmEls.timerDisplay) return;

        const selectedType = bmEls.breakSelect.value.toLowerCase().trim();
        const usage = latestAttendanceState?.usage || { lunch: 0, normal: 0 };
        const usedSec = parseInt(usage[selectedType] || 0);
        const limitSec = LIMITS[selectedType] || LIMITS.lunch;

        bmEls.timerDisplay.textContent = formatTimeFromSeconds(usedSec);

        const breakProgress = document.getElementById("bmTimerProgress");
        if (!breakProgress) return;

        breakProgress.classList.remove("lunch-fill", "normal-fill", "overtime-fill");
        breakProgress.classList.add(selectedType === "lunch" ? "lunch-fill" : "normal-fill");

        const radius = 80;
        const circumference = 2 * Math.PI * radius;
        const percent = Math.min(usedSec / limitSec, 1);

        breakProgress.style.strokeDasharray = circumference;
        breakProgress.style.strokeDashoffset = circumference - (percent * circumference);

        if (usedSec > limitSec) {
            breakProgress.classList.add("overtime-fill");
            bmEls.timerDisplay.style.color = "#d32f2f";
            if (bmEls.limitWarning) bmEls.limitWarning.style.display = "block";
        } else {
            bmEls.timerDisplay.style.color = "#333";
            if (bmEls.limitWarning) bmEls.limitWarning.style.display = "none";
        }
    }

    function renderPunchAndBreakControls(state) {
        if (!state) return;

        const status = state.status;
        const onBreak = !!(state.break_info && state.break_info.is_on_break);
        const selectedType = bmEls.breakSelect ? bmEls.breakSelect.value.toLowerCase().trim() : "lunch";
        const usedSelectedType = parseInt((state.usage && state.usage[selectedType]) || 0);

        if (punchBtn) {
            punchBtn.classList.remove("mode-out");

            if (status === "not_punched") {
                punchBtn.innerText = "Punch In";
                punchBtn.disabled = false;
            } else if (status === "punched_in" && !onBreak) {
                punchBtn.innerText = "Punch Out";
                punchBtn.disabled = false;
                punchBtn.classList.add("mode-out");
            } else if (status === "punched_in" && onBreak) {
                punchBtn.innerText = "Punch Out";
                punchBtn.disabled = true;
                punchBtn.classList.add("mode-out");
            } else if (status === "punched_out") {
                punchBtn.innerText = "Shift Completed";
                punchBtn.disabled = true;
            }
        }

        if (statusMsg) {
            if (status === "not_punched") {
                statusMsg.innerHTML = `<i class="fa-solid fa-fingerprint"></i> Not punched in`;
                statusMsg.style.color = "#999";
            } else if (status === "punched_in" && onBreak) {
                statusMsg.innerHTML = `<i class="fa-solid fa-mug-hot"></i> On Break...`;
                statusMsg.style.color = "#FF5B1E";
            } else if (status === "punched_in") {
                statusMsg.innerHTML = `<i class="fa-solid fa-clock"></i> Currently working...`;
                statusMsg.style.color = "#ff6b00";
            } else if (status === "punched_out") {
                statusMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Shift Completed`;
                statusMsg.style.color = "#4caf50";
            }
        }

        if (!bmEls.btnIn || !bmEls.btnOut || !bmEls.breakSelect || !bmEls.statusBadge) return;

        if (status === "not_punched") {
            bmEls.btnIn.style.display = "flex";
            bmEls.btnOut.style.display = "none";
            bmEls.btnIn.disabled = true;
            bmEls.breakSelect.disabled = true;
            bmEls.statusBadge.textContent = "Punch In Required";
            bmEls.statusBadge.className = "bm-badge bm-badge-secondary";
            bmEls.btnIn.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Break In`;
            return;
        }

        if (status === "punched_out") {
            bmEls.btnIn.style.display = "flex";
            bmEls.btnOut.style.display = "none";
            bmEls.btnIn.disabled = true;
            bmEls.breakSelect.disabled = true;
            bmEls.statusBadge.textContent = "Shift Completed";
            bmEls.statusBadge.className = "bm-badge bm-badge-danger";
            bmEls.btnIn.innerHTML = `<i class="fa-solid fa-ban"></i> Break Closed`;
            return;
        }

        if (onBreak) {
            const activeType = (state.break_info?.break_type || "").toLowerCase();
            bmEls.breakSelect.value = activeType || selectedType;
            bmEls.breakSelect.disabled = true;
            bmEls.btnIn.style.display = "none";
            bmEls.btnOut.style.display = "flex";
            bmEls.btnOut.disabled = false;

            const typeLabel = activeType === "lunch" ? "Lunch Break" : "Normal Break";
            bmEls.statusBadge.textContent = `On ${typeLabel}`;
            bmEls.statusBadge.className = "bm-badge bm-badge-primary";
            return;
        }

        bmEls.breakSelect.disabled = false;
        bmEls.btnIn.style.display = "flex";
        bmEls.btnOut.style.display = "none";
        bmEls.btnIn.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Break In`;

        if (usedSelectedType > 0) {
            bmEls.btnIn.disabled = true;
            bmEls.btnIn.innerHTML = `<i class="fa-solid fa-ban"></i> Break Finished`;
            bmEls.statusBadge.textContent = "Used Today";
            bmEls.statusBadge.className = "bm-badge bm-badge-danger";
        } else {
            bmEls.btnIn.disabled = false;
            bmEls.statusBadge.textContent = "Available";
            bmEls.statusBadge.className = "bm-badge bm-badge-success";
        }
    }

    function applyAttendanceState(state) {
        latestAttendanceState = state;
        updateMetricsUI(parseInt(state.total_work_seconds || 0));
        updateBreakProgressStats(state.usage || { lunch: 0, normal: 0 });
        renderMainLogs(state.main_logs || []);
        renderBreakHistory(state.today_breaks || []);
        drawTimelineFromServer(state.timeline || []);
        renderPunchAndBreakControls(state);
        updateBreakCircleUI();
    }

    async function syncAttendanceState(showError = false) {
        try {
            const data = await apiFetch(`${API_BASE_URL}/api/attendence-status/${emp_id}/`);
            applyAttendanceState(data);
        } catch (err) {
            console.error("Status fetch error:", err);
            if (showError) alert(err.message);
        }
    }

    function startLiveSync() {
        if (liveSyncInterval) clearInterval(liveSyncInterval);
        liveSyncInterval = setInterval(() => {
            syncAttendanceState(false);
        }, 1000);
    }

    function initDropdowns() {
        if (!calEls.monthSelect || !calEls.yearSelect) return;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        calEls.monthSelect.innerHTML = "";
        monthNames.forEach((m, index) => calEls.monthSelect.appendChild(new Option(m, index)));

        const currentYear = new Date().getFullYear();
        calEls.yearSelect.innerHTML = "";
        for (let y = currentYear - 5; y <= currentYear + 5; y++) {
            calEls.yearSelect.appendChild(new Option(y, y));
        }

        calEls.monthSelect.value = new Date().getMonth();
        calEls.yearSelect.value = currentYear;

        calEls.monthSelect.addEventListener("change", loadHistoryTable);
        calEls.yearSelect.addEventListener("change", loadHistoryTable);
    }

    function renderCalendar() {
        if (!calEls.grid || !calEls.label) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const todayKey = new Date().toLocaleDateString("en-CA");

        calEls.label.innerText = new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
        });

        calEls.grid.innerHTML = "";

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const presentDates = new Set(allAttendanceHistory.map(item => item.date));

        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement("div");
            div.classList.add("day-cell", "faded");
            calEls.grid.appendChild(div);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const div = document.createElement("div");
            div.classList.add("day-cell");
            div.innerText = day;

            const mStr = String(month + 1).padStart(2, "0");
            const dStr = String(day).padStart(2, "0");
            const dateKey = `${year}-${mStr}-${dStr}`;

            if (dateKey === todayKey) div.classList.add("today");
            if (presentDates.has(dateKey)) div.classList.add("present");
            if (pendingRequestDates.has(dateKey)) div.classList.add("pending");

            calEls.grid.appendChild(div);
        }
    }

    async function loadHistoryTable() {
        let year = new Date().getFullYear();
        let month = new Date().getMonth();

        if (calEls.yearSelect && calEls.monthSelect) {
            year = parseInt(calEls.yearSelect.value, 10);
            month = parseInt(calEls.monthSelect.value, 10);
        }

        try {
            const historyRes = await apiFetch(`${API_BASE_URL}/api/employee-attendence-history/${emp_id}/`);
            const reqRes = await apiFetch(`${API_BASE_URL}/api/admin/attendance-requests/`);

            allAttendanceHistory = Array.isArray(historyRes) ? historyRes : [];
            pendingRequestDates = new Set();

            if (Array.isArray(reqRes)) {
                reqRes.forEach(req => {
                    if (String(req.employee) === String(emp_id) && req.status === "Pending") {
                        pendingRequestDates.add(req.date);
                    }
                });
            }

            baselineWeeklySeconds = 0;
            baselineMonthlySeconds = 0;

            const now = new Date();
            const todayStr = now.toLocaleDateString("en-CA");
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const dayOfWeek = now.getDay() || 7;
            const startOfWeek = new Date(now);
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(now.getDate() - dayOfWeek + 1);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            allAttendanceHistory.forEach(item => {
                if (item.date === todayStr) return;

                const dur = parseInt(item.duration_seconds || 0);
                const dateObj = new Date(item.date + "T00:00:00");

                if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
                    baselineMonthlySeconds += dur;
                }

                if (dateObj >= startOfWeek && dateObj <= endOfWeek) {
                    baselineWeeklySeconds += dur;
                }
            });

            updateMetricsUI(parseInt(latestAttendanceState?.total_work_seconds || 0));

            if (calEls.tableBody) calEls.tableBody.innerHTML = "";
            attendanceCache = {};

            const attendanceMap = {};
            allAttendanceHistory.forEach(item => {
                attendanceMap[item.date] = item;
            });

            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, month, day);
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });

                const tr = document.createElement("tr");

                if (pendingRequestDates.has(dateStr)) {
                    tr.innerHTML = `
                        <td>${formattedDate}</td>
                        <td colspan="5" style="text-align:center; color:#ff6b00; font-weight:600; background-color:#fff8f5;">
                            <i class="fa-solid fa-clock-rotate-left"></i> Update Requested (Pending)
                        </td>
                    `;
                    if (calEls.tableBody) calEls.tableBody.appendChild(tr);
                    continue;
                }

                const record = attendanceMap[dateStr];
                let status = "-";
                let inTime = "-";
                let outTime = "-";
                let durationStr = "-";

                if (record) {
                    status = record.status || "Present";
                    if (record.checkin) {
                        inTime = new Date(record.checkin).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });
                    }
                    if (record.checkout) {
                        outTime = new Date(record.checkout).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });
                    }
                    durationStr = record.duration_display || "-";
                }

                attendanceCache[dateStr] = { status, inTime, outTime };

                let badgeHtml = `<span style="color:#999; font-weight:bold;">-</span>`;
                if (String(status).toLowerCase() === "present") {
                    badgeHtml = `<span class="status-badge status-present">Present</span>`;
                } else if (String(status).toLowerCase() === "absent") {
                    badgeHtml = `<span class="status-badge status-absent">Absent</span>`;
                } else if (status !== "-") {
                    badgeHtml = `<span class="status-badge">${status}</span>`;
                }

                tr.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${badgeHtml}</td>
                    <td style="font-family:monospace;">${inTime}</td>
                    <td style="font-family:monospace;">${outTime}</td>
                    <td style="font-family:monospace; font-weight:600; color:#4caf50;">${durationStr}</td>
                    <td><button class="btn-edit-row" data-date="${dateStr}"><i class="fa-solid fa-pen"></i></button></td>
                `;

                if (calEls.tableBody) calEls.tableBody.appendChild(tr);
            }

            renderCalendar();
        } catch (e) {
            console.error("History fetch error:", e);
        }
    }

    async function handlePunch() {
        if (!latestAttendanceState) return;

        try {
            if (latestAttendanceState.status === "not_punched") {
                await apiFetch(`${API_BASE_URL}/api/employee-attendence/create/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: emp_id })
                });
            } else if (latestAttendanceState.status === "punched_in" && !(latestAttendanceState.break_info && latestAttendanceState.break_info.is_on_break)) {
                await apiFetch(`${API_BASE_URL}/api/employee-attendence/checkout/`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: emp_id })
                });
            }

            await syncAttendanceState(true);
            await loadHistoryTable();
        } catch (err) {
            console.error("Punch Error:", err);
            alert(err.message);
        }
    }

    async function handleBreakStart() {
        if (!bmEls.breakSelect) return;

        try {
            const selectedType = bmEls.breakSelect.value.toLowerCase().trim();

            await apiFetch(`${API_BASE_URL}/api/employee-break/start/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: emp_id,
                    break_type: selectedType
                })
            });

            await syncAttendanceState(true);
            await loadHistoryTable();
        } catch (err) {
            console.error("Break Start Error:", err);
            alert(err.message);
        }
    }

    async function handleBreakEnd() {
        try {
            await apiFetch(`${API_BASE_URL}/api/employee-break/end/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: emp_id })
            });

            await syncAttendanceState(true);
            await loadHistoryTable();
        } catch (err) {
            console.error("Break End Error:", err);
            alert(err.message);
        }
    }

    if (punchBtn) {
        punchBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await handlePunch();
        });
    }

    if (bmEls.btnIn) {
        bmEls.btnIn.addEventListener("click", async (e) => {
            e.preventDefault();
            await handleBreakStart();
        });
    }

    if (bmEls.btnOut) {
        bmEls.btnOut.addEventListener("click", async (e) => {
            e.preventDefault();
            await handleBreakEnd();
        });
    }

    if (bmEls.breakSelect) {
        bmEls.breakSelect.addEventListener("change", () => {
            updateBreakCircleUI();
            renderPunchAndBreakControls(latestAttendanceState);
        });
    }

    if (calEls.prev) {
        calEls.prev.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (calEls.next) {
        calEls.next.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    if (calEls.viewBtn) {
        calEls.viewBtn.addEventListener("click", async () => {
            await loadHistoryTable();
            if (calEls.modal) calEls.modal.classList.add("show");
        });
    }

    function closeHistoryModal() {
        if (calEls.modal) calEls.modal.classList.remove("show");
    }

    if (calEls.closeBtn) calEls.closeBtn.addEventListener("click", closeHistoryModal);
    if (calEls.bottomCloseBtn) calEls.bottomCloseBtn.addEventListener("click", closeHistoryModal);
    if (calEls.modal) {
        calEls.modal.addEventListener("click", (e) => {
            if (e.target === calEls.modal) closeHistoryModal();
        });
    }

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

    function closeEditModal() {
        const editModal = document.getElementById("editModal");
        if (editModal) {
            editModal.classList.remove("show");
            editModal.style.display = "none";
        }
    }

    const saveEditBtn = document.getElementById("saveEditBtn");
    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (!editingDateKey) return;

            const inTimeInput = document.getElementById("editInTime");
            const outTimeInput = document.getElementById("editOutTime");
            const reasonInput = document.getElementById("editReason");

            if (!reasonInput || !reasonInput.value) {
                alert("Please provide a reason for this change.");
                return;
            }

            const updatePayload = {
                employee: parseInt(emp_id),
                date: editingDateKey,
                clock_in: inTimeInput && inTimeInput.value ? inTimeInput.value : null,
                clock_out: outTimeInput && outTimeInput.value ? outTimeInput.value : null,
                reason: reasonInput.value
            };

            try {
                await apiFetch(`${API_BASE_URL}/api/attendance-request/create/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatePayload)
                });

                alert("Attendance correction request submitted successfully. Pending Admin approval.");
                closeEditModal();
                await loadHistoryTable();
                if (calEls.modal) calEls.modal.classList.add("show");
                reasonInput.value = "";
            } catch (err) {
                console.error("Failed to submit request:", err);
                alert(err.message || "Failed to submit request.");
            }
        });
    }

    const cancelEditBtn = document.getElementById("cancelEditBtn");
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeEditModal();
            if (calEls.modal) calEls.modal.classList.add("show");
        });
    }

    const style = document.createElement("style");
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
        .day-cell.pending { outline: 2px solid #ff6b00; }
    `;
    document.head.appendChild(style);

    setInterval(updateHeaderTime, 1000);
    updateHeaderTime();

    initDropdowns();
    await fetchProfile();
    await loadHistoryTable();
    await syncAttendanceState(false);
    startLiveSync();
});