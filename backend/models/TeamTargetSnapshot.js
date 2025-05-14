const mongoose = require('mongoose');

const TeamTargetSnapshotSchema = new mongoose.Schema({
    teamId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Team', 
        required: true, 
        index: true 
    },
    timestamp: { 
        type: Date, 
        required: true, 
        index: true 
    },
    groupTargetValue: { // Sum of all members' personal targets at this timestamp
        type: Number, 
        required: true 
    }
}, { timestamps: false });

TeamTargetSnapshotSchema.index({ teamId: 1, timestamp: -1 });

module.exports = mongoose.model('TeamTargetSnapshot', TeamTargetSnapshotSchema); 