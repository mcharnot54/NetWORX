export default function HomePage() {
  return (
    <main className="content-area">
      <div className="card">
        <h2 className="card-title">NetWORX Essentials - System Check</h2>
        <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
          Testing basic functionality...
        </p>
        
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ margin: 0, color: "#15803d", fontSize: "1.5rem", fontWeight: "700" }}>
            ✅ Basic System: Online
          </h3>
          <p style={{ color: "#15803d", fontSize: "0.875rem", margin: 0 }}>
            NetWORX Essentials simplified mode is working.
          </p>
        </div>
        
        <p>If you can see this message, the server is functioning correctly.</p>
      </div>
    </main>
  );
}
