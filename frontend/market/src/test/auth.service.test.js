import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AuthService from '../services/auth.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

import axios from 'axios';

describe('AuthService (Market)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('register', () => {
        it('should call signup endpoint with client role', async () => {
            const mockResponse = { data: { message: 'User registered successfully!' } };
            axios.post.mockResolvedValue(mockResponse);

            const result = await AuthService.register('John Doe', 'john@example.com', 'password123');

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/auth/signup'),
                {
                    username: 'john@example.com', // Email used as username
                    email: 'john@example.com',
                    password: 'password123',
                    role: ['client'],
                }
            );
            expect(result.data.message).toBe('User registered successfully!');
        });
    });

    describe('login', () => {
        it('should store customer in localStorage', async () => {
            const mockCustomer = { token: 'jwt-token', username: 'john@example.com', roles: ['ROLE_CLIENT'] };
            axios.post.mockResolvedValue({ data: mockCustomer });

            await AuthService.login('john@example.com', 'password123');

            const storedCustomer = JSON.parse(localStorage.getItem('customer'));
            expect(storedCustomer).toEqual(mockCustomer);
        });

        it('should return customer data after login', async () => {
            const mockCustomer = { token: 'jwt-token', username: 'john@example.com' };
            axios.post.mockResolvedValue({ data: mockCustomer });

            const result = await AuthService.login('john@example.com', 'password123');

            expect(result).toEqual(mockCustomer);
        });
    });

    describe('logout', () => {
        it('should remove customer from localStorage', () => {
            localStorage.setItem('customer', JSON.stringify({ token: 'test' }));

            AuthService.logout();

            expect(localStorage.getItem('customer')).toBeNull();
        });
    });

    describe('getCurrentUser', () => {
        it('should return customer from localStorage', () => {
            const mockCustomer = { token: 'jwt-token', username: 'john@example.com' };
            localStorage.setItem('customer', JSON.stringify(mockCustomer));

            const result = AuthService.getCurrentUser();

            expect(result).toEqual(mockCustomer);
        });

        it('should return null if no customer in storage', () => {
            const result = AuthService.getCurrentUser();
            expect(result).toBeNull();
        });
    });
});
