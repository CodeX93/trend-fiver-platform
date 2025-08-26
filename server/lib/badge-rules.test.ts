import { describe, it, expect, beforeEach } from 'vitest';
import { BADGE_RULES, BadgeRule } from '../badge-service';

describe('Badge Rules Engine', () => {
  let mockUserStats: any;

  beforeEach(() => {
    mockUserStats = {
      userId: 'test-user-123',
      totalPredictions: 0,
      correctPredictions: 0,
      accuracyPercentage: 0,
      currentStreak: 0,
      bestStreak: 0,
      monthlyScore: 0,
      totalScore: 0,
    };
  });

  describe('Starter Badge', () => {
    it('should award starter badge for first correct prediction', () => {
      const starterRule = BADGE_RULES.find(rule => rule.type === 'starter')!;
      
      // No correct predictions
      expect(starterRule.condition(mockUserStats)).toBe(false);
      
      // First correct prediction
      mockUserStats.correctPredictions = 1;
      expect(starterRule.condition(mockUserStats)).toBe(true);
    });
  });

  describe('Streak Badges', () => {
    it('should award streak_3 badge for 3 consecutive correct predictions', () => {
      const streak3Rule = BADGE_RULES.find(rule => rule.type === 'streak_3')!;
      
      // Less than 3 streak
      mockUserStats.currentStreak = 2;
      expect(streak3Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 3 streak
      mockUserStats.currentStreak = 3;
      expect(streak3Rule.condition(mockUserStats)).toBe(true);
      
      // More than 3 streak
      mockUserStats.currentStreak = 5;
      expect(streak3Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award streak_5 badge for 5 consecutive correct predictions', () => {
      const streak5Rule = BADGE_RULES.find(rule => rule.type === 'streak_5')!;
      
      // Less than 5 streak
      mockUserStats.currentStreak = 4;
      expect(streak5Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 5 streak
      mockUserStats.currentStreak = 5;
      expect(streak5Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award streak_10 badge for 10 consecutive correct predictions', () => {
      const streak10Rule = BADGE_RULES.find(rule => rule.type === 'streak_10')!;
      
      // Less than 10 streak
      mockUserStats.currentStreak = 9;
      expect(streak10Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 10 streak
      mockUserStats.currentStreak = 10;
      expect(streak10Rule.condition(mockUserStats)).toBe(true);
    });
  });

  describe('Accuracy Badges', () => {
    it('should award accuracy_70 badge for 70%+ accuracy with 20+ predictions', () => {
      const accuracy70Rule = BADGE_RULES.find(rule => rule.type === 'accuracy_70')!;
      
      // Not enough predictions
      mockUserStats.totalPredictions = 19;
      mockUserStats.accuracyPercentage = 75;
      expect(accuracy70Rule.condition(mockUserStats)).toBe(false);
      
      // Enough predictions but low accuracy
      mockUserStats.totalPredictions = 25;
      mockUserStats.accuracyPercentage = 65;
      expect(accuracy70Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 70% accuracy with enough predictions
      mockUserStats.totalPredictions = 20;
      mockUserStats.accuracyPercentage = 70;
      expect(accuracy70Rule.condition(mockUserStats)).toBe(true);
      
      // Higher accuracy with enough predictions
      mockUserStats.accuracyPercentage = 85;
      expect(accuracy70Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award accuracy_80 badge for 80%+ accuracy with 20+ predictions', () => {
      const accuracy80Rule = BADGE_RULES.find(rule => rule.type === 'accuracy_80')!;
      
      // Not enough predictions
      mockUserStats.totalPredictions = 19;
      mockUserStats.accuracyPercentage = 85;
      expect(accuracy80Rule.condition(mockUserStats)).toBe(false);
      
      // Enough predictions but low accuracy
      mockUserStats.totalPredictions = 25;
      mockUserStats.accuracyPercentage = 75;
      expect(accuracy80Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 80% accuracy with enough predictions
      mockUserStats.totalPredictions = 20;
      mockUserStats.accuracyPercentage = 80;
      expect(accuracy80Rule.condition(mockUserStats)).toBe(true);
      
      // Higher accuracy with enough predictions
      mockUserStats.accuracyPercentage = 90;
      expect(accuracy80Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award accuracy_90 badge for 90%+ accuracy with 20+ predictions', () => {
      const accuracy90Rule = BADGE_RULES.find(rule => rule.type === 'accuracy_90')!;
      
      // Not enough predictions
      mockUserStats.totalPredictions = 19;
      mockUserStats.accuracyPercentage = 95;
      expect(accuracy90Rule.condition(mockUserStats)).toBe(false);
      
      // Enough predictions but low accuracy
      mockUserStats.totalPredictions = 25;
      mockUserStats.accuracyPercentage = 85;
      expect(accuracy90Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 90% accuracy with enough predictions
      mockUserStats.totalPredictions = 20;
      mockUserStats.accuracyPercentage = 90;
      expect(accuracy90Rule.condition(mockUserStats)).toBe(true);
      
      // Higher accuracy with enough predictions
      mockUserStats.accuracyPercentage = 95;
      expect(accuracy90Rule.condition(mockUserStats)).toBe(true);
    });
  });

  describe('Volume Badges', () => {
    it('should award volume_10 badge for 10+ predictions', () => {
      const volume10Rule = BADGE_RULES.find(rule => rule.type === 'volume_10')!;
      
      // Less than 10 predictions
      mockUserStats.totalPredictions = 9;
      expect(volume10Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 10 predictions
      mockUserStats.totalPredictions = 10;
      expect(volume10Rule.condition(mockUserStats)).toBe(true);
      
      // More than 10 predictions
      mockUserStats.totalPredictions = 25;
      expect(volume10Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award volume_25 badge for 25+ predictions', () => {
      const volume25Rule = BADGE_RULES.find(rule => rule.type === 'volume_25')!;
      
      // Less than 25 predictions
      mockUserStats.totalPredictions = 24;
      expect(volume25Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 25 predictions
      mockUserStats.totalPredictions = 25;
      expect(volume25Rule.condition(mockUserStats)).toBe(true);
      
      // More than 25 predictions
      mockUserStats.totalPredictions = 50;
      expect(volume25Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award volume_50 badge for 50+ predictions', () => {
      const volume50Rule = BADGE_RULES.find(rule => rule.type === 'volume_50')!;
      
      // Less than 50 predictions
      mockUserStats.totalPredictions = 49;
      expect(volume50Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 50 predictions
      mockUserStats.totalPredictions = 50;
      expect(volume50Rule.condition(mockUserStats)).toBe(true);
      
      // More than 50 predictions
      mockUserStats.totalPredictions = 100;
      expect(volume50Rule.condition(mockUserStats)).toBe(true);
    });

    it('should award volume_100 badge for 100+ predictions', () => {
      const volume100Rule = BADGE_RULES.find(rule => rule.type === 'volume_100')!;
      
      // Less than 100 predictions
      mockUserStats.totalPredictions = 99;
      expect(volume100Rule.condition(mockUserStats)).toBe(false);
      
      // Exactly 100 predictions
      mockUserStats.totalPredictions = 100;
      expect(volume100Rule.condition(mockUserStats)).toBe(true);
      
      // More than 100 predictions
      mockUserStats.totalPredictions = 150;
      expect(volume100Rule.condition(mockUserStats)).toBe(true);
    });
  });

  describe('Badge Rules Configuration', () => {
    it('should have all required badge types', () => {
      const expectedTypes = [
        'starter',
        'streak_3', 'streak_5', 'streak_10',
        'accuracy_70', 'accuracy_80', 'accuracy_90',
        'volume_10', 'volume_25', 'volume_50', 'volume_100'
      ];

      const actualTypes = BADGE_RULES.map(rule => rule.type);
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
    });

    it('should have unique badge types', () => {
      const types = BADGE_RULES.map(rule => rule.type);
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });

    it('should have proper metadata for each badge', () => {
      BADGE_RULES.forEach(rule => {
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('condition');
        expect(typeof rule.condition).toBe('function');
      });
    });

    it('should have meaningful badge names', () => {
      BADGE_RULES.forEach(rule => {
        expect(rule.name).toBeTruthy();
        expect(rule.name.length).toBeGreaterThan(0);
        expect(rule.name).not.toBe(rule.type);
      });
    });

    it('should have descriptive badge descriptions', () => {
      BADGE_RULES.forEach(rule => {
        expect(rule.description).toBeTruthy();
        expect(rule.description.length).toBeGreaterThan(10);
        expect(rule.description).toContain('prediction');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero predictions correctly', () => {
      mockUserStats.totalPredictions = 0;
      mockUserStats.correctPredictions = 0;
      mockUserStats.accuracyPercentage = 0;
      mockUserStats.currentStreak = 0;

      // Only starter badge should be possible
      const starterRule = BADGE_RULES.find(rule => rule.type === 'starter')!;
      expect(starterRule.condition(mockUserStats)).toBe(false);

      // All other badges should be false
      const otherRules = BADGE_RULES.filter(rule => rule.type !== 'starter');
      otherRules.forEach(rule => {
        expect(rule.condition(mockUserStats)).toBe(false);
      });
    });

    it('should handle very high accuracy correctly', () => {
      mockUserStats.totalPredictions = 100;
      mockUserStats.correctPredictions = 100;
      mockUserStats.accuracyPercentage = 100;
      mockUserStats.currentStreak = 100;

      // All badges should be awarded
      BADGE_RULES.forEach(rule => {
        expect(rule.condition(mockUserStats)).toBe(true);
      });
    });

    it('should handle very low accuracy correctly', () => {
      mockUserStats.totalPredictions = 100;
      mockUserStats.correctPredictions = 10;
      mockUserStats.accuracyPercentage = 10;
      mockUserStats.currentStreak = 0;

      // Only volume badges should be awarded
      const volumeRules = BADGE_RULES.filter(rule => rule.type.startsWith('volume'));
      volumeRules.forEach(rule => {
        expect(rule.condition(mockUserStats)).toBe(true);
      });

      // Accuracy badges should not be awarded
      const accuracyRules = BADGE_RULES.filter(rule => rule.type.startsWith('accuracy'));
      accuracyRules.forEach(rule => {
        expect(rule.condition(mockUserStats)).toBe(false);
      });
    });
  });
});
