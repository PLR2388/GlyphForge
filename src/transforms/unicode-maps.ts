// Unicode character mappings for various text styles

// Mathematical Bold (U+1D400-U+1D433)
export const BOLD_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const BOLD_MAP: Record<string, string> = {};
const boldStart = 0x1D400;
for (let i = 0; i < 26; i++) {
  BOLD_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(boldStart + i);
  BOLD_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(boldStart + 26 + i);
}
for (let i = 0; i < 10; i++) {
  BOLD_MAP[String(i)] = String.fromCodePoint(0x1D7CE + i);
}

// Mathematical Italic (U+1D434-U+1D467)
export const ITALIC_MAP: Record<string, string> = {};
const italicStart = 0x1D434;
for (let i = 0; i < 26; i++) {
  ITALIC_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(italicStart + i);
}
// Lowercase italic has a gap at 'h' (uses U+210E)
for (let i = 0; i < 26; i++) {
  if (i === 7) { // 'h'
    ITALIC_MAP['h'] = '\u210E';
  } else {
    ITALIC_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(italicStart + 26 + i);
  }
}

// Mathematical Bold Italic (U+1D468-U+1D49B)
export const BOLD_ITALIC_MAP: Record<string, string> = {};
const boldItalicStart = 0x1D468;
for (let i = 0; i < 26; i++) {
  BOLD_ITALIC_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(boldItalicStart + i);
  BOLD_ITALIC_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(boldItalicStart + 26 + i);
}

// Mathematical Script (U+1D49C-U+1D4CF)
export const SCRIPT_MAP: Record<string, string> = {};
const scriptUpperStart = 0x1D49C;
const scriptLowerStart = 0x1D4B6;
const scriptExceptions: Record<string, string> = {
  'B': '\u212C', 'E': '\u2130', 'F': '\u2131', 'H': '\u210B',
  'I': '\u2110', 'L': '\u2112', 'M': '\u2133', 'R': '\u211B',
  'e': '\u212F', 'g': '\u210A', 'o': '\u2134'
};
for (let i = 0; i < 26; i++) {
  const upper = String.fromCharCode(65 + i);
  const lower = String.fromCharCode(97 + i);
  SCRIPT_MAP[upper] = scriptExceptions[upper] || String.fromCodePoint(scriptUpperStart + i);
  SCRIPT_MAP[lower] = scriptExceptions[lower] || String.fromCodePoint(scriptLowerStart + i);
}

// Mathematical Bold Script (U+1D4D0-U+1D503)
export const BOLD_SCRIPT_MAP: Record<string, string> = {};
const boldScriptStart = 0x1D4D0;
for (let i = 0; i < 26; i++) {
  BOLD_SCRIPT_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(boldScriptStart + i);
  BOLD_SCRIPT_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(boldScriptStart + 26 + i);
}

// Mathematical Fraktur (U+1D504-U+1D537)
export const FRAKTUR_MAP: Record<string, string> = {};
const frakturExceptions: Record<string, string> = {
  'C': '\u212D', 'H': '\u210C', 'I': '\u2111', 'R': '\u211C', 'Z': '\u2128'
};
const frakturStart = 0x1D504;
for (let i = 0; i < 26; i++) {
  const upper = String.fromCharCode(65 + i);
  const lower = String.fromCharCode(97 + i);
  FRAKTUR_MAP[upper] = frakturExceptions[upper] || String.fromCodePoint(frakturStart + i);
  FRAKTUR_MAP[lower] = String.fromCodePoint(frakturStart + 26 + i);
}

// Mathematical Bold Fraktur (U+1D56C-U+1D59F)
export const BOLD_FRAKTUR_MAP: Record<string, string> = {};
const boldFrakturStart = 0x1D56C;
for (let i = 0; i < 26; i++) {
  BOLD_FRAKTUR_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(boldFrakturStart + i);
  BOLD_FRAKTUR_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(boldFrakturStart + 26 + i);
}

// Mathematical Double-Struck (U+1D538-U+1D56B)
export const DOUBLE_STRUCK_MAP: Record<string, string> = {};
const doubleStruckExceptions: Record<string, string> = {
  'C': '\u2102', 'H': '\u210D', 'N': '\u2115', 'P': '\u2119',
  'Q': '\u211A', 'R': '\u211D', 'Z': '\u2124'
};
const doubleStruckStart = 0x1D538;
for (let i = 0; i < 26; i++) {
  const upper = String.fromCharCode(65 + i);
  const lower = String.fromCharCode(97 + i);
  DOUBLE_STRUCK_MAP[upper] = doubleStruckExceptions[upper] || String.fromCodePoint(doubleStruckStart + i);
  DOUBLE_STRUCK_MAP[lower] = String.fromCodePoint(doubleStruckStart + 26 + i);
}
for (let i = 0; i < 10; i++) {
  DOUBLE_STRUCK_MAP[String(i)] = String.fromCodePoint(0x1D7D8 + i);
}

