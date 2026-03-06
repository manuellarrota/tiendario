import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Container, Card, Button, Form, Alert, Badge, Spinner, Row, Col, ProgressBar } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import AdminService from '../services/admin.service';
import {
    FaStore, FaUser, FaTags, FaBoxOpen, FaCheckCircle,
    FaPlus, FaTrash, FaMapMarkerAlt, FaArrowRight, FaArrowLeft,
    FaRocket, FaShieldAlt
} from 'react-icons/fa';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationPicker = ({ position, setPosition }) => {
    useMapEvents({ click(e) { setPosition(e.latlng); } });
    return position ? <Marker position={position} /> : null;
};

const STEPS = [
    { label: 'Tienda', icon: FaStore },
    { label: 'Acceso', icon: FaUser },
    { label: 'Categorías', icon: FaTags },
    { label: 'Inventario', icon: FaBoxOpen },
    { label: 'Listo', icon: FaCheckCircle },
];

const PLANS = [
    { value: 'TRIAL', label: 'Prueba (30 días)', color: 'warning' },
    { value: 'PAID', label: 'Pro (Activo)', color: 'success' },
    { value: 'FREE', label: 'Gratis', color: 'secondary' },
];

const INITIAL_PRODUCT = { name: '', price: '', stock: '', category: '', costPrice: '', sku: '' };

