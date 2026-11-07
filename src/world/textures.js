import * as THREE from '../../vendor/three.module.js';

export function canvasTexture(width, height, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

export function dirtTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#87694d');
    grad.addColorStop(0.5, '#775c43');
    grad.addColorStop(1, '#6b523d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2.2 + 0.2;
      const light = Math.random() > 0.52;
      ctx.fillStyle = light
        ? `rgba(210,176,132,${Math.random() * 0.18})`
        : `rgba(42,29,22,${Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = '#4d3728';
      ctx.lineWidth = Math.random() * 1.6 + 0.3;
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 24;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [30, 30]);
}

export function concreteTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6f716c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4300; i++) {
      const v = Math.random() * 50 + 45;
      ctx.fillStyle = `rgba(${v},${v},${v - 3},${Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.4, Math.random() * 2 + 0.4);
    }
    ctx.strokeStyle = 'rgba(35,35,32,0.35)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w / 4, 0);
      ctx.lineTo(i * w / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * h / 4);
      ctx.lineTo(w, i * h / 4);
      ctx.stroke();
    }
  }, [4, 4]);
}

export function rustTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#793c29';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 7 + 0.5;
      ctx.fillStyle = Math.random() > 0.45
        ? `rgba(144,72,41,${Math.random() * 0.25})`
        : `rgba(45,24,18,${Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = '#d17943';
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 1, Math.random() * 45 + 5);
    }
    ctx.globalAlpha = 1;
  }, [3, 2]);
}

export function makeSignTexture(title, subtitle, accent = '#ffb347') {
  return canvasTexture(768, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0b1117';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = accent;
    ctx.fillRect(28, 32, 8, h - 64);
    ctx.fillStyle = '#eef4f4';
    ctx.font = '700 66px "Chakra Petch", sans-serif';
    ctx.fillText(title, 62, 110);
    ctx.fillStyle = accent;
    ctx.font = '600 24px "Space Grotesk", sans-serif';
    ctx.letterSpacing = '7px';
    ctx.fillText(subtitle, 64, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(64, 186, w - 128, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 18px "Space Grotesk", sans-serif';
    ctx.fillText('SITE 07  ·  DEEP BORE DIVISION', 64, 218);
  });
}

export function makeScreenTexture(title, rows, accent = '#72e7ff') {
  return canvasTexture(768, 384, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#07131a');
    grad.addColorStop(1, '#0a1c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(114,231,255,0.18)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = accent;
    ctx.font = '700 28px "Chakra Petch", sans-serif';
    ctx.fillText(title, 30, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '500 19px "Space Grotesk", sans-serif';
    rows.forEach((row, i) => ctx.fillText(row, 30, 98 + i * 31));
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, h - 62);
    for (let i = 0; i < 16; i++) {
      ctx.lineTo(30 + i * 44, h - 62 + Math.sin(i * 1.4) * 16);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

export function makeGlowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,213,150,0.9)');
    grad.addColorStop(0.48, 'rgba(255,115,48,0.25)');
    grad.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeDustTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,235,205,0.9)');
    grad.addColorStop(0.35, 'rgba(255,215,165,0.35)');
    grad.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeHazardTexture() {
  return canvasTexture(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#17191a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3b33f';
    for (let x = -h; x < w + h; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 26, h);
      ctx.lineTo(x + 26 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.closePath();
      ctx.fill();
    }
  }, [3, 1]);
}
