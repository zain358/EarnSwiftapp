document.addEventListener('DOMContentLoaded', function(){
    const user = EH.requireAuth();
    if (!user) return;

    const message = document.getElementById('message');
    const form = document.getElementById('profile-form');

    function fill(){
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('full_name').value = user.full_name;
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('jazzcash_number').value = user.jazzcash_number || '';
        document.getElementById('stat-balance').textContent = EH.formatCurrency(user.balance);
        document.getElementById('stat-total-earned').textContent = EH.formatCurrency(user.total_earned);
        document.getElementById('stat-created-at').textContent = new Date(user.created_at).toLocaleDateString();
    }

    form.addEventListener('submit', function(e){
        e.preventDefault();
        message.innerHTML = '';
        const fullName = document.getElementById('full_name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const jazz = document.getElementById('jazzcash_number').value.trim();
        const currentPw = document.getElementById('current_password').value;
        const newPw = document.getElementById('new_password').value;
        const confirmNew = document.getElementById('confirm_new_password').value;

        if (!fullName){ message.innerHTML = '<div class="message error">Full name is required</div>'; return; }
        if (newPw){
            if (!currentPw){ message.innerHTML = '<div class="message error">Current password is required to change password</div>'; return; }
            if (user.password !== currentPw){ message.innerHTML = '<div class="message error">Current password is incorrect</div>'; return; }
            if (newPw.length < 6){ message.innerHTML = '<div class="message error">New password must be at least 6 characters long</div>'; return; }
            if (newPw !== confirmNew){ message.innerHTML = '<div class="message error">New passwords do not match</div>'; return; }
        }

        const now = new Date().toISOString();
        const updated = Object.assign({}, user, { full_name: fullName, phone, jazzcash_number: jazz, updated_at: now });
        if (newPw){ updated.password = newPw; }
        EH.upsertUser(updated);
        Object.assign(user, updated);
        fill();
        message.innerHTML = '<div class="message success">Profile updated successfully!</div>';
        form.reset();
        // re-fill after reset to restore readonly values
        fill();
    });

    fill();
});