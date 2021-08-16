// copied from https://github.com/gpujs/gpu.js/edit/develop/src/index.d.ts 'cause this is not included in npm

class GPU {
  static isGPUSupported: boolean;
  static isCanvasSupported: boolean;
  static isHeadlessGLSupported: boolean;
  static isWebGLSupported: boolean;
  static isWebGL2Supported: boolean;
  static isKernelMapSupported: boolean;
  static isOffscreenCanvasSupported: boolean;
  static isGPUHTMLImageArraySupported: boolean;
  static isSinglePrecisionSupported: boolean;
  constructor(settings?: IGPUSettings);
  functions: GPUFunction<ThreadKernelVariable[]>[];
  nativeFunctions: IGPUNativeFunction[];
  setFunctions(flag: any): this;
  setNativeFunctions(flag: IGPUNativeFunction[]): this;
  addFunction<
    ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[],
    ConstantsType = {}
  >(
    kernel: GPUFunction<ArgTypes, ConstantsType>,
    settings?: IGPUFunctionSettings
  ): this;
  addNativeFunction(
    name: string,
    source: string,
    settings?: IGPUFunctionSettings
  ): this;
  combineKernels(...kernels: KernelFunction[]): IKernelRunShortcut;
  combineKernels<KF extends KernelFunction>(
    ...kernels: KF[]
  ): ((
    ...args: Parameters<KF>
  ) =>
    | ReturnType<KF>[]
    | ReturnType<KF>[][]
    | ReturnType<KF>[][][]
    | Texture
    | void) &
    IKernelRunShortcutBase;
  createKernel<
    ArgTypes extends ThreadKernelVariable[],
    ConstantsT extends IConstantsThis
  >(
    kernel: KernelFunction<ArgTypes, ConstantsT>,
    settings?: IGPUKernelSettings
  ): IKernelRunShortcut;
  createKernel<KernelType extends KernelFunction>(
    kernel: KernelType,
    settings?: IGPUKernelSettings
  ): ((
    ...args: Parameters<KernelType>
  ) =>
    | ReturnType<KernelType>[]
    | ReturnType<KernelType>[][]
    | ReturnType<KernelType>[][][]
    | Texture
    | void) &
    IKernelRunShortcutBase;
  createKernelMap<
    ArgTypes extends ThreadKernelVariable[],
    ConstantsType = null
  >(
    subKernels: ISubKernelObject,
    rootKernel: ThreadFunction<ArgTypes, ConstantsType>,
    settings?: IGPUKernelSettings
  ): ((
    this: IKernelFunctionThis<ConstantsType>,
    ...args: ArgTypes
  ) => IMappedKernelResult) &
    IKernelMapRunShortcut<typeof subKernels>;
  destroy(): Promise<void>;
  Kernel: typeof Kernel;
  mode: string;
  canvas: any;
  context: any;
  static input(value: Float32Array | number[], size: OutputDimensions): Input;
}

interface ISubKernelObject {
  [targetLocation: string]:
    | ((...args: ThreadKernelVariable[]) => ThreadFunctionResult)
    | ((...args: any[]) => ThreadFunctionResult);
}

interface ISubKernelArray {
  [index: number]:
    | ((...args: ThreadKernelVariable[]) => ThreadFunctionResult)
    | ((...args: any[]) => ThreadFunctionResult);
}

interface ISubKernelsResults {
  [resultsLocation: string]: KernelOutput;
}

interface IGPUFunction extends IFunctionSettings {
  source: string;
}

interface IGPUNativeFunction extends IGPUFunctionSettings {
  name: string;
  source: string;
}

interface IMappedKernelResult {
  result?: KernelVariable;
  [targetLocation: string]: KernelVariable;
}

interface INativeFunction extends IGPUFunctionSettings {
  name: string;
  source: string;
}

interface IInternalNativeFunction extends IArgumentTypes {
  name: string;
  source: string;
}

interface INativeFunctionList {
  [name: string]: INativeFunction;
}

type GPUMode = "gpu" | "cpu" | "dev";
type GPUInternalMode = "webgl" | "webgl2" | "headlessgl";

