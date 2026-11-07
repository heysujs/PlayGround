import { BLOCKS } from './blocks.js';
import { makeIcon } from './textures.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function buildHotbar(el, hotbar, selected, onPick) {
  el.textContent = '';
  hotbar.forEach((id, i) => {
    const slot = document.createElement('button');
    slot.className = 'slot' + (i === selected ? ' selected' : '');
    slot.dataset.slot = String(i);
    slot.title = `${BLOCKS[id].name} (${i + 1})`;
    slot.setAttribute('aria-label', `${i + 1}: ${BLOCKS[id].name}`);
    const ic = document.createElement('span');
    ic.className = 'ic';
    ic.appendChild(makeIcon(BLOCKS[id], 48));
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(i + 1);
    slot.append(ic, num);
    slot.addEventListener('pointerdown', (e) => e.stopPropagation());
    slot.addEventListener('click', (e) => { e.stopPropagation(); onPick(i); });
    el.appendChild(slot);
  });
}

export function updateHotbarSelection(el, selected) {
  [...el.children].forEach((s, i) => s.classList.toggle('selected', i === selected));
}

export function buildPalette(el, activeId, onPick) {
  el.textContent = '';
  const list = BLOCKS.filter((b) => b && b.placeable);
  for (const def of list) {
    const btn = document.createElement('button');
    btn.className = 'paletteItem' + (def.id === activeId ? ' active' : '');
    btn.type = 'button';
    btn.appendChild(makeIcon(def, 48));
    const label = document.createElement('span');
    label.className = 'pname';
    label.textContent = def.name;
    btn.appendChild(label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onPick(def.id);
    });
    el.appendChild(btn);
  }
}

let toastTimer = 0;
export function toast(msg, ms = 1600) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

export function setBreakRing(el, progress) {
  const cross = $('#crosshair');
  if (!cross) return;
  if (progress == null || progress <= 0.001) {
    cross.classList.remove('mining');
    el.style.background = '';
    return;
  }
  cross.classList.add('mining');
  const deg = Math.min(1, progress) * 360;
  el.style.background = `conic-gradient(#ffe9a8 0deg, #ffe9a8 ${deg}deg, rgba(255,255,255,0.12) ${deg}deg)`;
}

export function fadeOut(el, ms = 250) {
  if (!el) return;
  el.classList.remove('show');
  setTimeout(() => el.classList.add('hidden'), ms);
}
export function show(el) { if (el) { el.classList.remove('hidden'); requestAnimationFrame(() => el.classList.add('show')); } }
export function hide(el) { if (el) { el.classList.remove('show'); } }
