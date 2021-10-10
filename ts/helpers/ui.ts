let app: HTMLDivElement;
let liElements: HTMLLIElement[] = [];

export function addBtn(label: string, onclick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  const span = document.createElement("span");
  span.innerHTML = label;
  btn.append(span);
  btn.addEventListener("click", onclick);
  app.append(btn);
  return btn;
}

export function addDiv(props: { id?: string } = {}): HTMLDivElement {
  const div = document.createElement("div");
  div.id = props.id ?? "";
  app.append(div);
  return div;
}

export function addLinebreak(): void {
  app.append(document.createElement("br"));
}

export function addLiElements(numberOfLiElement: number): HTMLUListElement {
  const ul = document.createElement("ul");
  for (let i = 0; i < numberOfLiElement; i++) {
    const li = document.createElement("li");
    liElements.push(li);
    ul.append(li);
  }
  app.append(ul);
  return ul;
}

function addInput<T>(
  label: string,
  value: T,
  onchange: (newValue: string) => void,
  type: "number" | "text" | "radio",
  options: {
    min?: number;
    max?: number;
    step?: number;
    name?: string;
  } = {}
): HTMLInputElement {
  const span = document.createElement("span");
  span.className = "input-label";
  span.innerHTML = label;
  app.append(span);
  const input = document.createElement("input");
  input.type = type;
  input.min = String(options.min);
  input.max = String(options.max);
  input.value = String(value);
  input.step = String(options.step);
  input.name = options.name ?? "";
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
    {
      min,
      max,
      step,
    }
  );
}
export function addInputRadio(
  radios: { label: string; value: number }[],
  onchange: (newValue: string) => void
): void {
  const name = radios.map((r) => r.label).reduce((l1, l2) => l1 + l2);
  radios.forEach((radio) => {
    addInput(radio.label, radio.value, onchange, "radio", { name });
  });
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
  if (liElements.length === 0) addLiElements(1);
  liElements[index].innerHTML = String(text);
}
