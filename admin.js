document.addEventListener('DOMContentLoaded', function(){
    const currentUser = EH.getCurrentUser();
    if (!currentUser) {
        alert("You must be logged in to view this page.");
        window.location.href = './login.html';
        return;
    }

    const isOwner = currentUser.role === 'owner';

    // DOM Elements
    const usersTable = document.getElementById('users-table');
    const userSearch = document.getElementById('user-search');
    const adsTable = document.getElementById('ads-table');
    const adForm = document.getElementById('ad-form');
    const wTable = document.getElementById('withdrawals-admin-table');
    const planRequestsContainer = document.getElementById('plan-requests-container');
    const planHistoryContainer = document.getElementById('plan-history-container');
    const statUsers = document.getElementById('stat-total-users');
    const statEarned = document.getElementById('stat-total-earned');
    const statPending = document.getElementById('stat-pending-withdrawals');
    const statAds = document.getElementById('stat-active-ads');
    const statPendingPlans = document.getElementById('stat-pending-plans');

    // Helpers
    function allUsers(){ return JSON.parse(localStorage.getItem(EH.STORAGE_KEYS.users)) || []; }
    function allAds(){ return EH.getAds(); }
    function allWithdrawals(){ return EH.getUserWithdrawalsMap(); }
    function getPendingPlanRequests(){ return EH.getPlanRequests(); }

    // Users
    function renderUsers(){
        if(!usersTable) return;
        const q = (userSearch?.value || '').toLowerCase();
        const list = allUsers().filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        usersTable.innerHTML = '';
        list.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${u.username}</td><td>${u.email}</td><td>${EH.formatCurrency(u.balance)}</td><td>${EH.formatCurrency(u.total_earned)}</td><td>${u.role || 'user'}</td>`;
            usersTable.appendChild(tr);
        });

        // Stats
        statUsers.textContent = String(allUsers().length);
        const totalEarned = allUsers().reduce((a,u)=> a + (u.total_earned || 0), 0);
        statEarned.textContent = EH.formatCurrency(totalEarned);
    }

    if(userSearch) userSearch.addEventListener('input', renderUsers);

    // Ads
    function renderAds(){
        if(!adsTable) return;
        const ads = allAds();
        statAds.textContent = String(ads.length);
        adsTable.innerHTML = '';
        ads.forEach(ad => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${ad.id}</td><td>${ad.title}</td><td>${ad.watch_duration}s</td><td>${EH.formatCurrency(ad.reward_amount)}</td>
                            <td>${isOwner ? `<button data-edit="${ad.id}" class="btn btn-secondary">Edit</button>
                                            <button data-del="${ad.id}" class="btn btn-primary" style="background:#ff6b6b;border-color:#ff6b6b;">Delete</button>` : '-'}</td>`;
            adsTable.appendChild(tr);
        });

        if(!isOwner) return;

        adsTable.querySelectorAll('button[data-edit]').forEach(btn => btn.addEventListener('click', function(){
            const id = parseInt(btn.getAttribute('data-edit'));
            const ad = allAds().find(a=>a.id===id);
            if(!ad) return;
            document.getElementById('ad-id').value = ad.id;
            document.getElementById('ad-title').value = ad.title;
            document.getElementById('ad-description').value = ad.description;
            document.getElementById('ad-duration').value = ad.watch_duration;
            document.getElementById('ad-reward').value = ad.reward_amount;
        }));

        adsTable.querySelectorAll('button[data-del]').forEach(btn => btn.addEventListener('click', function(){
            const id = parseInt(btn.getAttribute('data-del'));
            const ads = allAds().filter(a=>a.id!==id);
            localStorage.setItem(EH.STORAGE_KEYS.ads, JSON.stringify(ads));
            renderAds();
        }));
    }

    if(adForm){
        adForm.addEventListener('submit', function(e){
            e.preventDefault();
            if(!isOwner){ alert('Only owner can manage ads'); return; }

            const idVal = parseInt(document.getElementById('ad-id').value) || null;
            const title = document.getElementById('ad-title').value.trim();
            const description = document.getElementById('ad-description').value.trim();
            const duration = Math.max(5, parseInt(document.getElementById('ad-duration').value));
            const reward = Math.max(0.1, parseFloat(document.getElementById('ad-reward').value));

            if(!title || !description) return;

            let ads = allAds();
            if(idVal){
                const idx = ads.findIndex(a=>a.id===idVal);
                if(idx>=0) ads[idx] = {...ads[idx], title, description, watch_duration:duration, reward_amount:reward};
            } else {
                const newId = (ads.reduce((m,a)=>Math.max(m,a.id),0) || 0)+1;
                ads.push({id:newId, title, description, image_url:'', watch_duration:duration, reward_amount:reward});
            }

            localStorage.setItem(EH.STORAGE_KEYS.ads, JSON.stringify(ads));
            adForm.reset();
            renderAds();
        });
    }

    // Withdrawals
    function renderWithdrawals(){
        if(!wTable) return;
        const map = allWithdrawals();
        const users = allUsers();
        const rows = [];
        Object.keys(map).forEach(uid=>{
            const u = users.find(x=>String(x.id)===String(uid));
            (map[uid]||[]).forEach(w=>rows.push({u,w,uid:parseInt(uid)}));
        });

        rows.sort((a,b)=> new Date(b.w.requested_at) - new Date(a.w.requested_at));
        wTable.innerHTML = '';
        statPending.textContent = String(rows.filter(r=>r.w.status==='Pending').length);

        rows.forEach(({u,w,uid},idx)=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${u?u.username:'Unknown'}</td>
                            <td>${EH.formatCurrency(w.amount)}</td>
                            <td>${w.method||'-'}</td>
                            <td>${w.account_name? (w.account_name + ' / '+ w.account_number) : '-'}</td>
                            <td>${w.status}</td>
                            <td>${isOwner ? `<button class="btn-approve" data-index="${idx}">Approve</button>
                                             <button class="btn-reject" data-index="${idx}">Reject</button>` : '-'}</td>`;
            wTable.appendChild(tr);
        });

        if(!isOwner) return;

        wTable.querySelectorAll('.btn-approve').forEach(btn=>btn.addEventListener('click', function(){
            updateWithdrawalStatus(parseInt(this.dataset.index),'Approved');
        }));
        wTable.querySelectorAll('.btn-reject').forEach(btn=>btn.addEventListener('click', function(){
            updateWithdrawalStatus(parseInt(this.dataset.index),'Rejected');
        }));

        function updateWithdrawalStatus(idx,newStatus){
            const map = allWithdrawals();
            const order = [];
            Object.keys(map).forEach(uid => { (map[uid]||[]).forEach((w,i)=> order.push({uid,i})); });
            const ref = order.sort((a,b)=> new Date(map[b.uid][b.i].requested_at) - new Date(map[a.uid][a.i].requested_at))[idx];
            if(!ref) return;
            map[ref.uid][ref.i].status = newStatus;
            EH.setUserWithdrawalsMap(map);
            renderWithdrawals();
        }
    }

    // Plan Requests
    function renderPlanRequests(){
        if(!planRequestsContainer) return;
        const allRequests = getPendingPlanRequests();
        const pendingRequests = allRequests.filter(r=>r.status==='pending');
        statPendingPlans.textContent = String(pendingRequests.length);

        planRequestsContainer.innerHTML = '';
        if(pendingRequests.length===0){
            planRequestsContainer.innerHTML = '<p>No pending plan requests</p>';
            renderPlanHistory();
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `<thead><tr>
            <th>User</th><th>Plan</th><th>Amount</th><th>Daily Earnings</th><th>Ads/Day</th>
            <th>Payment Method</th><th>Transaction ID</th><th>Date</th><th>Actions</th>
        </tr></thead><tbody></tbody>`;

        const tbody = table.querySelector('tbody');
        pendingRequests.forEach((req,idx)=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${req.user_name}</td><td>${req.plan_name}</td><td>${EH.formatCurrency(req.plan_price)}</td>
                            <td>${EH.formatCurrency(req.daily_earnings)}</td><td>${req.ads_per_day}</td><td>${req.payment_method}</td>
                            <td>${req.transaction_id}</td><td>${new Date(req.requested_at).toLocaleString()}</td>
                            <td>${isOwner ? `<button class="btn-approve" data-idx="${idx}">Approve</button>
                                             <button class="btn-reject" data-idx="${idx}">Reject</button>` : '-'}</td>`;
            tbody.appendChild(tr);
        });
        planRequestsContainer.appendChild(table);

        if(!isOwner) return;

        planRequestsContainer.querySelectorAll('.btn-approve').forEach(btn=>{
            btn.addEventListener('click',function(){ approvePlanRequest(parseInt(this.dataset.idx)); });
        });
        planRequestsContainer.querySelectorAll('.btn-reject').forEach(btn=>{
            btn.addEventListener('click',function(){ rejectPlanRequest(parseInt(this.dataset.idx)); });
        });

        renderPlanHistory();
    }

    function renderPlanHistory(){
        if(!planHistoryContainer) return;
        const allRequests = getPendingPlanRequests();
        if(allRequests.length===0){
            planHistoryContainer.innerHTML = '<p>No plan request history</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `<thead><tr>
            <th>User</th><th>Plan</th><th>Amount</th><th>Daily Earnings</th><th>Ads/Day</th>
            <th>Payment Method</th><th>Transaction ID</th><th>Status</th><th>Requested</th><th>Processed</th>
        </tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');

        allRequests.forEach(req=>{
            let statusText='Pending', color='#ff9f43';
            if(req.status==='approved'){ statusText='Approved'; color='#1dd1a1'; }
            if(req.status==='rejected'){ statusText='Rejected'; color='#ff6b6b'; }
            const tr=document.createElement('tr');
            tr.innerHTML=`<td>${req.user_name}</td><td>${req.plan_name}</td><td>${EH.formatCurrency(req.plan_price)}</td>
                          <td>${EH.formatCurrency(req.daily_earnings)}</td><td>${req.ads_per_day}</td>
                          <td>${req.payment_method}</td><td>${req.transaction_id}</td>
                          <td style="color:${color}; font-weight:bold">${statusText}</td>
                          <td>${new Date(req.requested_at).toLocaleString()}</td>
                          <td>${req.processed_at?new Date(req.processed_at).toLocaleString():'-'}</td>`;
            tbody.appendChild(tr);
        });

        planHistoryContainer.appendChild(table);
    }

    function approvePlanRequest(idx){
        if(!isOwner) return alert('Only owner can approve');
        const allRequests=getPendingPlanRequests();
        const req=allRequests[idx];
        if(!req) return;

        const plans = EH.getPlans();
        const plan = plans.find(p=>p.id===req.plan_id);

        const userPlans = EH.getUserPlansMap();
        userPlans[req.user_id] = {
            id: req.plan_id,
            name: req.plan_name,
            price: req.plan_price,
            duration: plan ? plan.duration : 30,
            ads_per_day: req.ads_per_day,
            daily_earnings: req.daily_earnings,
            description: plan ? plan.description : `${req.plan_name} - Earn Rs.${req.daily_earnings} daily`,
            purchased_at: new Date().toISOString(),
            payment_method: req.payment_method,
            account_number: req.account_number,
            transaction_id: req.transaction_id
        };
        EH.setUserPlansMap(userPlans);

        req.status='approved';
        req.processed_at=new Date().toISOString();
        allRequests[idx]=req;
        EH.setPlanRequests(allRequests);

        renderPlanRequests();
        alert(`Plan activated for ${req.user_name}`);
    }

    function rejectPlanRequest(idx){
        if(!isOwner) return alert('Only owner can reject');
        const allRequests=getPendingPlanRequests();
        const req=allRequests[idx];
        if(!req) return;

        const reason = prompt('Enter reason for rejection:');
        if(!reason) return;

        req.status='rejected';
        req.rejected_reason=reason;
        req.processed_at=new Date().toISOString();
        allRequests[idx]=req;
        EH.setPlanRequests(allRequests);

        renderPlanRequests();
        alert(`Plan request rejected for ${req.user_name}`);
    }

    // Initial render
    renderUsers();
    renderAds();
    renderWithdrawals();
    renderPlanRequests();
});
