document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('login-form');
    const message = document.getElementById('message');
    if (!form) return;

    form.addEventListener('submit', function(e){
        e.preventDefault();
        message.innerHTML = '';
        const usernameEmail = document.getElementById('username_email').value.trim();
        const password = document.getElementById('password').value;
        if (!usernameEmail || !password) { message.innerHTML = '<div class="message error">Please enter both username/email and password</div>'; return; }

        const users = JSON.parse(localStorage.getItem(EH.STORAGE_KEYS.users)) || [];
        const user = users.find(u => u.username.toLowerCase() === usernameEmail.toLowerCase() || u.email.toLowerCase() === usernameEmail.toLowerCase());
        if (!user || user.password !== password) {
            message.innerHTML = '<div class="message error">Invalid username/email or password</div>';
            return;
        }

        EH.setSession({ userId: user.id });
        window.location.href = './dashboard.html';
    });
});


