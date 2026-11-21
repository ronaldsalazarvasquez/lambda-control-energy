// Fondo del login: molino de arroz al amanecer sobre campos de arroz (vectorial, modo claro)
export default function LoginScene() {
  const VP = { x: 560, y: 640 } // punto de fuga de los surcos
  const rows = Array.from({ length: 22 }, (_, i) => -900 + i * 190)
  const stalk = (x, y, s = 1, flip = 1, k = 0) => (
    <g key={`${x}-${k}`} transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      {[-18, -8, 0, 9, 17].map((a, j) => (
        <path key={j} d={`M0 0 Q${a * 0.6} -60 ${a * 2.2} -${118 + (j % 2) * 18}`} stroke={j % 2 ? '#93a85a' : '#a7bb6a'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((j) => (
        <ellipse key={`g${j}`} cx={30 + j * 4} cy={-112 + j * 9} rx="3.2" ry="6" fill="#e2bd57" transform={`rotate(${35 + j * 6} ${30 + j * 4} ${-112 + j * 9})`} />
      ))}
      <path d="M20 -100 Q34 -80 56 -54" stroke="#c9a544" strokeWidth="1.6" fill="none" />
    </g>
  )
  return (
    <svg className="login-scene" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9e6f6" /><stop offset=".55" stopColor="#eef1f3" /><stop offset=".8" stopColor="#fbf0dc" />
        </linearGradient>
        <radialGradient id="sun" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(560 560) scale(460 320)">
          <stop offset="0" stopColor="#fff3cf" /><stop offset=".35" stopColor="#ffe9b0" stopOpacity=".8" /><stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d58f" /><stop offset=".5" stopColor="#b6c877" /><stop offset="1" stopColor="#9fb563" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f1f4" stopOpacity=".9" /><stop offset="1" stopColor="#d4e3ea" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="silo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d3df" /><stop offset=".35" stopColor="#f4f7fa" /><stop offset=".7" stopColor="#dde4ec" /><stop offset="1" stopColor="#b9c5d3" />
        </linearGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef2f6" /><stop offset="1" stopColor="#d8e0e9" /></linearGradient>
        <linearGradient id="roof" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9fb0c4" /><stop offset="1" stopColor="#c4cfdc" /></linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fdf6e8" stopOpacity=".85" /></linearGradient>
        <clipPath id="ground"><rect x="0" y="640" width="1600" height="360" /></clipPath>
      </defs>

      {/* cielo y sol */}
      <rect width="1600" height="1000" fill="url(#sky)" />
      <rect width="1600" height="1000" fill="url(#sun)" />
      <circle cx="560" cy="560" r="58" fill="#fff6dc" opacity=".9" />
      {[[220, 170, 1.2], [520, 120, .8], [1350, 190, 1], [980, 90, .7]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity=".75">
          <ellipse cx="0" cy="0" rx="90" ry="18" /><ellipse cx="40" cy="-14" rx="50" ry="20" /><ellipse cx="-40" cy="-6" rx="40" ry="14" />
        </g>
      ))}

      {/* colinas lejanas */}
      <path d="M0 560 C180 500 320 520 470 548 S760 500 920 530 S1250 490 1420 520 S1560 540 1600 530 V650 H0 Z" fill="#c6d3e1" opacity=".75" />
      <path d="M0 600 C160 570 300 585 480 600 S800 572 980 590 S1300 570 1600 596 V650 H0 Z" fill="#b5c6d6" opacity=".7" />
      <rect y="560" width="1600" height="90" fill="url(#haze)" />

      {/* torres eléctricas y líneas */}
      {[[1470, 470, .9], [1200, 520, .6], [990, 552, .42]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} stroke="#8a9bb0" strokeWidth={2 / s * 0.6} fill="none">
          <path d="M0 0 L-34 190 M0 0 L34 190 M-12 60 H12 M-22 112 H22 M-30 160 H30 M-12 60 L22 112 L-30 160 M12 60 L-22 112 L30 160" />
          <path d="M-46 42 H46 M-58 78 H58" />
        </g>
      ))}
      <g fill="none" stroke="#9aa9bb" strokeWidth="1.1">
        <path d="M1512 508 Q1330 560 1228 545 Q1090 560 1008 565 Q880 590 770 520" />
        <path d="M1428 508 Q1300 550 1172 545 Q1050 556 970 565 Q860 586 740 516" />
      </g>
      <path d="M1428 508 Q1300 550 1172 545 Q1050 556 970 565 Q860 586 740 516" fill="none" stroke="#f2b705" strokeWidth="1.6" opacity=".8" />

      {/* molino de arroz */}
      <g transform="translate(-790 -10)">
      <g stroke="#9fb0c3" strokeWidth="1.3">
        {/* almacén */}
        <path d="M900 520 L1000 470 L1100 520 V650 H900 Z" fill="url(#wall)" />
        <path d="M892 524 L1000 466 L1108 524" fill="none" stroke="url(#roof)" strokeWidth="6" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={918 + i * 44} y="560" width="26" height="18" rx="2" fill={i === 1 ? '#ffe39a' : '#dfe6ee'} />)}
        <rect x="980" y="600" width="44" height="50" fill="#cfd8e2" />
        {/* torre de elevadores */}
        <rect x="1118" y="330" width="46" height="320" fill="url(#wall)" />
        <rect x="1110" y="318" width="62" height="18" fill="#c9d3de" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="1130" y={360 + i * 52} width="22" height="14" rx="2" fill={i === 2 ? '#ffe39a' : '#dfe6ee'} />)}
        {/* silos */}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={1196 + i * 74} y="420" width="62" height="230" fill="url(#silo)" />
            <path d={`M${1196 + i * 74} 422 Q${1227 + i * 74} 384 ${1258 + i * 74} 422`} fill="url(#silo)" />
            {[0, 1, 2, 3].map((k) => <path key={k} d={`M${1196 + i * 74} ${470 + k * 46} H${1258 + i * 74}`} stroke="#b6c3d1" strokeWidth="1" />)}
          </g>
        ))}
        {/* puente de transportadores */}
        <path d="M1164 340 L1480 404" stroke="#a8b7c8" strokeWidth="5" />
        <path d="M1164 352 L1480 416" stroke="#c3cedb" strokeWidth="2" />
        {[1210, 1284, 1358, 1432].map((x) => <path key={x} d={`M${x} ${349 + (x - 1164) * 0.2} V${386 + (x - 1196) * 0.2}`} stroke="#a8b7c8" />)}
        {/* secadora y chimenea */}
        <rect x="1036" y="430" width="58" height="90" fill="url(#wall)" />
        <rect x="1056" y="380" width="12" height="52" fill="#d4dce6" />
      </g>
      <path d="M1062 378 C1050 350 1080 330 1066 300 C1056 280 1082 262 1074 240" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" fill="none" opacity=".7" />
      {/* luz de energía sobre el puente */}
      <path d="M1164 340 L1480 404" stroke="#f2b705" strokeWidth="1.6" opacity=".9" />
      <circle cx="1164" cy="340" r="4" fill="#f2b705" />
      </g>

      {/* campos de arroz con perspectiva */}
      <rect y="640" width="1600" height="360" fill="url(#field)" />
      <g clipPath="url(#ground)">
        {rows.map((x, i) => (
          <path key={i} d={`M${VP.x} ${VP.y} L${x} 1000 L${x + 95} 1000 Z`} fill={i % 2 ? '#c2d185' : '#b3c574'} opacity=".45" />
        ))}
        {[680, 720, 775, 845, 935].map((y, i) => (
          <path key={y} d={`M0 ${y} C400 ${y - 8 - i * 2} 1000 ${y + 6} 1600 ${y - 4}`} stroke="url(#water)" strokeWidth={2 + i * 2} fill="none" opacity=".35" />
        ))}
        {rows.map((x, i) => <path key={`l${i}`} d={`M${VP.x} ${VP.y} L${x} 1000`} stroke="#a3b766" strokeWidth="1" opacity=".5" />)}
      </g>
      <rect y="636" width="1600" height="14" fill="#dfe8c2" opacity=".6" />

      {/* espigas en primer plano */}
      {[[60, 1010, 1.25], [150, 1030, 1.05], [250, 1015, .9], [1360, 1020, 1.1], [1470, 1005, 1.3], [1560, 1030, 1]].map(([x, y, s], i) => stalk(x, y, s, i % 2 ? -1 : 1, i))}
    </svg>
  )
}