// Mathematical Monospace (U+1D670-U+1D6A3)
export const MONOSPACE_MAP: Record<string, string> = {};
const monospaceStart = 0x1D670;
for (let i = 0; i < 26; i++) {
  MONOSPACE_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(monospaceStart + i);
  MONOSPACE_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(monospaceStart + 26 + i);
}
for (let i = 0; i < 10; i++) {
  MONOSPACE_MAP[String(i)] = String.fromCodePoint(0x1D7F6 + i);
}

// Circled Letters (U+24B6-U+24E9 for uppercase, U+24D0-U+24E9 for lowercase)
export const CIRCLED_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  CIRCLED_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x24B6 + i);
  CIRCLED_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x24D0 + i);
}
for (let i = 0; i < 10; i++) {
  CIRCLED_MAP[String(i)] = i === 0 ? '\u24EA' : String.fromCodePoint(0x2460 + i - 1);
}

// Negative Circled (U+1F150-U+1F169)
export const NEGATIVE_CIRCLED_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  NEGATIVE_CIRCLED_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1F150 + i);
  NEGATIVE_CIRCLED_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1F150 + i);
}

// Squared Letters (U+1F130-U+1F149)
export const SQUARED_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  SQUARED_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1F130 + i);
  SQUARED_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1F130 + i);
}

// Negative Squared (U+1F170-U+1F189)
export const NEGATIVE_SQUARED_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  NEGATIVE_SQUARED_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1F170 + i);
  NEGATIVE_SQUARED_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1F170 + i);
}

// Parenthesized Letters (U+249C-U+24B5 lowercase only in Unicode, we map both cases)
export const PARENTHESIZED_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  PARENTHESIZED_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x249C + i);
  PARENTHESIZED_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x249C + i);
}

// Small Caps (using Latin Extended-B and other blocks)
export const SMALL_CAPS_MAP: Record<string, string> = {
  'a': '\u1D00', 'b': '\u0299', 'c': '\u1D04', 'd': '\u1D05', 'e': '\u1D07',
  'f': '\uA730', 'g': '\u0262', 'h': '\u029C', 'i': '\u026A', 'j': '\u1D0A',
  'k': '\u1D0B', 'l': '\u029F', 'm': '\u1D0D', 'n': '\u0274', 'o': '\u1D0F',
  'p': '\u1D18', 'q': '\u01EB', 'r': '\u0280', 's': '\uA731', 't': '\u1D1B',
  'u': '\u1D1C', 'v': '\u1D20', 'w': '\u1D21', 'x': '\u1D22', 'y': '\u028F', 'z': '\u1D22',
  'A': '\u1D00', 'B': '\u0299', 'C': '\u1D04', 'D': '\u1D05', 'E': '\u1D07',
  'F': '\uA730', 'G': '\u0262', 'H': '\u029C', 'I': '\u026A', 'J': '\u1D0A',
  'K': '\u1D0B', 'L': '\u029F', 'M': '\u1D0D', 'N': '\u0274', 'O': '\u1D0F',
  'P': '\u1D18', 'Q': '\u01EB', 'R': '\u0280', 'S': '\uA731', 'T': '\u1D1B',
  'U': '\u1D1C', 'V': '\u1D20', 'W': '\u1D21', 'X': '\u1D22', 'Y': '\u028F', 'Z': '\u1D22'
};

// Superscript
export const SUPERSCRIPT_MAP: Record<string, string> = {
  'a': '\u1D43', 'b': '\u1D47', 'c': '\u1D9C', 'd': '\u1D48', 'e': '\u1D49',
  'f': '\u1DA0', 'g': '\u1D4D', 'h': '\u02B0', 'i': '\u2071', 'j': '\u02B2',
  'k': '\u1D4F', 'l': '\u02E1', 'm': '\u1D50', 'n': '\u207F', 'o': '\u1D52',
  'p': '\u1D56', 'q': '\u02A0', 'r': '\u02B3', 's': '\u02E2', 't': '\u1D57',
  'u': '\u1D58', 'v': '\u1D5B', 'w': '\u02B7', 'x': '\u02E3', 'y': '\u02B8', 'z': '\u1DBB',
  'A': '\u1D2C', 'B': '\u1D2E', 'C': '\u1D9C', 'D': '\u1D30', 'E': '\u1D31',
  'F': '\u1DA0', 'G': '\u1D33', 'H': '\u1D34', 'I': '\u1D35', 'J': '\u1D36',
  'K': '\u1D37', 'L': '\u1D38', 'M': '\u1D39', 'N': '\u1D3A', 'O': '\u1D3C',
  'P': '\u1D3E', 'Q': '\u02A0', 'R': '\u1D3F', 'S': '\u02E2', 'T': '\u1D40',
  'U': '\u1D41', 'V': '\u2C7D', 'W': '\u1D42', 'X': '\u02E3', 'Y': '\u02B8', 'Z': '\u1DBB',
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '+': '\u207A', '-': '\u207B', '=': '\u207C', '(': '\u207D', ')': '\u207E'
};

