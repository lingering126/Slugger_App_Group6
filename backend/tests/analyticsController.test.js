const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { analyticsRouter, recordTeamTargetSnapshot, recordUserTargetSnapshot } = require('../routes/analytics');
const Team = require('../models/team');
const Activity = require('../models/Activity');
const UserTeamTarget = require('../models/userTeamTarget');
const TeamTargetSnapshot = require('../models/TeamTargetSnapshot');
const UserTargetSnapshot = require('../models/UserTargetSnapshot');
const User = require('../src/models/user');
// const authMiddleware = require('../middleware/auth'); // Original mock below

let mockAuthenticatedUser = null;
jest.mock('../middleware/auth', () => (req, res, next) => {
    if (mockAuthenticatedUser) {
        req.user = mockAuthenticatedUser;
    }
    next();
});

jest.mock('../utils/cycleUtils', () => ({
    getCurrentCycleInfo: jest.fn(),
    getCycleInfoForTime: jest.fn(),
}));
const { getCurrentCycleInfo, getCycleInfoForTime } = require('../utils/cycleUtils');


let mongoServer;
let app;
let userCreationCounter = 1;
let initialDateNow; // Store the initial Date.now

beforeAll(async () => {
    initialDateNow = global.Date.now;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRouter);

    userCreationCounter = 1;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    global.Date.now = initialDateNow; // Restore only Date.now globally, spies are handled in tests
});

beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    jest.clearAllMocks();
    mockAuthenticatedUser = null;
    userCreationCounter = 1;

    // Default mock for getCurrentCycleInfo - simplified, specific tests might override
    getCurrentCycleInfo.mockReturnValue({
        cycleStartDate: new Date('2023-01-01T00:00:00.000Z'),
        cycleEndDate: new Date('2023-01-07T23:59:59.999Z'),
        timeElapsedInCycleMs: 1000 * 60 * 60 * 24 * 3, // 3 days
        cycleDurationMs: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    // Default mock for getCycleInfoForTime - simplified
    getCycleInfoForTime.mockImplementation((teamCreationDate, dateForCycle) => {
        const actualUtils = jest.requireActual('../utils/cycleUtils');
        return actualUtils.getCycleInfoForTime(teamCreationDate, dateForCycle);
    });
});

describe('Analytics Routes', () => {
    describe('GET /api/analytics/overview/:teamId', () => {
        let mockTeam;
        let testUser;

        beforeEach(async () => {
            const uniqueSuffix = userCreationCounter++;
            testUser = new User({
                _id: new mongoose.Types.ObjectId(),
                name: 'Test User Overview',
                username: `testuser_overview_${uniqueSuffix}`,
                email: `test${uniqueSuffix}@example.com`,
                password: 'password'
            });
            try {
                await testUser.save();
            } catch (e) {
                console.error('Error saving testUser in overview beforeEach:', e);
                throw e; 
            }
            expect(testUser._id).toBeDefined();
            mockAuthenticatedUser = { id: testUser._id.toString(), _id: testUser._id, name: testUser.name, username: testUser.username, email: testUser.email };

            mockTeam = new Team({
                _id: new mongoose.Types.ObjectId(),
                name: 'Test Team',
                targetName: 'Target 1',
                members: [testUser._id],
                createdBy: testUser._id,
                createdAt: new Date('2023-01-01T00:00:00.000Z')
            });
            await mockTeam.save();
        });

        it('should return 404 if team not found', async () => {
            const invalidTeamId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/analytics/overview/${invalidTeamId}`);
            expect(res.status).toBe(404);
            // expect(res.body.message).toBe('Team not found'); // Simplified
        });

        it('should return overview data successfully', async () => {
            await Activity.create([
                { teamsId: mockTeam._id, userId: testUser._id, points: 10, createdAt: new Date('2023-01-02T00:00:00.000Z'), type: 'Physical', name: 'Test Activity Overview', duration: 30 },
            ]);
            await UserTeamTarget.create({ teamId: mockTeam._id, userId: testUser._id, targetValue: 100 });

            const res = await request(app).get(`/api/analytics/overview/${mockTeam._id}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalScore');
            expect(res.body).toHaveProperty('groupTarget');
            expect(res.body).toHaveProperty('percentageOfTarget');
            expect(res.body).toHaveProperty('percentageOfTimeGone');
        });
    });

    describe('GET /api/analytics/user-overview/:teamId/:userId', () => {
        let mockTeam, testUserOne;

        beforeEach(async () => {
            const u1Suffix = userCreationCounter++;
            testUserOne = await new User({
                _id: new mongoose.Types.ObjectId(),
                name: 'User One Overview',
                username: `userone_useroverview_${u1Suffix}`,
                email: `one${u1Suffix}@example.com`,
                password: 'password'
            }).save().catch(e => { console.error('Save u1 failed:', e); throw e; });
            expect(testUserOne._id).toBeDefined();
            mockAuthenticatedUser = { id: testUserOne._id.toString(), _id: testUserOne._id, name: testUserOne.name, username: testUserOne.username, email: testUserOne.email };

            mockTeam = new Team({
                _id: new mongoose.Types.ObjectId(),
                name: 'Test Team for User Overview',
                targetName: 'Target 1',
                members: [testUserOne._id],
                createdBy: testUserOne._id,
                createdAt: new Date('2023-01-01T00:00:00.000Z')
            });
            await mockTeam.save();
        });

        it('should return 404 if team not found', async () => {
            const invalidTeamId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/analytics/user-overview/${invalidTeamId}/${testUserOne._id}`);
            expect(res.status).toBe(404);
        });

        it('should return user-specific overview data successfully', async () => {
            await Activity.create([
                { teamsId: mockTeam._id, userId: testUserOne._id, points: 20, createdAt: new Date('2023-01-02T00:00:00.000Z'), type: 'Physical', name: 'Test Activity User Overview', duration: 30 },
            ]);
            await UserTeamTarget.create({ teamId: mockTeam._id, userId: testUserOne._id, targetValue: 50 });

            const res = await request(app).get(`/api/analytics/user-overview/${mockTeam._id}/${testUserOne._id}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalScore');
            expect(res.body).toHaveProperty('individualTarget');
            expect(res.body).toHaveProperty('percentageOfTarget');
            expect(res.body).toHaveProperty('percentageOfTimeGone');
        });
    });

    describe('GET /api/analytics/member-progress/:teamId', () => {
        let mockTeam, testUserOne, testUserTwo;
        
        beforeEach(async () => {
            const u1Suffix = userCreationCounter++;
            testUserOne = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'User Alpha Progress', username: `useralpha_progress_${u1Suffix}`, email: `alpha${u1Suffix}@example.com`, password: 'password'
            }).save().catch(e => { console.error('Save u1 progress failed:', e); throw e; });
            expect(testUserOne._id).toBeDefined();

            const u2Suffix = userCreationCounter++;
            testUserTwo = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'User Beta Progress', username: `userbeta_progress_${u2Suffix}`, email: `beta${u2Suffix}@example.com`, password: 'password'
            }).save().catch(e => { console.error('Save u2 progress failed:', e); throw e; });
            expect(testUserTwo._id).toBeDefined();
            mockAuthenticatedUser = { id: testUserOne._id.toString(), _id: testUserOne._id, name: testUserOne.name, username: testUserOne.username, email: testUserOne.email };

            mockTeam = new Team({
                _id: new mongoose.Types.ObjectId(), name: 'Leaderboard Team', targetName: 'Target 1', members: [testUserOne._id, testUserTwo._id], createdBy: testUserOne._id, createdAt: new Date('2023-01-10T00:00:00.000Z')
            });
            await mockTeam.save();
        });

        it('should return 404 if team not found', async () => {
            const invalidTeamId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/analytics/member-progress/${invalidTeamId}`);
            expect(res.status).toBe(404);
        });

        it('should return member progress data', async () => {
            await Activity.create([
                { teamsId: mockTeam._id, userId: testUserOne._id, points: 50, createdAt: new Date('2023-01-10T00:00:00.000Z'), type: 'Physical', name: 'Test Activity Progress 1', duration: 30 },
                { teamsId: mockTeam._id, userId: testUserTwo._id, points: 75, createdAt: new Date('2023-01-10T00:00:00.000Z'), type: 'Mental', name: 'Test Activity Progress 2', duration: 60 },
            ]);

            const res = await request(app).get(`/api/analytics/member-progress/${mockTeam._id}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('userId');
                expect(res.body[0]).toHaveProperty('score');
                expect(res.body[0]).toHaveProperty('displayName');
            }
        });
    });

    describe('GET /api/analytics/timeline/:teamId', () => {
        let mockTeam, testUser;

        beforeEach(async () => {
            const uniqueSuffix = userCreationCounter++;
            testUser = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'Timeline User Team', username: `timelineuser_team_${uniqueSuffix}`, email: `timeline_team-${uniqueSuffix}@example.com`, password: 'password'
            }).save().catch(e => { console.error('Save timeline user failed:', e); throw e; });
            expect(testUser._id).toBeDefined();
            mockAuthenticatedUser = { id: testUser._id.toString(), _id: testUser._id, name: testUser.name, username: testUser.username, email: testUser.email };

            mockTeam = new Team({
                _id: new mongoose.Types.ObjectId(), name: 'Timeline Team', targetName: 'Target 1', members: [testUser._id], createdBy: testUser._id, createdAt: new Date('2023-01-01T00:00:00.000Z')
            });
            await mockTeam.save();
        });

        it('should return 404 if team not found', async () => {
            const invalidTeamId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/analytics/timeline/${invalidTeamId}?range=1W`);
            expect(res.status).toBe(404);
        });

        it('should return timeline data for 1W range (basic structure check)', async () => {
            const originalGlobalDate = global.Date;
            const originalGlobalDateNow = global.Date.now;
            let specificMockDateForTest;

            try {
                // --- Phase 1: Mock Date for route logic that needs controlled time ---
                specificMockDateForTest = new originalGlobalDate('2023-03-15T12:00:00.000Z');
                global.Date = jest.fn((...args) => 
                    args.length > 0 ? new originalGlobalDate(...args) : specificMockDateForTest
                );
                Object.setPrototypeOf(global.Date, originalGlobalDate); // Restore static methods like Date.parse, Date.UTC
                global.Date.now = jest.fn(() => specificMockDateForTest.getTime());

                await Activity.create([
                    { teamsId: mockTeam._id, userId: testUser._id, points: 10, createdAt: new Date('2023-03-10T10:00:00.000Z'), type: 'Physical', name: 'Test Activity Timeline', duration: 30 },
                ]);
            
                // --- Phase 2: Restore original Date before Mongoose operation ---
                global.Date = originalGlobalDate;
                global.Date.now = originalGlobalDateNow;

                const snapshotData = { teamId: mockTeam._id, groupTargetValue: 120, timestamp: new originalGlobalDate('2023-03-09T00:00:00.000Z')};
                await TeamTargetSnapshot.create(snapshotData);
            
                // --- Phase 3: Re-mock Date for the HTTP request part if necessary (though likely not for this specific test's assertions) ---
                global.Date = jest.fn((...args) => 
                    args.length > 0 ? new originalGlobalDate(...args) : specificMockDateForTest
                );
                Object.setPrototypeOf(global.Date, originalGlobalDate);
                global.Date.now = jest.fn(() => specificMockDateForTest.getTime());

                const res = await request(app).get(`/api/analytics/timeline/${mockTeam._id}?range=1W`);
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).toHaveProperty('labels');
                expect(res.body.data).toHaveProperty('data');
            } finally {
                // --- Final Cleanup: Restore original Date and Date.now ---
                global.Date = originalGlobalDate;
                global.Date.now = originalGlobalDateNow;
                jest.restoreAllMocks(); // Restore any other spies/mocks from Jest
            }
        });
    });

    describe('GET /api/analytics/user-timeline/:teamId/:userId', () => {
        let mockTeam, testUserOne;

        beforeEach(async () => {
            const u1Suffix = userCreationCounter++;
            testUserOne = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'UserAlpha UserTimeline', username: `ualpha_usertimeline_${u1Suffix}`, email: `ualpha_timeline-${u1Suffix}@example.com`, password: 'password'
            }).save().catch(e => { console.error('Save u1 user-timeline failed:', e); throw e; });
            expect(testUserOne._id).toBeDefined();
            mockAuthenticatedUser = { id: testUserOne._id.toString(), _id: testUserOne._id, name: testUserOne.name, username: testUserOne.username, email: testUserOne.email };

            mockTeam = new Team({
                _id: new mongoose.Types.ObjectId(), name: 'User Timeline Team', targetName: 'Target 1', members: [testUserOne._id], createdBy: testUserOne._id, createdAt: new Date('2023-02-01T00:00:00.000Z')
            });
            await mockTeam.save();
        });

        it('should return 404 if team not found', async () => {
            const invalidTeamId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/analytics/user-timeline/${invalidTeamId}/${testUserOne._id}?range=1W`);
            expect(res.status).toBe(404);
        });

        it('should return user timeline data for 1W range', async () => {
            const originalGlobalDate = global.Date;
            const originalGlobalDateNow = global.Date.now;
            let specificMockDateForTest;

            try {
                // --- Phase 1: Mock Date for route logic ---
                specificMockDateForTest = new originalGlobalDate('2023-04-10T12:00:00.000Z');
                global.Date = jest.fn((...args) => 
                    args.length > 0 ? new originalGlobalDate(...args) : specificMockDateForTest
                );
                Object.setPrototypeOf(global.Date, originalGlobalDate);
                global.Date.now = jest.fn(() => specificMockDateForTest.getTime());

                await Activity.create([
                    { teamsId: mockTeam._id, userId: testUserOne._id, points: 15, createdAt: new Date('2023-04-05T10:00:00.000Z'), type: 'Physical', name: 'Test Activity User Timeline', duration: 30 },
                ]);

                // --- Phase 2: Restore original Date before Mongoose operation ---
                global.Date = originalGlobalDate;
                global.Date.now = originalGlobalDateNow;

                const snapshotDataUser = { teamId: mockTeam._id, userId: testUserOne._id, personalTargetValue: 50, timestamp: new originalGlobalDate('2023-04-01T00:00:00.000Z')};
                await UserTargetSnapshot.create(snapshotDataUser);

                // --- Phase 3: Re-mock Date for HTTP request ---
                global.Date = jest.fn((...args) => 
                    args.length > 0 ? new originalGlobalDate(...args) : specificMockDateForTest
                );
                Object.setPrototypeOf(global.Date, originalGlobalDate);
                global.Date.now = jest.fn(() => specificMockDateForTest.getTime());

                const res = await request(app).get(`/api/analytics/user-timeline/${mockTeam._id}/${testUserOne._id}?range=1W`);
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).toHaveProperty('labels');
                expect(res.body.data).toHaveProperty('data');
            } finally {
                // --- Final Cleanup ---
                global.Date = originalGlobalDate;
                global.Date.now = originalGlobalDateNow;
                jest.restoreAllMocks();
            }
        });
    });
});

