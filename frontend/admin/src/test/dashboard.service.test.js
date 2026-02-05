import { describe, it, expect, beforeEach, vi } from 'vitest';
import DashboardService from '../services/dashboard.service';
import AuthService from '../services/auth.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

import axios from 'axios';

// Mock AuthService
vi.mock('../services/auth.service', () => ({
    default: {
        getCurrentUser: vi.fn(),
    },
}));

describe('DashboardService', () => {
    const mockUser = { token: 'test-jwt-token' };

    beforeEach(() => {
        vi.clearAllMocks();
        AuthService.getCurrentUser.mockReturnValue(mockUser);
    });

    describe('getSummary', () => {
        it('should fetch dashboard summary with auth header', async () => {
            const mockSummary = {
                totalProducts: 25,
                lowStockCount: 3,
                revenueToday: 1500.00,
                salesCountToday: 10,
                averageMargin: 35.5,
            };
            axios.get.mockResolvedValue({ data: mockSummary });

            const result = await DashboardService.getSummary();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/dashboard/summary'),
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
            expect(result.data).toEqual(mockSummary);
        });

        it('should return correct summary data structure', async () => {
            const mockSummary = {
                totalProducts: 10,
                lowStockCount: 2,
                revenueToday: 500,
                salesCountToday: 5,
                averageMargin: 25,
            };
            axios.get.mockResolvedValue({ data: mockSummary });

            const result = await DashboardService.getSummary();

            expect(result.data).toHaveProperty('totalProducts');
            expect(result.data).toHaveProperty('lowStockCount');
            expect(result.data).toHaveProperty('revenueToday');
            expect(result.data).toHaveProperty('salesCountToday');
            expect(result.data).toHaveProperty('averageMargin');
        });
    });
});
