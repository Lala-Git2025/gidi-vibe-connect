import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerSW'
import { reportWebVitals } from './utils/vitals'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();

// Monitor Web Vitals in production
if (import.meta.env.PROD) {
  reportWebVitals();
}
