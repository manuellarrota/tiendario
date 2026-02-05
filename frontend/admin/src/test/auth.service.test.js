import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AuthService from '../services/auth.service';

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

import axios from 'axios';

describe('AuthService', () => {
    beforeEach(() => {
        // Clear localStorage and sessionStorage before each test
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('register', () => {
        it('should call signup endpoint with correct data', async () => {
            const mockResponse = { data: { message: 'User registered successfully!' } };
            axios.post.mockResolvedValue(mockResponse);

            const result = await AuthService.register('testuser', 'password123', 'manager', 'Test Company');

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/auth/signup'),
                {
                    username: 'testuser',
                    password: 'password123',
                    role: ['manager'],
                    companyName: 'Test Company',
                }
            );
            expect(result.data.message).toBe('User registered successfully!');
        });
    });

    describe('login', () => {
        it('should store user in localStorage when rememberMe is true', async () => {
            const mockUser = { token: 'jwt-token', username: 'testuser', roles: ['ROLE_MANAGER'] };
            axios.post.mockResolvedValue({ data: mockUser });

            await AuthService.login('testuser', 'password123', true);

            const storedUser = JSON.parse(localStorage.getItem('user'));
            expect(storedUser).toEqual(mockUser);
            expect(sessionStorage.getItem('user')).toBeNull();
        });

        it('should store user in sessionStorage when rememberMe is false', async () => {
            const mockUser = { token: 'jwt-token', username: 'testuser', roles: ['ROLE_MANAGER'] };
            axios.post.mockResolvedValue({ data: mockUser });

            await AuthService.login('testuser', 'password123', false);

            const storedUser = JSON.parse(sessionStorage.getItem('user'));
            expect(storedUser).toEqual(mockUser);
            expect(localStorage.getItem('user')).toBeNull();
        });

        it('should return user data after login', async () => {
            const mockUser = { token: 'jwt-token', username: 'testuser' };
            axios.post.mockResolvedValue({ data: mockUser });

            const result = await AuthService.login('testuser', 'password123', true);

            expect(result).toEqual(mockUser);
        });
    });

    describe('logout', () => {
        it('should remove user from both storages', () => {
            localStorage.setItem('user', JSON.stringify({ token: 'test' }));
            sessionStorage.setItem('user', JSON.stringify({ token: 'test' }));

            AuthService.logout();

            expect(localStorage.getItem('user')).toBeNull();
            expect(sessionStorage.getItem('user')).toBeNull();
        });
    });

    describe('getCurrentUser', () => {
        it('should return user from localStorage', () => {
            const mockUser = { token: 'jwt-token', username: 'testuser' };
            localStorage.setItem('user', JSON.stringify(mockUser));

            const result = AuthService.getCurrentUser();

            expect(result).toEqual(mockUser);
        });

        it('should return user from sessionStorage if not in localStorage', () => {
            const mockUser = { token: 'jwt-token', username: 'testuser' };
            sessionStorage.setItem('user', JSON.stringify(mockUser));

            const result = AuthService.getCurrentUser();

            expect(result).toEqual(mockUser);
        });

        it('should return null if no user in storage', () => {
            const result = AuthService.getCurrentUser();
            expect(result).toBeNull();
        });

        it('should return null and log error if JSON is invalid', () => {
            localStorage.setItem('user', 'invalid-json');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = AuthService.getCurrentUser();

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
