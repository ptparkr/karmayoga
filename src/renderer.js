let appData = null;
let selectedOption = null;
let isDropdownOpen = false;

const elements = {
  currentStreak: document.getElementById('current-streak'),
  longestStreak: document.getElementById('longest-streak'),
  heatmapGrid: document.getElementById('heatmap-grid'),
  heatmapMonths: document.getElementById('heatmap-months'),
  checkinBtn: document.getElementById('checkin-btn'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  dropdownContainer: document.getElementById('dropdown-container'),
  dropdownBtn: document.getElementById('dropdown-btn'),
  dropdownSelected: document.getElementById('dropdown-selected'),
  dropdownArrow: document.querySelector('.dropdown-arrow'),
  dropdownMenu: document.getElementById('dropdown-menu'),
  yesBtn: document.getElementById('yes-btn'),
  noBtn: document.getElementById('no-btn'),
  tooltip: document.getElementById('tooltip'),
  confettiContainer: document.getElementById('confetti-container'),
  minimizeBtn: document.getElementById('minimize-btn'),
  closeBtn: document.getElementById('close-btn')
};

async function init() {
  try {
    appData = await window.electronAPI.getData();
    updateStreakDisplay();
    renderHeatmap();
    
    const today = await window.electronAPI.getToday();
    if (appData.lastCheckIn !== today) {
      setTimeout(() => showModal(), 1000);
    }
  } catch (error) {
    console.error('Error initializing:', error);
  }
}

function animateNumber(element, target, duration = 1000) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * easeOut);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function updateStreakDisplay() {
  animateNumber(elements.currentStreak, appData.currentStreak);
  animateNumber(elements.longestStreak, appData.longestStreak);
  
  if (appData.currentStreak >= 7) {
    elements.currentStreak.parentElement.parentElement.classList.add('glow');
  } else {
    elements.currentStreak.parentElement.parentElement.classList.remove('glow');
  }
}

function getStreakLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function getStreakAtDate(date) {
  let streak = 0;
  const checkDate = new Date(date);
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (appData.checkInHistory && appData.checkInHistory[dateStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

function renderHeatmap() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  
  const weeks = [];
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() - currentDate.getDay());
  
  while (currentDate <= today) {
    const weekStart = new Date(currentDate);
    const week = [];
    
    for (let i = 0; i < 7; i++) {
      const dayStr = currentDate.toISOString().split('T')[0];
      const isInRange = currentDate >= startDate && currentDate <= today;
      const hasData = appData.checkInHistory && appData.checkInHistory[dayStr];
      const streak = hasData ? getStreakAtDate(dayStr) : 0;
      const level = getStreakLevel(streak);
      
      week.push({
        date: dayStr,
        level: level,
        streak: streak,
        isInRange: isInRange,
        isToday: dayStr === today.toISOString().split('T')[0]
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    weeks.push(week);
  }
  
  elements.heatmapGrid.innerHTML = '';
  
  weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell level-${day.level}`;
      
      if (day.isToday) {
        cell.style.boxShadow = '0 0 0 2px var(--primary-green)';
      }
      
      cell.dataset.date = day.date;
      cell.dataset.streak = day.streak;
      
      cell.addEventListener('mouseenter', showTooltip);
      cell.addEventListener('mouseleave', hideTooltip);
      
      elements.heatmapGrid.appendChild(cell);
    });
  });
  
  renderMonthLabels(startDate, today);
}

function renderMonthLabels(startDate, today) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels = [];
  
  let currentDate = new Date(startDate);
  currentDate.setDate(1);
  
  while (currentDate <= today) {
    const monthIndex = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const monthStart = new Date(currentDate);
    const weekIndex = Math.floor((monthStart - startDate) / (7 * 24 * 60 * 60 * 1000));
    
    if (!labels.find(l => l.month === monthIndex && l.year === year)) {
      labels.push({
        month: monthIndex,
        year: year,
        label: months[monthIndex],
        position: weekIndex
      });
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  elements.heatmapMonths.innerHTML = labels
    .map(l => `<span style="margin-left: ${l.position * 15}px">${l.label}</span>`)
    .join('');
}

function showTooltip(event) {
  const cell = event.target;
  const date = cell.dataset.date;
  const streak = cell.dataset.streak;
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  elements.tooltip.textContent = `${formattedDate}: ${streak} day streak`;
  elements.tooltip.classList.add('visible');
  
  const rect = cell.getBoundingClientRect();
  elements.tooltip.style.left = `${rect.left + rect.width / 2 - elements.tooltip.offsetWidth / 2}px`;
  elements.tooltip.style.top = `${rect.top - elements.tooltip.offsetHeight - 8}px`;
}

function hideTooltip() {
  elements.tooltip.classList.remove('visible');
}

function showModal() {
  selectedOption = null;
  elements.dropdownSelected.textContent = 'Select an option';
  elements.yesBtn.disabled = true;
  elements.noBtn.disabled = true;
  elements.dropdownMenu.classList.remove('open');
  elements.dropdownBtn.classList.remove('active');
  elements.modalOverlay.classList.add('active');
}

function hideModal() {
  elements.modalOverlay.classList.remove('active');
}

function toggleDropdown() {
  isDropdownOpen = !isDropdownOpen;
  
  if (isDropdownOpen) {
    elements.dropdownMenu.classList.add('open');
    elements.dropdownBtn.classList.add('active');
  } else {
    elements.dropdownMenu.classList.remove('open');
    elements.dropdownBtn.classList.remove('active');
  }
}

function selectOption(value, label) {
  selectedOption = value;
  elements.dropdownSelected.textContent = label;
  elements.dropdownSelected.style.color = 'var(--text-primary)';
  elements.yesBtn.disabled = false;
  elements.noBtn.disabled = false;
  
  document.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.value === value) {
      opt.classList.add('selected');
    }
  });
  
  isDropdownOpen = false;
  elements.dropdownMenu.classList.remove('open');
  elements.dropdownBtn.classList.remove('active');
}

async function handleCheckIn(response) {
  const result = await window.electronAPI.checkIn(response);
  
  if (result.success) {
    appData = result.data;
    updateStreakDisplay();
    renderHeatmap();
    
    if (response === 'yes' && !result.alreadyChecked) {
      createConfetti();
    }
  }
  
  hideModal();
}

function createConfetti() {
  const colors = ['#00d26a', '#00b4d8', '#39d353', '#ffdd59', '#ff6b6b', '#a55eea'];
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      elements.confettiContainer.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

elements.checkinBtn.addEventListener('click', showModal);

elements.modalOverlay.addEventListener('click', (e) => {
  if (e.target === elements.modalOverlay) {
    hideModal();
  }
});

elements.dropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown();
});

elements.dropdownMenu.addEventListener('click', (e) => {
  const option = e.target.closest('.dropdown-option');
  if (option) {
    const value = option.dataset.value;
    const label = option.querySelector('span:last-child').textContent;
    selectOption(value, label);
  }
});

document.addEventListener('click', () => {
  if (isDropdownOpen) {
    isDropdownOpen = false;
    elements.dropdownMenu.classList.remove('open');
    elements.dropdownBtn.classList.remove('active');
  }
});

elements.yesBtn.addEventListener('click', () => handleCheckIn('yes'));
elements.noBtn.addEventListener('click', () => handleCheckIn('no'));

elements.minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

elements.closeBtn.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

window.electronAPI.onAppReady(() => {
  init();
});

window.electronAPI.onShowCheckin(() => {
  showModal();
});

init();
