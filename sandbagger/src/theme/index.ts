/**
 * Press design language — "the private club ledger."
 * Deep felt, engraved brass, cream cardstock, ledger mono. Every screen sits
 * on a vignetted felt backdrop; money is always tabular; brass is earned.
 */
export const theme = {
  // felt (background world)
  felt: '#0c2918',
  feltDeep: '#071d10',
  feltBlack: '#04130a',
  feltGlow: 'rgba(214,174,96,0.14)',

  // cardstock (foreground world)
  bone: '#f6f0df',
  boneDim: '#eae2cc',
  boneShadow: '#dccfb0',

  // ink
  ink: '#1b241e',
  inkSoft: 'rgba(27,36,30,0.62)',
  inkFaint: 'rgba(27,36,30,0.42)',
  inkLine: 'rgba(27,36,30,0.12)',
  inkHairline: 'rgba(27,36,30,0.22)',

  // brass (the money metal)
  brass: '#c9a24b',
  brassBright: '#ecd28d',
  brassDeep: '#8f6f2e',
  brassDim: '#9c7c34',
  brassInk: '#241b08',

  // accents
  clay: '#b4472f',
  wax: '#9e3a24',
  up: '#2f7d4f',
  down: '#e08a6e',

  // lines on felt
  line: 'rgba(246,240,223,0.16)',
  lineSoft: 'rgba(246,240,223,0.09)',
  boneFaint: 'rgba(246,240,223,0.07)',
  boneMuted: 'rgba(246,240,223,0.38)',

  // type
  fontDisplayBlack: 'Fraunces_900Black',
  fontDisplay: 'Fraunces_600SemiBold',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontUI: 'HankenGrotesk_500Medium',
  fontUISemi: 'HankenGrotesk_600SemiBold',
  fontUIBold: 'HankenGrotesk_700Bold',
  fontMono: 'DMMono_500Medium',
  fontMonoLight: 'DMMono_400Regular',

  radius: { card: 16, pill: 999, button: 14 },
} as const;

/** Brass plate gradient stops, light falling from above. */
export const BRASS_GRADIENT = ['#eed694', '#c9a24b', '#a07c33'] as const;

/** Felt backdrop gradient stops. */
export const FELT_GRADIENT = ['#11341f', '#0c2918', '#04130a'] as const;

/** "$5" / "-$2.50" money formatting used everywhere. */
export const fmtMoney = (n: number): string => {
  const cents = Math.round(Math.abs(n) * 100) % 100 !== 0;
  return (
    (n < 0 ? '-$' : '$') +
    Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
};
