class MapManager {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;
    this.builder = new LevelBuilder(scene, assets);
    this.currentMap = null;
    this.currentChapter = 0;
  }

  loadChapter1() {
    this._clearCurrentMap();
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }
    this.currentChapter = 1;
    this.builder = new LevelBuilder(this.scene, this.assets);
    const data = this.builder.buildChapter1(this.assets);
    this.currentMap = data;
    return data;
  }

  loadChapter2() {
    this._clearCurrentMap();
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.currentChapter = 2;
    this.builder = new LevelBuilder(this.scene, this.assets);
    const data = this.builder.buildChapter2(this.assets);
    this.currentMap = data;
    return data;
  }

  _clearCurrentMap() {
    if (this.builder) this.builder.clear();
    this.currentMap = null;
  }

  getColliders() {
    return this.currentMap ? this.currentMap.colliders : [];
  }

  getCoverPoints() {
    return this.currentMap ? this.currentMap.coverPoints : [];
  }

  getInteractables() {
    return this.currentMap ? this.currentMap.interactables : [];
  }
}

window.MapManager = MapManager;