interface IGPUSettings {
  mode?: GPUMode | GPUInternalMode;
  canvas?: object;
  context?: object;
  functions?: KernelFunction[];
  nativeFunctions?: IInternalNativeFunction[];
  // format: 'Float32Array' | 'Float16Array' | 'Float' // WE WANT THIS!
}

type GPUVariableType =
  | "Array"
  | "Array(2)"
  | "Array(3)"
  | "Array(4)"
  | "Array1D(2)"
  | "Array2D(2)"
  | "Array3D(2)"
  | "Array1D(3)"
  | "Array2D(3)"
  | "Array3D(3)"
  | "Array1D(4)"
  | "Array2D(4)"
  | "Array3D(4)"
  | "Boolean"
  | "HTMLCanvas"
  | "HTMLImage"
  | "HTMLImageArray"
  | "Number"
  | "Float"
  | "Integer"
  | GPUTextureType;

type GPUTextureType = "NumberTexture" | "ArrayTexture(4)";

interface IGPUArgumentTypes {
  [argumentName: string]: GPUVariableType;
}

interface IGPUFunctionSettings {
  argumentTypes?: IGPUArgumentTypes | string[];
  returnType?: GPUVariableType;
}

class Kernel {
  static isSupported: boolean;
  static isContextMatch(context: any): boolean;
  static disableValidation(): void;
  static enableValidation(): void;
  static nativeFunctionArguments(source: string): IArgumentTypes;
  static nativeFunctionReturnType(source: string): string;
  static destroyContext(context: any): void;
  static features: IKernelFeatures;
  static getFeatures(): IKernelFeatures;
  static mode: GPUMode | GPUInternalMode;
  source: string | IKernelJSON;
  Kernel: Kernel;
  output: number[];
  debug: boolean;
  graphical: boolean;
  loopMaxIterations: number;
  constants: IConstants;
  canvas: any;
  context: WebGLRenderingContext | any;
  functions: IFunction[];
  nativeFunctions: IInternalNativeFunction[];
  subKernels: ISubKernel[];
  validate: boolean;
  immutable: boolean;
  pipeline: boolean;
  plugins: IPlugin[];
  useLegacyEncoder: boolean;
  tactic: Tactic;
  built: boolean;
  texSize: [number, number];
  texture: Texture;
  mappedTextures?: Texture[];
  TextureConstructor: typeof Texture;
  getPixels(flip?: boolean): Uint8ClampedArray[];
  getVariablePrecisionString(
    textureSize?: number[],
    tactic?: Tactic,
    isInt?: boolean
  ): string;
  prependString(value: string): void;
  hasPrependString(value: string): boolean;
  constructor(
    kernel: KernelFunction | IKernelJSON | string,
    settings?: IDirectKernelSettings
  );
  onRequestSwitchKernel?: Kernel;
  onActivate(previousKernel: Kernel): void;
  build(...args: KernelVariable[]): void;
  run(...args: KernelVariable[]): KernelVariable;
  toString(...args: KernelVariable[]): string;
  toJSON(): IKernelJSON;
  setOutput(flag: number[]): this;
  setWarnVarUsage(flag: boolean): this;
  setOptimizeFloatMemory(flag: boolean): this;
  setArgumentTypes(flag: IKernelValueTypes): this;
  setDebug(flag: boolean): this;
  setGraphical(flag: boolean): this;
  setLoopMaxIterations(flag: number): this;
  setConstants(flag: IConstants): this;
  setConstants<T>(flag: T & IConstants): this;
  setConstantTypes(flag: IKernelValueTypes): this;
  setDynamicOutput(flag: boolean): this;
  setDynamicArguments(flag: boolean): this;
  setPipeline(flag: boolean): this;
  setPrecision(flag: Precision): this;
  setImmutable(flag: boolean): this;
  setCanvas(flag: any): this;
  setContext(flag: any): this;
  addFunction<ArgTypes extends ThreadKernelVariable[]>(
    flag: GPUFunction<ArgTypes>,
    settings?: IFunctionSettings
  ): this;
  setFunctions(flag: any): this;
  setNativeFunctions(flag: IGPUNativeFunction[]): this;
  setStrictIntegers(flag: boolean): this;
  setTactic(flag: Tactic): this;
  setUseLegacyEncoder(flag: boolean): this;
  addSubKernel(subKernel: ISubKernel): this;
  destroy(removeCanvasReferences?: boolean): void;
  validateSettings(args: IArguments): void;

