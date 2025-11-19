'use client'

export function IganiLoader() {
  return (
    <div className="loader-container w-[150px] h-[140px] relative">
      <div className="spinner-ring absolute top-1/2 left-1/2 w-[170px] h-[160px] -mt-20 -ml-[85px] border-[3px] border-transparent border-t-[#6694E0] rounded-full animate-spin" />

      <svg className="logo-icon w-full h-full" viewBox="0 0 106 98" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ovalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.3 0"
              result="dimmedBlur"/>
            <feMerge>
              <feMergeNode in="dimmedBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* White glowing ellipse */}
        <ellipse
          className="oval-back animate-fade-pulse"
          cx="53"
          cy="49"
          rx="38"
          ry="29"
          fill="white"
          opacity="0.4"
          filter="url(#ovalGlow)"
          transform="rotate(-5 53 49)"
        />

        {/* Black oval */}
        <ellipse
          className="oval-front animate-fade-pulse-delayed-200"
          cx="53"
          cy="49"
          rx="36"
          ry="27"
          fill="#020915"
          transform="rotate(-5 53 49)"
        />

        {/* Left pillar */}
        <rect
          className="pillar-left animate-grow-up-400"
          x="34"
          y="8"
          width="18"
          height="82"
          rx="9"
          fill="#8FB7F9"
          style={{ transformOrigin: 'center bottom' }}
        />

        {/* Left pillar cutout */}
        <rect
          className="cutout-left animate-grow-up-400"
          x="39"
          y="22"
          width="8"
          height="22"
          rx="4"
          fill="#020915"
          style={{ transformOrigin: 'center bottom' }}
        />

        {/* Right pillar */}
        <rect
          className="pillar-right animate-grow-up-600"
          x="56"
          y="6"
          width="18"
          height="86"
          rx="9"
          fill="#6694E0"
          style={{ transformOrigin: 'center bottom' }}
        />

        {/* Right pillar cutout */}
        <rect
          className="cutout-right animate-grow-up-600"
          x="61"
          y="54"
          width="8"
          height="22"
          rx="4"
          fill="#020915"
          style={{ transformOrigin: 'center bottom' }}
        />
      </svg>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes fadePulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes growUp {
          0%, 100% {
            transform: scaleY(1);
            opacity: 1;
          }
          50% {
            transform: scaleY(0.3);
            opacity: 0.5;
          }
        }

        .spinner-ring {
          animation: spin 2s linear infinite;
        }

        .animate-fade-pulse {
          animation: fadePulse 2s ease-in-out infinite;
        }

        .animate-fade-pulse-delayed-200 {
          animation: fadePulse 2s ease-in-out 0.2s infinite;
        }

        .animate-grow-up-400 {
          animation: growUp 2s ease-in-out 0.4s infinite;
        }

        .animate-grow-up-600 {
          animation: growUp 2s ease-in-out 0.6s infinite;
        }
      `}</style>
    </div>
  )
}
