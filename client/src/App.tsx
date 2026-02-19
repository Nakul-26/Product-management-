import { useEffect } from 'react';
import api from './api/api';

function App() {
  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        console.log('Backend health:', res.data);
      })
      .catch((error) => {
        console.error('Backend health check failed:', error);
      });
  }, []);

  return <h1>Product Management System</h1>;
}

export default App;
