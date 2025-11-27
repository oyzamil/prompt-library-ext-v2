function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Header /> */}
      <main className="flex-1 overflow-y-auto">{children}</main>
      <LicenseModal />
      <Footer />
    </>
  );
}

export default ProtectedRoute;
