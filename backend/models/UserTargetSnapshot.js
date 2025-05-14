const mongoose = require('mongoose');

const UserTargetSnapshotSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
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
    personalTargetValue: { // User's personal target at this timestamp for this team
        type: Number, 
        required: true 
    }
}, { timestamps: false });

UserTargetSnapshotSchema.index({ userId: 1, teamId: 1, timestamp: -1 });

module.exports = mongoose.model('UserTargetSnapshot', UserTargetSnapshotSchema); 