/**
 * CHAN - Hunter's Chronicle Diary & Activity Log
 * Interactive monthly calendar, mood logger, metrics tracker, and routine summary auto-attachment.
 */

class ChronicleDiary {
  constructor() {
    this.currentDate = new Date();
    this.selectedDateKey = this.formatDateKey(new Date());
    this.selectedMood = '🔥';
  }

  init() {
    this.bindEvents();
    this.renderCalendar();
    this.loadEntry(this.selectedDateKey);
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  bindEvents() {
    // Mood Selector Buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.onclick = () => {
        const mood = btn.dataset.mood;
        this.selectMood(mood);
      };
    });

    // Calendar Navigation
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    if (btnPrevMonth) {
      btnPrevMonth.onclick = () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
      };
    }

    const btnNextMonth = document.getElementById('btnNextMonth');
    if (btnNextMonth) {
      btnNextMonth.onclick = () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
      };
    }

    // Save Note Button
    const btnSave = document.getElementById('btnSaveDiary');
    if (btnSave) {
      btnSave.onclick = () => this.saveCurrentEntry();
    }

    // Auto-Attach Workout Summary Button
    const btnAttachWorkout = document.getElementById('btnAttachWorkout');
    if (btnAttachWorkout) {
      btnAttachWorkout.onclick = () => this.attachWorkoutSummary();
    }
  }

  selectMood(mood) {
    this.selectedMood = mood;
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mood === mood);
    });
    window.audioEngine.playClick();
  }

  renderCalendar() {
    const monthYearElem = document.getElementById('calendarMonthYear');
    const daysGrid = document.getElementById('calendarDaysGrid');
    if (!daysGrid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    if (monthYearElem) {
      monthYearElem.innerText = `${monthNames[month]} ${year}`;
    }

    daysGrid.innerHTML = '';

    // Day headers
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    daysOfWeek.forEach(d => {
      const headerCell = document.createElement('div');
      headerCell.className = 'day-header-cell';
      headerCell.innerText = d;
      daysGrid.appendChild(headerCell);
    });

    // First day of month
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Empty offset cells
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      daysGrid.appendChild(emptyCell);
    }

    const todayKey = this.formatDateKey(new Date());

    // Month days
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, month, day);
      const dateKey = this.formatDateKey(dayDate);
      const hasEntry = !!window.appStorage.diary[dateKey] && (window.appStorage.diary[dateKey].text || window.appStorage.diary[dateKey].updatedAt);
      const isSelected = dateKey === this.selectedDateKey;

      const dayBtn = document.createElement('button');
      dayBtn.className = `calendar-day-btn ${isSelected ? 'active-day' : ''} ${hasEntry ? 'has-entry' : ''}`;
      dayBtn.innerText = day;
      if (dateKey === todayKey) {
        dayBtn.style.color = 'var(--cyan-primary)';
      }

      dayBtn.onclick = () => {
        this.selectedDateKey = dateKey;
        this.renderCalendar();
        this.loadEntry(dateKey);
        window.audioEngine.playClick();
      };

      daysGrid.appendChild(dayBtn);
    }
  }

  loadEntry(dateKey) {
    const entry = window.appStorage.getDiaryEntry(dateKey);
    const dateLabel = document.getElementById('selectedDateLabel');
    if (dateLabel) {
      dateLabel.innerText = dateKey === this.formatDateKey(new Date()) ? `Today (${dateKey})` : dateKey;
    }

    const textInput = document.getElementById('diaryTextInput');
    if (textInput) textInput.value = entry.text || '';

    const weightInput = document.getElementById('inputDiaryWeight');
    if (weightInput) weightInput.value = entry.weight || '';

    const waterInput = document.getElementById('inputDiaryWater');
    if (waterInput) waterInput.value = entry.water || '2.5';

    this.selectMood(entry.mood || '🔥');
  }

  attachWorkoutSummary() {
    const textInput = document.getElementById('diaryTextInput');
    if (!textInput) return;

    const quests = window.appStorage.quests || [];
    let summaryText = "\n\n⚡ [COMPLETED PROTOCOL]:\n";

    quests.forEach(q => {
      summaryText += `• ${q.name}: ${q.completedSets}/${q.targetSets} sets (${q.targetReps})\n`;
    });

    textInput.value = (textInput.value.trim() + summaryText).trim();
    window.audioEngine.playQuestCheck();
    window.appController.showToast("Workout routine attached to note 📝");
  }

  saveCurrentEntry() {
    const textInput = document.getElementById('diaryTextInput');
    const weightInput = document.getElementById('inputDiaryWeight');
    const waterInput = document.getElementById('inputDiaryWater');

    const entryData = {
      text: textInput ? textInput.value.trim() : '',
      mood: this.selectedMood,
      weight: weightInput ? weightInput.value.trim() : '',
      water: waterInput ? waterInput.value.trim() : '2.5'
    };

    window.appStorage.saveDiaryEntry(this.selectedDateKey, entryData);
    
    // Reward XP for daily journaling
    const xpRes = window.appStorage.addXP(35);
    window.audioEngine.playUnlock();
    window.appController.showToast("Chronicle Log Saved! +35 XP 📖");
    window.appController.updateHUD();

    if (xpRes.leveledUp) {
      window.appController.showLevelUpModal(xpRes.newInfo);
    }

    this.renderCalendar();
  }
}

window.chronicleDiary = new ChronicleDiary();
