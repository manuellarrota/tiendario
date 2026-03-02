import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import Navbar from "../components/Navbar";

const LegalPage = ({ type }) => {
    const isTerms = type === "terms";

    return (
        <div className="bg-light min-vh-100">
            <Navbar />
            <div className="py-5" style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                borderRadius: '0 0 40px 40px'
            }}>
                <Container>
                    <h1 className="display-5 fw-800 text-white mb-2">
                        {isTerms ? "📄 Términos de Servicio" : "🔒 Política de Privacidad"}
                    </h1>
                    <p className="text-white opacity-75">
                        Última actualización: Febrero 2026
                    </p>
                </Container>
            </div>

            <Container className="py-5">
                <Row className="justify-content-center">
                    <Col lg={8}>
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                            <Card.Body className="p-5">
                                {isTerms ? <TermsContent /> : <PrivacyContent />}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

const TermsContent = () => (
    <div className="legal-content">
        <h2 className="fw-bold mb-4">Términos y Condiciones de Uso</h2>

        <Section title="1. Aceptación de los Términos">
            Al acceder y utilizar la plataforma Tiendario ("la Plataforma"), usted acepta estar sujeto a estos
            Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no deberá utilizar
            la Plataforma.
        </Section>

        <Section title="2. Descripción del Servicio">
            Tiendario es un marketplace digital que conecta vendedores locales con compradores en la región de
            San Cristóbal, Táchira, Venezuela. La Plataforma ofrece:
            <ul className="mt-2">
                <li>Catálogo digital de productos de múltiples tiendas.</li>
                <li>Sistema de gestión de inventario para vendedores.</li>
                <li>Procesamiento de pedidos con modalidad "Click & Collect".</li>
                <li>Panel de administración para comercios.</li>
            </ul>
        </Section>

        <Section title="3. Registro y Cuentas">
            <ul>
                <li>Los usuarios deben proporcionar información veraz al registrarse.</li>
                <li>Cada usuario es responsable de mantener la confidencialidad de sus credenciales.</li>
                <li>La creación de cuentas falsas o múltiples está prohibida.</li>
                <li>Tiendario se reserva el derecho de suspender cuentas que violen estos términos.</li>
            </ul>
        </Section>

        <Section title="4. Planes y Suscripciones">
            <ul>
                <li><strong>Plan Gratuito:</strong> Permite exhibir productos en el catálogo digital.</li>
                <li><strong>Plan Premium:</strong> Incluye funcionalidades de venta, gestión de pedidos y reportes.</li>
                <li><strong>Periodo de Prueba:</strong> 15 días gratuitos con acceso a funciones Premium.</li>
                <li>Los pagos de suscripción son no reembolsables una vez procesados.</li>
            </ul>
        </Section>

        <Section title="5. Compras y Pagos">
            <ul>
                <li>Tiendario actúa como intermediario entre compradores y vendedores.</li>
                <li>Los pagos se coordinan directamente con cada tienda en la modalidad Click & Collect.</li>
                <li>Los precios publicados son establecidos por cada vendedor individual.</li>
                <li>Tiendario no es responsable por disputas de precios entre compradores y vendedores.</li>
            </ul>
        </Section>

        <Section title="6. Responsabilidad del Vendedor">
            Los vendedores registrados se comprometen a:
            <ul className="mt-2">
                <li>Publicar información precisa sobre sus productos.</li>
                <li>Mantener actualizado su inventario y precios.</li>
                <li>Cumplir con las leyes locales aplicables a la venta de sus productos.</li>
                <li>Respetar los pedidos realizados a través de la Plataforma.</li>
            </ul>
        </Section>

        <Section title="7. Propiedad Intelectual">
            Todo el contenido de la Plataforma, incluyendo pero no limitado a texto, gráficos, logotipos,
            iconos y software, es propiedad de Antigravity Inc. o sus licenciantes y está protegido por las
            leyes de propiedad intelectual aplicables.
        </Section>

        <Section title="8. Limitación de Responsabilidad">
            Tiendario no será responsable por:
            <ul className="mt-2">
                <li>Daños indirectos, incidentales o consecuentes.</li>
                <li>La calidad de productos vendidos por terceros en la Plataforma.</li>
                <li>Interrupciones del servicio por causas de fuerza mayor.</li>
                <li>Pérdida de datos causada por factores fuera de nuestro control.</li>
            </ul>
        </Section>

        <Section title="9. Modificaciones">
            Tiendario se reserva el derecho de modificar estos términos en cualquier momento. Los cambios
            significativos serán comunicados a los usuarios registrados. El uso continuado de la Plataforma
            después de los cambios constituye la aceptación de los nuevos términos.
        </Section>

        <Section title="10. Contacto">
            Para consultas relacionadas con estos términos, puede contactarnos a través de:
            <div className="bg-light p-3 rounded-3 mt-2">
                <strong>Email:</strong> legal@tiendario.com<br />
                <strong>Ubicación:</strong> San Cristóbal, Táchira, Venezuela
            </div>
        </Section>
    </div>
);

