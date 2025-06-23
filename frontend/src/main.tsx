import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { PostHogProvider } from 'posthog-js/react'

const AppWithProviders = () => {
  const content = (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  if (import.meta.env.MODE === 'development') {
    return content;
  }

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        capture_exceptions: true,
      }}
    >
      {content}
    </PostHogProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithProviders />
  </StrictMode>,
)