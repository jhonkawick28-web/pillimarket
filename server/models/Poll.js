const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [optionSchema],
  createdAt: { type: Date, default: Date.now },
  totalVotes: { type: Number, default: 0 },
  category: { type: String, default: 'General' }
});

// Auto-update totalVotes before saving
pollSchema.pre('save', function (next) {
  this.totalVotes = this.options.reduce((sum, opt) => sum + opt.votes, 0);
  next();
});

module.exports = mongoose.model('Poll', pollSchema);