const PrivacyContent = () => (
    <div className="legal-content">
        <h2 className="fw-bold mb-4">Política de Privacidad</h2>

        <Section title="1. Información que Recopilamos">
            Recopilamos los siguientes tipos de información:
            <ul className="mt-2">
                <li><strong>Datos de registro:</strong> nombre, correo electrónico y contraseña.</li>
                <li><strong>Datos de perfil comercial:</strong> nombre del negocio, teléfono, ubicación y descripción.</li>
                <li><strong>Datos de transacciones:</strong> historial de pedidos, montos y métodos de pago reportados.</li>
                <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador y datos de uso de la plataforma.</li>
            </ul>
        </Section>

        <Section title="2. Uso de la Información">
            Utilizamos la información recopilada para:
            <ul className="mt-2">
                <li>Facilitar las transacciones entre compradores y vendedores.</li>
                <li>Gestionar cuentas de usuario y suscripciones.</li>
                <li>Enviar notificaciones sobre pedidos y actualizaciones del servicio.</li>
                <li>Mejorar la experiencia de usuario y funcionalidades de la Plataforma.</li>
                <li>Cumplir con obligaciones legales.</li>
            </ul>
        </Section>

        <Section title="3. Compartición de Datos">
            <ul>
                <li>Los datos de contacto del comprador se comparten con el vendedor para completar los pedidos.</li>
                <li>No vendemos información personal a terceros.</li>
                <li>Podemos compartir datos de forma agregada y anonimizada para análisis.</li>
                <li>Compartiremos datos cuando sea requerido por ley o autoridad competente.</li>
            </ul>
        </Section>

        <Section title="4. Seguridad de los Datos">
            Implementamos medidas de seguridad que incluyen:
            <ul className="mt-2">
                <li>Encriptación de contraseñas mediante BCrypt.</li>
                <li>Autenticación basada en tokens JWT con expiración.</li>
                <li>Rate limiting para prevenir ataques de fuerza bruta.</li>
                <li>Protección contra enumeración de usuarios.</li>
                <li>Control de acceso basado en roles (RBAC).</li>
            </ul>
        </Section>

        <Section title="5. Cookies y Almacenamiento Local">
            Utilizamos almacenamiento local del navegador (localStorage) para mantener la sesión del usuario.
            No utilizamos cookies de seguimiento de terceros.
        </Section>

        <Section title="6. Retención de Datos">
            <ul>
                <li>Los datos de cuenta se mantienen mientras la cuenta esté activa.</li>
                <li>Los datos de transacciones se conservan por el período requerido por la legislación fiscal aplicable.</li>
                <li>Los datos pueden ser eliminados a solicitud del usuario, salvo obligaciones legales de retención.</li>
            </ul>
        </Section>

        <Section title="7. Derechos del Usuario">
            Los usuarios tienen derecho a:
            <ul className="mt-2">
                <li><strong>Acceso:</strong> solicitar una copia de sus datos personales.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Eliminación:</strong> solicitar la eliminación de su cuenta y datos asociados.</li>
                <li><strong>Portabilidad:</strong> recibir sus datos en formato estándar.</li>
            </ul>
        </Section>

        <Section title="8. Menores de Edad">
            La Plataforma no está dirigida a menores de 18 años. No recopilamos
            intencionalmente información de menores de edad.
        </Section>

        <Section title="9. Cambios en esta Política">
            Nos reservamos el derecho de actualizar esta Política de Privacidad. Las modificaciones
            se publicarán en esta página con la fecha de última actualización. Recomendamos revisar
            esta política periódicamente.
        </Section>

        <Section title="10. Contacto">
            Para ejercer sus derechos o realizar consultas sobre privacidad:
            <div className="bg-light p-3 rounded-3 mt-2">
                <strong>Email:</strong> privacidad@tiendario.com<br />
                <strong>Ubicación:</strong> San Cristóbal, Táchira, Venezuela
            </div>
        </Section>
    </div>
);

const Section = ({ title, children }) => (
    <div className="mb-4">
        <h5 className="fw-bold text-primary mb-3">{title}</h5>
        <div className="text-secondary" style={{ lineHeight: 1.8 }}>
            {children}
        </div>
    </div>
);

export default LegalPage;