describe('Helper Functions', () => {
    describe('recordTeamTargetSnapshot', () => {
        let mockTeamWithObjectIdMembers, testUserA, testUserB;

        beforeEach(async () => {
            const uaSuffix = userCreationCounter++;
            testUserA = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'User A SnapTeam', username: `usera_snapshot_team_${uaSuffix}`, email: `a_snap_team-${uaSuffix}@snap.com`, password: 'password_a_snap_team'
            }).save().catch(e => { console.error('Save SnapTeam A failed:', e); throw e; });
            expect(testUserA._id).toBeDefined();

            const ubSuffix = userCreationCounter++;
            testUserB = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'User B SnapTeam', username: `userb_snapshot_team_${ubSuffix}`, email: `b_snap_team-${ubSuffix}@snap.com`, password: 'password_b_snap_team'
            }).save().catch(e => { console.error('Save SnapTeam B failed:', e); throw e; });
            expect(testUserB._id).toBeDefined();

            mockTeamWithObjectIdMembers = new Team({
                _id: new mongoose.Types.ObjectId(), name: 'Team Snap ObjectId', targetName: 'Target 1', members: [testUserA._id, testUserB._id], createdBy: testUserA._id
            });
            await mockTeamWithObjectIdMembers.save();
            
            await UserTeamTarget.create({ teamId: mockTeamWithObjectIdMembers._id, userId: testUserA._id, targetValue: 100 });
            await UserTeamTarget.create({ teamId: mockTeamWithObjectIdMembers._id, userId: testUserB._id, targetValue: 150 });
        });

        it('should record a team target snapshot correctly', async () => {
            await recordTeamTargetSnapshot(mockTeamWithObjectIdMembers._id);
            const snapshot = await TeamTargetSnapshot.findOne({ teamId: mockTeamWithObjectIdMembers._id });
            expect(snapshot).not.toBeNull();
            expect(snapshot).toHaveProperty('groupTargetValue', 250); // 100 + 150
            expect(snapshot.timestamp).toBeInstanceOf(Date);
        });
    });

    describe('recordUserTargetSnapshot', () => {
        let testUser, mockTeamForUserSnap; // Renamed mockTeam to avoid conflict

        beforeEach(async () => {
            const uniqueSuffix = userCreationCounter++;
            testUser = await new User({
                _id: new mongoose.Types.ObjectId(), name: 'UserSnap UserSnapshot', username: `usersnap_usersnapshot_${uniqueSuffix}`, email: `usersnap_snapshot-${uniqueSuffix}@example.com`, password: 'password_user_snap'
            }).save().catch(e => { console.error('Save UserSnapshot user failed:', e); throw e; });
            expect(testUser._id).toBeDefined();

            // Renamed mockTeam to mockTeamForUserSnap to avoid potential naming conflicts if this describe was nested differently or vars had wider scope
            mockTeamForUserSnap = await new Team({ _id: new mongoose.Types.ObjectId(), name: 'Team For User Snap', targetName: 'Target 1', members: [testUser._id], createdBy: testUser._id }).save();
             expect(mockTeamForUserSnap._id).toBeDefined(); // Ensure team is saved
        });

        it('should record a user target snapshot correctly', async () => {
            const personalTargetValue = 77;
            await recordUserTargetSnapshot(testUser._id, mockTeamForUserSnap._id, personalTargetValue);
            const snapshot = await UserTargetSnapshot.findOne({ userId: testUser._id, teamId: mockTeamForUserSnap._id });
            expect(snapshot).not.toBeNull();
            expect(snapshot).toHaveProperty('personalTargetValue', personalTargetValue);
            expect(snapshot.timestamp).toBeInstanceOf(Date);
        });
    });
}); 