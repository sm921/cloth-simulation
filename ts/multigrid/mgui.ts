/// <reference path="../helpers/ui.ts" />
namespace MGUI {
  export function initUI(): void {
    UI.init("Muligrid Example Problem");
  }

  export function addDescription(
    phi: (x: number, y: number) => number,
    f: (x: number, y: number) => number,
    index: number = 0
  ): void {
    UI.addLiElements(3);
    UI.printTo(index, `solve  φ(x,y)  such that  ∇・∇φ(x,y) = f(x,y)`);
    UI.printTo(index + 1, `φ: ${phi.toString()}`);
    UI.printTo(index + 2, `f: ${f.toString()}`);
  }

  export function plot2d(
    phi: (x: number) => number,
    data: {
      x: number[];
      y: number[] | Float32Array;
      name: string;
    }[]
  ): void {
    Plotly.newPlot(
      UI.addDiv(),
      data.map((d) => ({
        type: "scatter",
        x: d.x,
        y: d.y,
        name: d.name,
      })),
      {
        width: 500,
      },
      { displayModeBar: false }
    );
  }

  export function plot3d(
    phi: (x: number, y: number) => number,
    data: {
      x: number[];
      y: number[];
      z: number[] | Float32Array;
      name: string;
    }[]
  ): void {
    Plotly.newPlot(
      UI.addDiv(),
      data.map((d) => ({
        type: "mesh3d",
        name: d.name,
        x: d.x,
        y: d.y,
        z: d.z,
      })),
      {
        margin: { b: 20, l: 20, r: 20, t: 20 },
        width: 500,
        scene: {
          zaxis: { title: `phi = ${phi.toString()}` },
        },
      },
      { displayModeBar: false }
    );
  }
}
