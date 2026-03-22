# AI-Powered Job Application Tracker

A full working local project for GitHub and portfolio use.

## Features
- Add, edit, and delete job applications
- Track status: Applied, Interview, Offer, Rejected
- Dashboard stats
- Search by company or role
- AI-style resume review endpoint
- JSON file storage so it works locally with no database setup

## Run locally

```bash
npm install
npm start
```

Then open:

```bash
http://localhost:3000
```

## Files
- `server.js` - Express backend + API
- `public/` - frontend
- `data/store.json` - local storage

## Optional AI setup
This starter includes a built-in analysis fallback so it works without an API key.
If you later want real OpenAI responses, add `OPENAI_API_KEY` to a `.env` file and extend the `/api/review` route.
