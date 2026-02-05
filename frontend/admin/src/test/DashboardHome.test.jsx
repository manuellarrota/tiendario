import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardHome from '../pages/DashboardHome';
import AuthService from '../services/auth.service';
import DashboardService from '../services/dashboard.service';
import AdminService from '../services/admin.service';

// Mock Sidebar component
vi.mock('../components/Sidebar', () => ({
    default: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock services
vi.mock('../services/auth.service', () => ({
    default: {
        getCurrentUser: vi.fn(),
    },
}));

vi.mock('../services/dashboard.service', () => ({
    default: {
        getSummary: vi.fn(),
    },
}));

vi.mock('../services/admin.service', () => ({
    default: {
        getGlobalStats: vi.fn(),
    },
}));

vi.mock('../services/company.service', () => ({
    default: {
        upgradeSubscription: vi.fn(),
        downgradeSubscription: vi.fn(),
    },
}));

const renderDashboardHome = () => {
    return render(
        <BrowserRouter>
            <DashboardHome />
        </BrowserRouter>
    );
};

describe('DashboardHome', () => {
    const mockManagerUser = {
        token: 'test-token',
        roles: ['ROLE_MANAGER'],
        subscriptionStatus: 'FREE',
    };

    const mockPremiumUser = {
        token: 'test-token',
        roles: ['ROLE_MANAGER'],
        subscriptionStatus: 'PAID',
    };

    const mockAdminUser = {
        token: 'test-token',
        roles: ['ROLE_ADMIN'],
        subscriptionStatus: 'PAID',
    };

    const mockSummary = {
        totalProducts: 25,
        lowStockCount: 3,
        revenueToday: 1500.00,
        salesCountToday: 10,
        averageMargin: 35.5,
    };

    const mockAdminStats = {
        totalCompanies: 50,
        totalUsers: 200,
        globalGmv: 150000,
        paidPlanCount: 15,
        freePlanCount: 35,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Manager User (FREE plan)', () => {
        beforeEach(() => {
            AuthService.getCurrentUser.mockReturnValue(mockManagerUser);
            DashboardService.getSummary.mockResolvedValue({ data: mockSummary });
        });

        it('should render dashboard with sidebar', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByTestId('sidebar')).toBeInTheDocument();
                expect(screen.getByText('Panel de Control')).toBeInTheDocument();
            });
        });

        it('should show FREE plan badge', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByText('Plan Gratuito')).toBeInTheDocument();
            });
        });

        it('should display total products count', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByText('25')).toBeInTheDocument();
            });
        });

        it('should call getSummary on mount', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(DashboardService.getSummary).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Manager User (PAID/Premium plan)', () => {
        beforeEach(() => {
            AuthService.getCurrentUser.mockReturnValue(mockPremiumUser);
            DashboardService.getSummary.mockResolvedValue({ data: mockSummary });
        });

        it('should show premium metrics', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByText('25')).toBeInTheDocument(); // Total products
            });
        });

        it('should not show FREE badge for premium users', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.queryByText('Plan Gratuito')).not.toBeInTheDocument();
            });
        });
    });

    describe('Super Admin User', () => {
        beforeEach(() => {
            AuthService.getCurrentUser.mockReturnValue(mockAdminUser);
            AdminService.getGlobalStats.mockResolvedValue({ data: mockAdminStats });
        });

        it('should show Super Admin badge', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByText('Super Admin')).toBeInTheDocument();
            });
        });

        it('should call getGlobalStats for admin', async () => {
            renderDashboardHome();

            await waitFor(() => {
                expect(AdminService.getGlobalStats).toHaveBeenCalledTimes(1);
                expect(DashboardService.getSummary).not.toHaveBeenCalled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message on API failure', async () => {
            AuthService.getCurrentUser.mockReturnValue(mockManagerUser);
            DashboardService.getSummary.mockRejectedValue(new Error('API Error'));

            renderDashboardHome();

            await waitFor(() => {
                expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument();
            });
        });
    });
});
