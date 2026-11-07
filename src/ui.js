import {
  UPGRADE_DEFS, SHOP_ITEMS, formatMoney, formatDepth, formatClock,
} from './config.js';

const $ = (selector) => document.querySelector(selector);

export class GameUI {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.modalOpen = false;
    this.modalKind = null;
    this.started = false;
    this.pointerLocked = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.last = {};
    this.waypointEls = {
      lab: $('.wp-lab'),
      shop: $('.wp-shop'),
      rig: $('.wp-rig'),
    };

    this.el = {
      hud: $('#hud'),
      intro: $('#intro'),
      modal: $('#modal'),
      modalCard: $('#modalCard'),
      victory: $('#victory'),
      fade: $('#fade'),
      depthValue: $('#depthValue'),
      depthFill: $('#depthFill'),
      biomeTag: $('#biomeTag'),
      cashValue: $('#cashValue'),
      cashRate: $('#cashRate'),
      missionTitle: $('#missionTitle'),
      missionCopy: $('#missionCopy'),
      missionMeta: $('#missionMeta'),
      missionPct: $('#missionPct'),
      oilTime: $('#oilTime'),
      oilFill: $('#oilFill'),
      oilInventory: $('#oilInventory'),
      oilMax: $('#oilMax'),
      rigStatus: $('#rigStatus'),
      reticle: $('#reticle'),
      prompt: $('#interactPrompt'),
      promptText: $('#interactText'),
      toastStack: $('#toastStack'),
      clickLook: $('#clickLook'),
      soundToggle: $('#soundToggle'),
      mapZone: $('#mapZone'),
      minimap: $('#minimap'),
      waypointLayer: $('#waypointLayer'),
      touchUI: $('#touchUI'),
      touchUse: $('#touchUse'),
      touchSprint: $('#touchSprint'),
      joystick: $('#joystick'),
      stick: $('#stick'),
      startBtn: $('#startBtn'),
      againBtn: $('#againBtn'),
      victoryTime: $('#victoryTime'),
      victoryEarned: $('#victoryEarned'),
      victoryBarrels: $('#victoryBarrels'),
      victoryUpgrades: $('#victoryUpgrades'),
    };

    this.el.startBtn.addEventListener('click', () => {
      this.handlers.onStart?.();
    });
    this.el.againBtn.addEventListener('click', () => {
      this.handlers.onRestart?.();
    });
    this.el.soundToggle.addEventListener('click', () => {
      this.handlers.onToggleSound?.();
    });
    this.el.modal.addEventListener('click', (event) => {
      if (event.target === this.el.modal) this.handlers.onClosePanel?.();
    });
    this.el.modalCard.addEventListener('click', (event) => {
      const close = event.target.closest('[data-close]');
      if (close) {
        this.handlers.onClosePanel?.();
        return;
      }
      const buy = event.target.closest('[data-buy]');
      if (buy) {
        this.handlers.onBuy?.(buy.dataset.buy);
        return;
      }
      const upgrade = event.target.closest('[data-upgrade]');
      if (upgrade) {
        this.handlers.onUpgrade?.(upgrade.dataset.upgrade);
      }
    });

