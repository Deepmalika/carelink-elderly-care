import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import Triage from './pages/Triage';
import BookingDetail from './pages/BookingDetail';

import FamilyHome from './pages/family/FamilyHome';
import NewPatient from './pages/family/NewPatient';
import BookCaregiver from './pages/family/BookCaregiver';

import CaregiverHome from './pages/caregiver/CaregiverHome';
import CaregiverHistory from './pages/caregiver/CaregiverHistory';

import AdminHome from './pages/admin/AdminHome';
import AdminCaregivers from './pages/admin/AdminCaregivers';
import AdminServices from './pages/admin/AdminServices';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSentiment from './pages/admin/AdminSentiment';
import AdminModeration from './pages/admin/AdminModeration';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/services" element={<Services />} />
              <Route path="/triage" element={<Triage />} />

              <Route path="/bookings/:id" element={
                <ProtectedRoute><BookingDetail /></ProtectedRoute>
              } />

              <Route path="/family" element={
                <ProtectedRoute roles={['FAMILY']}><FamilyHome /></ProtectedRoute>
              } />
              <Route path="/family/new-patient" element={
                <ProtectedRoute roles={['FAMILY']}><NewPatient /></ProtectedRoute>
              } />
              <Route path="/family/book" element={
                <ProtectedRoute roles={['FAMILY']}><BookCaregiver /></ProtectedRoute>
              } />

              <Route path="/caregiver" element={
                <ProtectedRoute roles={['CAREGIVER']}><CaregiverHome /></ProtectedRoute>
              } />
              <Route path="/caregiver/history" element={
                <ProtectedRoute roles={['CAREGIVER']}><CaregiverHistory /></ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute roles={['ADMIN']}><AdminHome /></ProtectedRoute>
              } />
              <Route path="/admin/caregivers" element={
                <ProtectedRoute roles={['ADMIN']}><AdminCaregivers /></ProtectedRoute>
              } />
              <Route path="/admin/services" element={
                <ProtectedRoute roles={['ADMIN']}><AdminServices /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>
              } />
              <Route path="/admin/sentiment" element={
                <ProtectedRoute roles={['ADMIN']}><AdminSentiment /></ProtectedRoute>
              } />
              <Route path="/admin/moderation" element={
                <ProtectedRoute roles={['ADMIN']}><AdminModeration /></ProtectedRoute>
              } />

              <Route path="*" element={<Landing />} />
            </Routes>
          </main>
          <footer className="border-t border-pine-100 py-8 text-center text-sm text-muted">
            CareLink — Elderly Nursing & Healthcare Assistance Platform
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
