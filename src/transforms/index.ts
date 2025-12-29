import {
  BOLD_MAP, ITALIC_MAP, BOLD_ITALIC_MAP, SCRIPT_MAP, BOLD_SCRIPT_MAP,
  FRAKTUR_MAP, BOLD_FRAKTUR_MAP, DOUBLE_STRUCK_MAP, MONOSPACE_MAP,
  CIRCLED_MAP, NEGATIVE_CIRCLED_MAP, SQUARED_MAP, NEGATIVE_SQUARED_MAP,
  PARENTHESIZED_MAP, SMALL_CAPS_MAP, SUPERSCRIPT_MAP, SUBSCRIPT_MAP,
  UPSIDE_DOWN_MAP, FULLWIDTH_MAP, REGIONAL_MAP, LEET_MAP, MORSE_MAP,
  ZALGO_UP, ZALGO_MID, ZALGO_DOWN
} from './unicode-maps.js';

// Helper function to apply a character map
function applyMap(text: string, map: Record<string, string>): string {
  return [...text].map(char => map[char] ?? char).join('');
}

// All available styles
export const STYLES = {
  bold: 'bold',
  italic: 'italic',
  boldItalic: 'boldItalic',
  script: 'script',
  boldScript: 'boldScript',
  fraktur: 'fraktur',
  boldFraktur: 'boldFraktur',
  doubleStruck: 'doubleStruck',
  monospace: 'monospace',
  circled: 'circled',
  negativeCircled: 'negativeCircled',
  squared: 'squared',
  negativeSquared: 'negativeSquared',
  parenthesized: 'parenthesized',
  smallCaps: 'smallCaps',
  superscript: 'superscript',
  subscript: 'subscript',
  upsideDown: 'upsideDown',
  vaporwave: 'vaporwave',
  regional: 'regional',
  leet: 'leet',
  morse: 'morse',
  binary: 'binary',
  hex: 'hex',
  zalgo: 'zalgo',
  strikethrough: 'strikethrough',
  underline: 'underline',
  sparkles: 'sparkles',
  wave: 'wave',
  bubble: 'bubble',
  medieval: 'medieval'
} as const;

export type StyleName = keyof typeof STYLES;

// Unicode font transforms
export function bold(text: string): string {
  return applyMap(text, BOLD_MAP);
}

export function italic(text: string): string {
  return applyMap(text, ITALIC_MAP);
}

export function boldItalic(text: string): string {
  return applyMap(text, BOLD_ITALIC_MAP);
}

export function script(text: string): string {
  return applyMap(text, SCRIPT_MAP);
}

export function boldScript(text: string): string {
  return applyMap(text, BOLD_SCRIPT_MAP);
}

export function fraktur(text: string): string {
  return applyMap(text, FRAKTUR_MAP);
}

export function boldFraktur(text: string): string {
  return applyMap(text, BOLD_FRAKTUR_MAP);
}

export function doubleStruck(text: string): string {
  return applyMap(text, DOUBLE_STRUCK_MAP);
}

export function monospace(text: string): string {
  return applyMap(text, MONOSPACE_MAP);
}

export function circled(text: string): string {
  return applyMap(text, CIRCLED_MAP);
}

export function negativeCircled(text: string): string {
  return applyMap(text, NEGATIVE_CIRCLED_MAP);
}

export function squared(text: string): string {
  return applyMap(text, SQUARED_MAP);
}

export function negativeSquared(text: string): string {
  return applyMap(text, NEGATIVE_SQUARED_MAP);
}

export function parenthesized(text: string): string {
  return applyMap(text, PARENTHESIZED_MAP);
}

export function smallCaps(text: string): string {
  return applyMap(text, SMALL_CAPS_MAP);
}

export function superscript(text: string): string {
  return applyMap(text, SUPERSCRIPT_MAP);
}

export function subscript(text: string): string {
  return applyMap(text, SUBSCRIPT_MAP);
}

export function upsideDown(text: string): string {
  return [...applyMap(text, UPSIDE_DOWN_MAP)].reverse().join('');
}

export function vaporwave(text: string): string {
  return applyMap(text, FULLWIDTH_MAP);
}

export function regional(text: string): string {
  return applyMap(text, REGIONAL_MAP);
}

export function leet(text: string): string {
  return applyMap(text, LEET_MAP);
}

export function morse(text: string): string {
  return [...text.toUpperCase()]
    .map(char => MORSE_MAP[char] ?? char)
    .join(' ');
}

