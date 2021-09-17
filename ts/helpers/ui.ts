namespace UI {
  let app: HTMLDivElement;
  export let liElements: HTMLLIElement[] = [];

  export function addBtn(
    label: string,
    onclick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    const span = document.createElement("span");
    span.innerHTML = label;
    btn.append(span);
    btn.addEventListener("click", onclick);
    app.append(btn);
    return btn;
  }

  export function addLinebreak(): void {
    app.append(document.createElement("br"));
  }

  export function addLiElements(numberOfLiElement: number): void {
    const ul = document.createElement("ul");
    for (let i = 0; i < numberOfLiElement; i++) {
      const li = document.createElement("li");
      liElements.push(li);
      ul.append(li);
    }
    app.append(ul);
  }

  function addInput<T>(
    label: string,
    value: T,
    onchange: (newValue: string) => void,
    type: "number" | "text",
    min?: number,
    max?: number,
    step?: number
  ): HTMLInputElement {
    const span = document.createElement("span");
    span.className = "input-label";
    span.innerHTML = label;
    app.append(span);
    const input = document.createElement("input");
    input.type = type;
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.step = String(step);
    input.addEventListener("change", () => {
      onchange(input.value);
    });
    app.append(input);
    return input;
  }
  export function addInputNumber(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onchange: (newValue: number) => void
  ): HTMLInputElement {
    return addInput(
      label,
      value,
      (newValue) => onchange(Number(newValue)),
      "number",
      min,
      max,
      step
    );
  }
  export function addInputText(
    label: string,
    value: string,
    onchange: (newValue: string) => void
  ): HTMLInputElement {
    return addInput(label, value, onchange, "text");
  }

  export function init(title: string) {
    app = document.getElementById("ui") as HTMLDivElement;
    const header = document.createElement("h1");
    header.innerHTML = title;
    app.append(header);
  }

  export function print(text: string | number): void {
    printTo(0, text);
  }
  export function printTo(index: number, text: string | number): void {
    liElements[index].innerHTML = String(text);
  }
}
