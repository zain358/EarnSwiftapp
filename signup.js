document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('signup-form');
    const message = document.getElementById('message');
    if (!form) return;

    form.addEventListener('submit', function(e){
        e.preventDefault();
        message.innerHTML = '';

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const fullName = document.getElementById('full_name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;

        if (!username || !email || !fullName || !password){ message.innerHTML = '<div class="message error">All required fields must be filled</div>'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ message.innerHTML = '<div class="message error">Please enter a valid email address</div>'; return; }
        if (password.length < 6){ message.innerHTML = '<div class="message error">Password must be at least 6 characters long</div>'; return; }
        if (password !== confirm){ message.innerHTML = '<div class="message error">Passwords do not match</div>'; return; }

        const users = JSON.parse(localStorage.getItem(EH.STORAGE_KEYS.users)) || [];
        const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
        if (exists){ message.innerHTML = '<div class="message error">Username or email already exists</div>'; return; }

        const id = Date.now();
        const now = new Date().toISOString();
        const user = { 
            id, 
            username, 
            email, 
            full_name: fullName, 
            phone, 
            password, 
            jazzcash_number: '', 
            balance: 0, 
            total_earned: 0, 
            role: 'user', // ADDED: Default role for new users
            created_at: now, 
            updated_at: now 
        };
        users.push(user);
        localStorage.setItem(EH.STORAGE_KEYS.users, JSON.stringify(users));
        message.innerHTML = '<div class="message success">Account created successfully! You can now login.</div>';
        setTimeout(function(){ window.location.href = './login.html'; }, 800);
    });
});