    if (this.isTouch) {
      this.el.touchUI.style.display = 'block';
      this.el.touchUse.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.handlers.onTouchUse?.();
      });
      this.el.touchSprint.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.handlers.onSprintToggle?.();
      });
    }
  }

  start() {
    this.started = true;
    this.el.intro.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
  }

  resetToIntro() {
    this.started = false;
    this.modalOpen = false;
    this.el.modal.classList.add('hidden');
    this.el.victory.classList.add('hidden');
    this.el.hud.classList.add('hidden');
    this.el.intro.classList.remove('hidden');
  }

  setPointerLocked(locked) {
    this.pointerLocked = locked;
    this.el.clickLook.classList.toggle('visible', this.started && !locked && !this.modalOpen && !this.isTouch);
  }

  setMuted(muted) {
    this.el.soundToggle.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  }

  updateHUD(state, info) {
    const {
      biome, objective, rate, tankCapacity, speed, oilSeconds, totalOilSeconds,
    } = info;
    const depth = state.depth;
    const pct = Math.min(100, (depth / 6371) * 100);

    this.setText('depthValue', formatDepth(depth));
    this.el.depthFill.style.width = `${pct}%`;
    this.el.biomeTag.textContent = biome.id;
    this.el.biomeTag.style.color = biome.css;
    this.el.biomeTag.style.borderColor = `${biome.css}66`;
    this.el.biomeTag.style.background = `${biome.css}14`;
    this.setText('cashValue', formatMoney(state.cash));
    this.setText('cashRate', state.drilling ? `+${formatMoney(rate)} / SEC` : '+$0 / SEC');
    this.setText('missionTitle', objective.title);
    this.setText('missionCopy', objective.copy);
    this.setText('missionMeta', objective.meta);
    this.setText('missionPct', `${pct.toFixed(1)}%`);

    const oilPct = Math.min(100, (oilSeconds / Math.max(1, totalOilSeconds)) * 100);
    this.el.oilFill.style.width = `${oilPct}%`;
    this.setText('oilTime', oilSeconds > 0 ? formatClock(oilSeconds) : 'DRY');
    this.setText('oilInventory', `${state.oilInv} BARREL${state.oilInv === 1 ? '' : 'S'}`);
    this.setText('oilMax', `CAPACITY ${tankCapacity} BARREL${tankCapacity === 1 ? '' : 'S'} · ${speed.toFixed(1)} KM/S`);
    const status = this.el.rigStatus;
    status.className = `status ${state.drilling ? 'drilling' : oilSeconds > 0 ? 'ready' : 'idle'}`;
    status.innerHTML = `<i></i>${state.drilling ? 'DRILLING' : oilSeconds > 0 ? 'READY' : 'IDLE'}`;

    this.el.clickLook.classList.toggle('visible', this.started && !this.pointerLocked && !this.modalOpen && !this.isTouch);
  }

  setText(key, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    const node = this.el[key];
    if (node) node.textContent = value;
  }

  setInteract(label) {
    if (label) {
      this.el.promptText.textContent = label;
      this.el.prompt.classList.add('visible');
      this.el.reticle.classList.add('active');
    } else {
      this.el.prompt.classList.remove('visible');
      this.el.reticle.classList.remove('active');
    }
  }

  toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`.trim();
    node.textContent = message;
    this.el.toastStack.appendChild(node);
    while (this.el.toastStack.children.length > 4) this.el.toastStack.firstChild.remove();
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 320);
    }, 2900);
  }

  showModal(kind, state) {
    this.modalOpen = true;
    this.modalKind = kind;
    this.el.modal.classList.remove('hidden');
    this.el.clickLook.classList.remove('visible');
    if (kind === 'shop') this.renderShop(state);
    else this.renderLab(state);
  }

  hideModal() {
    this.modalOpen = false;
    this.modalKind = null;
    this.el.modal.classList.add('hidden');
  }

  renderShop(state) {
    const items = SHOP_ITEMS.map((item) => {
      const affordable = state.cash >= item.cost;
      return `
        <article class="shop-item">
          <div class="item-icon">${item.icon}</div>
          <div class="item-name">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
          <div class="item-stock">+${item.barrels} BARREL${item.barrels === 1 ? '' : 'S'} · IN STOCK</div>
          <button class="buy-btn" data-buy="${item.id}" ${affordable ? '' : 'disabled'}>
            BUY · ${formatMoney(item.cost)}
          </button>
        </article>
      `;
    }).join('');

    this.el.modalCard.innerHTML = `
      <div class="modal-head">
        <div>
          <div class="modal-kicker">OIL DEPOT · SITE 07</div>
          <div class="modal-title">FUEL &amp; SUPPLIES</div>
          <div class="modal-sub">Crude barrels keep the BORE-01 reservoir running. Each barrel burns for exactly 60 seconds of drilling.</div>
        </div>
        <button class="modal-close" data-close aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="shop-grid">${items}</div>
      </div>
      <div class="modal-foot">
        <span>INVENTORY · ${state.oilInv} BARREL${state.oilInv === 1 ? '' : 'S'}</span>
        <span>AVAILABLE <b class="wallet">${formatMoney(state.cash)}</b></span>
      </div>
    `;
  }

  renderLab(state) {
    const cards = UPGRADE_DEFS.map((def) => {
      const level = state.lv[def.id] || 0;
      const maxed = level >= def.max;
      const cost = maxed ? null : def.costs[level];
      const affordable = cost !== null && state.cash >= cost;
      const pips = Array.from({ length: def.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
      const current = def.stat(level);
      const next = maxed ? null : def.stat(level + 1);
      return `
        <article class="upgrade-card ${maxed ? 'maxed' : ''}">
          <div class="upgrade-top">
            <div class="upgrade-name">${def.name}</div>
            <div class="upgrade-level">${maxed ? 'MAXED' : `LV ${level + 1} / ${def.max}`}</div>
          </div>
          <div class="upgrade-desc">${def.desc}</div>
          <div class="upgrade-stat">${def.statLabel} <b>${current}</b>${next ? `<span>→</span><b>${next}</b>` : ''}</div>
          <div class="level-pips">${pips}</div>
          <button class="buy-btn" data-upgrade="${def.id}" ${maxed || !affordable ? 'disabled' : ''}>
            ${maxed ? 'FULLY UPGRADED' : `INSTALL · ${formatMoney(cost)}`}
          </button>
        </article>
      `;
    }).join('');

    this.el.modalCard.innerHTML = `
      <div class="modal-head">
        <div>
          <div class="modal-kicker">CORE LAB · GEOSCIENCE</div>
          <div class="modal-title">DRILL RESEARCH</div>
          <div class="modal-sub">Spend bore credits on permanent rig improvements. Every upgrade applies immediately to BORE-01.</div>
        </div>
        <button class="modal-close" data-close aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="upgrade-grid">${cards}</div>
      </div>
      <div class="modal-foot">
        <span>LAB ACCESS · GRANTED</span>
        <span>AVAILABLE <b class="wallet">${formatMoney(state.cash)}</b></span>
      </div>
    `;
  }

  updateWaypoints(camera, zone, waypoints) {
    const show = this.started && zone === 'surface' && !this.modalOpen;
    for (const [key, node] of Object.entries(this.waypointEls)) {
      if (!show) {
        node.classList.remove('visible');
        continue;
      }
      const world = waypoints[key];
      const projected = world.clone().project(camera);
      if (projected.z > 1 || projected.z < -1) {
        node.classList.remove('visible');
        continue;
      }
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      if (x < -80 || x > window.innerWidth + 80 || y < -80 || y > window.innerHeight + 80) {
        node.classList.remove('visible');
        continue;
      }
      const dist = world.distanceTo(camera.position);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.querySelector('.wp-dist').textContent = `${Math.round(dist)} M`;
      node.classList.add('visible');
    }
  }

  drawMinimap(state, zone, playerPos, yaw) {
    const canvas = this.el.minimap;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(9,17,22,0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(114,231,255,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 5) * i, 0);
      ctx.lineTo((w / 5) * i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h / 5) * i);
      ctx.lineTo(w, (h / 5) * i);
      ctx.stroke();
    }

    const mapX = (x) => ((x + 48) / 96) * w;
    const mapY = (z) => ((z + 54) / 90) * h;

    if (zone === 'surface') {
      this.el.mapZone.textContent = 'SITE 07 · SURFACE';
      // Paths.
      ctx.strokeStyle = 'rgba(176,140,104,0.32)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(28));
      ctx.lineTo(mapX(0), mapY(-15));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(-2));
      ctx.lineTo(mapX(-19), mapY(-8));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(-2));
      ctx.lineTo(mapX(19), mapY(-8));
      ctx.stroke();

      // Buildings.
      ctx.fillStyle = 'rgba(114,231,255,0.5)';
      ctx.fillRect(mapX(-25), mapY(-12.8), mapX(-13) - mapX(-25), mapY(-3.3) - mapY(-12.8));
      ctx.fillStyle = 'rgba(255,179,71,0.55)';
      ctx.fillRect(mapX(13), mapY(-12.8), mapX(25) - mapX(13), mapY(-3.3) - mapY(-12.8));
      // Rig.
      ctx.strokeStyle = '#ff9c50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mapX(0), mapY(-22), 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,100,40,0.5)';
      ctx.beginPath();
      ctx.arc(mapX(0), mapY(-22), 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Player.
      const px = mapX(playerPos.x);
      const py = mapY(playerPos.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-yaw);
      ctx.fillStyle = '#eef4f4';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 3);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 13, 0, Math.PI * 2);
      ctx.stroke();
    } else if (zone === 'lab') {
      this.el.mapZone.textContent = 'CORE LAB · INTERIOR';
      ctx.strokeStyle = 'rgba(114,231,255,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.16, h * 0.14, w * 0.68, h * 0.72);
      ctx.fillStyle = 'rgba(114,231,255,0.5)';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.46, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,179,71,0.7)';
      ctx.fillRect(w * 0.24, h * 0.26, 12, 5);
      const lx = ((playerPos.x - 193) / 14) * (w * 0.68) + w * 0.16;
      const ly = ((playerPos.z + 6) / 12) * (h * 0.72) + h * 0.14;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-yaw);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      this.el.mapZone.textContent = 'OIL DEPOT · INTERIOR';
      ctx.strokeStyle = 'rgba(255,179,71,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.16, h * 0.14, w * 0.68, h * 0.72);
      ctx.fillStyle = 'rgba(255,179,71,0.65)';
      ctx.fillRect(w * 0.3, h * 0.38, w * 0.4, 8);
      const sx = ((playerPos.x + 206.5) / 13) * (w * 0.68) + w * 0.16;
      const sy = ((playerPos.z + 5.5) / 11) * (h * 0.72) + h * 0.14;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-yaw);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  showVictory(stats) {
    this.el.victory.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.victoryTime.textContent = stats.time;
    this.el.victoryEarned.textContent = stats.earned;
    this.el.victoryBarrels.textContent = stats.barrels;
    this.el.victoryUpgrades.textContent = stats.upgrades;
  }

  hideVictory() {
    this.el.victory.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
  }

  fade(on) {
    this.el.fade.classList.toggle('on', on);
  }
}
