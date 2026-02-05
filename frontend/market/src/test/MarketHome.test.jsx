import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MarketHome from '../pages/MarketHome';
import MarketService from '../services/market.service';

// Mock MarketService
vi.mock('../services/market.service', () => ({
    default: {
        getAllProducts: vi.fn(),
    },
}));

// Mock ProductCard component
vi.mock('../components/ProductCard', () => ({
    default: ({ product }) => <div data-testid="product-card">{product.name}</div>,
}));

const renderMarketHome = () => {
    return render(
        <BrowserRouter>
            <MarketHome />
        </BrowserRouter>
    );
};

describe('MarketHome', () => {
    const mockProducts = [
        { id: 1, name: 'Laptop Gaming', price: 999, category: 'Electrónica' },
        { id: 2, name: 'Camiseta Deportiva', price: 29, category: 'Ropa' },
        { id: 3, name: 'Licuadora Pro', price: 89, category: 'Hogar' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        MarketService.getAllProducts.mockResolvedValue({ data: mockProducts });
    });

    it('should render hero section', async () => {
        renderMarketHome();

        expect(screen.getByText(/todo lo que necesitas/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
    });

    it('should show loading spinner initially', () => {
        MarketService.getAllProducts.mockImplementation(() => new Promise(() => { }));
        renderMarketHome();

        expect(screen.getByText(/buscando los mejores productos/i)).toBeInTheDocument();
    });

    it('should display products after loading', async () => {
        renderMarketHome();

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        expect(screen.getByText('Laptop Gaming')).toBeInTheDocument();
        expect(screen.getByText('Camiseta Deportiva')).toBeInTheDocument();
    });

    it('should filter products by search term', async () => {
        renderMarketHome();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        const searchInput = screen.getByPlaceholderText(/buscar productos/i);
        await user.type(searchInput, 'Laptop');

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(1);
            expect(screen.getByText('Laptop Gaming')).toBeInTheDocument();
        });
    });

    it('should filter products by category when clicking category card', async () => {
        renderMarketHome();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        // Click on "Ropa" category
        await user.click(screen.getByText('Ropa'));

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(1);
            expect(screen.getByText('Camiseta Deportiva')).toBeInTheDocument();
        });
    });

    it('should show no products message when search has no results', async () => {
        renderMarketHome();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        const searchInput = screen.getByPlaceholderText(/buscar productos/i);
        await user.type(searchInput, 'xyz123notfound');

        await waitFor(() => {
            expect(screen.getByText(/no encontramos productos/i)).toBeInTheDocument();
        });
    });

    it('should render category cards', async () => {
        renderMarketHome();

        expect(screen.getByText('Ropa')).toBeInTheDocument();
        expect(screen.getByText('Deportes')).toBeInTheDocument();
        expect(screen.getByText('Hogar')).toBeInTheDocument();
        expect(screen.getByText('Electrónica')).toBeInTheDocument();
    });

    it('should render feature section', async () => {
        renderMarketHome();

        expect(screen.getByText('Compra Segura')).toBeInTheDocument();
        expect(screen.getByText('Tiendas Locales')).toBeInTheDocument();
        expect(screen.getByText('Múltiples Pagos')).toBeInTheDocument();
    });

    it('should call getAllProducts on mount', async () => {
        renderMarketHome();

        await waitFor(() => {
            expect(MarketService.getAllProducts).toHaveBeenCalledTimes(1);
        });
    });
});
