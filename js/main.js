 // Initialize variables
 let currentUser = null;
 let chatMessages = {};
 let chatRelationships = {};
 let socket;

 // Connect to Socket.IO server
 function initializeSocket() {
     socket = io('https://chatter-socket-server.glitch.me'); // Using a free Glitch server

     socket.on('connect', () => {
         console.log('Connected to server');
         if (currentUser) {
             socket.emit('register', { username: currentUser });
         }
     });

     socket.on('private_message', (data) => {
         console.log('Received message:', data);
         if (data.receiver === currentUser) {
             // Add message to chat
             if (!chatMessages[data.sender]) {
                 chatMessages[data.sender] = [];
                 chatRelationships[data.sender] = [];
             }
             chatMessages[data.sender].push({
                 text: data.message,
                 sender: data.sender,
                 receiver: currentUser,
                 timestamp: new Date().toISOString(),
                 status: 'received'
             });

             // Save to localStorage
             localStorage.setItem(`messages_${currentUser}`, JSON.stringify(chatMessages));
             localStorage.setItem(`relationships_${currentUser}`, JSON.stringify(chatRelationships));

             // Update UI if chat is open
             const currentChat = document.querySelector('.chat-header .chat-name').textContent;
             if (currentChat === data.sender) {
                 loadMessages(data.sender);
             }
             loadContacts();
         }
     });

     socket.on('message_status', (data) => {
         if (data.receiver === currentUser) {
             updateMessageStatus(data.sender, data.messageId, data.status);
         }
     });
 }

 function sendMessage() {
     const input = document.getElementById('message-input');
     const currentContact = document.querySelector('.chat-header .chat-name').textContent;
     const messageText = input.value.trim();
     
     if (messageText && currentContact !== 'Select a chat to start messaging') {
         // Create message object
         const newMessage = {
             text: messageText,
             sender: currentUser,
             receiver: currentContact,
             timestamp: new Date().toISOString(),
             status: 'sent'
         };

         // Save message locally
         if (!chatMessages[currentContact]) {
             chatMessages[currentContact] = [];
         }
         chatMessages[currentContact].push(newMessage);
         localStorage.setItem(`messages_${currentUser}`, JSON.stringify(chatMessages));

         // Send message through socket
         socket.emit('private_message', {
             sender: currentUser,
             receiver: currentContact,
             message: messageText
         });

         // Clear input and update UI
         input.value = '';
         loadMessages(currentContact);
         loadContacts();
     }
 }

 function handleLogin(event) {
     event.preventDefault();
     const username = document.getElementById('username').value;
     const password = document.getElementById('password').value;

     if (username && password) {
         currentUser = username;
         
         // Load existing data
         chatMessages = JSON.parse(localStorage.getItem(`messages_${username}`)) || {};
         chatRelationships = JSON.parse(localStorage.getItem(`relationships_${username}`)) || {};
         
         // Save current user
         localStorage.setItem('currentUser', username);
         
         // Initialize socket connection
         initializeSocket();
         
         // Show chat interface
         showChat();
         
         // Clear login form
         document.getElementById('username').value = '';
         document.getElementById('password').value = '';
     }
 }

 function startRealtimeUpdates() {
     // Check for updates every second
     setInterval(() => {
         if (currentUser) {
             // Reload messages and relationships
             const updatedMessages = JSON.parse(localStorage.getItem(`messages_${currentUser}`)) || {};
             const updatedRelationships = JSON.parse(localStorage.getItem(`relationships_${currentUser}`)) || {};
             
             // Check if there are any changes
             if (JSON.stringify(updatedMessages) !== JSON.stringify(chatMessages) ||
                 JSON.stringify(updatedRelationships) !== JSON.stringify(chatRelationships)) {
                 
                 chatMessages = updatedMessages;
                 chatRelationships = updatedRelationships;
                 
                 // Update UI
                 loadContacts();
                 
                 // If a chat is open, reload its messages
                 const currentChat = document.querySelector('.chat-header .chat-name').textContent;
                 if (currentChat && currentChat !== 'Select a chat to start messaging') {
                     loadMessages(currentChat);
                 }
             }
         }
     }, 1000);
 }

 function showLogin() {
     document.getElementById('login-page').classList.remove('hidden');
     document.getElementById('chat-page').classList.add('hidden');
 }

 function showChat() {
     document.getElementById('login-page').classList.add('hidden');
     document.getElementById('chat-page').classList.remove('hidden');
     
     // Load contacts for current user
     loadContacts();
 }

 function logout() {
     // Clear all current user data
     localStorage.removeItem('currentUser');
     localStorage.removeItem(`messages_${currentUser}`);
     localStorage.removeItem(`relationships_${currentUser}`);
     currentUser = null;
     chatMessages = {};
     chatRelationships = {};
     showLogin();
 }

 function loadContacts() {
     const chatList = document.getElementById('chat-list');
     chatList.innerHTML = '';
     
     Object.keys(chatRelationships).forEach(contact => {
         let lastMessage = 'No messages yet';
         if (chatMessages[contact] && chatMessages[contact].length > 0) {
             const messages = chatMessages[contact];
             lastMessage = messages[messages.length - 1].text;
         }
         
         const contactHtml = `
             <div class="chat-item" onclick="selectContact(this)">
                 <div class="profile-pic"></div>
                 <div class="chat-info">
                     <div class="chat-name">${contact}</div>
                     <div class="last-message">${lastMessage}</div>
                 </div>
                 <div class="online-status ${Math.random() > 0.5 ? 'online' : ''}"></div>
             </div>
         `;
         chatList.innerHTML += contactHtml;
     });
 }

 function selectContact(contact) {
     const contactName = contact.querySelector('.chat-name').textContent;
     
     // Update chat header
     document.querySelector('.chat-header .chat-name').textContent = contactName;
     
     // Load and mark messages as seen
     loadMessages(contactName);
     markMessagesAsSeen(contactName);
     
     // Update mobile view
     if (window.innerWidth <= 768) {
         document.getElementById('sidebar').classList.add('hidden');
     }
 }

 function searchContacts() {
     const searchInput = document.getElementById('contact-search');
     const filter = searchInput.value.toLowerCase();
     const chatList = document.getElementById('chat-list');
     const contacts = chatList.getElementsByClassName('chat-item');

     for (let contact of contacts) {
         const name = contact.getElementsByClassName('chat-name')[0].textContent;
         if (name.toLowerCase().includes(filter)) {
             contact.style.display = "";
         } else {
             contact.style.display = "none";
         }
     }
 }

 // Add event listener for Enter key
 document.getElementById('message-input').addEventListener('keypress', function(e) {
     if (e.key === 'Enter') {
         sendMessage();
     }
 });

 // Add new functions for mobile support
 function toggleSidebar() {
     const sidebar = document.getElementById('sidebar');
     sidebar.classList.toggle('hidden');
 }

 // Add resize listener to handle back button visibility
 window.addEventListener('resize', handleResize);
 window.addEventListener('load', handleResize);

 function handleResize() {
     const backButton = document.querySelector('.back-button');
     if (window.innerWidth <= 768) {
         backButton.style.display = 'block';
     } else {
         backButton.style.display = 'none';
         // Show sidebar when returning to desktop view
         document.getElementById('sidebar').classList.remove('hidden');
     }
 }

 // Update allUsers variable to use localStorage
 let allUsers = JSON.parse(localStorage.getItem('users')) || [
     { username: 'John Doe', id: 1 },
     { username: 'Jane Smith', id: 2 },
     { username: 'Mike Johnson', id: 3 }
 ];

 // Settings functions
 function toggleSettings(event) {
     if (event) {
         event.stopPropagation(); // Prevent event from bubbling up
     }
     document.getElementById('settings-dropdown').classList.toggle('show');
 }

 function toggleDarkMode() {
     document.body.classList.toggle('dark-mode');
     localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
     toggleSettings(); // Close dropdown after selection
 }

 // Initialize dark mode
 if (localStorage.getItem('darkMode') === 'true') {
     document.body.classList.add('dark-mode');
 }

 function showAddChat() {
     const modal = document.getElementById('add-chat-modal');
     modal.classList.add('show');
     populateUserList();
     toggleSettings(); // Close dropdown after selection
 }

 function showUserInfo() {
     const modal = document.getElementById('user-info-modal');
     const content = document.getElementById('user-info-content');
     content.innerHTML = `
         <p><strong>Username:</strong> ${currentUser}</p>
         <!-- Add more user info here -->
     `;
     modal.classList.add('show');
     toggleSettings(); // Close dropdown after selection
 }

 function populateUserList() {
     const userList = document.getElementById('user-list');
     userList.innerHTML = '';
     
     allUsers.forEach(user => {
         if (user.username !== currentUser) {
             const userItem = document.createElement('div');
             userItem.className = 'user-item';
             userItem.innerHTML = `
                 <div class="profile-pic"></div>
                 <div>${user.username}</div>
             `;
             userItem.onclick = () => addNewChat(user.username);
             userList.appendChild(userItem);
         }
     });
 }

 function addNewChat(username) {
     // Initialize relationships for current user
     if (!chatRelationships[username]) {
         chatRelationships[username] = [];
     }

     // Initialize messages
     if (!chatMessages[username]) {
         chatMessages[username] = [];
     }
     
     // Save to localStorage for current user
     localStorage.setItem(`relationships_${currentUser}`, JSON.stringify(chatRelationships));
     localStorage.setItem(`messages_${currentUser}`, JSON.stringify(chatMessages));
     
     // Initialize relationships for the other user
     let otherUserRelationships = JSON.parse(localStorage.getItem(`relationships_${username}`)) || {};
     if (!otherUserRelationships[currentUser]) {
         otherUserRelationships[currentUser] = [];
         localStorage.setItem(`relationships_${username}`, JSON.stringify(otherUserRelationships));
     }
     
     // Update UI
     document.getElementById('add-chat-modal').classList.remove('show');
     loadContacts();
     
     // Select the new chat
     const chatItems = document.getElementsByClassName('chat-item');
     for (let item of chatItems) {
         if (item.querySelector('.chat-name').textContent === username) {
             selectContact(item);
             break;
         }
     }
 }

 function addNewUser() {
     const newUserInput = document.getElementById('new-user-input');
     const username = newUserInput.value.trim();
     
     if (username) {
         if (username === currentUser) {
             alert("You can't add yourself as a contact!");
             return;
         }

         // Check if user already exists in current user's contacts
         if (chatRelationships[username]) {
             alert('This user is already in your contacts!');
             return;
         }

         // Add new chat
         addNewChat(username);
         
         // Clear input
         newUserInput.value = '';
     } else {
         alert('Please enter a username!');
     }
 }

 // Add event listener for Enter key on new user input
 document.getElementById('new-user-input').addEventListener('keypress', function(e) {
     if (e.key === 'Enter') {
         addNewUser();
     }
 });

 // Close dropdowns and modals when clicking outside
 document.addEventListener('click', function(event) {
     const dropdown = document.getElementById('settings-dropdown');
     const settingsBtn = document.querySelector('.settings-btn');
     
     // Close settings dropdown if clicking outside
     if (!settingsBtn.contains(event.target) && !dropdown.contains(event.target)) {
         dropdown.classList.remove('show');
     }

     // Close modals if clicking outside
     if (event.target.classList.contains('modal')) {
         event.target.classList.remove('show');
     }
 });

 function markMessagesAsSeen(contactName) {
     // Get sender's messages
     let senderMessages = JSON.parse(localStorage.getItem(`messages_${contactName}`)) || {};
     
     if (senderMessages[currentUser]) {
         // Mark messages as seen
         senderMessages[currentUser] = senderMessages[currentUser].map(msg => ({
             ...msg,
             status: 'seen'
         }));
         
         // Save updated messages for sender
         localStorage.setItem(`messages_${contactName}`, JSON.stringify(senderMessages));
     }
 }

 function loadMessages(contactName) {
     const messagesContainer = document.getElementById('chat-messages');
     messagesContainer.innerHTML = '';
     
     if (chatMessages[contactName]) {
         chatMessages[contactName].forEach(message => {
             const messageDiv = document.createElement('div');
             const isSentByMe = message.sender === currentUser;
             
             messageDiv.className = `message ${isSentByMe ? 'sent' : 'received'}`;
             messageDiv.textContent = message.text;
             
             if (isSentByMe) {
                 const statusSpan = document.createElement('span');
                 statusSpan.className = 'message-status';
                 // Show double tick if seen, single tick if just sent
                 statusSpan.innerHTML = message.status === 'seen' 
                     ? '<i class="fas fa-check-double"></i>' 
                     : '<i class="fas fa-check"></i>';
                 messageDiv.appendChild(statusSpan);
             }
             
             messagesContainer.appendChild(messageDiv);
         });
         
         messagesContainer.scrollTop = messagesContainer.scrollHeight;
     }
 }

 function showUserProfile(username) {
     document.getElementById('profile-username').textContent = username;
     document.getElementById('user-profile-modal').classList.add('show');
 }

 function closeUserProfile() {
     document.getElementById('user-profile-modal').classList.remove('show');
 }

 function removeUser() {
     const username = document.getElementById('profile-username').textContent;
     
     // Remove from relationships
     if (chatRelationships[username]) {
         delete chatRelationships[username];
     }
     
     // Remove messages
     if (chatMessages[username]) {
         delete chatMessages[username];
     }
     
     // Save updated data
     localStorage.setItem(`relationships_${currentUser}`, JSON.stringify(chatRelationships));
     localStorage.setItem(`messages_${currentUser}`, JSON.stringify(chatMessages));
     
     // Close modal and update UI
     closeUserProfile();
     loadContacts();
     
     // Reset chat area
     document.querySelector('.chat-header .chat-name').textContent = 'Select a chat to start messaging';
     document.getElementById('chat-messages').innerHTML = '';
 }

 function sendMessageStatus(sender, messageId, status) {
     socket.emit('status', {
         sender: currentUser,
         receiver: sender,
         messageId: messageId,
         status: status
     });
 }

 function updateMessageStatus(sender, messageId, status) {
     if (chatMessages[sender]) {
         const message = chatMessages[sender].find(m => m.id === messageId);
         if (message) {
             message.status = status;
             localStorage.setItem(`messages_${currentUser}`, JSON.stringify(chatMessages));
             
             // Update UI if sender's chat is open
             const currentChat = document.querySelector('.chat-header .chat-name').textContent;
             if (currentChat === sender) {
                 loadMessages(sender);
             }
         }
     }
 }

 // Add typing indicator
 let typingTimeout;
 function handleTyping() {
     if (typingTimeout) {
         clearTimeout(typingTimeout);
     }

     const currentContact = document.querySelector('.chat-header .chat-name').textContent;
     if (currentContact !== 'Select a chat to start messaging') {
         socket.emit('typing', {
             sender: currentUser,
             receiver: currentContact
         });

         typingTimeout = setTimeout(() => {
             socket.emit('typing_stop', {
                 sender: currentUser,
                 receiver: currentContact
             });
         }, 1000);
     }
 }

 function showTypingIndicator(sender) {
     const currentChat = document.querySelector('.chat-header .chat-name').textContent;
     if (currentChat === sender) {
         // Show typing indicator in UI
         const typingDiv = document.createElement('div');
         typingDiv.className = 'typing-indicator';
         typingDiv.textContent = 'typing...';
         document.getElementById('chat-messages').appendChild(typingDiv);
         
         // Remove after 1.5 seconds
         setTimeout(() => {
             const indicator = document.querySelector('.typing-indicator');
             if (indicator) {
                 indicator.remove();
             }
         }, 1500);
     }
 }

 // Add event listener for typing
 document.getElementById('message-input').addEventListener('input', handleTyping);

 // Initialize on page load
 window.onload = function() {
     const savedUser = localStorage.getItem('currentUser');
     if (savedUser) {
         currentUser = savedUser;
         chatMessages = JSON.parse(localStorage.getItem(`messages_${savedUser}`)) || {};
         chatRelationships = JSON.parse(localStorage.getItem(`relationships_${savedUser}`)) || {};
         initializeSocket();
         showChat();
     } else {
         showLogin();
     }
 };

 // Update click handler for window to handle new modal
 window.onclick = function(event) {
     if (event.target.classList.contains('modal') || 
         event.target.classList.contains('user-profile-modal')) {
         event.target.classList.remove('show');
     }
     if (!event.target.matches('.settings-btn')) {
         document.getElementById('settings-dropdown').classList.remove('show');
     }
 }