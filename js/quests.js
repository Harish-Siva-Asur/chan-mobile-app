/**
 * CHAN - Daily Quests & Workout Routine Manager
 * Handles routine rendering, set check-offs, XP rewards, custom workouts, and rest countdowns.
 */

class QuestsManager {
  constructor() {
    this.container = document.getElementById('questsList');
    this.restTimerInterval = null;
    this.restTimeRemaining = 60;
  }

  init() {
    this.render();
    this.updateProgressSummary();
    this.bindEvents();
  }

  bindEvents() {
    const btnAddQuest = document.getElementById('btnAddQuest');
    if (btnAddQuest) {
      btnAddQuest.onclick = () => this.openAddModal();
    }

    const btnSaveQuest = document.getElementById('btnSaveQuest');
    if (btnSaveQuest) {
      btnSaveQuest.onclick = () => this.saveNewQuest();
    }

    const btnCloseAddModal = document.getElementById('btnCloseAddModal');
    if (btnCloseAddModal) {
      btnCloseAddModal.onclick = () => this.closeAddModal();
    }

    const btnCloseRestModal = document.getElementById('btnCloseRestModal');
    if (btnCloseRestModal) {
      btnCloseRestModal.onclick = () => this.closeRestTimer();
    }
  }

  render() {
    if (!this.container) return;
    const quests = window.appStorage.quests || [];
    this.container.innerHTML = '';

    if (quests.length === 0) {
      this.container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-secondary);">
          <p>No active quests assigned. Tap below to create your protocol!</p>
        </div>
      `;
      return;
    }

    quests.forEach((quest, qIndex) => {
      const isAllDone = quest.completedSets >= quest.targetSets;
      const card = document.createElement('div');
      card.className = `quest-item ${isAllDone ? 'completed' : ''}`;
      card.dataset.id = quest.id;

      // Build Set Pills
      let setsHTML = '';
      for (let s = 1; s <= quest.targetSets; s++) {
        const isDone = s <= quest.completedSets;
        setsHTML += `
          <button class="set-pill ${isDone ? 'done' : ''}" 
                  onclick="window.questsManager.toggleSet('${quest.id}', ${s})">
            SET ${s} ${isDone ? '✓' : ''}
          </button>
        `;
      }

      card.innerHTML = `
        <div class="quest-item-top">
          <div class="quest-meta">
            <div class="quest-icon-box">${quest.icon || '⚡'}</div>
            <div>
              <div class="quest-name">${quest.name}</div>
              <div class="quest-sub">${quest.muscle || 'Full Body'} • ${quest.completedSets}/${quest.targetSets} Sets</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="quest-target-badge">${quest.targetReps}</div>
            <button class="hud-btn-icon" style="width:26px; height:26px; font-size:0.75rem; border:none;" 
                    onclick="window.questsManager.deleteQuest('${quest.id}')" title="Delete Quest">
              ✕
            </button>
          </div>
        </div>
        <div class="sets-row">
          ${setsHTML}
        </div>
      `;

      this.container.appendChild(card);
    });

    this.updateProgressSummary();
  }

  toggleSet(questId, setNumber) {
    const quests = window.appStorage.quests;
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    if (quest.completedSets >= setNumber) {
      // Uncheck set
      quest.completedSets = setNumber - 1;
      window.audioEngine.playClick();
    } else {
      // Complete set
      quest.completedSets = setNumber;
      window.audioEngine.playQuestCheck();

      // Award XP
      const xpResult = window.appStorage.addXP(25);
      window.appController.showToast(`+25 XP! Set ${setNumber} Complete ⚡`);
      window.appController.updateHUD();

      // Check level up
      if (xpResult.leveledUp) {
        window.appController.showLevelUpModal(xpResult.newInfo);
      }

      // Prompt optional rest timer
      this.promptRestTimer(60);
    }

    window.appStorage.saveQuests(quests);
    this.render();

    // Check if entire daily routine is completed
    this.checkAllQuestsComplete();
  }

  checkAllQuestsComplete() {
    const quests = window.appStorage.quests;
    if (quests.length === 0) return;

    const allCompleted = quests.every(q => q.completedSets >= q.targetSets);
    if (allCompleted) {
      // Routine Complete Fanfare!
      window.audioEngine.playQuestComplete();
      window.appController.triggerConfetti();
      const bonusXP = window.appStorage.addXP(100);
      window.appController.showToast(`🎉 DAILY QUEST PROTOCOL ACCOMPLISHED! +100 BONUS XP`);
      window.appController.updateHUD();

      if (bonusXP.leveledUp) {
        setTimeout(() => {
          window.appController.showLevelUpModal(bonusXP.newInfo);
        }, 1200);
      }
    }
  }

  updateProgressSummary() {
    const quests = window.appStorage.quests || [];
    let totalSets = 0;
    let completedSets = 0;

    quests.forEach(q => {
      totalSets += (q.targetSets || 3);
      completedSets += (q.completedSets || 0);
    });

    const percent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    
    const bannerPercent = document.getElementById('questBannerPercent');
    if (bannerPercent) bannerPercent.innerText = `${percent}%`;

    const bannerSub = document.getElementById('questBannerSub');
    if (bannerSub) {
      bannerSub.innerText = `${completedSets} of ${totalSets} Sets Conquered Today`;
    }
  }

  // Rest Timer Modal
  promptRestTimer(seconds = 60) {
    const modal = document.getElementById('restTimerModal');
    if (!modal) return;

    this.restTimeRemaining = seconds;
    document.getElementById('restTimerVal').innerText = `${this.restTimeRemaining}s`;
    modal.classList.add('active');

    clearInterval(this.restTimerInterval);
    this.restTimerInterval = setInterval(() => {
      this.restTimeRemaining--;
      const display = document.getElementById('restTimerVal');
      if (display) display.innerText = `${this.restTimeRemaining}s`;

      if (this.restTimeRemaining <= 3 && this.restTimeRemaining > 0) {
        window.audioEngine.playCountdownBeep(false);
      }

      if (this.restTimeRemaining <= 0) {
        clearInterval(this.restTimerInterval);
        window.audioEngine.playCountdownBeep(true);
        this.closeRestTimer();
        window.appController.showToast("⚡ Rest period ended! Begin next set!");
      }
    }, 1000);
  }

  closeRestTimer() {
    clearInterval(this.restTimerInterval);
    const modal = document.getElementById('restTimerModal');
    if (modal) modal.classList.remove('active');
  }

  // Custom Quest Modal
  openAddModal() {
    window.audioEngine.playClick();
    const modal = document.getElementById('addQuestModal');
    if (modal) modal.classList.add('active');
  }

  closeAddModal() {
    const modal = document.getElementById('addQuestModal');
    if (modal) modal.classList.remove('active');
  }

  saveNewQuest() {
    const nameInput = document.getElementById('inputQuestName');
    const muscleInput = document.getElementById('inputQuestMuscle');
    const setsInput = document.getElementById('inputQuestSets');
    const repsInput = document.getElementById('inputQuestReps');
    const iconInput = document.getElementById('inputQuestIcon');

    const name = nameInput.value.trim();
    if (!name) {
      window.audioEngine.playError();
      window.appController.showToast("Please enter an exercise name");
      return;
    }

    const newQuest = {
      id: 'quest-' + Date.now(),
      name: name,
      icon: iconInput.value || '🏋️',
      targetSets: parseInt(setsInput.value, 10) || 3,
      targetReps: repsInput.value.trim() || '10 reps',
      muscle: muscleInput.value.trim() || 'Full Body',
      completedSets: 0
    };

    window.appStorage.quests.push(newQuest);
    window.appStorage.saveQuests();
    this.render();
    this.closeAddModal();

    // Reset inputs
    nameInput.value = '';
    muscleInput.value = '';

    window.audioEngine.playUnlock();
    window.appController.showToast("New Quest Added to Protocol ⚡");
  }

  deleteQuest(questId) {
    if (confirm("Remove this quest from your daily protocol?")) {
      window.appStorage.quests = window.appStorage.quests.filter(q => q.id !== questId);
      window.appStorage.saveQuests();
      this.render();
      window.audioEngine.playClick();
      window.appController.showToast("Quest Removed");
    }
  }
}

window.questsManager = new QuestsManager();