// Subscript
export const SUBSCRIPT_MAP: Record<string, string> = {
  'a': '\u2090', 'e': '\u2091', 'h': '\u2095', 'i': '\u1D62', 'j': '\u2C7C',
  'k': '\u2096', 'l': '\u2097', 'm': '\u2098', 'n': '\u2099', 'o': '\u2092',
  'p': '\u209A', 'r': '\u1D63', 's': '\u209B', 't': '\u209C', 'u': '\u1D64',
  'v': '\u1D65', 'x': '\u2093',
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
  '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089',
  '+': '\u208A', '-': '\u208B', '=': '\u208C', '(': '\u208D', ')': '\u208E'
};

// Upside Down
export const UPSIDE_DOWN_MAP: Record<string, string> = {
  'a': '\u0250', 'b': 'q', 'c': '\u0254', 'd': 'p', 'e': '\u01DD',
  'f': '\u025F', 'g': '\u0183', 'h': '\u0265', 'i': '\u0131', 'j': '\u027E',
  'k': '\u029E', 'l': 'l', 'm': '\u026F', 'n': 'u', 'o': 'o',
  'p': 'd', 'q': 'b', 'r': '\u0279', 's': 's', 't': '\u0287',
  'u': 'n', 'v': '\u028C', 'w': '\u028D', 'x': 'x', 'y': '\u028E', 'z': 'z',
  'A': '\u2200', 'B': '\u1012', 'C': '\u0186', 'D': '\u15E1', 'E': '\u018E',
  'F': '\u2132', 'G': '\u2141', 'H': 'H', 'I': 'I', 'J': '\u017F',
  'K': '\u22CA', 'L': '\u02E5', 'M': 'W', 'N': 'N', 'O': 'O',
  'P': '\u0500', 'Q': '\u038C', 'R': '\u1D1A', 'S': 'S', 'T': '\u22A5',
  'U': '\u2229', 'V': '\u039B', 'W': 'M', 'X': 'X', 'Y': '\u2144', 'Z': 'Z',
  '0': '0', '1': '\u0196', '2': '\u1105', '3': '\u0190', '4': '\u3123',
  '5': '\u03DB', '6': '9', '7': '\u3125', '8': '8', '9': '6',
  '.': '\u02D9', ',': "'", "'": ',', '"': ',,', '!': '\u00A1',
  '?': '\u00BF', '[': ']', ']': '[', '(': ')', ')': '(',
  '{': '}', '}': '{', '<': '>', '>': '<', '&': '\u214B',
  '_': '\u203E', ';': '\u061B', '\u203F': '\u2040'
};

// Fullwidth (Vaporwave) - U+FF01-U+FF5E
export const FULLWIDTH_MAP: Record<string, string> = {};
for (let i = 33; i <= 126; i++) {
  FULLWIDTH_MAP[String.fromCharCode(i)] = String.fromCodePoint(0xFF00 + i - 32);
}
FULLWIDTH_MAP[' '] = '\u3000'; // Fullwidth space

// Regional Indicator (Emoji flags style) - U+1F1E6-U+1F1FF
export const REGIONAL_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  REGIONAL_MAP[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1F1E6 + i);
  REGIONAL_MAP[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1F1E6 + i);
}

// Leet speak
export const LEET_MAP: Record<string, string> = {
  'a': '4', 'A': '4', 'b': '8', 'B': '8', 'e': '3', 'E': '3',
  'g': '9', 'G': '9', 'i': '1', 'I': '1', 'l': '1', 'L': '1',
  'o': '0', 'O': '0', 's': '5', 'S': '5', 't': '7', 'T': '7',
  'z': '2', 'Z': '2'
};

// Morse code
export const MORSE_MAP: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
  'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
  'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

// Zalgo combining characters
export const ZALGO_UP = [
  '\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306',
  '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a',
  '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0303',
  '\u0302', '\u030c', '\u0350', '\u0300', '\u0301', '\u030b', '\u030f',
  '\u0312', '\u0313', '\u0314', '\u033d', '\u0309', '\u0363', '\u0364',
  '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036a', '\u036b',
  '\u036c', '\u036d', '\u036e', '\u036f', '\u033e', '\u035b'
];

export const ZALGO_MID = [
  '\u0315', '\u031b', '\u0340', '\u0341', '\u0358', '\u0321', '\u0322',
  '\u0327', '\u0328', '\u0334', '\u0335', '\u0336', '\u034f', '\u035c',
  '\u035d', '\u035e', '\u035f', '\u0360', '\u0362', '\u0338', '\u0337'
];

export const ZALGO_DOWN = [
  '\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e',
  '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a',
  '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331',
  '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345',
  '\u0347', '\u0348', '\u0349', '\u034d', '\u034e', '\u0353', '\u0354',
  '\u0355', '\u0356', '\u0359', '\u035a', '\u0323'
];
