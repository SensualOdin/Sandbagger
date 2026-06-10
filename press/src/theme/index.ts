export const theme = {
  felt: '#10301f',
  feltDeep: '#0a2417',
  bone: '#f4efe1',
  boneDim: '#e7e0cd',
  ink: '#1c2620',
  brass: '#c9a24b',
  brassDim: '#9c7c34',
  clay: '#b4472f',
  up: '#2f7d4f',
  down: '#e88b72',
  line: 'rgba(244,239,225,0.14)',
  inkFaint: 'rgba(28,38,32,0.5)',
  inkLine: 'rgba(0,0,0,0.06)',
  boneFaint: 'rgba(244,239,225,0.08)',
  boneMuted: 'rgba(244,239,225,0.3)',

  fontDisplay: 'Fraunces_600SemiBold',
  fontUI: 'HankenGrotesk_500Medium',
  fontUISemi: 'HankenGrotesk_600SemiBold',
  fontUIBold: 'HankenGrotesk_700Bold',
  fontMono: 'DMMono_500Medium',
} as const;

/** "$5" / "-$5" money formatting used everywhere. */
export const fmtMoney = (n: number): string =>
  (n < 0 ? '-$' : '$') +
  Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
