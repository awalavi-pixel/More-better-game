import * as THREE from 'three';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  private fov: number;

  constructor(canvas: HTMLCanvasElement) {
    this.fov = 90;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.camera.position.set(0, 1.65, 0);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setFOV(degrees: number): void {
    this.fov = degrees;
    this.camera.fov = degrees;
    this.camera.updateProjectionMatrix();
  }

  getFOV(): number { return this.fov; }

  render(scene: THREE.Scene): void {
    this.renderer.render(scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
