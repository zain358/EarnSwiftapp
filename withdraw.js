document.addEventListener('DOMContentLoaded', function(){
    const user = EH.requireAuth();
    if (!user) return;

    const form = document.getElementById('withdraw-form');
    const message = document.getElementById('message');
    const table = document.getElementById('withdrawals-table');

    function load(){
        const map = EH.getUserWithdrawalsMap();
        const list = map[user.id] || [];
        table.innerHTML = '';
        list.slice().reverse().forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + EH.formatCurrency(w.amount) + '</td>' +
                           '<td>' + (w.method || '-') + '</td>' +
                           '<td>' + (w.account_name ? (w.account_name + ' / ' + w.account_number) : '-') + '</td>' +
                           '<td>' + w.status + '</td>' +
                           '<td>' + new Date(w.requested_at).toLocaleString() + '</td>';
            table.appendChild(tr);
        });
    }

    form.addEventListener('submit', function(e){
        e.preventDefault();
        message.innerHTML = '';
        const method = document.getElementById('method').value;
        const accountName = document.getElementById('account_name').value.trim();
        const accountNumber = document.getElementById('account_number').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        if (!method){ message.innerHTML = '<div class="message error">Select a withdrawal method</div>'; return; }
        if (!accountName){ message.innerHTML = '<div class="message error">Enter account holder name</div>'; return; }
        if (!accountNumber){ message.innerHTML = '<div class="message error">Enter account number</div>'; return; }
        if (!amount || amount <= 0){ message.innerHTML = '<div class="message error">Enter a valid amount</div>'; return; }
        if (amount < 60){ message.innerHTML = '<div class="message error">Minimum withdrawal is Rs. 60</div>'; return; }
        if (amount > user.balance){ message.innerHTML = '<div class="message error">Insufficient balance</div>'; return; }

        const now = new Date().toISOString();
        const map = EH.getUserWithdrawalsMap();
        const list = map[user.id] || [];
        list.push({ amount, status: 'Pending', requested_at: now, method, account_name: accountName, account_number: accountNumber });
        map[user.id] = list;
        EH.setUserWithdrawalsMap(map);

        const updated = Object.assign({}, user, { balance: user.balance - amount, updated_at: now });
        EH.upsertUser(updated);
        Object.assign(user, updated);

        message.innerHTML = '<div class="message success">Withdrawal requested successfully!</div>';
        form.reset();
        load();
    });

    load();
});