  setUniform1f(name: string, value: number): void;
  setUniform2f(name: string, value1: number, value2: number): void;
  setUniform3f(
    name: string,
    value1: number,
    value2: number,
    value3: number
  ): void;
  setUniform4f(
    name: string,
    value1: number,
    value2: number,
    value3: number,
    value4: number
  ): void;

  setUniform2fv(name: string, value: [number, number]): void;
  setUniform3fv(name: string, value: [number, number, number]): void;
  setUniform4fv(name: string, value: [number, number, number, number]): void;

  setUniform1i(name: string, value: number): void;
  setUniform2i(name: string, value1: number, value2: number): void;
  setUniform3i(
    name: string,
    value1: number,
    value2: number,
    value3: number
  ): void;
  setUniform4i(
    name: string,
    value1: number,
    value2: number,
    value3: number,
    value4: number
  ): void;

  setUniform2iv(name: string, value: [number, number]): void;
  setUniform3iv(name: string, value: [number, number, number]): void;
  setUniform4iv(name: string, value: [number, number, number, number]): void;
}

type GPUFunction<
  ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[],
  ConstantsType = {}
> =
  | ThreadFunction<ArgTypes, ConstantsType>
  | IFunction
  | IGPUFunction
  | string[];

type ThreadFunction<
  ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[],
  ConstantsType = {}
> = (
  this: IKernelFunctionThis<ConstantsType>,
  ...args: ArgTypes
) => ThreadFunctionResult;

type Precision = "single" | "unsigned";

class CPUKernel extends Kernel {}
class GLKernel extends Kernel {}
class WebGLKernel extends GLKernel {}
class WebGL2Kernel extends WebGLKernel {}
class HeadlessGLKernel extends WebGLKernel {}

interface IArgumentTypes {
  argumentTypes: GPUVariableType[];
  argumentNames: string[];
}

interface IConstants {
  [constantName: string]: KernelVariable;
}

interface IKernelValueTypes {
  [constantType: string]: GPUVariableType;
}

interface IWebGLKernelValueSettings extends IKernelValueSettings {
  onRequestTexture: () => object;
  onRequestIndex: () => number;
  onRequestContextHandle: () => number;
  texture: any;
}

interface IKernelValueSettings {
  name: string;
  kernel: Kernel;
  context: WebGLRenderingContext;
  contextHandle?: number;
  checkContext?: boolean;
  onRequestContextHandle: () => number;
  onUpdateValueMismatch: (constructor: object) => void;
  origin: "user" | "constants";
  strictIntegers?: boolean;
  type: GPUVariableType;
  tactic?: Tactic;
  size: number[];
  index?: number;
}

type Tactic = "speed" | "balanced" | "precision";

interface IConstantsThis {
  [constantName: string]: ThreadKernelVariable;
}

interface IKernelXYZ {
  x: number;
  y: number;
  z: number;
}

interface FunctionList {
  [functionName: string]: Function;
}

interface IGPUKernelSettings extends IKernelSettings {
  argumentTypes?: ITypesList;
  functions?: Function[] | FunctionList;
  tactic?: Tactic;
  onRequestSwitchKernel?: Kernel;
}

interface IKernelSettings {
  pluginNames?: string[];
  output?: number[] | IKernelXYZ;
  precision?: Precision;
  constants?: object;
  context?: any;
  canvas?: any;
  pipeline?: boolean;
  immutable?: boolean;
  graphical?: boolean;
  onRequestFallback?: () => Kernel;
  optimizeFloatMemory?: boolean;
  dynamicOutput?: boolean;
  dynamicArguments?: boolean;
  constantTypes?: ITypesList;
  useLegacyEncoder?: boolean;
  nativeFunctions?: IGPUNativeFunction[];
  strictIntegers?: boolean;
}

