import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { theme } from '@/theme';

/**
 * The club seal: crossed clubs behind a P monogram inside a double ring,
 * flanked by engraved ticks. Drawn, not imported — it's ours.
 */
export function Crest({ size = 96 }: { size?: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* double ring */}
      <Circle cx={48} cy={48} r={46} stroke={theme.brass} strokeWidth={1.5} fill="none" opacity={0.9} />
      <Circle cx={48} cy={48} r={40} stroke={theme.brass} strokeWidth={0.75} fill="none" opacity={0.55} />
      {/* crossed clubs */}
      <G opacity={0.5}>
        <Line x1={26} y1={70} x2={64} y2={26} stroke={theme.brass} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M64 26 q8 -7 4 -12 q-6 -2 -9 7 z" fill={theme.brass} />
        <Line x1={70} y1={70} x2={32} y2={26} stroke={theme.brass} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M32 26 q-8 -7 -4 -12 q6 -2 9 7 z" fill={theme.brass} />
      </G>
      {/* ball on the tee line */}
      <Circle cx={48} cy={66} r={4} fill={theme.bone} opacity={0.85} />
      {/* monogram */}
      <SvgText
        x={c}
        y={56}
        textAnchor="middle"
        fontFamily={theme.fontDisplayBlack}
        fontSize={34}
        fill={theme.bone}
      >
        S
      </SvgText>
      {/* compass ticks */}
      {[0, 90, 180, 270].map((deg) => (
        <Line
          key={deg}
          x1={48}
          y1={1}
          x2={48}
          y2={6}
          stroke={theme.brass}
          strokeWidth={1.5}
          transform={`rotate(${deg} 48 48)`}
        />
      ))}
    </Svg>
  );
}
