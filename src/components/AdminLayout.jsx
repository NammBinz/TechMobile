import AdminSidebar from './AdminSidebar'

function AdminLayout({ children }) {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-3 col-lg-2 p-0">
          <AdminSidebar />
        </div>

        <div className="col-md-9 col-lg-10 p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminLayout