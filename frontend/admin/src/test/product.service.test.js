import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProductService from '../services/product.service';
import AuthService from '../services/auth.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

import axios from 'axios';

// Mock AuthService
vi.mock('../services/auth.service', () => ({
    default: {
        getCurrentUser: vi.fn(),
    },
}));

describe('ProductService', () => {
    const mockUser = { token: 'test-jwt-token' };

    beforeEach(() => {
        vi.clearAllMocks();
        AuthService.getCurrentUser.mockReturnValue(mockUser);
    });

    describe('getAll', () => {
        it('should fetch products with auth header', async () => {
            const mockProducts = [
                { id: 1, name: 'Product 1', price: 100 },
                { id: 2, name: 'Product 2', price: 200 },
            ];
            axios.get.mockResolvedValue({ data: mockProducts });

            const result = await ProductService.getAll();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/products/'),
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
            expect(result.data).toEqual(mockProducts);
        });

        it('should use empty header if no user logged in', async () => {
            AuthService.getCurrentUser.mockReturnValue(null);
            axios.get.mockResolvedValue({ data: [] });

            await ProductService.getAll();

            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                { headers: {} }
            );
        });
    });

    describe('create', () => {
        it('should post new product with auth header', async () => {
            const newProduct = { name: 'New Product', price: 150, stock: 10 };
            const mockResponse = { data: { ...newProduct, id: 3 } };
            axios.post.mockResolvedValue(mockResponse);

            const result = await ProductService.create(newProduct);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/products/'),
                newProduct,
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
            expect(result.data.id).toBe(3);
        });
    });

    describe('update', () => {
        it('should put updated product data with auth header', async () => {
            const updatedData = { name: 'Updated Product', price: 175 };
            axios.put.mockResolvedValue({ data: { ...updatedData, id: 1 } });

            await ProductService.update(1, updatedData);

            expect(axios.put).toHaveBeenCalledWith(
                expect.stringMatching(/\/products\/1$/),
                updatedData,
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
        });
    });

    describe('remove', () => {
        it('should delete product with auth header', async () => {
            axios.delete.mockResolvedValue({ data: { message: 'Deleted' } });

            await ProductService.remove(5);

            expect(axios.delete).toHaveBeenCalledWith(
                expect.stringMatching(/\/products\/5$/),
                { headers: { Authorization: 'Bearer test-jwt-token' } }
            );
        });
    });

    describe('getSuggestedSku', () => {
        it('should fetch suggested SKU with params', async () => {
            const mockSku = { suggestedSku: 'ELE-LAPT-0001' };
            axios.get.mockResolvedValue({ data: mockSku });

            const result = await ProductService.getSuggestedSku('Laptop', 'Electronics', 'Pro');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/suggest-sku'),
                {
                    params: { name: 'Laptop', category: 'Electronics', variant: 'Pro' },
                    headers: { Authorization: 'Bearer test-jwt-token' },
                }
            );
            expect(result.data.suggestedSku).toBe('ELE-LAPT-0001');
        });
    });
});
