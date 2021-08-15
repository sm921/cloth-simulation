let gui;
let guiControls: GuiControls;

class GuiControls {
  constructor(
    public restart: boolean,
    public damping_i: number,
    public gravity_i: number,
    public len_i: number,
    public mass_i: number,
    public sizex_i: number,
    public sizey_i: number,
    public springLen_i: number,
    public stiffness_i: number
  ) {}
}

// require dat.gui.min.js
function initGUI(restartCloth: Function) {
  gui = new dat.GUI();

  guiControls = new GuiControls(
    false,
    CLOTH_MODEL.damping_i,
    CLOTH_MODEL.gravity_i,
    CLOTH_MODEL.len_i,
    CLOTH_MODEL.mass_i,
    CLOTH_MODEL.sizex_i,
    CLOTH_MODEL.sizey_i,
    CLOTH_MODEL.springLen_i,
    CLOTH_MODEL.stiffness_i
  );

  gui.add(guiControls, "restart").onChange((_) => restartCloth());
  gui
    .add(guiControls, "springLen_i", 1, Math.floor(CLOTH_MODEL.len_i / 2))
    .step(1)
    .name("spring len")
    .onChange((value) => {
      CLOTH_MODEL.setSpringLen_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "len_i", 200, 1000)
    .step(20)
    .name("length of cloth")
    .onChange((value) => {
      CLOTH_MODEL.setLen_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "sizex_i", 2, 100)
    .step(1)
    .name("x segments")
    .onChange((value) => {
      CLOTH_MODEL.setSizeX_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "sizey_i", 2, 100)
    .step(1)
    .name("y segments")
    .onChange((value) => {
      CLOTH_MODEL.setSizeY_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "stiffness_i", 0, 3)
    .step(0.01)
    .name("stiffness")
    .onChange((value) => {
      CLOTH_MODEL.setStiffness_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "damping_i", 0, 3)
    .step(0.01)
    .name("damping")
    .onChange((value) => {
      CLOTH_MODEL.setDamping_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "gravity_i", 0, 10)
    .step(0.01)
    .name("gravity")
    .onChange((value) => {
      CLOTH_MODEL.setGravity_i(value);
      restartCloth();
    });
  gui
    .add(guiControls, "mass_i", 0, 10)
    .step(0.01)
    .name("mass")
    .onChange((value) => {
      CLOTH_MODEL.setMass_i(value);
      restartCloth();
    });
}
