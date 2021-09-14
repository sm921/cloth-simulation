namespace UI {
  export let liElements: HTMLLIElement[] = [];

  export function init(title: string, numberOfLiElement: number) {
    const app = document.getElementById("ui");
    const header = document.createElement("h1");
    header.innerHTML = title;
    const uiContainer = document.createElement("div");
    uiContainer.setAttribute("class", "ui");
    const ul = document.createElement("ul");
    uiContainer.append(ul);
    for (let i = 0; i < numberOfLiElement; i++) {
      const li = document.createElement("li");
      liElements.push(li);
      ul.append(li);
    }
    app?.append(header);
    app?.append(ul);
  }
}
