import { Routes, Route } from 'react-router-dom'

import ScrollToTop from './components/ScrollToTop'

import Header from './components/Header'
import Footer from './components/Footer'
import FloatingPanels from './components/FloatingPanels'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/client/Home'
import ProductList from './pages/client/ProductList'
import ProductDetail from './pages/client/ProductDetail'
import Compare from './pages/client/Compare'
import Cart from './pages/client/Cart'
import Wishlist from './pages/client/Wishlist'
import Checkout from './pages/client/Checkout'
import Login from './pages/client/Login'
import Register from './pages/client/Register'
import Profile from './pages/client/Profile'
import OrderHistory from './pages/client/OrderHistory'

import Dashboard from './pages/admin/Dashboard'
import ProductManager from './pages/admin/ProductManager'
import CategoryManager from './pages/admin/CategoryManager'
import UserManager from './pages/admin/UserManager'
import StaffManager from './pages/admin/StaffManager'
import OrderManager from './pages/admin/OrderManager'
import CouponManager from './pages/admin/CouponManager'

function App() {
  return (
    <>
      <ScrollToTop />
      
      <Header />

      <Routes>
        {/* Client */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <ProductManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <OrderManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CategoryManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/staffs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CouponManager />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
      <FloatingPanels />
    </>
  )
}

export default App