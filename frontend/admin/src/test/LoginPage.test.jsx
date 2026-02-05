import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import AuthService from '../services/auth.service';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthService
vi.mock('../services/auth.service', () => ({
    default: {
        login: vi.fn(),
    },
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
    value: { reload: mockReload },
    writable: true,
});

const renderLoginPage = () => {
    return render(
        <BrowserRouter>
            <LoginPage />
        </BrowserRouter>
    );
};

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form', () => {
        renderLoginPage();

        expect(screen.getByText('Tiendario - Iniciar Sesión')).toBeInTheDocument();
        expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
        expect(screen.getByText(/recuérdame/i)).toBeInTheDocument();
    });

    it('should update input values when typing', async () => {
        renderLoginPage();
        const user = userEvent.setup();

        const usernameInput = screen.getByLabelText(/usuario/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);

        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'password123');

        expect(usernameInput).toHaveValue('testuser');
        expect(passwordInput).toHaveValue('password123');
    });

    it('should call login service on form submit', async () => {
        AuthService.login.mockResolvedValue({ token: 'test-token' });
        renderLoginPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/usuario/i), 'testuser');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /ingresar/i }));

        await waitFor(() => {
            expect(AuthService.login).toHaveBeenCalledWith('testuser', 'password123', false);
        });
    });

    it('should navigate to dashboard on successful login', async () => {
        AuthService.login.mockResolvedValue({ token: 'test-token' });
        renderLoginPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/usuario/i), 'testuser');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /ingresar/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('should display error message on login failure', async () => {
        AuthService.login.mockRejectedValue({
            response: { data: { message: 'Invalid credentials' } },
        });
        renderLoginPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/usuario/i), 'testuser');
        await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /ingresar/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    it('should toggle remember me checkbox', async () => {
        renderLoginPage();
        const user = userEvent.setup();

        const checkbox = screen.getByLabelText(/recuérdame/i);
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);
        expect(checkbox).toBeChecked();
    });

    it('should pass rememberMe value to login service', async () => {
        AuthService.login.mockResolvedValue({ token: 'test-token' });
        renderLoginPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/usuario/i), 'testuser');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByLabelText(/recuérdame/i));
        await user.click(screen.getByRole('button', { name: /ingresar/i }));

        await waitFor(() => {
            expect(AuthService.login).toHaveBeenCalledWith('testuser', 'password123', true);
        });
    });

    it('should navigate to register page when clicking register link', async () => {
        renderLoginPage();
        const user = userEvent.setup();

        await user.click(screen.getByText(/regístrate aquí/i));

        expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    it('should show loading state while logging in', async () => {
        // Make login take some time
        AuthService.login.mockImplementation(() => new Promise(() => { }));
        renderLoginPage();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/usuario/i), 'testuser');
        await user.type(screen.getByLabelText(/contraseña/i), 'password123');
        await user.click(screen.getByRole('button', { name: /ingresar/i }));

        expect(screen.getByRole('button', { name: /cargando/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cargando/i })).toBeDisabled();
    });
});
