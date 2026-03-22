const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { applications: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function nextId(applications) {
  return applications.length ? Math.max(...applications.map(a => a.id)) + 1 : 1;
}

function scoreResume(app) {
  const text = `${app.role} ${app.company} ${app.notes || ''} ${app.resumeText || ''} ${app.coverLetterText || ''}`.toLowerCase();
  const keywords = ['react', 'node', 'python', 'sql', 'api', 'docker', 'aws', 'typescript', 'javascript', 'mongodb', 'postgresql'];
  const hits = keywords.filter(k => text.includes(k)).length;
  return Math.min(100, 35 + hits * 7);
}

function buildAIReview(app) {
  const score = scoreResume(app);
  const suggestions = [];
  if (!app.resumeText) suggestions.push('Add resume text to get a better AI review.');
  if (!app.coverLetterText) suggestions.push('Add a cover letter draft for stronger feedback.');
  if (!app.notes) suggestions.push('Add follow-up notes and interview prep reminders.');
  if ((app.resumeText || '').length < 120) suggestions.push('Expand bullet points with measurable outcomes.');
  if (score < 60) suggestions.push('Include more role-specific keywords from the job description.');
  if (score >= 60) suggestions.push('Your application looks solid; tailor the summary to the company mission.');
  return {
    score,
    summary: `Estimated application strength for ${app.role} at ${app.company}.`,
    suggestions: suggestions.slice(0, 4),
    followUp: app.deadline ? `Set a follow-up reminder 7 days after ${app.deadline}.` : 'Set a follow-up reminder two weeks after applying.'
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Job tracker API is running' });
});

app.get('/api/applications', (req, res) => {
  const store = readStore();
  res.json(store.applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/applications', (req, res) => {
  const { company, role, status, location, dateApplied, deadline, notes, resumeText, coverLetterText } = req.body || {};
  if (!company || !role) {
    return res.status(400).json({ error: 'company and role are required' });
  }
  const store = readStore();
  const application = {
    id: nextId(store.applications),
    company,
    role,
    status: status || 'Applied',
    location: location || '',
    dateApplied: dateApplied || new Date().toISOString().slice(0, 10),
    deadline: deadline || '',
    notes: notes || '',
    resumeText: resumeText || '',
    coverLetterText: coverLetterText || '',
    createdAt: new Date().toISOString()
  };
  store.applications.unshift(application);
  writeStore(store);
  res.status(201).json(application);
});

app.put('/api/applications/:id', (req, res) => {
  const id = Number(req.params.id);
  const store = readStore();
  const idx = store.applications.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Application not found' });

  store.applications[idx] = { ...store.applications[idx], ...req.body, id };
  writeStore(store);
  res.json(store.applications[idx]);
});

app.delete('/api/applications/:id', (req, res) => {
  const id = Number(req.params.id);
  const store = readStore();
  const before = store.applications.length;
  store.applications = store.applications.filter(a => a.id !== id);
  if (store.applications.length === before) return res.status(404).json({ error: 'Application not found' });
  writeStore(store);
  res.json({ deleted: true });
});

app.post('/api/review', (req, res) => {
  const appData = req.body || {};
  if (!appData.company || !appData.role) {
    return res.status(400).json({ error: 'company and role are required' });
  }
  res.json(buildAIReview(appData));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Job tracker running on http://localhost:${PORT}`);
});
