// src/components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('DataSmithy crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#F8FAFC', padding: '20px'
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
            padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A', marginBottom: '10px' }}>
              Something went wrong
            </div>
            <div style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/app'; }}
              style={{
                background: '#00CBA8', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                marginRight: '10px'
              }}>
              ↩ Back to Tool
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0',
                borderRadius: '8px', padding: '10px 24px', fontSize: '13px', cursor: 'pointer'
              }}>
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}