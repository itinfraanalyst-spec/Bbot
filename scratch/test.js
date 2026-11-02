
        // Theme Logic
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const themeIconMoon = document.getElementById('theme-icon-moon');
        const themeIconSun = document.getElementById('theme-icon-sun');

        function initTheme() {
            const savedTheme = localStorage.getItem('chatbot-theme') || 'dark';
            setTheme(savedTheme);
        }

        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('chatbot-theme', theme);
            if (theme === 'light') {
                themeIconMoon.style.display = 'none';
                themeIconSun.style.display = 'block';
            } else {
                themeIconMoon.style.display = 'block';
                themeIconSun.style.display = 'none';
            }
        }

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });

        initTheme();

        // Data Logic
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login.html';
        }

        async function loadPendingUsers() {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('content').classList.add('hidden');
            
            try {
                const res = await fetch('/auth/admin/pending', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.status === 401 || res.status === 403) {
                    document.getElementById('admin-panel').classList.add('hidden');
                    document.getElementById('access-denied').classList.remove('hidden');
                    return;
                }
                
                if (!res.ok) throw new Error("Failed to fetch");
                
                const data = await res.json();
                const users = data.pending_users;
                
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
                document.getElementById('admin-panel').classList.remove('hidden');
                
                const list = document.getElementById('users-list');
                list.innerHTML = '';
                
                if (!users || users.length === 0) {
                    document.getElementById('empty-message').classList.remove('hidden');
                    document.getElementById('users-list').classList.add('hidden');
                } else {
                    document.getElementById('empty-message').classList.add('hidden');
                    document.getElementById('users-list').classList.remove('hidden');
                    
                    users.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    
                    users.forEach(user => {
                        const card = document.createElement('div');
                        card.className = 'user-card';
                        card.id = `user-card-${user.id}`;
                        
                        const initials = user.username.substring(0, 2);
                        const dateStr = new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        
                        card.innerHTML = `
                            <div class="user-info">
                                <div class="user-avatar">${initials}</div>
                                <div class="user-details">
                                    <span class="user-name">${user.username}</span>
                                    <span class="user-meta">Registered ${dateStr}</span>
                                    <div class="status-badge">
                                        <div class="dot warning"></div> Pending Review
                                    </div>
                                </div>
                            </div>
                            <div class="actions-group" id="actions-${user.id}">
                                <button class="btn-action reject" onclick="actionUser('${user.id}', 'reject')">
                                    Reject
                                </button>
                                <button class="btn-action approve" onclick="actionUser('${user.id}', 'approve')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Approve
                                </button>
                            </div>
                        `;
                        list.appendChild(card);
                    });
                }
            } catch (err) {
                document.getElementById('loading').innerHTML = "<div style='color:var(--error);'>Error loading users.</div>";
            }
        }

        async function actionUser(userId, action) {
            const actionsGroup = document.getElementById(`actions-${userId}`);
            const buttons = actionsGroup.querySelectorAll('button');
            
            // Set loading state
            buttons.forEach(btn => btn.disabled = true);
            const targetBtn = actionsGroup.querySelector(action === 'approve' ? '.approve' : '.reject');
            const originalContent = targetBtn.innerHTML;
            targetBtn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Processing...`;
            
            try {
                const res = await fetch(`/auth/admin/${action}/${userId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    // Show inline toast
                    actionsGroup.innerHTML = `
                        <div class="toast-pill">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ${action === 'approve' ? 'Approved' : 'Rejected'}
                        </div>
                    `;
                    // Refresh table after a brief moment so they see the toast
                    setTimeout(() => {
                        const card = document.getElementById(`user-card-${userId}`);
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(10px)';
                        setTimeout(loadPendingUsers, 300);
                    }, 1200);
                } else {
                    alert(`Failed to ${action} user.`);
                    targetBtn.innerHTML = originalContent;
                    buttons.forEach(btn => btn.disabled = false);
                }
            } catch (err) {
                alert(`Error trying to ${action} user.`);
                targetBtn.innerHTML = originalContent;
                buttons.forEach(btn => btn.disabled = false);
            }
        }
        
        function logout() {
            localStorage.removeItem('access_token');
            window.location.href = '/login.html';
        }

        loadPendingUsers();

        function switchTab(tabId) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
            
            if (tabId === 'activity') loadActivityUsers();
            if (tabId === 'analytics') loadAnalytics();
        }
        
        async function loadActivityUsers() {
            loadActiveDirectory();
            const list = document.getElementById('activity-users-list');
            try {
                const res = await fetch('/auth/admin/approved', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                list.innerHTML = '';
                
                if (!data.approved_users || data.approved_users.length === 0) {
                    list.innerHTML = '<div style="color:var(--text-muted)">No approved users.</div>';
                    return;
                }
                
                data.approved_users.forEach(u => {
                    const el = document.createElement('div');
                    el.className = 'activity-user-row';
                    el.innerText = u.username;
                    el.onclick = (e) => {
                        document.querySelectorAll('.activity-user-row').forEach(r => r.classList.remove('active'));
                        e.target.classList.add('active');
                        loadUserConversations(u.id, u.username);
                    };
                    list.appendChild(el);
                });
            } catch(e) {
                list.innerHTML = '<div style="color:var(--error)">Error loading users</div>';
            }
        }
        
        async function loadUserConversations(userId, username) {
            const pane = document.getElementById('activity-details-pane');
            pane.innerHTML = '<div style="color: var(--text-muted); padding: var(--sp-4);">Loading...</div>';
            
            try {
                const res = await fetch(`/auth/admin/users/${userId}/conversations`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                
                const convs = data.conversations || [];
                const overview = data.user_overview || {};
                
                // Build Overview HTML
                let lastActive = overview.last_active ? new Date(overview.last_active).toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Never';
                let topDocsHtml = '';
                if (overview.top_documents && overview.top_documents.length > 0) {
                    topDocsHtml = `
                        <div style="margin-top: var(--sp-2);">
                            <div class="overview-stat-label" style="margin-bottom: 8px;">Top Attached Documents</div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                ${overview.top_documents.map(d => `
                                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-primary);">
                                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📄 ${d.filename}</span>
                                        <span style="color:var(--text-muted); margin-left:8px;">${d.count}x</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                const overviewHtml = `
                    <div class="user-overview-card" style="position:relative;">
                        <div style="display:flex; align-items:center; gap:var(--sp-3); margin-bottom:var(--sp-2);">
                            <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); color:var(--bg-main); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem;">
                                ${username.charAt(0).toUpperCase()}
                            </div>
                            <h3 style="font-size: 1.2rem; color: var(--text-primary); margin: 0;">${username}</h3>
                        </div>
                        <div style="position:absolute; top:var(--sp-5); right:var(--sp-5);">
                            <button class="btn-secondary" style="font-size:0.8rem; padding:6px 12px; display:flex; align-items:center; gap:6px;" onclick="jumpToUserAnalytics('${userId}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                                View Analytics
                            </button>
                        </div>
                        
                        <div class="overview-stats">
                            <div class="overview-stat-item">
                                <span class="overview-stat-label">Total Messages</span>
                                <span class="overview-stat-value">${overview.total_messages || 0}</span>
                            </div>
                            <div class="overview-stat-item">
                                <span class="overview-stat-label">Conversations</span>
                                <span class="overview-stat-value">${overview.total_conversations || 0}</span>
                            </div>
                            <div class="overview-stat-item">
                                <span class="overview-stat-label">Last Active</span>
                                <span class="overview-stat-value" style="font-size:1rem; margin-top:2px;">${lastActive}</span>
                            </div>
                        </div>
                        ${topDocsHtml}
                    </div>
                `;

                if (convs.length === 0) {
                    pane.innerHTML = overviewHtml + '<div style="color: var(--text-muted); padding: var(--sp-4);">No conversations found.</div>';
                    return;
                }
                
                let listHtml = `<h4 style="margin-bottom: var(--sp-3); color: var(--text-secondary);">Conversations (${convs.length})</h4><div style="display:flex; flex-direction:column; gap:var(--sp-2);">`;
                convs.forEach(c => {
                    const date = new Date(c.updated_at).toLocaleString();
                    listHtml += `
                        <div class="conversation-item" onclick="viewTranscript('${c.id}', '${c.title.replace(/'/g, "\'")}')">
                            <div class="conv-title">${c.title}</div>
                            <div class="conv-meta">
                                <span>${c.message_count} messages</span> • <span>${date}</span>
                            </div>
                        </div>
                    `;
                });
                listHtml += '</div>';
                
                pane.innerHTML = overviewHtml + listHtml;
            } catch(e) {
                console.error(e);
                pane.innerHTML = '<div style="color: var(--error); padding: var(--sp-4);">Failed to load conversations.</div>';
            }
        }
        
        async function loadConversationTranscript(convId) {
            const pane = document.getElementById('activity-details-pane');
            pane.innerHTML = '<div style="color:var(--text-muted)">Loading transcript...</div>';
            
            try {
                const res = await fetch(`/auth/admin/conversations/${convId}/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                
                let html = `<div style="margin-bottom:var(--sp-4);"><button class="btn-action" onclick="document.querySelector('.activity-user-row.active').click()">← Back to list</button></div>`;
                
                if (!data.messages || data.messages.length === 0) {
                    html += '<div style="color:var(--text-muted)">No messages found.</div>';
                } else {
                    data.messages.forEach(m => {
                        const isUser = m.role === 'user';
                        html += `
                            <div class="transcript-msg ${m.role}">
                                <strong style="color:${isUser ? 'var(--text-secondary)' : 'var(--accent)'}; text-transform:uppercase; font-size:0.75rem;">${m.role}</strong>
                                <div style="margin-top:4px; white-space:pre-wrap;">${m.content}</div>
                            </div>
                        `;
                    });
                }
                pane.innerHTML = html;
            } catch(e) {
                pane.innerHTML = '<div style="color:var(--error)">Error loading transcript</div>';
            }
        }
        
        
        
        let currentAnalyticsData = null;
        let chartRange = 'daily';
        let chartUserScope = 'all';

        document.getElementById('analytics-range-select')?.addEventListener('change', (e) => {
            chartRange = e.target.value;
            loadAnalytics();
        });
        document.getElementById('analytics-scope-select')?.addEventListener('change', (e) => {
            chartUserScope = e.target.value;
            loadAnalytics();
        });

        function renderChart() {
            if (!currentAnalyticsData) return;
            const data = currentAnalyticsData;
            const chart = document.getElementById('analytics-chart');
            chart.innerHTML = '';
            
            if (data.volume.length > 0) {
                let plotData = [...data.volume];
                
                const maxVal = Math.max(...plotData.map(d => d.count), 1);
                
                // Base grid layout
                chart.style.display = 'flex';
                chart.style.alignItems = 'flex-end';
                chart.style.justifyContent = 'space-between';
                chart.style.gap = '4px';
                chart.style.paddingTop = '20px'; // space for tooltips
                chart.style.borderBottom = '1px solid var(--border-subtle)';
                
                // Let's add simple y-axis ticks
                const tickHtml = `
                    <div style="position:absolute; left:0; top:0; bottom:0; width:30px; display:flex; flex-direction:column; justify-content:space-between; border-right:1px solid var(--border-subtle); font-size:0.7rem; color:var(--text-muted); padding-right:4px; text-align:right;">
                        <span>${maxVal}</span>
                        <span>${Math.round(maxVal/2)}</span>
                        <span>0</span>
                    </div>
                `;
                chart.style.position = 'relative';
                chart.style.paddingLeft = '40px';
                chart.innerHTML += tickHtml;

                plotData.forEach(d => {
                    const height = (d.count / maxVal) * 100;
                    let label = d.date;
                    if(chartRange === 'daily' || chartRange === 'weekly') {
                        const dateObj = new Date(d.date);
                        label = dateObj.toLocaleDateString([], {month:'short', day:'numeric'});
                    } else if(chartRange === 'monthly') {
                        // format: YYYY-MM
                        const parts = d.date.split('-');
                        const m = new Date(parts[0], parseInt(parts[1])-1, 1).toLocaleDateString([], {month:'short', year:'2-digit'});
                        label = m;
                    }
                    
                    chart.innerHTML += `
                        <div class="bar" style="height: ${height}%; width: 100%; max-width: 40px; background: linear-gradient(to top, var(--accent), transparent); border-radius: 2px 2px 0 0; position: relative;">
                            <div class="chart-tooltip">${label}: ${d.count}</div>
                            <div class="bar-label" style="font-size:0.65rem; position:absolute; bottom:-20px; left:50%; transform:translateX(-50%) rotate(-45deg); white-space:nowrap;">${label}</div>
                        </div>
                    `;
                });
                
                chart.style.marginBottom = '25px'; // space for labels
            } else {
                chart.innerHTML = '<div style="color:var(--text-muted); align-self:center; width:100%; text-align:center; padding: 40px 0;">No data available for this range/user</div>';
            }
        }

        async function loadAnalytics() {
            try {
                const url = `/auth/admin/analytics?range=${chartRange}&user_id=${chartUserScope}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                currentAnalyticsData = data;
                
                // Summary Stats
                if (data.summary) {
                    const summaryHtml = `
                        <div class="stat-card">
                            <div class="stat-label">Total Messages</div>
                            <div class="stat-value">${data.summary.total_messages}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Convs</div>
                            <div class="stat-value">${data.summary.total_conversations}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Approved Users</div>
                            <div class="stat-value">${data.summary.total_users}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Active Today</div>
                            <div class="stat-value">${data.summary.active_today}</div>
                        </div>
                    `;
                    document.getElementById('analytics-summary').innerHTML = summaryHtml;
                }

                // Render Chart
                renderChart();
                
                // Render Top Users
                const topUsers = document.getElementById('analytics-top-users');
                const topUsersCard = topUsers.closest('.user-card');
                if (chartUserScope !== 'all') {
                    if (topUsersCard) topUsersCard.style.display = 'none';
                } else {
                    if (topUsersCard) topUsersCard.style.display = 'flex';
                    topUsers.innerHTML = data.top_users.map((u, i) => {

                    let sparklineHtml = '<div class="sparkline-container">';
                    if (u.sparkline && u.sparkline.length > 0) {
                        const sparkMax = Math.max(...u.sparkline.map(s => s.count), 1);
                        u.sparkline.forEach(s => {
                            const h = (s.count / sparkMax) * 100;
                            sparklineHtml += `<div class="spark-bar" style="height: ${h}%" title="${s.count}"></div>`;
                        });
                    } else {
                        sparklineHtml += '<div style="color:var(--text-muted); font-size:0.6rem;">No recent</div>';
                    }
                    sparklineHtml += '</div>';
                    const clickAction = u.user_id ? `onclick="jumpToUserActivity('${u.user_id}', '${u.username}')"` : '';
                    return `
                    <div class="top-user-row" ${clickAction}>
                        <div style="display:flex; flex-direction:column;">
                            <span style="color:var(--text-primary);"><span style="color:var(--text-muted); margin-right:8px;">${i+1}.</span>${u.username}</span>
                            <span style="color:var(--text-secondary); font-weight:500; font-size:0.8rem; margin-left: 20px;">${u.count} msgs</span>
                        </div>
                        ${sparklineHtml}
                    </div>
                `}).join('') || '<div style="color:var(--text-muted);">No data available</div>';
                }
                
                // Render Top Docs
                const topDocs = document.getElementById('analytics-top-docs');
                if (data.top_documents && data.top_documents.length > 0) {
                    topDocs.innerHTML = data.top_documents.map((d, i) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--sp-2) 0; border-bottom:1px solid var(--border-subtle);">
                            <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                <span style="color:var(--text-primary); font-size:0.9rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${d.filename}">${d.filename}</span>
                            </div>
                            <span style="color:var(--text-secondary); font-weight:500; font-size:0.85rem;">${d.count} uses</span>
                        </div>
                    `).join('');
                } else {
                    topDocs.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">No documents attached yet.</div>';
                }

                // Render Trending
                const trending = document.getElementById('analytics-trending');
                if (data.trending && data.trending.length >= 3) {
                    trending.innerHTML = data.trending.map((t, i) => `
                        <div style="display:flex; justify-content:space-between; padding:var(--sp-2) 0; border-bottom:1px solid var(--border-subtle);">
                            <span style="color:var(--text-primary);"><span style="color:var(--text-muted); margin-right:8px;">#</span>${t.term}</span>
                            <span style="color:var(--text-secondary); font-weight:500;">${t.count}</span>
                        </div>
                    `).join('');
                } else {
                    trending.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Not enough message data yet to determine trends.</div>';
                }
                
            } catch(e) {
                console.error("Failed to load analytics", e);
            }
        }
        
        function jumpToUserActivity(userId, username) {
            switchTab('activity');
            setTimeout(() => {
                const rows = document.querySelectorAll('.activity-user-row');
                let found = false;
                rows.forEach(r => {
                    if (r.innerText === username) {
                        r.click();
                        found = true;
                    }
                });
                if (!found) {
                    loadUserConversations(userId, username);
                }
            }, 300);
        }

        
        function jumpToUserAnalytics(userId) {
            switchTab('analytics');
            const scopeSelect = document.getElementById('analytics-scope-select');
            if(scopeSelect) {
                scopeSelect.value = userId;
                chartUserScope = userId;
                loadAnalytics();
            }
        }

        /* --- ADMIN USER MANAGEMENT --- */
        
        async function loadActiveDirectory() {
            try {
                const res = await fetch('/auth/admin/users/active', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                const list = document.getElementById('active-directory-list');
                const scopeSelect = document.getElementById('analytics-scope-select');
                
                // Populate Scope Select
                let scopeHtml = '<option value="all">System-wide</option>';
                data.active_users.forEach(u => {
                    scopeHtml += `<option value="${u.id}">${u.username}</option>`;
                });
                scopeSelect.innerHTML = scopeHtml;
                scopeSelect.value = chartUserScope;
                
                // Populate Directory
                if(data.active_users.length === 0){
                    list.innerHTML = '<div style="color:var(--text-muted); padding:var(--sp-4);">No active users.</div>';
                    return;
                }
                
                list.innerHTML = data.active_users.map(u => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--sp-3); border-bottom:1px solid var(--border-subtle);">
                        <div style="display:flex; flex-direction:column;">
                            <span style="color:var(--text-primary); font-weight:500;">${u.username}</span>
                            <span style="color:var(--text-muted); font-size:0.8rem;">Status: ${u.status} | Role: ${u.is_admin ? '<span style="color:var(--accent);">Admin</span>' : 'User'}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            ${!u.is_admin ? `<button class="btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="promoteUser('${u.id}')">Promote to Admin</button>` : `<button class="btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="demoteUser('${u.id}')">Demote</button>`}
                            <button class="btn-secondary" style="font-size:0.75rem; padding:4px 8px; color:var(--error);" onclick="deactivateUser('${u.id}')">Deactivate</button>
                        </div>
                    </div>
                `).join('');
            } catch(e) {
                console.error(e);
            }
        }
        
        function showAddUserModal() {
            document.getElementById('new-user-name').value = '';
            document.getElementById('new-user-pass').value = '';
            document.getElementById('add-user-error').innerText = '';
            document.getElementById('add-user-modal').classList.remove('hidden');
        }
        function closeAddUserModal() {
            document.getElementById('add-user-modal').classList.add('hidden');
        }
        async function submitNewUser() {
            const username = document.getElementById('new-user-name').value;
            const password = document.getElementById('new-user-pass').value;
            const errDiv = document.getElementById('add-user-error');
            
            if(!username || !password || password.length < 6) {
                errDiv.innerText = "Valid username and 6+ char password required.";
                return;
            }
            
            try {
                const res = await fetch('/auth/admin/users', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({username, password})
                });
                if(res.ok) {
                    closeAddUserModal();
                    loadActiveDirectory();
                    loadActivityUsers(); // refresh side list
                } else {
                    const data = await res.json();
                    errDiv.innerText = data.detail || "Error creating user";
                }
            } catch(e) {
                errDiv.innerText = "Network error";
            }
        }
        
        async function promoteUser(id) {
            await fetch(`/auth/admin/users/${id}/promote`, {method:'POST', headers:{'Authorization': `Bearer ${token}`}});
            loadActiveDirectory();
        }
        async function demoteUser(id) {
            if(!confirm("Are you sure you want to demote this admin?")) return;
            const res = await fetch(`/auth/admin/users/${id}/demote`, {method:'POST', headers:{'Authorization': `Bearer ${token}`}});
            if(!res.ok) {
                const data = await res.json();
                alert(data.detail || "Failed to demote");
            }
            loadActiveDirectory();
        }
        async function deactivateUser(id) {
            if(!confirm("Are you sure you want to deactivate this user? They will lose login access.")) return;
            const res = await fetch(`/auth/admin/users/${id}/deactivate`, {method:'POST', headers:{'Authorization': `Bearer ${token}`}});
            if(!res.ok) {
                const data = await res.json();
                alert(data.detail || "Failed to deactivate");
            }
            loadActiveDirectory();
            loadActivityUsers();
        }



    