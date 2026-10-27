import { useId } from 'react';

// Coordinates are registered to the Higgsfield panorama (5456 × 3072).
// Only water and atmosphere move; architecture and the sharp background stay still.
const falls = [
  '565,359 591,359 588,474 578,525 563,483',
  '688,352 708,353 702,410 683,420',
  '1239,388 1273,388 1267,498 1255,545 1237,507',
  '1407,401 1424,399 1420,448 1409,457',
  '916,788 937,790 937,875 929,923 914,880',
  '1015,789 1090,790 1080,899 1060,980 1032,1004 1015,919',
  '1216,763 1234,762 1227,817 1213,846',
  '406,862 426,865 425,932 416,969 404,940',
  '299,988 319,989 315,1050 307,1080 296,1046',
];
export default function ArchipelagoAtmosphere() {
  const id = useId().replace(/:/g, '');
  return <svg className="archipelago-atmosphere" viewBox="0 0 2048 1153" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={`${id}-falls`}>{falls.map((points, i) => <polygon key={i} points={points} />)}</clipPath>
      <pattern id={`${id}-streams`} width="19" height="48" patternUnits="userSpaceOnUse">
        <path d="M2 2v17 M8 20v22 M14 5v29 M18 39v9" stroke="#e5ffff" strokeWidth="1.5" strokeLinecap="round" opacity=".52" />
        <path d="M5 30v13 M12 0v9" stroke="#56cdd9" strokeWidth="2" opacity=".38" />
      </pattern>
      <radialGradient id={`${id}-mist`}><stop stopColor="#f2ffff" stopOpacity=".5"/><stop offset="1" stopColor="#e6ffff" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${id}-ember`}><stop stopColor="#ffdc89" stopOpacity=".65"/><stop offset=".4" stopColor="#ffa351" stopOpacity=".25"/><stop offset="1" stopColor="#ffb171" stopOpacity="0"/></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-falls)`} className="archipelago-water">
      <rect className="archipelago-streams" x="0" y="-48" width="2048" height="1249" fill={`url(#${id}-streams)`}/>
    </g>
    <g className="archipelago-ripples" fill="none" stroke="#ddffff" strokeWidth="1.4">
      <ellipse cx="1000" cy="702" rx="50" ry="10"/>
      <ellipse cx="958" cy="666" rx="31" ry="6"/>
      <ellipse cx="1512" cy="982" rx="33" ry="5"/>
      <ellipse cx="1730" cy="1048" rx="54" ry="7"/>
    </g>
    <g className="archipelago-mist" fill={`url(#${id}-mist)`}>
      <ellipse cx="1050" cy="991" rx="85" ry="39"/>
      <ellipse cx="1250" cy="537" rx="52" ry="27"/>
      <ellipse cx="573" cy="509" rx="49" ry="25"/>
      <ellipse cx="418" cy="968" rx="46" ry="20"/>
    </g>
    <ellipse className="archipelago-ember" cx="1778" cy="496" rx="48" ry="22" fill={`url(#${id}-ember)`}/>
  </svg>;
}
