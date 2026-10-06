import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './globals.css';

export const metadata = {
  title: 'Lumio · Acompanhamento de rota em tempo real',
  description: 'Defina origem e destino e acompanhe a localização real do dispositivo durante o trajeto.'
};

export default function Layout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
