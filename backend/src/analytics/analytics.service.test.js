const mongoose = require('mongoose');
const AnalyticsService = require('./analytics.service');
const Group = require('../../models/group'); 
const ActivityLog = require('../models/activity-log'); 
const GroupCycleHistory = require('../models/group-cycle-history'); 
const User = require('../models/user'); 

// -- Mock Mongoose Models --
// jest.mock('../path/to/group'); 
// jest.mock('../path/to/activity-log');
// jest.mock('../path/to/group-cycle-history');
// jest.mock('../path/to/user');

// -- More Robust Mock for Mongoose Methods --
jest.mock('../../models/group', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  prototype: {
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(),
  }
}));
jest.mock('../models/activity-log', () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));
// Modify GroupCycleHistory mock to be a constructor
jest.mock('../models/group-cycle-history', () => {
  // Mock the constructor
  const mockSave = jest.fn();
  const MockModel = jest.fn().mockImplementation(() => ({
      save: mockSave
  }));
  // Attach static methods to the mock constructor
  MockModel.findOne = jest.fn();
  MockModel.find = jest.fn();
  // Attach prototype methods needed if find/findOne results are used
  // MockModel.prototype.save = mockSave; // Already handled by constructor instance

  // Expose the mock save for assertions if needed externally
  MockModel._mockSave = mockSave;

  return MockModel;
});
jest.mock('../models/user', () => ({
  findById: jest.fn(),
}));


