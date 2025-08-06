// Utility to extract dominant color from an image and convert to pastel
// Uses color-thief-browser (install with: npm install color-thief-browser)
import ColorThief from 'color-thief-browser';

// Convert an RGB array to a pastel hex color
export function rgbToPastelHex(rgb) {
  // Blend with white to get a pastel color
  const pastel = rgb.map(c => Math.round((c + 255 * 2) / 3));
  return (
    '#' + pastel.map(x => x.toString(16).padStart(2, '0')).join('')
  );
}

// Extract dominant color from an image URL, returns a pastel hex
export async function getPastelFromImage(url) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = async () => {
      try {
        const colorThief = new ColorThief();
        const rgb = await colorThief.getColor(img);
        resolve(rgbToPastelHex(rgb));
      } catch (e) {
        resolve('#f5f5f5'); // fallback
      }
    };
    img.onerror = () => resolve('#f5f5f5');
  });
}
