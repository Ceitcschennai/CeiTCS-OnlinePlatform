import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}


// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null, errorInfo: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true };
//   }

//   componentDidCatch(error, errorInfo) {
//     this.setState({
//       error: error,
//       errorInfo: errorInfo
//     });
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div style={{
//           padding: '2rem',
//           textAlign: 'center',
//           minHeight: '100vh',
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'center',
//           justifyContent: 'center',
//           background: '#f8f9fa'
//         }}>
//           <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
//             Something went wrong
//           </h2>
//           <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
//             We're sorry for the inconvenience. Please try refreshing the page.
//           </p>
//           <button 
//             onClick={() => window.location.reload()}
//             style={{
//               padding: '0.75rem 1.5rem',
//               background: '#007bff',
//               color: 'white',
//               border: 'none',
//               borderRadius: '0.5rem',
//               cursor: 'pointer',
//               fontSize: '1rem'
//             }}
//           >
//             Refresh Page
//           </button>
//           {process.env.NODE_ENV === 'development' && (
//             <details style={{ marginTop: '2rem', textAlign: 'left' }}>
//               <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
//                 Error Details (Development Mode)
//               </summary>
//               <pre style={{ 
//                 background: '#f8f9fa', 
//                 padding: '1rem', 
//                 borderRadius: '0.5rem',
//                 fontSize: '0.8rem',
//                 overflow: 'auto'
//               }}>
//                 {this.state.error && this.state.error.toString()}
//                 <br />
//                 {this.state.errorInfo.componentStack}
//               </pre>
//             </details>
//           )}
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

export default ErrorBoundary;
