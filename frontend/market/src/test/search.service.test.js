import { describe, it, expect, beforeEach, vi } from 'vitest';
import SearchService from '../services/search.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import axios from 'axios';

describe('SearchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('searchProducts', () => {
        it('should search products with query', async () => {
            const mockProducts = [
                { id: 1, name: 'Laptop', price: 999 },
                { id: 2, name: 'Laptop Pro', price: 1499 },
            ];
            axios.get.mockResolvedValue({ data: mockProducts });

            const result = await SearchService.searchProducts('laptop');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/public/search'),
                { params: { q: 'laptop' } }
            );
            expect(result.data).toHaveLength(2);
        });
    });

    describe('getAllProducts', () => {
        it('should fetch all products', async () => {
            const mockProducts = [
                { id: 1, name: 'Product 1' },
                { id: 2, name: 'Product 2' },
            ];
            axios.get.mockResolvedValue({ data: mockProducts });

            const result = await SearchService.getAllProducts();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/public/products')
            );
            expect(result.data).toEqual(mockProducts);
        });
    });

    describe('getProductDetail', () => {
        it('should fetch product by id', async () => {
            const mockProduct = { id: 1, name: 'Laptop', price: 999, description: 'Great laptop' };
            axios.get.mockResolvedValue({ data: mockProduct });

            const result = await SearchService.getProductDetail(1);

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringMatching(/\/public\/products\/1$/)
            );
            expect(result.data).toEqual(mockProduct);
        });
    });

    describe('createOrder', () => {
        it('should create order with correct data', async () => {
            const orderData = {
                customerEmail: 'john@example.com',
                items: [{ productId: 1, quantity: 2 }],
            };
            axios.post.mockResolvedValue({ data: { message: 'Order created' } });

            const result = await SearchService.createOrder(orderData);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/public/order'),
                orderData
            );
            expect(result.data.message).toBe('Order created');
        });
    });

    describe('getPlatformConfig', () => {
        it('should fetch platform configuration', async () => {
            const mockConfig = { platformFee: 5, currency: 'USD' };
            axios.get.mockResolvedValue({ data: mockConfig });

            const result = await SearchService.getPlatformConfig();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/public/config')
            );
            expect(result.data).toEqual(mockConfig);
        });
    });

    describe('getSellersByName', () => {
        it('should fetch sellers for a product name', async () => {
            const mockSellers = [
                { id: 1, companyName: 'Store A', price: 100 },
                { id: 2, companyName: 'Store B', price: 95 },
            ];
            axios.get.mockResolvedValue({ data: mockSellers });

            const result = await SearchService.getSellersByName('iPhone 15');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/public/products/name/iPhone%2015/sellers')
            );
            expect(result.data).toHaveLength(2);
        });
    });

    describe('getCustomerPoints', () => {
        it('should fetch customer loyalty points', async () => {
            const mockPoints = { points: 500 };
            axios.get.mockResolvedValue({ data: mockPoints });

            const result = await SearchService.getCustomerPoints('john@example.com');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/public/customer/points'),
                { params: { email: 'john@example.com' } }
            );
            expect(result.data.points).toBe(500);
        });
    });
});
