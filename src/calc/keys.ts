export type KeyAction =
  | 'angleSlope' | 'takeoutArc' | 'offset' | 'welders' | 'run' | 'cutback'
  | 'travel' | 'roll' | 'pipeMaterial' | 'elbow'
  | 'power' | 'nthRoot' | 'sine' | 'arcSine' | 'cosine' | 'arcCosine'
  | 'tangent' | 'arcTangent' | 'pipeSize' | 'pipe'
  | 'openParen' | 'flow' | 'closeParen' | 'velocity' | 'circle' | 'pressure'
  | 'square' | 'force' | 'squareRoot' | 'area'
  | 'mm' | 'metre' | 'feet' | 'inch' | 'slash' | 'kilo' | 'clear' | 'percent'
  | 'conv' | 'pound' | 'gallon' | 'litre' | 'divide' | 'reciprocal'
  | 'store' | 'prefs' | 'cubicFeet' | 'cubicYard' | 'fahrenheit' | 'multiply' | 'clearAll'
  | 'recall' | 'memoryClear' | 'gpm' | 'litrePerSecond' | 'celsius' | 'subtract' | 'sign'
  | 'memoryPlus' | 'memoryMinus' | 'dms' | 'equals' | 'add' | 'pi'
  | 'digit' | 'dot'
  | 'backspace'
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
    { label: 'Offset', action: 'offset', shiftLabel: "Welder's", shiftAction: 'welders', tone: 'trade' },
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
    { label: '/', action: 'slash', shiftLabel: 'k', shiftAction: 'kilo', tone: 'unit' },
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
    {
      label: '4', action: 'digit', arg: '4', shiftLabel: 'cu ft', shiftAction: 'cubicFeet', tone: 'digit',
      note: 'the housing prints "cf" over both 4 and 5; confirm which is cubic feet and which is cubic yards',
    },
    {
      label: '5', action: 'digit', arg: '5', shiftLabel: 'cu yd', shiftAction: 'cubicYard', tone: 'digit',
      note: 'provisional — see the note on 4',
    },
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
    {
      label: '0', action: 'digit', arg: '0', shiftLabel: '?', shiftAction: 'unassigned', tone: 'digit',
      note: 'the housing prints something over 0 that reads as "Cos", which cannot be right — Cos already has its own key. Left unassigned rather than guessed.',
    },
    { label: '•', action: 'dot', shiftLabel: 'dms◀▶', shiftAction: 'dms', tone: 'digit' },
    {
      label: '=', action: 'equals', shiftLabel: '?', shiftAction: 'unassigned', tone: 'operator',
      note: 'the housing prints something over = that reads as "Tap". Left unassigned rather than guessed.',
    },
    { label: '+', action: 'add', shiftLabel: 'π', shiftAction: 'pi', tone: 'operator' },
  ],
];

export const ALL_KEYS: Key[] = KEYPAD.flat();

export const unassignedKeys = (): Key[] => ALL_KEYS.filter((k) => k.shiftAction === 'unassigned');

export const provisionalKeys = (): Key[] => ALL_KEYS.filter((k) => k.note !== undefined);
