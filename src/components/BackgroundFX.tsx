import React, { useEffect, useState } from 'react';

export interface BackgroundPhoto {
  id: string;
  title: string;
  url: string;
}

const baseUrl = (((import.meta as any).env?.BASE_URL) || './').replace(/\/$/, '') + '/assets/aistudio/';

export const BACKGROUND_PHOTOS: BackgroundPhoto[] = [
  { id: '01', title: 'Espiral Geométrica', url: `${baseUrl}01_ab27b0ee.jpg` },
  { id: '02', title: 'Píer Infinito', url: `${baseUrl}02_d2059371.jpg` },
  { id: '03', title: 'Dunas do Deserto', url: `${baseUrl}03_a8ffd669.jpg` },
  { id: '04', title: 'Cachoeira Skógafoss', url: `${baseUrl}04_51a369ee.jpg` },
  { id: '06', title: 'Urso Polar Ártico', url: `${baseUrl}06_883100cf.jpg` },
  { id: '07', title: 'Torre Eiffel', url: `${baseUrl}07_5e6e81b2.jpg` },
  { id: '08', title: 'Elefante de Amboseli', url: `${baseUrl}08_c5e3d5c4.jpg` },
  { id: '09', title: 'Monte Everest', url: `${baseUrl}09_be43390e.jpg` },
  { id: '10', title: 'Lago Nebuloso', url: `${baseUrl}10_d530e39e.jpg` },
  { id: '11', title: 'Highland Cattle', url: `${baseUrl}11_3d1559ce.jpg` },
  { id: '12', title: 'Palafita no Lago', url: `${baseUrl}12_88b13b80.jpg` },
  { id: '13', title: 'Colunata Brutalista', url: `${baseUrl}13_64685134.jpg` },
  { id: '14', title: 'Família Polar', url: `${baseUrl}14_610056ec.jpg` },
];

const CYCLE_INTERVAL_MS = 10000; // 10 segundos

interface BackgroundFXProps {
  locked?: boolean;
}

export const BackgroundFX: React.FC<BackgroundFXProps> = ({ locked }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Precarrega todas as 14 imagens em alta definição para troca instantânea
  useEffect(() => {
    BACKGROUND_PHOTOS.forEach((photo) => {
      const img = new Image();
      img.src = photo.url;
    });
  }, []);

  // Alterna as imagens a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUND_PHOTOS.length);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-app-wallpaper" aria-hidden="true">
      {/* Camadas com as 14 fotografias em 4K com crossfade suave */}
      <div className="bg-app-images">
        {BACKGROUND_PHOTOS.map((photo, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={photo.id}
              className={`bg-app-slide ${isActive ? 'is-active' : ''}`}
              style={{
                backgroundImage: `url(${photo.url})`,
              }}
            />
          );
        })}
      </div>

      {/* Camada sutil e estática de contraste para leitura perfeita dos cartões */}
      <div className="bg-app-scrim" />
      {locked && <div className="bg-app-locked-scrim" />}
    </div>
  );
};