interface IDirectKernelSettings extends IKernelSettings {
  argumentTypes?: string[];
  functions?: string[] | IFunction;
}

interface ITypesList {
  [typeName: string]: GPUVariableType;
}

interface IKernelRunShortcutBase<T = KernelOutput> extends Kernel {
  kernel: Kernel;
  (...args: KernelVariable[]): T;
  exec(): Promise<T>;
}

interface IKernelRunShortcut extends IKernelRunShortcutBase {}

interface IKernelMapRunShortcut<SubKernelType>
  extends IKernelRunShortcutBase<
    { result: KernelOutput } & { [key in keyof SubKernelType]: KernelOutput }
  > {}

interface IKernelFeatures {
  isFloatRead: boolean;
  kernelMap: boolean;
  isIntegerDivisionAccurate: boolean;
  isSpeedTacticSupported: boolean;
  isTextureFloat: boolean;
  isDrawBuffers: boolean;
  channelCount: number;
  maxTextureSize: number;
  lowIntPrecision: { rangeMax: number };
  mediumIntPrecision: { rangeMax: number };
  highIntPrecision: { rangeMax: number };
  lowFloatPrecision: { rangeMax: number };
  mediumFloatPrecision: { rangeMax: number };
  highFloatPrecision: { rangeMax: number };
}

interface IKernelFunctionThis<ConstantsT = {}> {
  output: IKernelXYZ;
  thread: IKernelXYZ;
  constants: ConstantsT;
  color(r: number): void;
  color(r: number, g: number): void;
  color(r: number, g: number, b: number): void;
  color(r: number, g: number, b: number, a: number): void;
}

type KernelVariable =
  | boolean
  | number
  | Texture
  | Input
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLImageElement[]
  | Float32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | KernelOutput;

type ThreadFunctionResult =
  | number
  | number[]
  | number[][]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | Pixel
  | Boolean;

type ThreadKernelVariable =
  | boolean
  | number
  | number[]
  | number[][]
  | number[][][]
  | Float32Array
  | Float32Array[]
  | Float32Array[][]
  | Pixel
  | Pixel[][]
  | [number, number]
  | [number, number][]
  | [number, number][][]
  | [number, number][][][]
  | [number, number, number]
  | [number, number, number][]
  | [number, number, number][][]
  | [number, number, number][][][]
  | [number, number, number, number]
  | [number, number, number, number][]
  | [number, number, number, number][][]
  | [number, number, number, number][][][];

type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
};

//  type KernelFunction<ArgT extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsT extends IConstantsThis = {}> = ((
//   this: IKernelFunctionThis<ConstantsT>,
//   ...args: ArgT
// ) => KernelOutput);

interface KernelFunction<
  ArgT extends ThreadKernelVariable[] = ThreadKernelVariable[],
  ConstantsT = {}
> {
  (this: IKernelFunctionThis<ConstantsT>, ...args: ArgT): KernelOutput;
}

type KernelOutput =
  | void
  | number
  | number[]
  | number[][]
  | number[][][]
  | Float32Array
  | Float32Array[]
  | Float32Array[][]
  | [number, number][]
  | [number, number, number][]
  | [number, number, number, number][]
  | [number, number][][]
  | [number, number, number][][]
  | [number, number, number, number][][]
  | [number, number][][][]
  | [number, number, number][][][]
  | [number, number, number, number][][][]
  | Texture;

interface IFunction {
  source: string;
  settings: IFunctionSettings;
}

interface IFunctionSettings {
  name?: string;
  debug?: boolean;
  argumentNames?: string[];
  argumentTypes?: string[] | { [argumentName: string]: string };
  argumentSizes?: number[];

  constants?: IConstants;
  constantTypes?: IKernelValueTypes;

  output?: number[];
  loopMaxIterations?: number;
  returnType?: string;
  isRootKernel?: boolean;
  isSubKernel?: boolean;
  onNestedFunction?(ast: any, source: string): void;
  lookupReturnType?(functionName: string, ast: any, node: FunctionNode): void;
  plugins?: any[];

  useLegacyEncoder?: boolean;
  ast?: any;
}

