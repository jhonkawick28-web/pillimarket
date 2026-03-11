const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');

// GET /api/polls — return all polls, newest first
router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sort || 'newest';
    let sort = { createdAt: -1 };
    if (sortBy === 'popular') sort = { totalVotes: -1 };

    const polls = await Poll.find().sort(sort);
    res.json({ success: true, polls });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/polls/trending — top 3 most voted polls
router.get('/trending', async (req, res) => {
  try {
    const polls = await Poll.find().sort({ totalVotes: -1 }).limit(3);
    res.json({ success: true, polls });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/polls/:id — single poll
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    res.json({ success: true, poll });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/polls — create a new poll
router.post('/', async (req, res) => {
  try {
    const { question, options, category } = req.body;

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question and at least 2 options required' });
    }

    const formattedOptions = options.map(opt => ({
      text: typeof opt === 'string' ? opt : opt.text,
      votes: 0
    }));

    const poll = new Poll({
      question,
      options: formattedOptions,
      category: category || 'General'
    });

    await poll.save();
    res.status(201).json({ success: true, poll });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/polls/:id/vote — vote on a poll
router.post('/:id/vote', async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option index' });
    }

    poll.options[optionIndex].votes += 1;
    poll.totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    await poll.save();

    res.json({ success: true, poll });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