// -- test suite --
describe('AnalyticsService', () => {
  let analyticsService;
  let mockGroupData;
  let mockActivityLogData;
  let mockUserData;
  let mockCycleHistoryData;

  // Suppress console logs and errors for cleaner test output
  let consoleLogSpy, consoleErrorSpy, consoleWarnSpy;
  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // Also suppress warn
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    analyticsService = new AnalyticsService();

    // -- Prepare mock data --
    const groupObjectId = new mongoose.Types.ObjectId();
    const userObjectId1 = new mongoose.Types.ObjectId();
    const userObjectId2 = new mongoose.Types.ObjectId();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    mockGroupData = {
      _id: groupObjectId,
      groupId: '123456',
      name: 'Test Group',
      members: [userObjectId1, userObjectId2],
      targetValue: 1000,
      targetStartDate: sevenDaysAgo,
      targetEndDate: sevenDaysLater, // current cycle
      save: jest.fn().mockResolvedValue(this), // mock instance save method
      populate: jest.fn().mockImplementation((path, select) => {
        // mock populate behavior
        if (path === 'members') {
          return Promise.resolve({
            ...mockGroupData, // return group data
            members: [ // replace with populated data
              { _id: userObjectId1, name: 'User One', avatar: 'avatar1.png' },
              { _id: userObjectId2, name: 'User Two', avatar: 'avatar2.png' },
            ]
          });
        }
        return Promise.resolve(this); // return self in other cases
      }),
    };

     mockUserData = {
        [userObjectId1.toString()]: { _id: userObjectId1, name: 'User One', avatar: 'avatar1.png' },
        [userObjectId2.toString()]: { _id: userObjectId2, name: 'User Two', avatar: 'avatar2.png' },
     };


    mockActivityLogData = [
      { _id: new mongoose.Types.ObjectId(), userId: userObjectId1, groupId: groupObjectId, points: 50, timestamp: now },
      { _id: new mongoose.Types.ObjectId(), userId: userObjectId2, groupId: groupObjectId, points: 100, timestamp: yesterday },
      { _id: new mongoose.Types.ObjectId(), userId: userObjectId1, groupId: groupObjectId, points: 25, timestamp: yesterday },
    ];

    mockCycleHistoryData = {
        _id: new mongoose.Types.ObjectId(),
        groupId: groupObjectId,
        startDate: new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000), // 上个周期
        endDate: sevenDaysAgo, // 上个周期结束
        targetValue: 900,
        completionPercentage: 85.5,
    };

    // -- Configure mock implementations --
    // mock Group.findOne to return mock data (return data directly, no .lean() wrapper)
    Group.findOne.mockResolvedValue(mockGroupData);

    // mock Group.findById to return mock data (include .lean())
    Group.findById.mockReturnValue({
        ...mockGroupData,
        lean: jest.fn().mockResolvedValue(mockGroupData)
    });

    // mock ActivityLog.find (include .lean())
    ActivityLog.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockActivityLogData)
    });

    // mock GroupCycleHistory.findOne (include .lean())
    // Now use the static mock method
    GroupCycleHistory.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCycleHistoryData)
    });

    // mock GroupCycleHistory.prototype.save (now via constructor mock)
    // Access the mock save via the static property if needed for reset/assertion
    // GroupCycleHistory._mockSave.mockClear();
    GroupCycleHistory._mockSave.mockResolvedValue(mockCycleHistoryData);

    // mock User.findById (if needed)
    User.findById.mockImplementation(id => {
        const user = mockUserData[id.toString()];
        return Promise.resolve(user ? { ...user, lean: jest.fn().mockResolvedValue(user) } : null);
    });

     // mock Group.prototype.save (already defined in mockGroupData)
     // mockGroupData.save = jest.fn().mockResolvedValue(mockGroupData);
     // mock Group.prototype.populate (also defined in mockGroupData)
     // mockGroupData.populate = jest.fn().mockImplementation(...);

  });

  // -- test findGroupByStringId --
  describe('findGroupByStringId', () => {
    it('should return group data when found', async () => {
      const groupIdString = '123456';
      const result = await analyticsService.findGroupByStringId(groupIdString);
      expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
      expect(result).toEqual(mockGroupData);
    });

    it('should throw an error if group not found', async () => {
      Group.findOne.mockResolvedValue(null); // mock not found
      const groupIdString = '000000';
      await expect(analyticsService.findGroupByStringId(groupIdString))
        .rejects.toThrow(`Group with ID ${groupIdString} not found`);
       expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
    });
  });

  // -- test isUserGroupMember --
  describe('isUserGroupMember', () => {
      it('should return true if user is a member', async () => {
          const userId = mockGroupData.members[0]; // use ObjectId
          const groupIdString = '123456';
          // ensure findGroupByStringId (internal call Group.findOne) returns group with members
          Group.findOne.mockResolvedValue(mockGroupData);

          const result = await analyticsService.isUserGroupMember(userId, groupIdString);
          expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
          expect(result).toBe(true);
      });

      it('should return true if user is a member (userId as string)', async () => {
        const userId = mockGroupData.members[0].toString(); // use String
        const groupIdString = '123456';
        Group.findOne.mockResolvedValue(mockGroupData);

        const result = await analyticsService.isUserGroupMember(userId, groupIdString);
        expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
        expect(result).toBe(true);
      });

      it('should return false if user is not a member', async () => {
        const nonMemberUserId = new mongoose.Types.ObjectId();
        const groupIdString = '123456';
        Group.findOne.mockResolvedValue(mockGroupData);

        const result = await analyticsService.isUserGroupMember(nonMemberUserId, groupIdString);
         expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
        expect(result).toBe(false);
      });

       it('should throw error if group is not found', async () => {
         const userId = mockGroupData.members[0];
         const groupIdString = '000000';
         Group.findOne.mockResolvedValue(null); // mock not found

         await expect(analyticsService.isUserGroupMember(userId, groupIdString))
            .rejects.toThrow(`Group with ID ${groupIdString} not found`);
            expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
       });
  });

  // -- test getGroupOverviewSummary --
  describe('getGroupOverviewSummary', () => {
    it('should return correct summary when cycle is current', async () => {
        const groupIdString = '123456';
        const now = new Date(); // for timeGone calculation
        // ensure Group.findOne returns mockGroupData
        // ensure ActivityLog.find returns relevant logs
        ActivityLog.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([ // assume current cycle only has these logs
                { points: 100, timestamp: new Date(mockGroupData.targetStartDate.getTime() + 1000) },
                { points: 50, timestamp: new Date() } // now
            ])
        });

        const result = await analyticsService.getGroupOverviewSummary(groupIdString);

        expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
        expect(ActivityLog.find).toHaveBeenCalledWith({
            groupId: mockGroupData._id,
            timestamp: { $gte: mockGroupData.targetStartDate, $lte: mockGroupData.targetEndDate },
        });
        expect(result.groupTarget).toBe(1000);
        expect(result.currentTotal).toBe(150); // 100 + 50
        expect(result.percentOfTarget).toBeCloseTo(15.0);
        // verify timeGone - need to accurately mock time
        const cycleDuration = mockGroupData.targetEndDate.getTime() - mockGroupData.targetStartDate.getTime();
        const timeElapsed = now.getTime() - mockGroupData.targetStartDate.getTime();
        const expectedTimeGone = Math.min(1, timeElapsed / cycleDuration) * 100;
        expect(result.percentOfTimeGone).toBeCloseTo(expectedTimeGone);
        // confirm no archiving related methods were called
        expect(GroupCycleHistory._mockSave).not.toHaveBeenCalled();
        expect(mockGroupData.save).not.toHaveBeenCalled(); // Group instance save
    });

    it('should archive old cycle and return summary for new cycle if cycle ended', async () => {
        const groupIdString = '123456';
        const now = new Date();
        const oldEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oldStartDate = new Date(oldEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endedGroupData = {
             ...mockGroupData,
            _id: mockGroupData._id,
            groupId: groupIdString,
            targetStartDate: oldStartDate,
            targetEndDate: oldEndDate,
            targetValue: 800,
            save: jest.fn().mockResolvedValue({}), // Mock save needed for group update
        };
        const logsForOldCycle = [
            { points: 200, timestamp: new Date(oldStartDate.getTime() + 1000) },
            { points: 400, timestamp: new Date(oldEndDate.getTime() - 1000) } // Total 600
        ];
        const newStartDate = new Date(oldEndDate);
        newStartDate.setMilliseconds(newStartDate.getMilliseconds() + 1);
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 7);
        newEndDate.setMilliseconds(newEndDate.getMilliseconds() - 1);
        const updatedGroupData = {
            ...endedGroupData,
            targetStartDate: newStartDate,
            targetEndDate: newEndDate,
        };

        // --- Mocking --- 
        // 1. Initial Group.findOne returns endedGroupData
        Group.findOne.mockResolvedValueOnce(endedGroupData);
        // 2. Mocks for calculateTargetPercentage call
        GroupCycleHistory.findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) });
        Group.findById.mockReturnValueOnce({ ...endedGroupData, lean: jest.fn().mockResolvedValue(endedGroupData) });
        // 3. GroupCycleHistory constructor/save is mocked in beforeEach
        GroupCycleHistory._mockSave.mockResolvedValue({});
        // 4. endedGroupData.save is mocked above
        // 5. Second Group.findOne returns updatedGroupData
        Group.findOne.mockResolvedValueOnce(updatedGroupData);
        // 6. ActivityLog.find mock using mockImplementation
        let findCallCount = 0;
        ActivityLog.find.mockImplementation(() => {
            findCallCount++;
            if (findCallCount === 1) {
                // First call (inside calculateTargetPercentage for old cycle)
                return { lean: jest.fn().mockResolvedValue(logsForOldCycle) };
            } else if (findCallCount === 2) {
                // Second call (for new cycle overview)
                return { lean: jest.fn().mockResolvedValue([]) };
            } else {
                return { lean: jest.fn().mockResolvedValue([]) }; // Default empty
            }
        });

        // --- Execute --- 
        const result = await analyticsService.getGroupOverviewSummary(groupIdString);

        // --- Assertions ---
        expect(Group.findOne).toHaveBeenCalledTimes(2);
        expect(GroupCycleHistory.findOne).toHaveBeenCalledTimes(1);
        expect(Group.findById).toHaveBeenCalledTimes(1);
        expect(GroupCycleHistory._mockSave).toHaveBeenCalledTimes(1);
        expect(endedGroupData.save).toHaveBeenCalledTimes(1);
        // Assert ActivityLog.find was called twice (implicitly verified by mockImplementation)
        expect(findCallCount).toBe(2);
        // Verify the arguments for the calls if needed (more complex with mockImplementation)

        // Verify history save arguments
        const constructorArgs = GroupCycleHistory.mock.calls[0][0];
        expect(constructorArgs.completionPercentage).toBeCloseTo((600 / 800) * 100); // 75%
        
        // Verify result based on new cycle
        expect(result.groupTarget).toBe(updatedGroupData.targetValue);
        expect(result.currentTotal).toBe(0);
        expect(result.percentOfTarget).toBe(0);
    });

     it('should handle group target value of 0 correctly', async () => {
        const groupIdString = '123456';
        // Explicitly mock Group.findOne for this test case
        const groupWithZeroTarget = { ...mockGroupData, targetValue: 0 };
        Group.findOne.mockResolvedValue(groupWithZeroTarget);
        ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ points: 50 }]) });

        const result = await analyticsService.getGroupOverviewSummary(groupIdString);

        expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
        expect(result.groupTarget).toBe(0);
        expect(result.currentTotal).toBe(50);
        expect(result.percentOfTarget).toBe(0); // divide by 0 should be 0
    });

    // Add test: what happens if Group.save() fails
     it('should throw error if updating group cycle fails', async () => {
        const groupIdString = '123456';
        const now = new Date();
        const oldEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oldStartDate = new Date(oldEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const endedGroupData = {
            ...mockGroupData,
            targetStartDate: oldStartDate,
            targetEndDate: oldEndDate,
            save: jest.fn().mockRejectedValue(new Error("Database save failed")), // mock save failed
             populate: jest.fn().mockResolvedValue(this),
        };

        Group.findOne.mockResolvedValueOnce(endedGroupData);
        // Mock ActivityLog.find for percentage calculation
        ActivityLog.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([{ points: 100 }]) });
         // Mock history save to resolve successfully before group save fails
         // Use the mock constructor's save mock
        GroupCycleHistory._mockSave.mockResolvedValue({});

        await expect(analyticsService.getGroupOverviewSummary(groupIdString))
            .rejects.toThrow('Failed to update group cycle: Database save failed');

        expect(endedGroupData.save).toHaveBeenCalledTimes(1); // confirm attempt to save
        expect(Group.findOne).toHaveBeenCalledTimes(1); // not re-find after save failed
    });
  });

  // -- test getMemberProgress --
  describe('getMemberProgress', () => {
      it('should return correct progress for each member', async () => {
          const groupIdString = '123456';
          const user1Id = mockGroupData.members[0].toString();
          const user2Id = mockGroupData.members[1].toString();

          // Define the populate mock for this test
          const populateMock = jest.fn().mockImplementation(async function() {
              return {
                  ...this, // "this" refers to the object findOne resolved with
                  members: [ // Hardcode the populated members array
                      { _id: mockGroupData.members[0], name: 'User One', avatar: 'avatar1.png' },
                      { _id: mockGroupData.members[1], name: 'User Two', avatar: 'avatar2.png' },
                  ]
              };
          });

          // Group.findOne returns base data *including* the populate mock
          Group.findOne.mockResolvedValue({ ...mockGroupData, populate: populateMock });

          const currentCycleLogs = [
             { userId: mockGroupData.members[0], points: 50, timestamp: mockGroupData.targetStartDate },
             { userId: mockGroupData.members[1], points: 100, timestamp: new Date() },
             { userId: mockGroupData.members[0], points: 25, timestamp: new Date() },
          ];
          ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(currentCycleLogs) });

          const result = await analyticsService.getMemberProgress(groupIdString);

          // Verify calls
          expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
          // Verify the populate mock *was* called
          expect(populateMock).toHaveBeenCalledWith('members', 'name avatar');
          expect(ActivityLog.find).toHaveBeenCalledWith({
              groupId: mockGroupData._id,
              timestamp: { $gte: mockGroupData.targetStartDate, $lte: mockGroupData.targetEndDate },
          });

          // Verify results
          expect(result.membersProgress).toHaveLength(2);
          const member1Progress = result.membersProgress.find(m => m.userId === user1Id);
          const member2Progress = result.membersProgress.find(m => m.userId === user2Id);
          expect(member1Progress.completed).toBe(75);
          expect(member2Progress.completed).toBe(100);
      });

       it('should handle members with no activity', async () => {
         const groupIdString = '123456';
         const user1Id = mockGroupData.members[0].toString();
         const user2Id = mockGroupData.members[1].toString(); // User 2 has no activity

         // Define the populate mock for this test
         const populateMock = jest.fn().mockImplementation(async function() {
              return {
                  ...this, // "this" refers to the object findOne resolved with
                  members: [ // Hardcode the populated members array
                      { _id: mockGroupData.members[0], name: 'User One', avatar: 'avatar1.png' },
                      { _id: mockGroupData.members[1], name: 'User Two', avatar: 'avatar2.png' },
                  ]
              };
          });
         // Ensure findOne returns object with populate mock
         Group.findOne.mockResolvedValue({ ...mockGroupData, populate: populateMock });

         const logsForUser1Only = [
            { userId: mockGroupData.members[0], points: 50, timestamp: new Date() },
         ];
         ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(logsForUser1Only) });

         const result = await analyticsService.getMemberProgress(groupIdString);

         expect(populateMock).toHaveBeenCalledWith('members', 'name avatar');
         expect(result.membersProgress).toHaveLength(2);
         const member1Progress = result.membersProgress.find(m => m.userId === user1Id);
         const member2Progress = result.membersProgress.find(m => m.userId === user2Id);

         expect(member1Progress.completed).toBe(50);
         expect(member2Progress.completed).toBe(0);
         expect(member2Progress.name).toBe('User Two');
       });

       it('should handle case where populate fails or returns partial data', async () => {
           const groupIdString = '123456';
           const user1Id = mockGroupData.members[0];

           // Define the populate mock for this test
           const populateMock = jest.fn().mockImplementation(async function() {
                return {
                   ...this,
                   members: [
                       { _id: user1Id, name: 'User One', avatar: 'avatar1.png' },
                       // User 2 info missing
                   ]
               };
           });
           // Ensure findOne returns object with populate mock
           Group.findOne.mockResolvedValue({ ...mockGroupData, populate: populateMock });

           ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

           const result = await analyticsService.getMemberProgress(groupIdString);

           expect(populateMock).toHaveBeenCalledWith('members', 'name avatar');
           expect(result.membersProgress).toHaveLength(1);
           expect(result.membersProgress[0].userId).toBe(user1Id.toString());
       });

        it('should handle logs with missing userId', async () => {
            const groupIdString = '123456';
            // Define the populate mock for this test
            const populateMock = jest.fn().mockImplementation(async function() {
                return {
                    ...this,
                    members: [
                        { _id: mockGroupData.members[0], name: 'User One', avatar: 'avatar1.png' },
                        { _id: mockGroupData.members[1], name: 'User Two', avatar: 'avatar2.png' },
                    ]
                };
            });
            // Ensure findOne returns object with populate mock
            Group.findOne.mockResolvedValue({ ...mockGroupData, populate: populateMock });

            const logsWithMissingUser = [
                { userId: mockGroupData.members[0], points: 50 },
                { /* userId missing */ points: 100 },
            ];
            ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(logsWithMissingUser) });
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await analyticsService.getMemberProgress(groupIdString);

            expect(populateMock).toHaveBeenCalledWith('members', 'name avatar');
            const member1Progress = result.membersProgress.find(m => m.userId === mockGroupData.members[0].toString());
            expect(member1Progress.completed).toBe(50);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
  });

  // -- test getTimeline --
  // this test is complex because it calls multiple private/public methods and database queries
  describe('getTimeline', () => {
      beforeEach(() => {
          // Mock _getRangeDetails
          jest.spyOn(analyticsService, '_getRangeDetails').mockReturnValue({
              startDate: new Date('2024-04-21T00:00:00Z'), // Example start date for 1W
              unit: 'day', count: 7, range: '1W'
          });
          // Mock _generateLabels with realistic 1W data
          const mockLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const mockFullLabels = ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27']; // Example
          const mockIsoTimestamps = Array.from({length: 7}, (_, i) => 
              new Date(Date.UTC(2024, 3, 21 + i, 23, 59, 59, 999)).toISOString()
          );
          jest.spyOn(analyticsService, '_generateLabels').mockReturnValue({
              labels: mockLabels, 
              fullLabels: mockFullLabels, 
              isoTimestamps: mockIsoTimestamps
          }); 
          // Mock calculateTargetPercentage directly for this test suite
          jest.spyOn(analyticsService, 'calculateTargetPercentage')
              .mockResolvedValueOnce(10) // Corresponds to first timestamp
              .mockResolvedValueOnce(20)
              .mockResolvedValueOnce(15)
              .mockResolvedValueOnce(30)
              .mockResolvedValueOnce(25)
              .mockResolvedValueOnce(40)
              .mockResolvedValueOnce(35); // Example percentages
          
          // Ensure ActivityLog.find mock exists but doesn't need specific return value here
          // as calculateTargetPercentage is mocked directly.
          ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }); 
      });

      it('should return timeline data correctly for a given range (e.g., 1W)', async () => {
          const groupIdString = '123456';
          const range = '1W';
          Group.findOne.mockResolvedValue(mockGroupData);

          const result = await analyticsService.getTimeline(groupIdString, range);

          // Verify underlying mocks were called
          expect(Group.findOne).toHaveBeenCalledWith({ groupId: groupIdString });
          expect(analyticsService._getRangeDetails).toHaveBeenCalledWith(range);
          expect(analyticsService._generateLabels).toHaveBeenCalled(); 
          // Verify calculateTargetPercentage was called 7 times (due to map)
          expect(analyticsService.calculateTargetPercentage).toHaveBeenCalledTimes(7);

          // Verify the result structure and data based on mocks
          const expectedLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const expectedFullLabels = ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27']; // Example
          const expectedIsoTimestamps = Array.from({length: 7}, (_, i) => 
              new Date(Date.UTC(2024, 3, 21 + i, 23, 59, 59, 999)).toISOString()
          );
          const expectedData = [10, 20, 15, 30, 25, 40, 35];

          expect(result).toEqual({
              labels: expectedLabels, 
              fullLabels: expectedFullLabels, 
              isoTimestamps: expectedIsoTimestamps,
              data: expectedData, 
              meta: undefined 
          });
      });
    });


  // -- test calculateTargetPercentage --
   describe('calculateTargetPercentage', () => {
        it('should calculate percentage based on current cycle and logs', async () => {
            const groupId = mockGroupData._id;
            const timestamp = new Date();
            // Override GroupCycleHistory.findOne for this test to force using Group.findById
            GroupCycleHistory.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

            const currentGroup = {
                 ...mockGroupData, // contains start/end date, targetValue
                targetValue: 500,
                targetStartDate: new Date(timestamp.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                targetEndDate: new Date(timestamp.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days later
            };
            // Make sure Group.findById is mocked correctly for THIS test
            Group.findById.mockReturnValue({ ...currentGroup, lean: jest.fn().mockResolvedValue(currentGroup) });

            // mock ActivityLog.find to find logs within the cycle
            ActivityLog.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { points: 100 },
                    { points: 50 },
                    { points: 25 }, // Total = 175
                ])
            });

            const result = await analyticsService.calculateTargetPercentage(groupId, timestamp);

            expect(Group.findById).toHaveBeenCalledWith(groupId);
            expect(ActivityLog.find).toHaveBeenCalledWith({
                 groupId: groupId,
                 timestamp: { $gte: currentGroup.targetStartDate, $lte: timestamp }, // to specified timestamp
            });
            expect(result).toBeCloseTo((175 / 500) * 100); // 35%
        });

        it('should return 0 if targetValue is 0', async () => {
             const groupId = mockGroupData._id;
             const timestamp = new Date();
             // Override GroupCycleHistory.findOne to force using Group.findById
             GroupCycleHistory.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

             const currentGroup = { ...mockGroupData, targetValue: 0 };
             // Make Group.findById return the group with targetValue 0
             Group.findById.mockReturnValue({ ...currentGroup, lean: jest.fn().mockResolvedValue(currentGroup) });

             ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ points: 100 }]) });

             const result = await analyticsService.calculateTargetPercentage(groupId, timestamp);

             expect(result).toBe(0);
             expect(Group.findById).toHaveBeenCalledWith(groupId); // Verify Group.findById was called
        });

        it('should return 0 if group not found', async () => {
             const groupId = mockGroupData._id;
             const timestamp = new Date();
             // Override GroupCycleHistory.findOne to force using Group.findById
             GroupCycleHistory.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

             // Make Group.findById return null
             Group.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

             const result = await analyticsService.calculateTargetPercentage(groupId, timestamp);

             expect(result).toBe(0);
             expect(Group.findById).toHaveBeenCalledWith(groupId);
        });

        it('should return 0 if no logs found', async () => {
             const groupId = mockGroupData._id;
             const timestamp = new Date();
             // Force using Group.findById
             GroupCycleHistory.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
             // Ensure Group.findById returns a valid group
             Group.findById.mockReturnValue({ ...mockGroupData, lean: jest.fn().mockResolvedValue(mockGroupData) });
             // Mock ActivityLog.find to return no logs
             ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

             const result = await analyticsService.calculateTargetPercentage(groupId, timestamp);
             expect(result).toBe(0);
             expect(Group.findById).toHaveBeenCalledWith(groupId);
        });

         it('should include cycle info if requested', async () => {
             const groupId = mockGroupData._id;
             const timestamp = new Date();
             // Override GroupCycleHistory.findOne to force using Group.findById
             GroupCycleHistory.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

             const currentGroup = { ...mockGroupData, targetValue: 200 };
             // Make Group.findById return the correct group
             Group.findById.mockReturnValue({ ...currentGroup, lean: jest.fn().mockResolvedValue(currentGroup) });

             ActivityLog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ points: 50 }]) }); // 50 / 200 = 25%

             const result = await analyticsService.calculateTargetPercentage(groupId, timestamp, true);

             expect(Group.findById).toHaveBeenCalledWith(groupId);
             // Define the expected cycle object based on currentGroup
             const expectedCycleInfo = {
                _id: null, // Indicate it's the active cycle from Group doc
                groupId: currentGroup._id,
                startDate: currentGroup.targetStartDate,
                endDate: currentGroup.targetEndDate,
                targetValue: currentGroup.targetValue,
                __isActiveCycle: true // Custom flag
             };
             // Get the actual percentage calculated by the service
             const actualPercentage = analyticsService.calculateTargetPercentage(groupId, timestamp, false); // Call without info

             // Adjust expected percentage based on actual calculation (rounding/clamping)
             // Assuming the service clamps and rounds percentage:
             const calculatedPoints = 50;
             let expectedPercentage = 0;
             if (currentGroup.targetValue > 0) {
                expectedPercentage = Math.round((calculatedPoints / currentGroup.targetValue) * 100);
                expectedPercentage = Math.max(0, Math.min(100, expectedPercentage));
             }

             expect(result).toEqual({
                 percentage: expectedPercentage,
                 cycle: expectedCycleInfo
             });
         });
   });

});