interface ISubKernel {
  name: string;
  source: string;
  property: string | number;
  returnType: string;
}

class FunctionBuilder {
  static fromKernel(
    kernel: Kernel,
    FunctionNode: FunctionNode,
    extraNodeOptions?: any
  ): FunctionBuilder;
  constructor(settings: IFunctionBuilderSettings);
  addFunctionNode(functionNode: FunctionNode): void;
  traceFunctionCalls(functionName: string, retList?: string[]): string[];
  getStringFromFunctionNames(functionName: string[]): string;
  getPrototypesFromFunctionNames(functionName: string[]): string[];
  getString(functionName: string): string;
  getPrototypeString(functionName: string): string;
}

interface IFunctionBuilderSettings {
  kernel: Kernel;
  rootNode: FunctionNode;
  functionNodes?: FunctionNode[];
  nativeFunctions?: INativeFunctionList;
  subKernelNodes?: FunctionNode[];
}

// These are mostly internal
class FunctionNode implements IFunctionSettings {
  constructor(source: string, settings?: IFunctionNodeSettings);
}

interface IFunctionNodeSettings extends IFunctionSettings {
  argumentTypes: string[];
}

class WebGLFunctionNode extends FunctionNode {}
class WebGL2FunctionNode extends WebGLFunctionNode {}
class CPUFunctionNode extends FunctionNode {}

interface IGPUTextureSettings {
  texture: WebGLTexture;
  size: number[];
  dimensions: number[];
  output: number[];
  context: WebGLRenderingContext;
  kernel: Kernel;
  gpu?: GPU;
  type?: GPUTextureType;
}

class Texture {
  constructor(settings: IGPUTextureSettings);
  toArray(): TextureArrayOutput;
  clone(): Texture;
  delete(): void;
  clear(): void;
  kernel: Kernel;
}

type TextureArrayOutput =
  | number[]
  | number[][]
  | number[][][]
  | Float32Array
  | Float32Array[]
  | Float32Array[][]
  | [number, number][]
  | [number, number][][]
  | [number, number][][][]
  | [number, number, number][]
  | [number, number, number][][]
  | [number, number, number][][][]
  | [number, number, number, number][]
  | [number, number, number, number][][]
  | [number, number, number, number][][][];

interface IPlugin {
  source: string;
  name: string;
  functionMatch: string;
  functionReplace: string;
  functionReturnType: GPUVariableType;
  onBeforeRun: (kernel: Kernel) => void;
}

type OutputDimensions =
  | [number]
  | [number, number]
  | [number, number, number]
  | Int32Array;
type TextureDimensions = [number, number];

class Input {
  value: number[];
  size: number[];
  constructor(value: number[], size: OutputDimensions);
}

function alias<T>(name: string, source: T): T;

class KernelValue {
  constructor(value: KernelVariable, settings: IKernelValueSettings);
  getSource(): string;
  setup(): void;
  updateValue(value: KernelVariable): void;
}

class WebGLKernelValue {
  constructor(value: any, settings: IWebGLKernelValueSettings);
}

interface IFunctionNodeMemberExpressionDetails {
  xProperty: object;
  yProperty: object;
  zProperty: object;
  property: string;
  type: string;
  origin: "user" | "constants";
  signature: string;
}

interface IKernelJSON {
  settings: IJSONSettings;
  functionNodes?: object;
}

interface IJSONSettings {
  output: number[];
  argumentsTypes: GPUVariableType;
  returnType: string;
  argumentNames?: string[];
  constants?: IConstants;
  pipeline?: boolean;
  pluginNames?: string[];
  tactic?: Tactic;
  threadDim?: number[];
}

declare const utils: {
  getMinifySafeName: <T>(arrowReference: () => T) => string;
};

interface IReason {
  type: "argumentMismatch" | "outputPrecisionMismatch";
  needed: any;
}

interface IDeclaration {
  ast: object;
  context: object;
  name: string;
  origin: "declaration";
  inForLoopInit: boolean;
  inForLoopTest: boolean;
  assignable: boolean;
  suggestedType: string;
  valueType: string;
  dependencies: any;
  isSafe: boolean;
}
