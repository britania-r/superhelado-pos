// src/router/AppRouter.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { PosPage } from '../features/pos/PosPage';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { CategoryManagementPage } from '../features/management/categories/CategoryManagementPage';
import { StoreManagementPage } from '../features/management/stores/StoreManagementPage';
import { ProductManagementPage } from '../features/management/products/ProductManagementPage';
import { ProductDetailPage } from '../features/management/products/ProductDetailPage';
import { UserManagementPage } from '../features/management/users/UserManagementPage';
import { PaymentMethodManagementPage } from '../features/management/payment-methods/PaymentMethodManagementPage';
import { SaleManagementPage } from '../features/sales/SaleManagementPage';
import { SaleDetailPage } from '../features/sales/SaleDetailPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { DailyCashPage } from '../features/reports/DailyCashPage';
import { NotFoundPage } from '../features/errors/NotFoundPage';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}> 
            <Route path="/" element={<PosPage />} />
            <Route path="/reports" element={<ReportsPage />} /> 
            
            <Route path="/management/products" element={<ProductManagementPage />} />
            <Route path="/management/products/:productId" element={<ProductDetailPage />} />
            <Route path="/management/categories" element={<CategoryManagementPage />} />
            <Route path="/management/stores" element={<StoreManagementPage />} />
            <Route path="/management/users" element={<UserManagementPage />} />
            <Route path="/management/payment-methods" element={<PaymentMethodManagementPage />} />

            <Route path="/sales" element={<SaleManagementPage />} />
            <Route path="/sales/:saleId" element={<SaleDetailPage />} />


            <Route path="/cash-daily" element={<DailyCashPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};