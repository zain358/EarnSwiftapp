// Replace the entire dashboard.js content with this fixed version
document.addEventListener('DOMContentLoaded', function () {
  const user = EH.requireAuth();
  if (!user) return;

  // Welcome message
  document.getElementById('welcome').textContent =
    'Welcome, ' + user.full_name + '!';

  // Display plan status
  function updatePlanStatus() {
    const planStatus = document.getElementById('plan-status');
    const userActivePlan = EH.getUserActivePlan(user.id);
    
    if (userActivePlan) {
      const todayViews = EH.getUserAdViewsToday(user.id);
      const remainingViews = userActivePlan.ads_per_day - todayViews;
      const purchaseDate = new Date(userActivePlan.purchased_at);
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + userActivePlan.duration);
      const perAdEarnings = userActivePlan.daily_earnings / userActivePlan.ads_per_day;
      
      planStatus.innerHTML = `
        <div style="margin-bottom: 0.5rem;">
          <strong>${userActivePlan.name}</strong>
        </div>
        <div style="font-size: 0.9rem;">
          ${remainingViews} ads remaining today
        </div>
        <div style="font-size: 0.9rem;">
          Earns: ${EH.formatCurrency(perAdEarnings)} per ad
        </div>
        <div style="font-size: 0.9rem;">
          Daily: ${EH.formatCurrency(userActivePlan.daily_earnings)}
        </div>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">
          Expires: ${expiryDate.toLocaleDateString()}
        </div>
      `;
    } else {
      planStatus.innerHTML = `
        <div style="margin-bottom: 0.5rem;">
          <strong>No active plan</strong>
        </div>
        <div style="font-size: 0.9rem;">
          Purchase a plan to watch ads
        </div>
      `;
    }
  }

  // Refresh all stats
  function refreshStats() {
    const earningsMap = EH.getUserEarningsMap();
    const logs = earningsMap[user.id] || [];
    const today = new Date().toDateString();
    const todayTotal = logs
      .filter((e) => new Date(e.created_at).toDateString() === today)
      .reduce((a, b) => a + b.amount, 0);
    const totalViews = logs.length;

    document.getElementById('current-balance').textContent =
      EH.formatCurrency(user.balance);
    document.getElementById('total-earned').textContent =
      EH.formatCurrency(user.total_earned);
    document.getElementById('today-earnings').textContent =
      EH.formatCurrency(todayTotal);
    document.getElementById('total-views').textContent = String(totalViews);

    // Update plan status
    updatePlanStatus();

    // Recent earnings
    const recentWrap = document.getElementById('recent-earnings-wrap');
    const tbody = document.getElementById('recent-earnings');
    tbody.innerHTML = '';
    if (logs.length) {
      recentWrap.style.display = '';
      logs
        .slice()
        .reverse()
        .slice(0, 10)
        .forEach((e) => {
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' +
            EH.formatCurrency(e.amount) +
            '</td><td>' +
            e.source +
            '</td><td>' +
            new Date(e.created_at).toLocaleString() +
            '</td>';
          tbody.appendChild(tr);
        });
    } else {
      recentWrap.style.display = 'none';
    }
  }

  // Render ads list with plan check
  function renderAds() {
    const userActivePlan = EH.getUserActivePlan(user.id);
    const grid = document.getElementById('ads-grid');
    
    if (!userActivePlan) {
      grid.innerHTML = `
        <div class="dashboard-card" style="grid-column: 1 / -1; text-align: center;">
          <h3>No Active Plan</h3>
          <p>You need to purchase a plan to watch ads and earn money</p>
          <a href="./plans.html" class="btn btn-primary">View Plans</a>
        </div>
      `;
      return;
    }

    // Check if user has reached daily ad limit
    const todayViews = EH.getUserAdViewsToday(user.id);
    if (todayViews >= userActivePlan.ads_per_day) {
      grid.innerHTML = `
        <div class="dashboard-card" style="grid-column: 1 / -1; text-align: center;">
          <h3>Daily Limit Reached</h3>
          <p>You've watched ${todayViews} ads today. Come back tomorrow!</p>
          <p>Your plan: ${userActivePlan.name} (${userActivePlan.ads_per_day} ads/day)</p>
          <p>Daily earnings: ${EH.formatCurrency(userActivePlan.daily_earnings)}</p>
        </div>
      `;
      return;
    }

    // Show ALL available ads from the pool
    const ads = EH.getAds();
    grid.innerHTML = '';
    
    if (ads.length === 0) {
      grid.innerHTML = `
        <div class="dashboard-card" style="grid-column: 1 / -1; text-align: center;">
          <h3>No Ads Available</h3>
          <p>Check back later for available ads</p>
        </div>
      `;
      return;
    }
    
    // Calculate earnings per ad based on user's plan
    const perAdEarnings = userActivePlan.daily_earnings / userActivePlan.ads_per_day;
    
    // Show all ads (users can watch any of them)
    ads.forEach(ad => {
      const card = document.createElement('div');
      card.className = 'ad-card';
      card.setAttribute('data-ad-id', ad.id);
      card.innerHTML = `
        <h3>${ad.title}</h3>
        <div class="ad-image">Ad Content</div>
        <p>${ad.description}</p>
        <div class="timer hidden" id="timer-${ad.id}">${ad.watch_duration}</div>
        <button class="btn btn-primary watch-ad-btn">Watch & Earn ${EH.formatCurrency(perAdEarnings)}</button>
      `;

      const btn = card.querySelector('button');
      btn.addEventListener('click', function() {
        watchAd(ad, card, btn, perAdEarnings);
      });
      grid.appendChild(card);
    });
  }

  // Watch ad logic with plan validation
  function watchAd(ad, card, button, rewardAmount) {
    const userActivePlan = EH.getUserActivePlan(user.id);
    if (!userActivePlan) {
      alert('You need an active plan to watch ads!');
      return;
    }

    // Check if user has reached daily limit
    if (!EH.canUserWatchAdToday(user.id)) {
      alert('You have reached your daily ad limit. Come back tomorrow!');
      return;
    }

    const timer = card.querySelector('#timer-' + ad.id);
    const duration = ad.watch_duration;

    card.classList.add('ad-disabled');
    button.disabled = true;
    button.textContent = 'Watching...';
    timer.classList.remove('hidden');
    timer.classList.add('visible');

    let timeLeft = duration;
    timer.textContent = timeLeft;
    const countdown = setInterval(function () {
      timeLeft--;
      timer.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(countdown);
        
        // Record that user watched an ad today
        EH.recordAdView(user.id);
        
        // record earning
        const now = new Date().toISOString();
        const earningsMap = EH.getUserEarningsMap();
        const logs = earningsMap[user.id] || [];
        logs.push({ amount: rewardAmount, source: ad.title, created_at: now });
        earningsMap[user.id] = logs;
        EH.setUserEarningsMap(earningsMap);

        // update user balances
        const updated = Object.assign({}, user, {
          balance: user.balance + rewardAmount,
          total_earned: user.total_earned + rewardAmount,
          updated_at: now,
        });
        EH.upsertUser(updated);
        // refresh user in memory
        Object.assign(user, updated);

        button.textContent = 'Earned ' + EH.formatCurrency(rewardAmount) + '!';
        button.style.background = 'linear-gradient(45deg, #11998e, #38ef7d)';
        timer.classList.add('hidden');
        refreshStats();
        setTimeout(function () {
          // After watching, re-render to show limit reached if applicable
          renderAds();
        }, 3000);
      }
    }, 1000);
  }

  // Withdrawals approve/reject
  const withdrawalsTable = document.getElementById('withdrawals-list');
  if (withdrawalsTable) {
    withdrawalsTable.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-approve')) {
        const row = e.target.closest('tr');
        const statusCell = row.querySelector('.status');
        statusCell.innerHTML = `<span style="color:#1dd1a1;">Approved</span>`;
      }

      if (e.target.classList.contains('btn-reject')) {
        const row = e.target.closest('tr');
        const statusCell = row.querySelector('.status');
        const reason = prompt('Enter reason for rejection:');

        if (reason) {
          statusCell.innerHTML = `<span style="color:#ff6b6b;">Rejected</span><br><small>${reason}</small>`;
        }
      }
    });
  }

  // Run on page load
  renderAds();
  refreshStats();
});