export function binary(text: string): string {
  return [...text]
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

export function hex(text: string): string {
  return [...text]
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');
}

export interface ZalgoOptions {
  intensity?: 'mini' | 'normal' | 'maxi';
  up?: boolean;
  mid?: boolean;
  down?: boolean;
}

export function zalgo(text: string, options: ZalgoOptions = {}): string {
  const {
    intensity = 'normal',
    up = true,
    mid = true,
    down = true
  } = options;

  const counts = {
    mini: { up: 1, mid: 0, down: 1 },
    normal: { up: 3, mid: 1, down: 3 },
    maxi: { up: 8, mid: 3, down: 8 }
  };

  const count = counts[intensity];

  return [...text].map(char => {
    let result = char;

    if (up) {
      for (let i = 0; i < count.up; i++) {
        result += ZALGO_UP[Math.floor(Math.random() * ZALGO_UP.length)];
      }
    }

    if (mid) {
      for (let i = 0; i < count.mid; i++) {
        result += ZALGO_MID[Math.floor(Math.random() * ZALGO_MID.length)];
      }
    }

    if (down) {
      for (let i = 0; i < count.down; i++) {
        result += ZALGO_DOWN[Math.floor(Math.random() * ZALGO_DOWN.length)];
      }
    }

    return result;
  }).join('');
}

export function strikethrough(text: string): string {
  return [...text].map(char => char + '\u0336').join('');
}

export function underline(text: string): string {
  return [...text].map(char => char + '\u0332').join('');
}

export function sparkles(text: string): string {
  return '\u2728 ' + [...text].join(' \u2728 ') + ' \u2728';
}

export function wave(text: string): string {
  return '~' + [...text].join('~') + '~';
}

// Bubble is same as circled for letters
export function bubble(text: string): string {
  return circled(text);
}

// Medieval is same as fraktur
export function medieval(text: string): string {
  return fraktur(text);
}

// Main transform function
export function transform(text: string, style: StyleName, options?: ZalgoOptions): string {
  switch (style) {
    case 'bold': return bold(text);
    case 'italic': return italic(text);
    case 'boldItalic': return boldItalic(text);
    case 'script': return script(text);
    case 'boldScript': return boldScript(text);
    case 'fraktur': return fraktur(text);
    case 'boldFraktur': return boldFraktur(text);
    case 'doubleStruck': return doubleStruck(text);
    case 'monospace': return monospace(text);
    case 'circled': return circled(text);
    case 'negativeCircled': return negativeCircled(text);
    case 'squared': return squared(text);
    case 'negativeSquared': return negativeSquared(text);
    case 'parenthesized': return parenthesized(text);
    case 'smallCaps': return smallCaps(text);
    case 'superscript': return superscript(text);
    case 'subscript': return subscript(text);
    case 'upsideDown': return upsideDown(text);
    case 'vaporwave': return vaporwave(text);
    case 'regional': return regional(text);
    case 'leet': return leet(text);
    case 'morse': return morse(text);
    case 'binary': return binary(text);
    case 'hex': return hex(text);
    case 'zalgo': return zalgo(text, options);
    case 'strikethrough': return strikethrough(text);
    case 'underline': return underline(text);
    case 'sparkles': return sparkles(text);
    case 'wave': return wave(text);
    case 'bubble': return bubble(text);
    case 'medieval': return medieval(text);
    default:
      throw new Error(`Unknown style: ${style}`);
  }
}

// Transform to all styles at once
export function transformAll(text: string): Record<StyleName, string> {
  const result: Partial<Record<StyleName, string>> = {};

  for (const style of Object.keys(STYLES) as StyleName[]) {
    try {
      result[style] = transform(text, style);
    } catch {
      result[style] = text;
    }
  }

  return result as Record<StyleName, string>;
}

// Get list of available styles with examples
export function getStylesInfo(): Array<{ name: StyleName; example: string; description: string }> {
  const example = 'Hello';
  return [
    { name: 'bold', example: bold(example), description: 'Mathematical bold text' },
    { name: 'italic', example: italic(example), description: 'Mathematical italic text' },
    { name: 'boldItalic', example: boldItalic(example), description: 'Mathematical bold italic text' },
    { name: 'script', example: script(example), description: 'Mathematical script/cursive text' },
    { name: 'boldScript', example: boldScript(example), description: 'Mathematical bold script text' },
    { name: 'fraktur', example: fraktur(example), description: 'Mathematical Fraktur/Gothic text' },
    { name: 'boldFraktur', example: boldFraktur(example), description: 'Mathematical bold Fraktur text' },
    { name: 'doubleStruck', example: doubleStruck(example), description: 'Mathematical double-struck text' },
    { name: 'monospace', example: monospace(example), description: 'Mathematical monospace text' },
    { name: 'circled', example: circled(example), description: 'Circled letters' },
    { name: 'negativeCircled', example: negativeCircled(example), description: 'Negative circled letters' },
    { name: 'squared', example: squared(example), description: 'Squared letters' },
    { name: 'negativeSquared', example: negativeSquared(example), description: 'Negative squared letters' },
    { name: 'parenthesized', example: parenthesized(example), description: 'Parenthesized letters' },
    { name: 'smallCaps', example: smallCaps(example), description: 'Small capital letters' },
    { name: 'superscript', example: superscript(example), description: 'Superscript text' },
    { name: 'subscript', example: subscript(example), description: 'Subscript text' },
    { name: 'upsideDown', example: upsideDown(example), description: 'Upside down/flipped text' },
    { name: 'vaporwave', example: vaporwave(example), description: 'Fullwidth vaporwave aesthetic' },
    { name: 'regional', example: regional(example), description: 'Regional indicator symbols' },
    { name: 'leet', example: leet(example), description: 'Leet speak (1337)' },
    { name: 'morse', example: morse(example), description: 'Morse code' },
    { name: 'binary', example: binary(example), description: 'Binary encoding' },
    { name: 'hex', example: hex(example), description: 'Hexadecimal encoding' },
    { name: 'zalgo', example: zalgo(example, { intensity: 'mini' }), description: 'Zalgo/cursed text' },
    { name: 'strikethrough', example: strikethrough(example), description: 'Strikethrough text' },
    { name: 'underline', example: underline(example), description: 'Underlined text' },
    { name: 'sparkles', example: sparkles(example), description: 'Sparkle decorated text' },
    { name: 'wave', example: wave(example), description: 'Wave decorated text' },
    { name: 'bubble', example: bubble(example), description: 'Bubble letters (same as circled)' },
    { name: 'medieval', example: medieval(example), description: 'Medieval/Gothic style (same as fraktur)' }
  ];
}
