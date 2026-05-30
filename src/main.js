window.addEventListener('DOMContentLoaded', () => {
  const loadingBar = document.getElementById('loading-bar');
  const loadingText = document.getElementById('loading-text');
  const loadingTips = [
    'Aegis Industries AI network: ACTIVE',
    'ARES satellites: ARMED',
    'Ghost Division: DEPLOYED',
    'Captain Reed: READY',
    'Suppressor: ATTACHED',
    'Initializing threat analysis...',
  ];

  const steps = [
    { pct: 15, text: 'LOADING ASSET SYSTEM...' },
    { pct: 30, text: 'BUILDING THREE.JS RENDERER...' },
    { pct: 45, text: 'COMPILING ENEMY AI...' },
    { pct: 60, text: 'CONSTRUCTING WEAPONS...' },
    { pct: 75, text: 'LOADING MISSION DATA...' },
    { pct: 88, text: 'INITIALIZING AUDIO ENGINE...' },
    { pct: 100, text: 'GHOST DIVISION READY.' },
  ];

  let stepIdx = 0;
  let tipIdx = 0;
  let game = null;

  const tipEl = document.getElementById('loading-tip');

  const nextStep = () => {
    if (stepIdx >= steps.length) {
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        if (game) game.start();
      }, 400);
      return;
    }
    const step = steps[stepIdx++];
    if (loadingBar) loadingBar.style.width = step.pct + '%';
    if (loadingText) loadingText.textContent = step.text;
    if (tipEl) tipEl.textContent = loadingTips[tipIdx++ % loadingTips.length];
    setTimeout(nextStep, 200 + Math.random() * 150);
  };

  try {
    game = new Game();
    nextStep();
  } catch (err) {
    console.error('Failed to initialize game:', err);
    if (loadingText) loadingText.textContent = 'ERROR: ' + err.message;
    if (loadingBar) loadingBar.style.background = '#ff2244';
  }
});
