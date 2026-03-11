# 🟢 Pillimarket

> A prediction market polling platform inspired by Polymarket.

![Dark theme · Real-time voting · MongoDB persistence]

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ 
- **MongoDB** running locally (or a MongoDB Atlas URI)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server/server.js
```

Open **http://localhost:5000** in your browser.

---

## 🔧 Configuration

By default the app connects to:
```
mongodb://127.0.0.1:27017/pillimarket
```

To use a custom URI (e.g. MongoDB Atlas):
```bash
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/pillimarket" node server/server.js
```

To change the port:
```bash
PORT=3000 node server/server.js
```

---

## 📁 Project Structure

```
pillimarket/
├── server/
│   ├── server.js          ← Express app + MongoDB connection
│   ├── models/
│   │   └── Poll.js        ← Mongoose schema
│   └── routes/
│       └── polls.js       ← REST API routes
│
├── public/
│   ├── index.html         ← Homepage (all markets)
│   ├── create.html        ← Create a new poll
│   ├── style.css          ← Dark theme styles
│   └── script.js          ← Frontend logic
│
├── package.json
└── README.md
```

---

## 🌐 API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/polls` | Get all polls (`?sort=newest\|popular`) |
| GET | `/api/polls/trending` | Top 3 polls by votes |
| GET | `/api/polls/:id` | Get a single poll |
| POST | `/api/polls` | Create a new poll |
| POST | `/api/polls/:id/vote` | Vote on an option |
| DELETE | `/api/polls/:id` | Delete a poll |

### Create Poll — Request Body
```json
{
  "question": "Will AI replace programmers?",
  "options": ["Yes", "No", "Partially"],
  "category": "Tech"
}
```

### Vote — Request Body
```json
{ "optionIndex": 0 }
```

---

## ✨ Features

- **Dark Polymarket-inspired UI** with Syne + DM Sans fonts
- **Real-time vote updates** — results refresh without page reload
- **Auto-refresh** every 5 seconds for live vote counts
- **Trending section** showing top 3 most-voted polls
- **Sort** by Newest or Most Popular
- **Search** polls by question or category
- **Duplicate vote prevention** via `localStorage`
- **Live preview** while creating a poll
- **Animated progress bars** per option
- **Category badges** with distinct colors
- **Toast notifications** for user actions
- **MongoDB persistence** — data survives restarts
- **Responsive** mobile-friendly layout

---

## 🛠 Development

```bash
# Install nodemon for auto-restart on file changes
npm install -g nodemon

# Run in dev mode
npm run dev
```

---

## 📄 License

MIT © Pillimarket 2025
