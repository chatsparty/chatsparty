import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { PostHogProvider } from 'posthog-js/react'
import { createFaviconDataURL } from './utils/generateFavicon'

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

// Set the favicon dynamically
const setFavicon = () => {
  const faviconURL = createFaviconDataURL();
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    link.href = faviconURL;
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/svg+xml';
    newLink.href = faviconURL;
    document.head.appendChild(newLink);
  }
};

// Set favicon before rendering
setFavicon();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithProviders />
  </StrictMode>,
)