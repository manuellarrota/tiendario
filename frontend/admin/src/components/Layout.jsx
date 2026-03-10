import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, isSuperAdmin, isBlocked }) => {
    return (
        <div className="admin-layout">
            <Sidebar isSuperAdmin={isSuperAdmin} isBlocked={isBlocked} />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
