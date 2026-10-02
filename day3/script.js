// Starting Data (Cleaned trailing spaces from categories to prevent logic errors)
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes(word)
function searchNotes(word) {
  const lowerWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(lowerWord));
}

// 2. longestNote()
function longestNote() {
  if (notes.length === 0) return null;
  return notes.reduce((longest, current) => 
    current.text.length > longest.text.length ? current : longest
  );
}

// 3. countByCategory()
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    const cat = note.category;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

// 4. getSummary()
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const noteWord = total === 1 ? "note" : "notes";
  
  const categoryParts = Object.entries(counts).map(([cat, count]) => `${count} ${cat}`);
  const categoryStr = categoryParts.join(", ");
  
  return `${total} ${noteWord}: ${categoryStr}.`;
}

// 5. isDuplicate(text)
function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === normalizedText);
}

// 6. addNote(text, category)
function addNote(text, category) {
  const trimmedText = text.trim();
  
  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Reason: Text must be between 1 and 200 characters.");
    return false;
  }
  
  const validCategories = ["personal", "work", "study"];
  if (!validCategories.includes(category)) {
    console.log("Reason: Invalid category. Must be personal, work, or study.");
    return false;
  }
  
  if (isDuplicate(trimmedText)) {
    console.log("Reason: A note with this text already exists.");
    return false;
  }
  
  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text: trimmedText, category: category });
  return true;
}


/* =========================================
   TESTING & CONSOLE LOGS
   ========================================= */

// --- Tests for searchNotes ---
console.log("searchNotes('milk'):", searchNotes("milk")); 
// Expected: [{ id: 1, text: "Buy milk and bread", category: "personal" }]

console.log("searchNotes('xyz'):", searchNotes("xyz")); 
// Expected: [] (Edge case: no results)


// --- Tests for longestNote ---
console.log("longestNote():", longestNote()); 
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

const originalNotes = [...notes]; // Backup for edge case testing
notes = [];
console.log("longestNote() on empty array:", longestNote()); 
// Expected: null (Edge case: empty array)
notes = originalNotes; // Restore


// --- Tests for countByCategory ---
console.log("countByCategory():", countByCategory()); 
// Expected: { personal: 2, study: 2, work: 1 }

notes = [{ id: 1, text: "test", category: "work" }];
console.log("countByCategory() single item:", countByCategory()); 
// Expected: { work: 1 } (Edge case: single category)
notes = originalNotes; // Restore


// --- Tests for getSummary ---
console.log("getSummary():", getSummary()); 
// Expected: "5 notes: 2 personal, 2 study, 1 work." (Order may vary based on object keys)

notes = [{ id: 1, text: "test", category: "personal" }];
console.log("getSummary() singular:", getSummary()); 
// Expected: "1 note: 1 personal." (Edge case: exactly one note, uses singular "note")
notes = originalNotes; // Restore


// --- Tests for isDuplicate ---
console.log("isDuplicate('Buy milk and bread'):", isDuplicate("Buy milk and bread")); 
// Expected: true

console.log("isDuplicate('  BUY MILK AND BREAD  '):", isDuplicate("  BUY MILK AND BREAD  ")); 
// Expected: true (Edge case: ignoring case and extra spaces)

console.log("isDuplicate('New unique note'):", isDuplicate("New unique note")); 
// Expected: false


// --- Tests for addNote ---
console.log("addNote('Read a book', 'personal'):", addNote("Read a book", "personal")); 
// Expected: true (Normal case: successfully added)

console.log("addNote('Read a book', 'personal'):", addNote("Read a book", "personal")); 
// Expected: false (Edge case: duplicate, logs reason)

console.log("addNote('', 'work'):", addNote("", "work")); 
// Expected: false (Edge case: empty string, logs length reason)

console.log("addNote('Valid text', 'invalid'):", addNote("Valid text", "invalid")); 
// Expected: false (Edge case: invalid category, logs category reason)