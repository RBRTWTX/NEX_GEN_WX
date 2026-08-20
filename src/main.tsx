import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from './app/StudioApp';
import { OutputApp } from './output/OutputApp';
import { WeatherDataProvider } from './data/weather-data-context';
import { ModuleRegistryProvider } from './modules/module-context';
import { StudioErrorBoundary } from './components/StudioErrorBoundary';
import './styles/r3-base.css';
import './styles/nex-gen-wx.css';
import './styles/broadcast-header.css';

const params = new URLSearchParams(window.location.search);
const isOutput = params.get('window') === 'output';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModuleRegistryProvider>
      <WeatherDataProvider>
        {isOutput ? <OutputApp /> : (
          <StudioErrorBoundary>
            <StudioApp />
          </StudioErrorBoundary>
        )}
      </WeatherDataProvider>
    </ModuleRegistryProvider>
  </StrictMode>,
);
