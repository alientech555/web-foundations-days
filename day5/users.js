// Select DOM elements
const loadUsersBtn = document.getElementById('load-users');
const filterInput = document.getElementById('filter-input');
const status = document.getElementById('status');
const usersList = document.getElementById('users-list');

// State to store loaded users
let allUsers = [];

// Async function to fetch and display users
async function loadUsers() {
  loadUsersBtn.disabled = true;
  status.textContent = 'Loading...';
  
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    allUsers = await response.json();
    status.textContent = 'Users loaded successfully.';
    renderUsers(allUsers);
    
  } catch (error) {
    status.textContent = 'Error loading users.';
    console.error('Fetch error:', error);
  } finally {
    loadUsersBtn.disabled = false;
  }
}

// Function to render an array of users to the DOM
function renderUsers(list) {
  // Clear existing list
  usersList.innerHTML = '';
  
  // Handle empty filter results
  if (list.length === 0) {
    status.textContent = 'No users match your filter.';
    return;
  }
  
  // Ensure success message is shown if it was previously loading
  if (status.textContent === 'Loading...') {
    status.textContent = 'Users loaded successfully.';
  }
  
  // Render each user using createElement and textContent
  for (const user of list) {
    const li = document.createElement('li');
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `Name: ${user.name}`;
    li.appendChild(nameSpan);
    li.appendChild(document.createElement('br'));
    
    const emailSpan = document.createElement('span');
    emailSpan.textContent = `Email: ${user.email}`;
    li.appendChild(emailSpan);
    li.appendChild(document.createElement('br'));
    
    const citySpan = document.createElement('span');
    citySpan.textContent = `City: ${user.address.city}`;
    li.appendChild(citySpan);
    li.appendChild(document.createElement('br'));
    
    const companySpan = document.createElement('span');
    companySpan.textContent = `Company: ${user.company.name}`;
    li.appendChild(companySpan);
    
    usersList.appendChild(li);
  }
}

// Event listener for the Load Users button
loadUsersBtn.addEventListener('click', loadUsers);

// Event listener for the filter input (case-insensitive, no new network request)
filterInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(query)
  );
  renderUsers(filteredUsers);
});