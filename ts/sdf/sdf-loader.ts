namespace SDF_LOADER {
  loadJSON();

  function loadJSON() {
    document.getElementById("load")?.addEventListener("change", (e) => {
      const reader = new FileReader();
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file === undefined) return;
      reader.readAsText(file);
      reader.onload = (e) => {
        const json = e.target?.result;
        if (!json || typeof json !== "string") return;
        const sdf = SDF.restoreFromJSON(json);
        sdf.forEach((p) => {
          const color = THREE_HELPER.sphere(SDF_RENDER.scene, p);
          const [d, nx, ny, nz] = sdf._sdf(p);
          THREE_HELPER.line(
            SDF_RENDER.scene,
            [...p, ...VEC.add(p, VEC.scale([nx, ny, nz], Math.abs(d)))],
            color
          );
        });
      };
    });
  }
}
