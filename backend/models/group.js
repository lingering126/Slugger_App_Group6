const mongoose = require('mongoose');

function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const groupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    unique: true,
    required: true,
    length: 6
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  targetName: {
    type: String,
    required: false
  },
  targetValue: {
    type: String,
    required: false
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 自动生成唯一六位数 groupId
groupSchema.pre('validate', async function(next) {
  if (this.isNew) {
    let exists = true;
    while (exists) {
      const id = generateSixDigitId();
      exists = await mongoose.models.Group.findOne({ groupId: id });
      if (!exists) this.groupId = id;
    }
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);