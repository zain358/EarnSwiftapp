// lightweight state and helpers using localStorage to mimic backend
(function(){
    const STORAGE_KEYS = {
        users: 'eh_users',
        session: 'eh_session',
        earnings: 'eh_earnings',
        withdrawals: 'eh_withdrawals',
        ads: 'eh_ads',
        plans: 'eh_plans',
        user_plans: 'eh_user_plans',
        ad_views: 'eh_ad_views',
        plan_requests: 'eh_plan_requests'
    };

    function parse(key, fallback){
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

    function initSeed(){
        // Seed ads
        if (!parse(STORAGE_KEYS.ads)) {
            const sampleAds = [
                { id: 1, title: 'Super Phone', description: 'Latest smartphone promo', image_url: '', watch_duration: 15, reward_amount: 2.00 },
                { id: 2, title: 'Gaming Laptop', description: 'High performance deals', image_url: '', watch_duration: 12, reward_amount: 1.50 },
                { id: 3, title: 'Food Delivery', description: 'Order now and save', image_url: '', watch_duration: 10, reward_amount: 1.00 }
            ];
            save(STORAGE_KEYS.ads, sampleAds);
        }

        // Seed plans
        if (!parse(STORAGE_KEYS.plans)) {
            const samplePlans = [
                {id: 1, name: "Basic Plan", price: 5000, duration: 30, ads_per_day: 10, daily_earnings: 500, description: "Earn Rs. 500 daily - 10 ads per day"},
                {id: 2, name: "Silver Plan", price: 8000, duration: 30, ads_per_day: 15, daily_earnings: 850, description: "Earn Rs. 850 daily - 15 ads per day"},
                {id: 3, name: "Gold Plan", price: 15000, duration: 30, ads_per_day: 20, daily_earnings: 1600, description: "Earn Rs. 1,600 daily - 20 ads per day"}
            ];
            save(STORAGE_KEYS.plans, samplePlans);
        }

        // Seed users
        if (!parse(STORAGE_KEYS.users)) {
            const now = new Date().toISOString();
            const owner = { id: 1, username: 'owner', email: 'owner@example.com', password: 'owner123', full_name: 'Site Owner', phone: '', balance: 0, total_earned: 0, role: 'owner', created_at: now, updated_at: now };
            save(STORAGE_KEYS.users, [owner]);
        }

        // Ensure all users have a role
        const users = parse(STORAGE_KEYS.users, []);
        let updated = false;
        users.forEach(u => {
            if (!u.role) { u.role = u.username === 'owner' ? 'owner' : 'user'; updated = true; }
        });
        if (updated) save(STORAGE_KEYS.users, users);

        // Seed other maps
        if (!parse(STORAGE_KEYS.earnings)) save(STORAGE_KEYS.earnings, {});
        if (!parse(STORAGE_KEYS.withdrawals)) save(STORAGE_KEYS.withdrawals, {});
        if (!parse(STORAGE_KEYS.user_plans)) save(STORAGE_KEYS.user_plans, {});
        if (!parse(STORAGE_KEYS.ad_views)) save(STORAGE_KEYS.ad_views, {});
        if (!parse(STORAGE_KEYS.plan_requests)) save(STORAGE_KEYS.plan_requests, []);
    }

    // Session
    function getSession(){ return parse(STORAGE_KEYS.session, null); }
    function setSession(sess){ save(STORAGE_KEYS.session, sess); }
    function clearSession(){ localStorage.removeItem(STORAGE_KEYS.session); }

    // Current user
    function getCurrentUser(){
        const sess = getSession();
        if (!sess) return null;
        const users = parse(STORAGE_KEYS.users, []);
        return users.find(u => u.id === sess.userId) || null;
    }

    function upsertUser(updated){
        const users = parse(STORAGE_KEYS.users, []);
        const idx = users.findIndex(u => u.id === updated.id);
        if (idx >= 0) users[idx] = updated; else users.push(updated);
        save(STORAGE_KEYS.users, users);
        return updated;
    }

    // Navigation
    function nav(){ return document.getElementById('nav-links'); }
    function isOwner(user){ return user && user.role === 'owner'; }

    function renderNav(){
        const n = nav(); if (!n) return;
        const user = getCurrentUser();
        if (user){
            const adminLink = isOwner(user) ? '<a href="./admin.html">Admin</a>' : '';
            n.innerHTML = '<a href="./dashboard.html">Dashboard</a><a href="./plans.html">Plans</a><a href="./profile.html">Profile</a><a href="./withdraw.html">Withdraw</a>' + adminLink + '<a id="logout-link">Logout</a>';
            const logout = document.getElementById('logout-link');
            if (logout) logout.addEventListener('click', () => { clearSession(); window.location.href = './index.html'; });
        } else {
            n.innerHTML = '<a href="./login.html">Login</a><a href="./signup.html">Signup</a>';
        }
    }

    function requireAuth(){ const u = getCurrentUser(); if (!u) window.location.href = './login.html'; return u; }
    function requireOwner(){ const u = requireAuth(); if (!u) return null; if (!isOwner(u)) window.location.href = './dashboard.html'; return u; }

    function formatCurrency(n){ return 'Rs. ' + Number(n || 0).toFixed(2); }

    // Ads
    function getAds(){ return parse(STORAGE_KEYS.ads, []); }

    // Earnings & withdrawals
    function getUserEarningsMap(){ return parse(STORAGE_KEYS.earnings, {}); }
    function setUserEarningsMap(map){ save(STORAGE_KEYS.earnings, map); }

    function getUserWithdrawalsMap(){ return parse(STORAGE_KEYS.withdrawals, {}); }
    function setUserWithdrawalsMap(map){ save(STORAGE_KEYS.withdrawals, map); }

    // Plans
    function getPlans(){ return parse(STORAGE_KEYS.plans, []); }
    function getUserPlansMap(){ return parse(STORAGE_KEYS.user_plans, {}); }
    function setUserPlansMap(map){ save(STORAGE_KEYS.user_plans, map); }

    function getUserActivePlan(userId){
        const userPlans = getUserPlansMap();
        const plan = userPlans[userId];
        if (!plan) return null;
        const today = new Date();
        const purchaseDate = new Date(plan.purchased_at);
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(expiryDate.getDate() + plan.duration);
        return today > expiryDate ? null : plan;
    }

    // Plan requests
    function getPlanRequests(){ return parse(STORAGE_KEYS.plan_requests, []); }
    function setPlanRequests(reqs){ save(STORAGE_KEYS.plan_requests, reqs); }

    function addPlanRequest(planId, paymentMethod, accountName, accountNumber, transactionId){
        const currentUser = getCurrentUser();
        if (!currentUser) { alert("Login required"); return; }

        const plan = getPlans().find(p => p.id === planId);
        if (!plan) return;

        const requests = getPlanRequests();
        requests.push({
            id: Date.now(),
            user_id: currentUser.id,
            user_name: currentUser.username,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_price: plan.price,
            daily_earnings: plan.daily_earnings,
            ads_per_day: plan.ads_per_day,
            payment_method: paymentMethod,
            account_name: accountName,
            account_number: accountNumber,
            transaction_id: transactionId,
            status: "pending",
            requested_at: new Date().toISOString(),
            processed_at: null
        });
        setPlanRequests(requests);
    }

    function updatePlanRequestStatus(id, status){
        const requests = getPlanRequests();
        const idx = requests.findIndex(r => r.id === id);
        if (idx >= 0){
            requests[idx].status = status;
            requests[idx].processed_at = new Date().toISOString();
            setPlanRequests(requests);
        }
    }

    // Ad views
    function getUserAdViewsToday(userId){
        const map = parse(STORAGE_KEYS.ad_views, {});
        const views = map[userId] || [];
        const today = new Date().toDateString();
        return views.filter(v => new Date(v.date).toDateString() === today).length;
    }

    function canUserWatchAdToday(userId){
        const plan = getUserActivePlan(userId);
        if (!plan) return false;
        return getUserAdViewsToday(userId) < plan.ads_per_day;
    }

    function recordAdView(userId){
        const map = parse(STORAGE_KEYS.ad_views, {});
        const views = map[userId] || [];
        views.push({ date: new Date().toISOString() });
        map[userId] = views;
        save(STORAGE_KEYS.ad_views, map);
    }

    // Expose
    window.EH = {
        STORAGE_KEYS,
        initSeed,
        getSession, setSession, clearSession, getCurrentUser, upsertUser,
        renderNav, requireAuth, requireOwner, formatCurrency, isOwner,
        getAds,
        getUserEarningsMap, setUserEarningsMap,
        getUserWithdrawalsMap, setUserWithdrawalsMap,
        getPlans, getUserPlansMap, setUserPlansMap, getUserActivePlan,
        getPlanRequests, setPlanRequests, addPlanRequest, updatePlanRequestStatus,
        getUserAdViewsToday, canUserWatchAdToday, recordAdView
    };

    document.addEventListener('DOMContentLoaded', function(){ initSeed(); renderNav(); });
})();
