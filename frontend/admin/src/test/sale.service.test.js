import { describe, it, expect, beforeEach, vi } from 'vitest';
import SaleService from '../services/sale.service';
import AuthService from '../services/auth.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

import axios from 'axios';

// Mock AuthService
vi.mock('../services/auth.service', () => ({
    default: {
        getCurrentUser: vi.fn(),
    },
}));

describe('SaleService', () => {
    const mockUser = { token: 'test-jwt-token' };

    beforeEach(() => {
        vi.clearAllMocks();
        AuthService.getCurrentUser.mockReturnValue(mockUser);
    });

    describe('getSales', () => {
        it('should fetch sales with auth header', async () => {
            const mockSales = [
                { id: 1, totalAmount: 100, status: 'PAID' },
                { id: 2, totalAmount: 200, status: 'PENDING' },
            ];
            axios.get.mockResolvedValue({ data: mockSales });

            const result = await SaleService.getSales();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/sales/'),
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
            expect(result.data).toHaveLength(2);
        });
    });

    describe('createSale', () => {
        it('should post new sale with auth header', async () => {
            const newSale = {
                items: [{ productId: 1, quantity: 2 }],
            };
            const mockResponse = { data: { message: 'Sale completed!' } };
            axios.post.mockResolvedValue(mockResponse);

            const result = await SaleService.createSale(newSale);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/sales/'),
                newSale,
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
            expect(result.data.message).toContain('completed');
        });
    });

    describe('updateStatus', () => {
        it('should update sale status with auth header', async () => {
            axios.put.mockResolvedValue({ data: { message: 'Status updated' } });

            await SaleService.updateStatus(1, 'PAID');

            expect(axios.put).toHaveBeenCalledWith(
                expect.stringMatching(/\/sales\/1\/status$/),
                null,
                {
                    params: { status: 'PAID' },
                    headers: { Authorization: 'Bearer test-jwt-token' },
                }
            );
        });
    });
});
