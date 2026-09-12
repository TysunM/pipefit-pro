export type KeyAction =
  | 'angleSlope' | 'takeoutArc' | 'offset' | 'welders' | 'run' | 'cutback'
  | 'travel' | 'roll' | 'pipeMaterial' | 'elbow'
  | 'power' | 'nthRoot' | 'sine' | 'arcSine' | 'cosine' | 'arcCosine'
  | 'tangent' | 'arcTangent' | 'pipeSize' | 'pipe'
  | 'openParen' | 'flow' | 'closeParen' | 'velocity' | 'circle' | 'pressure'
  | 'square' | 'force' | 'squareRoot' | 'area'
  | 'mm' | 'metre' | 'feet' | 'inch' | 'slash' | 'kilogram' | 'clear' | 'percent'
  | 'conv' | 'pound' | 'gallon' | 'litre' | 'divide' | 'reciprocal'
  | 'store' | 'prefs' | 'cubicFeetPerMinute' | 'cubicFeetPerSecond' | 'fahrenheit' | 'multiply' | 'clearAll'
  | 'recall' | 'memoryClear' | 'gpm' | 'litrePerSecond' | 'celsius' | 'subtract' | 'sign'
  | 'memoryPlus' | 'memoryMinus' | 'dms' | 'equals' | 'add' | 'pi'
  | 'digit' | 'dot'
  | 'backspace' | 'cost' | 'tape'
  | 'unassigned';

export type Key = {
  label: string;
  action: KeyAction;
  arg?: string;
  shiftLabel?: string;
  shiftAction?: KeyAction;
  tone: 'trade' | 'function' | 'unit' | 'digit' | 'operator' | 'clear' | 'conv';
  note?: string;
};

export const KEYPAD: Key[][] = [
  [
    { label: 'Angle/\nSlope', action: 'angleSlope', shiftLabel: 'T.O./Arc', shiftAction: 'takeoutArc', tone: 'trade' },
    {
      label: 'Offset', action: 'offset', shiftLabel: "Welder's", shiftAction: 'welders', tone: 'trade',
      note: "Welder's Gap is a setting, not a computation: the gap subtracted from an end-to-end length. Default 1/8 inch; zero is valid.",
    },
    { label: 'Run', action: 'run', shiftLabel: 'Cutback', shiftAction: 'cutback', tone: 'trade' },
    { label: 'Travel', action: 'travel', shiftLabel: 'Roll', shiftAction: 'roll', tone: 'trade' },
    { label: "Pipe\nMat'l", action: 'pipeMaterial', shiftLabel: 'Elbow', shiftAction: 'elbow', tone: 'trade' },
  ],
  [
    { label: 'xʸ', action: 'power', shiftLabel: 'x^(1/y)', shiftAction: 'nthRoot', tone: 'function' },
    { label: 'Sine', action: 'sine', shiftLabel: 'ArcSin', shiftAction: 'arcSine', tone: 'function' },
    { label: 'Cos', action: 'cosine', shiftLabel: 'ArcCos', shiftAction: 'arcCosine', tone: 'function' },
    { label: 'Tan', action: 'tangent', shiftLabel: 'ArcTan', shiftAction: 'arcTangent', tone: 'function' },
    { label: 'Pipe\nSize', action: 'pipeSize', shiftLabel: 'Pipe', shiftAction: 'pipe', tone: 'trade' },
  ],
  [
    { label: '(', action: 'openParen', shiftLabel: 'Flow', shiftAction: 'flow', tone: 'function' },
    { label: ')', action: 'closeParen', shiftLabel: 'Velocity', shiftAction: 'velocity', tone: 'function' },
    { label: 'Circle', action: 'circle', shiftLabel: 'Pressure', shiftAction: 'pressure', tone: 'function' },
    { label: 'x²', action: 'square', shiftLabel: 'Force', shiftAction: 'force', tone: 'function' },
    { label: '√x', action: 'squareRoot', shiftLabel: 'Area', shiftAction: 'area', tone: 'function' },
  ],
  [
    { label: 'mm', action: 'mm', shiftLabel: 'm', shiftAction: 'metre', tone: 'unit' },
    { label: 'Feet', action: 'feet', tone: 'unit' },
    { label: 'Inch', action: 'inch', tone: 'unit' },
    { label: '/', action: 'slash', shiftLabel: 'kg', shiftAction: 'kilogram', tone: 'unit' },
    { label: 'Clear', action: 'clear', shiftLabel: '%', shiftAction: 'percent', tone: 'clear' },
  ],
  [
    { label: 'Conv', action: 'conv', tone: 'conv' },
    { label: '7', action: 'digit', arg: '7', shiftLabel: 'lb', shiftAction: 'pound', tone: 'digit' },
    { label: '8', action: 'digit', arg: '8', shiftLabel: 'gallon', shiftAction: 'gallon', tone: 'digit' },
    { label: '9', action: 'digit', arg: '9', shiftLabel: 'liter', shiftAction: 'litre', tone: 'digit' },
    { label: '÷', action: 'divide', shiftLabel: '1/x', shiftAction: 'reciprocal', tone: 'operator' },
  ],
  [
    { label: 'Store', action: 'store', shiftLabel: 'Prefs', shiftAction: 'prefs', tone: 'operator' },
    { label: '4', action: 'digit', arg: '4', shiftLabel: 'cfm', shiftAction: 'cubicFeetPerMinute', tone: 'digit' },
    { label: '5', action: 'digit', arg: '5', shiftLabel: 'cfs', shiftAction: 'cubicFeetPerSecond', tone: 'digit' },
    { label: '6', action: 'digit', arg: '6', shiftLabel: '°F', shiftAction: 'fahrenheit', tone: 'digit' },
    { label: '×', action: 'multiply', shiftLabel: 'Clear all', shiftAction: 'clearAll', tone: 'operator' },
  ],
  [
    { label: 'Rcl', action: 'recall', shiftLabel: 'MC', shiftAction: 'memoryClear', tone: 'operator' },
    { label: '1', action: 'digit', arg: '1', shiftLabel: 'gpm', shiftAction: 'gpm', tone: 'digit' },
    { label: '2', action: 'digit', arg: '2', shiftLabel: 'l/s', shiftAction: 'litrePerSecond', tone: 'digit' },
    { label: '3', action: 'digit', arg: '3', shiftLabel: '°C', shiftAction: 'celsius', tone: 'digit' },
    { label: '−', action: 'subtract', shiftLabel: '+/−', shiftAction: 'sign', tone: 'operator' },
  ],
  [
    { label: 'M+', action: 'memoryPlus', shiftLabel: 'M−', shiftAction: 'memoryMinus', tone: 'operator' },
    { label: '0', action: 'digit', arg: '0', shiftLabel: 'Cost', shiftAction: 'cost', tone: 'digit' },
    { label: '•', action: 'dot', shiftLabel: 'dms◀▶', shiftAction: 'dms', tone: 'digit' },
    { label: '=', action: 'equals', shiftLabel: 'Tape', shiftAction: 'tape', tone: 'operator' },
    { label: '+', action: 'add', shiftLabel: 'π', shiftAction: 'pi', tone: 'operator' },
  ],
];

export const ALL_KEYS: Key[] = KEYPAD.flat();

export const unassignedKeys = (): Key[] => ALL_KEYS.filter((k) => k.shiftAction === 'unassigned');

export const provisionalKeys = (): Key[] => ALL_KEYS.filter((k) => k.note !== undefined);
