document.addEventListener('DOMContentLoaded', function() {
    const user = EH.requireAuth();
    if (!user) return;

    const plansContainer = document.getElementById('plans-container');
    const messageEl = document.getElementById('message');
    const currentPlanSection = document.getElementById('current-plan-section');
    const currentPlanCard = document.getElementById('current-plan-card');

    function renderPlans() {
        const plans = EH.getPlans();
        const userActivePlan = EH.getUserActivePlan(user.id);
        
        // === Current Plan Section ===
        if (userActivePlan) {
            currentPlanSection.style.display = 'block';
            const purchaseDate = new Date(userActivePlan.purchased_at);
            const expiryDate = new Date(purchaseDate);
            expiryDate.setDate(expiryDate.getDate() + userActivePlan.duration);
            const perAdEarnings = userActivePlan.daily_earnings / userActivePlan.ads_per_day;
            const monthlyEarnings = userActivePlan.daily_earnings * 30;
            
            currentPlanCard.innerHTML = `
                <h3>${userActivePlan.name}</h3>
                <p>${userActivePlan.description}</p>
                <div class="plan-box">
                    <p><strong>Investment:</strong> ${EH.formatCurrency(userActivePlan.price)}</p>
                    <p><strong>Daily Earnings:</strong> ${EH.formatCurrency(userActivePlan.daily_earnings)}</p>
                    <p><strong>Earnings Per Ad:</strong> ${EH.formatCurrency(perAdEarnings)}</p>
                    <p><strong>Ads Per Day:</strong> ${userActivePlan.ads_per_day}</p>
                    <p><strong>Monthly Potential:</strong> ${EH.formatCurrency(monthlyEarnings)}</p>
                    <p><strong>ROI:</strong> ${((monthlyEarnings / userActivePlan.price) * 100).toFixed(1)}% monthly</p>
                </div>
                <p><strong>Purchased:</strong> ${purchaseDate.toLocaleDateString()}</p>
                <p><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span style="color: #1dd1a1; font-weight: bold;">Active</span></p>
            `;
        } else {
            currentPlanSection.style.display = 'none';
        }

        // === Render All Plans ===
        plansContainer.innerHTML = '';
        plans.forEach(plan => {
            const perAdEarnings = plan.daily_earnings / plan.ads_per_day;
            const monthlyEarnings = plan.daily_earnings * 30;
            const roiPercentage = ((monthlyEarnings / plan.price) * 100).toFixed(1);
            
            const planCard = document.createElement('div');
            planCard.className = 'dashboard-card';
            planCard.innerHTML = `
                <h3>${plan.name}</h3>
                <p>${plan.description}</p>
                <div class="balance-amount">${EH.formatCurrency(plan.price)}</div>
                
                <div class="plan-features">
                    <p><span>Daily Earnings:</span> ${EH.formatCurrency(plan.daily_earnings)}</p>
                    <p><span>Earnings Per Ad:</span> ${EH.formatCurrency(perAdEarnings)}</p>
                    <p><span>Ads Per Day:</span> ${plan.ads_per_day}</p>
                    <p><span>Monthly Potential:</span> ${EH.formatCurrency(monthlyEarnings)}</p>
                    <p><span>ROI:</span> ${roiPercentage}% monthly</p>
                </div>
                
                <button class="btn btn-primary purchase-btn" data-plan-id="${plan.id}">Buy Now</button>
            `;
            plansContainer.appendChild(planCard);
        });

        // === Buy Button Event ===
        document.querySelectorAll('.purchase-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const planId = parseInt(this.getAttribute('data-plan-id'));
                showPaymentModal(planId);
            });
        });

        // === History ===
        renderPlanHistory();
    }

    function showPaymentModal(planId) {
        const plans = EH.getPlans();
        const plan = plans.find(p => p.id === planId);
        
        if (!plan) {
            showMessage('Plan not found!', 'error');
            return;
        }

        const perAdEarnings = plan.daily_earnings / plan.ads_per_day;
        const monthlyEarnings = plan.daily_earnings * 30;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>Purchase ${plan.name}</h2>
                <div class="plan-box">
                    <p><strong>Investment:</strong> ${EH.formatCurrency(plan.price)}</p>
                    <p><strong>Daily Earnings:</strong> ${EH.formatCurrency(plan.daily_earnings)}</p>
                    <p><strong>Earnings Per Ad:</strong> ${EH.formatCurrency(perAdEarnings)}</p>
                    <p><strong>Ads Per Day:</strong> ${plan.ads_per_day}</p>
                    <p><strong>Monthly Potential:</strong> ${EH.formatCurrency(monthlyEarnings)}</p>
                </div>
                <form id="payment-form">
                    <div class="form-group">
                        <label>Payment Method *</label>
                        <select id="payment-method" required>
                            <option value="">Select method</option>
                            <option value="JazzCash">JazzCash</option>
                            <option value="EasyPaisa">EasyPaisa</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Account Holder Name *</label>
                        <input type="text" id="account-name" required>
                    </div>
                    <div class="form-group">
                        <label>Account Number *</label>
                        <input type="text" id="account-number" required>
                    </div>
                    <div class="form-group">
                        <label>Transaction ID *</label>
                        <input type="text" id="transaction-id" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Request</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const form = document.getElementById('payment-form');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitPlanRequest(plan, modal);
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
    }

    function submitPlanRequest(plan, modal) {
        const paymentMethod = document.getElementById('payment-method').value;
        const accountName = document.getElementById('account-name').value.trim();
        const accountNumber = document.getElementById('account-number').value.trim();
        const transactionId = document.getElementById('transaction-id').value.trim();

        if (!paymentMethod || !accountName || !accountNumber || !transactionId) {
            showMessage('Please fill all required fields!', 'error');
            return;
        }

        EH.addPlanRequest(plan.id, paymentMethod, accountName, accountNumber, transactionId);

        showMessage('Plan request submitted successfully! Waiting for admin approval.', 'success');
        modal.remove();
        renderPlanHistory();
    }

    function renderPlanHistory() {
        const container = document.getElementById('plan-history-container');
        if (!container) return;
        
        const allRequests = EH.getPlanRequests();
        const userRequests = allRequests.filter(req => req.user_id === user.id);
        
        container.innerHTML = userRequests.length ? '' : '<p>No plan request history</p>';

        if (userRequests.length) {
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Plan</th><th>Amount</th><th>Daily</th><th>Ads</th>
                        <th>Payment</th><th>Txn ID</th><th>Status</th>
                        <th>Requested</th><th>Processed</th>
                    </tr>
                </thead><tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            userRequests.forEach(r => {
                let color = '#ff9f43', text = 'Pending';
                if (r.status === 'approved') { color = '#1dd1a1'; text = 'Approved'; }
                if (r.status === 'rejected') { color = '#ff6b6b'; text = 'Rejected'; }
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.plan_name}</td>
                    <td>${EH.formatCurrency(r.plan_price)}</td>
                    <td>${EH.formatCurrency(r.daily_earnings)}</td>
                    <td>${r.ads_per_day}</td>
                    <td>${r.payment_method}</td>
                    <td>${r.transaction_id}</td>
                    <td style="color:${color};font-weight:bold;">${text}</td>
                    <td>${new Date(r.requested_at).toLocaleString()}</td>
                    <td>${r.processed_at ? new Date(r.processed_at).toLocaleString() : '-'}</td>
                `;
                tbody.appendChild(tr);
            });

            container.appendChild(table);
        }
    }

    function showMessage(text, type) {
        messageEl.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => messageEl.innerHTML = '', 5000);
    }

    renderPlans();
});
