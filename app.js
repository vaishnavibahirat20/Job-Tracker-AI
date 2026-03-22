const listEl = document.getElementById('list');
const form = document.getElementById('appForm');
const statsEl = document.getElementById('stats');
const reviewBox = document.getElementById('reviewBox');
const reviewBtn = document.getElementById('reviewBtn');
const searchEl = document.getElementById('search');
let applications = [];
let selectedApp = null;

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function renderStats(items) {
  const total = items.length;
  const interviews = items.filter(a => a.status === 'Interview').length;
  const offers = items.filter(a => a.status === 'Offer').length;
  const applied = items.filter(a => a.status === 'Applied').length;
  statsEl.innerHTML = `
    <div class="stat"><span>Total</span><strong>${total}</strong></div>
    <div class="stat"><span>Applied</span><strong>${applied}</strong></div>
    <div class="stat"><span>Interviews</span><strong>${interviews}</strong></div>
    <div class="stat"><span>Offers</span><strong>${offers}</strong></div>
  `;
}

function renderList(items) {
  const query = searchEl.value.trim().toLowerCase();
  const filtered = items.filter(item => {
    const text = `${item.company} ${item.role} ${item.status}`.toLowerCase();
    return text.includes(query);
  });

  listEl.innerHTML = filtered.map(item => `
    <div class="item">
      <div class="item-top">
        <div>
          <h3>${item.company} <span class="badge">${item.status}</span></h3>
          <p class="muted">${item.role} ${item.location ? '• ' + item.location : ''}</p>
          <p class="muted">Applied: ${item.dateApplied || 'N/A'} ${item.deadline ? '• Deadline: ' + item.deadline : ''}</p>
          <p>${item.notes || ''}</p>
        </div>
        <button type="button" onclick="setSelected(${item.id})">AI review</button>
      </div>
      <div class="actions">
        <button type="button" onclick="updateStatus(${item.id}, 'Interview')">Interview</button>
        <button type="button" onclick="updateStatus(${item.id}, 'Offer')">Offer</button>
        <button type="button" onclick="updateStatus(${item.id}, 'Rejected')">Rejected</button>
        <button type="button" class="danger" onclick="removeItem(${item.id})">Delete</button>
      </div>
    </div>
  `).join('') || '<p class="muted">No applications found.</p>';
}

async function loadData() {
  applications = await api('/api/applications');
  renderStats(applications);
  renderList(applications);
  if (!selectedApp && applications.length) selectedApp = applications[0];
}

window.setSelected = function(id) {
  selectedApp = applications.find(a => a.id === id);
  if (selectedApp) {
    reviewBox.textContent = 'Selected ' + selectedApp.company + ' - ' + selectedApp.role + '\nClick Generate review to analyze it.';
  }
};

window.updateStatus = async function(id, status) {
  await api(`/api/applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  await loadData();
};

window.removeItem = async function(id) {
  await api(`/api/applications/${id}`, { method: 'DELETE' });
  if (selectedApp && selectedApp.id === id) selectedApp = null;
  await loadData();
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const created = await api('/api/applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  form.reset();
  selectedApp = created;
  reviewBox.textContent = 'Saved. Click Generate review to see AI feedback for the new application.';
  await loadData();
});

reviewBtn.addEventListener('click', async () => {
  const source = selectedApp || applications[0];
  if (!source) {
    reviewBox.textContent = 'Add an application first.';
    return;
  }
  const review = await api('/api/review', {
    method: 'POST',
    body: JSON.stringify(source)
  });
  reviewBox.textContent = `Score: ${review.score}/100\n\n${review.summary}\n\nSuggestions:\n- ${review.suggestions.join('\n- ')}\n\n${review.followUp}`;
});

searchEl.addEventListener('input', () => renderList(applications));

loadData().catch(err => {
  reviewBox.textContent = 'Error loading data: ' + err.message;
});
