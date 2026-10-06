// Select DOM elements
const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

// Function to update counts and apply warning/over classes
function updateCounts() {
  const text = noteText.value;
  const charLength = text.length;
  
  // Calculate word count (handles empty strings and multiple spaces)
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  const wordLength = words.length;
  
  // Update text content
  charCount.textContent = `${charLength} / 200 characters`;
  wordCount.textContent = `${wordLength} words`;
  
  // Update classes for character counter
  charCount.classList.remove('warning', 'over');
  if (charLength > 200) {
    charCount.classList.add('over');
  } else if (charLength > 180) {
    charCount.classList.add('warning');
  }
}

// Function to save draft to localStorage
function saveDraft() {
  localStorage.setItem('quicknotes-draft', noteText.value);
}

// Function to clear everything
function clearAll() {
  noteText.value = '';
  updateCounts();
  localStorage.removeItem('quicknotes-draft');
}

// Event listener for input (updates counts and saves draft)
noteText.addEventListener('input', () => {
  updateCounts();
  saveDraft();
});

// Event listener for Escape key inside textarea
noteText.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    clearAll();
  }
});

// Event listener for Clear button
clearBtn.addEventListener('click', clearAll);

// Theme toggle logic
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark');
    themeToggle.textContent = 'Light mode';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = 'Dark mode';
  }
  localStorage.setItem('quicknotes-theme', isDark ? 'dark' : 'light');
}

// Event listener for theme button
themeToggle.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark');
  applyTheme(isDark);
});

// On page load: restore draft, theme, and update counts
document.addEventListener('DOMContentLoaded', () => {
  // Restore draft
  const savedDraft = localStorage.getItem('quicknotes-draft');
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }
  
  // Restore theme
  const savedTheme = localStorage.getItem('quicknotes-theme');
  if (savedTheme === 'dark') {
    applyTheme(true);
  } else {
    applyTheme(false);
  }
  
  // Update counts based on restored draft
  updateCounts();
});