import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import AuthService from '../services/auth.service';

// Mock useNavigate and useSearchParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('plan=free')],
    };
});

// Mock AuthService
vi.mock('../services/auth.service', () => ({
    default: {
        register: vi.fn(),
    },
}));

const renderRegisterPage = () => {
    return render(
        <BrowserRouter>
            <RegisterPage />
        </BrowserRouter>
    );
};

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render registration form', () => {
        renderRegisterPage();

        expect(screen.getByText('Crear Tienda')).toBeInTheDocument();
        expect(screen.getByLabelText(/nombre de tu empresa/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/usuario \(admin\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /registrar empresa/i })).toBeInTheDocument();
    });

    it('should show selected plan', () => {
        renderRegisterPage();

        expect(screen.getByText(/plan seleccionado/i)).toBeInTheDocument();
        expect(screen.getByText('free')).toBeInTheDocument();
    });

    it('should update input values when typing', async () => {
        renderRegisterPage();
        const user = userEvent.setup();

        const companyInput = screen.getByLabelText(/nombre de tu empresa/i);
        const usernameInput = screen.getByLabelText(/usuario \(admin\)/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);

        await user.type(companyInput, 'Mi Tienda');
        await user.type(usernameInput, 'miusuario');
        await user.type(passwordInput, 'password123');

        expect(companyInput).toHaveValue('Mi Tienda');
        expect(usernameInput).toHaveValue('miusuario');
        expect(passwordInput).toHaveValue('password123');
    });

    it('should call register service on form submit', async () => {
        AuthService.register.mockResolvedValue({ data: { message: 'Success' } });
        renderRegisterPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/nombre de tu empresa/i), 'Mi Tienda');
        await user.type(screen.getByLabelText(/usuario \(admin\)/i), 'miusuario');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /registrar empresa/i }));

        await waitFor(() => {
            expect(AuthService.register).toHaveBeenCalledWith(
                'miusuario',
                'password123',
                'manager',
                'Mi Tienda'
            );
        });
    });

    it('should show success message on successful registration', async () => {
        AuthService.register.mockResolvedValue({ data: { message: 'Success' } });
        renderRegisterPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/nombre de tu empresa/i), 'Mi Tienda');
        await user.type(screen.getByLabelText(/usuario \(admin\)/i), 'miusuario');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /registrar empresa/i }));

        await waitFor(() => {
            expect(screen.getByText(/registro exitoso/i)).toBeInTheDocument();
        });
    });

    it('should show error message on registration failure', async () => {
        AuthService.register.mockRejectedValue({
            response: { data: { message: 'Username already exists' } },
        });
        renderRegisterPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/nombre de tu empresa/i), 'Mi Tienda');
        await user.type(screen.getByLabelText(/usuario \(admin\)/i), 'existinguser');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /registrar empresa/i }));

        await waitFor(() => {
            expect(screen.getByText('Username already exists')).toBeInTheDocument();
        });
    });

    it('should navigate to login when clicking login link', async () => {
        renderRegisterPage();
        const user = userEvent.setup();

        await user.click(screen.getByText(/inicia sesión/i));

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});
