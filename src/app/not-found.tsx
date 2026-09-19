export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#07141f', color: '#e5edf7' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Page Not Found</h1>
            <p style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>
              The requested municipal service page could not be found.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
