export default function TestSimplePage() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this page with styling, the basic Next.js setup is working.</p>
      <a href="/auth/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go to Login Page
      </a>
    </div>
  )
}