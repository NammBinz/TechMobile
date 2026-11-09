import AdminSidebar from './AdminSidebar'
import '../assets/css/admin-forms.css'

function AdminLayout({ children }) {
  return (
    <div className="container-fluid admin-layout">
      <div className="row">
        <div className="col-md-3 col-lg-2 p-0 admin-sidebar-column">
          <AdminSidebar />
        </div>

        <div className="col-md-9 col-lg-10 p-4 admin-main">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