export default function AdminOnboardingPage() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdCompanyId, setCreatedCompanyId] = useState(null);
    const [createdCompanyName, setCreatedCompanyName] = useState('');

    // Step 0 — Datos de Tienda
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [plan, setPlan] = useState('TRIAL');
    const [position, setPosition] = useState(null);

    // Step 1 — Cuenta de Acceso
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Step 2 — Categorías
    const [catInput, setCatInput] = useState('');
    const [categories, setCategories] = useState([]);
    const [globalCategories, setGlobalCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(false);

    useEffect(() => {
        AdminService.getGlobalCategories().then(
            res => setGlobalCategories(res.data || []),
            err => console.error("Error cargando categorías globales", err)
        );
    }, []);

    // Step 3 — Inventario
    const [products, setProducts] = useState([{ ...INITIAL_PRODUCT }]);
    const [prodLoading, setProdLoading] = useState(false);
    const [savedProducts, setSavedProducts] = useState([]);

    const progress = (step / (STEPS.length - 1)) * 100;

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await AdminService.createStore({
                companyName, username, email, password,
                phoneNumber: phone, description,
                subscriptionStatus: plan,
                latitude: position?.lat || 0,
                longitude: position?.lng || 0,
            });
            setCreatedCompanyId(res.data.companyId);
            setCreatedCompanyName(res.data.companyName);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear la tienda. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const addCategoryDirectly = async (name) => {
        if (!name.trim()) return;
        if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) return;
        setCatLoading(true);
        try {
            const res = await AdminService.addGlobalCategory({ name: name.trim() });
            setCategories(prev => [...prev, res.data]);
        } catch {
            setError('Error al agregar la categoría ' + name);
        } finally {
            setCatLoading(false);
        }
    };

    const handleAddCategory = () => {
        addCategoryDirectly(catInput);
        setCatInput('');
    };

    // Excel Logic
    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            if (data && data.length > 0) {
                const imported = data.map(row => ({
                    name: row['Nombre'] || '',
                    sku: row['SKU'] || '',
                    price: row['Precio'] || '',
                    stock: row['Cantidad'] || '',
                    category: row['Categoría'] || '',
                    costPrice: row['Precio Costo'] || ''
                }));
                // Also auto-add missing categories from Excel to current store categories
                const newCats = imported.map(i => i.category).filter(c => c && c.trim());
                const uniqueNewCats = [...new Set(newCats)];

                uniqueNewCats.forEach(catName => {
                    addCategoryDirectly(catName);
                });

                setProducts(prev => {
                    if (prev.length === 1 && !prev[0].name) return imported;
                    return [...prev, ...imported];
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadExcelTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { 'Nombre': 'Ejemplo Producto', 'SKU': 'SKU-001', 'Precio': 100, 'Cantidad': 50, 'Categoría': 'Ropa', 'Precio Costo': 80 }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, "Formato_Inventario.xlsx");
    };

    const handleSaveProducts = async () => {
        const valid = products.filter(p => p.name.trim() && p.price);
        if (valid.length === 0) { setStep(4); return; }
        setProdLoading(true);
        setError('');
        const saved = [];
        for (const p of valid) {
            try {
                await AdminService.addProductToCompany(createdCompanyId, {
                    name: p.name,
                    sku: p.sku,
                    price: parseFloat(p.price),
                    stock: parseInt(p.stock) || 0,
                    category: p.category,
                    costPrice: p.costPrice ? parseFloat(p.costPrice) : null,
                    minStock: 5,
                });
                saved.push(p.name);
            } catch { /* skip individual failures */ }
        }
        setSavedProducts(saved);
        setProdLoading(false);
        setStep(4);
    };

    const addProductRow = () => setProducts([...products, { ...INITIAL_PRODUCT }]);
    const removeProductRow = (i) => setProducts(products.filter((_, idx) => idx !== i));
    const updateProduct = (i, field, value) => {
        const updated = [...products];
        updated[i] = { ...updated[i], [field]: value };
        setProducts(updated);
    };

    const resetWizard = () => {
        setStep(0); setCompanyName(''); setPhone(''); setDescription(''); setPlan('TRIAL'); setPosition(null);
        setUsername(''); setEmail(''); setPassword('');
        setCategories([]); setCatInput('');
        setProducts([{ ...INITIAL_PRODUCT }]); setSavedProducts([]);
        setCreatedCompanyId(null); setCreatedCompanyName(''); setError('');
    };

    return (
        <div className="d-flex admin-content-area overflow-hidden">
            <Sidebar />
            <div className="flex-grow-1 p-3 p-md-4 main-content-mobile-fix" style={{ overflowY: 'auto', background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)' }}>
                <Container className="py-4" style={{ maxWidth: 820 }}>

                    {/* Header */}
                    <div className="mb-4">
                        <h2 className="fw-bold d-flex align-items-center gap-2 mb-1">
                            <div className="rounded-3 d-flex align-items-center justify-content-center text-white p-2"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', width: 42, height: 42 }}>
                                <FaRocket size={18} />
                            </div>
                            Registrar Nueva Tienda
                        </h2>
                        <p className="text-muted mb-0">Onboarding completo: datos, acceso, categorías e inventario inicial.</p>
                    </div>

                    {/* Step Indicator */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                        <Card.Body className="p-3">
                            <ProgressBar now={progress} className="mb-3" style={{ height: 6, background: '#e0e7ff' }}
                                variant="primary" />
                            <div className="d-flex justify-content-between">
                                {STEPS.map((s, i) => {
                                    const Icon = s.icon;
                                    const active = i === step;
                                    const done = i < step;
                                    return (
                                        <div key={i} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
                                            <div className={`rounded-circle d-flex align-items-center justify-content-center mb-1 fw-bold`}
                                                style={{
                                                    width: 36, height: 36, fontSize: 14, transition: 'all 0.3s',
                                                    background: done ? '#22c55e' : active ? '#6366f1' : '#e0e7ff',
                                                    color: (done || active) ? '#fff' : '#94a3b8',
                                                }}>
                                                {done ? <FaCheckCircle size={14} /> : <Icon size={14} />}
                                            </div>
                                            <small className={`d-none d-md-block fw-semibold ${active ? 'text-primary' : done ? 'text-success' : 'text-muted'}`}
                                                style={{ fontSize: '0.7rem' }}>
                                                {s.label}
                                            </small>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card.Body>
                    </Card>

                    {error && <Alert variant="danger" className="rounded-3" onClose={() => setError('')} dismissible>{error}</Alert>}

                    {/* ─── PASO 0: Datos de la Tienda ─── */}
                    {step === 0 && (
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                    <FaStore className="text-primary" /> Datos de la Tienda
                                </h5>
                                <p className="text-muted small mb-4">Información general del negocio de tu cliente.</p>
                                <Form>
                                    <Row className="g-3">
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Nombre de la Tienda <span className="text-danger">*</span></Form.Label>
                                                <Form.Control className="rounded-3" placeholder="Ej: Tienda de María"
                                                    value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Teléfono</Form.Label>
                                                <Form.Control className="rounded-3" placeholder="+58 412 1234567"
                                                    value={phone} onChange={e => setPhone(e.target.value)} />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Descripción del negocio</Form.Label>
                                                <Form.Control as="textarea" rows={2} className="rounded-3"
                                                    placeholder="¿Qué vende esta tienda? (opcional)"
                                                    value={description} onChange={e => setDescription(e.target.value)} />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Label className="fw-semibold small">Plan de Suscripción</Form.Label>
                                            <div className="d-flex gap-2 flex-wrap">
                                                {PLANS.map(p => (
                                                    <button key={p.value} type="button"
                                                        className={`btn btn-sm rounded-pill px-3 ${plan === p.value ? `btn-${p.color}` : `btn-outline-${p.color}`}`}
                                                        onClick={() => setPlan(p.value)}>
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Label className="fw-semibold small d-flex align-items-center gap-2">
                                                <FaMapMarkerAlt className="text-danger" /> Ubicación en el Mapa
                                                {position && <Badge bg="success" className="rounded-pill px-2">Marcada</Badge>}
                                            </Form.Label>
                                            <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e7ff' }}>
                                                <MapContainer center={[10.4806, -66.9036]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <LocationPicker position={position} setPosition={setPosition} />
                                                </MapContainer>
                                            </div>
                                            <small className="text-muted">Haz clic en el mapa para marcar la ubicación de la tienda.</small>
                                        </Col>
                                    </Row>
                                    <div className="d-flex justify-content-end mt-4">
                                        <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm"
                                            disabled={!companyName.trim()}
                                            onClick={() => setStep(1)}>
                                            Siguiente: Cuenta de Acceso <FaArrowRight className="ms-2" />
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}

                    {/* ─── PASO 1: Cuenta de Acceso ─── */}
                    {step === 1 && (
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                    <FaShieldAlt className="text-primary" /> Cuenta del Gestor
                                </h5>
                                <p className="text-muted small mb-4">
                                    Estas credenciales se las das al dueño de la tienda para que inicie sesión.
                                    La cuenta queda <strong>activa de inmediato</strong> sin necesidad de verificación por correo.
                                </p>
                                <Form onSubmit={handleCreateStore}>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Usuario <span className="text-danger">*</span></Form.Label>
                                                <Form.Control className="rounded-3" placeholder="tienda_maria"
                                                    value={username} onChange={e => setUsername(e.target.value)} required />
                                                <Form.Text className="text-muted">Solo letras, números y guiones bajos.</Form.Text>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Correo Electrónico <span className="text-danger">*</span></Form.Label>
                                                <Form.Control type="email" className="rounded-3" placeholder="maria@tienda.com"
                                                    value={email} onChange={e => setEmail(e.target.value)} required />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Contraseña <span className="text-danger">*</span></Form.Label>
                                                <Form.Control type="password" className="rounded-3" placeholder="Mínimo 6 caracteres"
                                                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="d-flex align-items-end">
                                            <div className="bg-light rounded-3 p-3 w-100">
                                                <small className="text-muted d-block mb-1">Registrando para:</small>
                                                <span className="fw-bold">{companyName}</span>
                                                <Badge className="ms-2 rounded-pill" bg={PLANS.find(p => p.value === plan)?.color || 'secondary'}>
                                                    {PLANS.find(p => p.value === plan)?.label}
                                                </Badge>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="d-flex justify-content-between mt-4">
                                        <Button variant="light" className="rounded-pill px-4" onClick={() => setStep(0)}>
                                            <FaArrowLeft className="me-2" /> Atrás
                                        </Button>
                                        <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold shadow-sm"
                                            disabled={loading || !username || !email || !password}>
                                            {loading ? <><Spinner size="sm" animation="border" className="me-2" />Creando tienda...</> : <>Crear Tienda <FaArrowRight className="ms-2" /></>}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}

                    {/* ─── PASO 2: Categorías ─── */}
                    {step === 2 && (
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="rounded-3 d-flex align-items-center justify-content-center text-white p-2"
                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', width: 40, height: 40 }}>
                                        <FaCheckCircle size={16} />
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-0">¡Tienda creada! Ahora las categorías</h5>
                                        <small className="text-muted">
                                            Empresa: <strong>{createdCompanyName}</strong> · ID: #{createdCompanyId}
                                        </small>
                                    </div>
                                </div>

                                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                    <FaTags className="text-primary" /> Categorías de Productos
                                </h6>

                                <div className="d-flex gap-2 mb-3">
                                    <Form.Control className="rounded-3" placeholder="Ej: Ropa, Calzado, Electrónica..."
                                        value={catInput} onChange={e => setCatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())} />
                                    <Button variant="primary" className="rounded-3 px-3" onClick={handleAddCategory} disabled={catLoading || !catInput.trim()}>
                                        {catLoading ? <Spinner size="sm" animation="border" /> : <FaPlus />}
                                    </Button>
                                </div>

                                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 mt-4">
                                    <FaTags className="text-secondary" /> Sugerencias Globales
                                </h6>
                                <div className="d-flex flex-wrap gap-2 mb-4">
                                    {globalCategories.slice(0, 15).map((gc, idx) => {
                                        const alreadyAdded = categories.find(c => c.name.toLowerCase() === gc.toLowerCase());
                                        if (alreadyAdded) return null;
                                        return (
                                            <Badge key={idx} bg="light" text="dark" className="border px-3 py-2 rounded-pill shadow-sm"
                                                style={{ cursor: 'pointer' }} onClick={() => addCategoryDirectly(gc)}>
                                                <FaPlus className="me-1 text-primary" /> {gc}
                                            </Badge>
                                        );
                                    })}
                                </div>

                                <div className="d-flex flex-wrap gap-2 mb-4" style={{ minHeight: 48 }}>
                                    {categories.length === 0 ? (
                                        <small className="text-muted fst-italic">Aún no has agregado categorías. Puedes continuar sin ellas.</small>
                                    ) : categories.map((c, i) => (
                                        <Badge key={i} bg="primary" className="px-3 py-2 rounded-pill fs-6 fw-normal"
                                            style={{ cursor: 'default' }}>
                                            <FaTags className="me-1" />{c.name}
                                        </Badge>
                                    ))}
                                </div>

                                <div className="d-flex justify-content-between">
                                    <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setStep(3)}>
                                        Omitir categorías
                                    </Button>
                                    <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setStep(3)}>
                                        Siguiente: Inventario <FaArrowRight className="ms-2" />
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* ─── PASO 3: Inventario Inicial ─── */}
                    {step === 3 && (
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                    <FaBoxOpen className="text-primary" /> Inventario Inicial
                                </h5>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <p className="text-muted small mb-0">
                                        Agrega los primeros productos de la tienda.
                                    </p>
                                    <div className="d-flex gap-2">
                                        <Button variant="outline-success" size="sm" className="rounded-pill px-3 fw-bold" onClick={downloadExcelTemplate}>
                                            <FaArrowRight className="me-1" /> Descargar Formato
                                        </Button>
                                        <div className="position-relative">
                                            <Button variant="success" size="sm" className="rounded-pill px-3 fw-bold bg-success text-white border-0 shadow-sm" style={{ pointerEvents: 'none' }}>
                                                <FaBoxOpen className="me-1" /> Importar Excel
                                            </Button>
                                            <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload}
                                                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-borderless align-middle mb-2">
                                        <thead>
                                            <tr className="bg-light rounded">
                                                <th className="small fw-bold text-muted ps-2">Nombre del Producto</th>
                                                <th className="small fw-bold text-muted">SKU (Grupo)</th>
                                                <th className="small fw-bold text-muted">Precio</th>
                                                <th className="small fw-bold text-muted">Cantidad</th>
                                                <th className="small fw-bold text-muted">Categoría</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((p, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <Form.Control size="sm" className="rounded-3"
                                                            placeholder="Ej: Camiseta Azul"
                                                            value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} />
                                                    </td>
                                                    <td style={{ width: 130 }}>
                                                        <Form.Control size="sm" className="rounded-3"
                                                            placeholder="SKU-XXX"
                                                            value={p.sku} onChange={e => updateProduct(i, 'sku', e.target.value)} />
                                                    </td>
                                                    <td style={{ width: 100 }}>
                                                        <Form.Control size="sm" type="number" className="rounded-3"
                                                            placeholder="0.00" min="0" step="0.01"
                                                            value={p.price} onChange={e => updateProduct(i, 'price', e.target.value)} />
                                                    </td>
                                                    <td style={{ width: 90 }}>
                                                        <Form.Control size="sm" type="number" className="rounded-3"
                                                            placeholder="0" min="0"
                                                            value={p.stock} onChange={e => updateProduct(i, 'stock', e.target.value)} />
                                                    </td>
                                                    <td style={{ width: 160 }}>
                                                        <Form.Select size="sm" className="rounded-3"
                                                            value={p.category} onChange={e => updateProduct(i, 'category', e.target.value)}>
                                                            <option value="">Sin categoría</option>
                                                            {categories.map((c, ci) => (
                                                                <option key={ci} value={c.name}>{c.name}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </td>
                                                    <td style={{ width: 40 }}>
                                                        {products.length > 1 && (
                                                            <Button variant="link" className="text-danger p-0" onClick={() => removeProductRow(i)}>
                                                                <FaTrash size={14} />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Button variant="outline-primary" size="sm" className="rounded-pill px-3 mb-4" onClick={addProductRow}>
                                    <FaPlus className="me-1" /> Agregar fila
                                </Button>

                                <div className="d-flex justify-content-between">
                                    <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setStep(4)}>
                                        Omitir inventario
                                    </Button>
                                    <Button variant="success" className="rounded-pill px-4 fw-bold shadow-sm"
                                        onClick={handleSaveProducts} disabled={prodLoading}>
                                        {prodLoading
                                            ? <><Spinner size="sm" animation="border" className="me-2" />Guardando...</>
                                            : <><FaCheckCircle className="me-2" />Guardar y Finalizar</>}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* ─── PASO 4: Confirmación ─── */}
                    {step === 4 && (
                        <Card className="border-0 shadow-sm rounded-4 text-center">
                            <Card.Body className="p-5">
                                <div className="mb-4">
                                    <div className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                                        style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                        <FaCheckCircle size={36} className="text-white" />
                                    </div>
                                    <h3 className="fw-bold mb-1">¡Tienda Registrada Exitosamente!</h3>
                                    <p className="text-muted">
                                        <strong>{createdCompanyName}</strong> ya está activa en el sistema.
                                    </p>
                                </div>

                                <Row className="justify-content-center g-3 mb-4">
                                    <Col md={4}>
                                        <div className="bg-light rounded-4 p-3">
                                            <div className="fw-bold fs-4 text-primary">{categories.length}</div>
                                            <small className="text-muted">Categorías creadas</small>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="bg-light rounded-4 p-3">
                                            <div className="fw-bold fs-4 text-success">{savedProducts.length}</div>
                                            <small className="text-muted">Productos agregados</small>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="bg-light rounded-4 p-3">
                                            <div className="fw-bold fs-4 text-indigo">
                                                {PLANS.find(p => p.value === plan)?.label?.split(' ')[0]}
                                            </div>
                                            <small className="text-muted">Plan activo</small>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="bg-light rounded-3 p-3 text-start mb-4" style={{ fontSize: '0.875rem' }}>
                                    <div className="fw-bold mb-2 text-muted">CREDENCIALES PARA EL CLIENTE</div>
                                    <div><span className="text-muted">Usuario:</span> <strong className="ms-2 font-monospace">{username}</strong></div>
                                    <div><span className="text-muted">Contraseña:</span> <strong className="ms-2 font-monospace">{password}</strong></div>
                                    <div><span className="text-muted">URL Admin:</span> <strong className="ms-2 font-monospace">localhost:8081</strong></div>
                                </div>

                                <div className="d-flex gap-3 justify-content-center flex-wrap">
                                    <Button variant="outline-primary" className="rounded-pill px-4" onClick={resetWizard}>
                                        <FaPlus className="me-2" /> Registrar Otra Tienda
                                    </Button>
                                    <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm"
                                        onClick={() => window.location.href = '/admin/companies'}>
                                        <FaStore className="me-2" /> Ver Todas las Tiendas
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </Container>
            </div>
        </div>
    );
}
