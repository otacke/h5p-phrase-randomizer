import Color from 'color';

/** @constant {number} GRADIENT_FACTOR_1 Darken factor #1 for gradient. */
const GRADIENT_FACTOR_1 = 0.17;

/** @constant {number} GRADIENT_FACTOR_2 Darken factor #2 for gradient. */
const GRADIENT_FACTOR_2 = 0.28;

/** @constant {number} GRADIENT_FACTOR_3 Darken factor #3 for gradient. */
const GRADIENT_FACTOR_3 = 0.52;

/** Class for color utility functions */
export default class UtilColor {

  /**
   * Create Color gradient.
   * @param {string} color Background color in common CSS format.
   * @returns {string} CSS background value for gradient.
   */
  static createColorGradient(color) {
    const baseColor = Color(color);
    const darker1 = baseColor.darken(GRADIENT_FACTOR_1);
    const darker2 = baseColor.darken(GRADIENT_FACTOR_2);
    const darker3 = baseColor.darken(GRADIENT_FACTOR_3);

    // eslint-disable-next-line @stylistic/js/max-len
    return `linear-gradient(to bottom, ${darker3.hex()} 0%, ${darker2.hex()} 9%, ${darker1.hex()} 18%, ${baseColor.hex()} 55%, ${darker1.hex()} 82%, ${darker2.hex()} 91%, ${darker3.hex()} 100%)`;
  }

  /**
   * Get text color for given background color.
   * @param {string} backgroundColor Background color in common CSS format.
   * @returns {string} CSS color value for text color.
   */
  static getColorText(backgroundColor) {
    return Color(backgroundColor).isLight() ? '#0f0f0f' : '#f0f0f0';
  }
}
