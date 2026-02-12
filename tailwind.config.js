/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // classpet 기반 라이트 테마 색상 팔레트
      colors: {
        // 배경 계열
        bg: '#FFF9F0',
        surface: 'rgba(255, 255, 255, 0.55)',
        surface2: 'rgba(255, 255, 255, 0.3)',
        border: 'rgba(255, 255, 255, 0.6)',

        // 텍스트 계열
        text: '#2D3748',
        textMuted: '#718096',
        textDim: '#A0AEC0',

        // 액센트 계열
        primary: {
          DEFAULT: '#7C9EF5',
          light: '#A78BFA',
        },
        secondary: {
          DEFAULT: '#F5A67C',
          light: '#F5E07C',
        },
        success: {
          DEFAULT: '#7CE0A3',
          light: '#7CF5D4',
        },
        warning: '#F5E07C',
        danger: '#F57C7C',

        // 영역 전용 색상
        domain: {
          exercise: '#F57C7C',   // 운동 💪
          sports: '#7C9EF5',      // 스포츠 ⚽
          expression: '#A78BFA',  // 표현 🎭
        },

        // 스포츠 중영역 색상
        subdomain: {
          skill: '#7C9EF5',       // 기술형
          strategy: '#818CF8',    // 전략형
          ecology: '#7CE0A3',     // 생태형
        },

        // 탭별 고유 색상
        tab: {
          home: '#7C9EF5',        // 🏠 오늘
          weather: '#7CE0A3',     // 🌤️ 날씨
          schedule: '#F5E07C',    // 📅 시간표
          sketch: '#F5A67C',      // ✏️ 수업스케치
          classes: '#A78BFA',     // 📋 학급
        },
      },

      // 커스텀 Border Radius
      borderRadius: {
        'lg': '8px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },

      // 폰트 패밀리 (Pretendard CDN 사용)
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },

      // 커스텀 그림자
      boxShadow: {
        'glass': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'glass-strong': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },

      // 커스텀 애니메이션
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        sparkle: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        toastIn: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        toastOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce': 'bounce 1s infinite',
        'wiggle': 'wiggle 0.3s ease-in-out',
        'pulse': 'pulse 2s ease-in-out infinite',
        'sparkle': 'sparkle 0.6s ease-in-out',
        'toast-in': 'toastIn 0.3s ease-out',
        'toast-out': 'toastOut 0.3s ease-in',
      },

      // 컨테이너 max-width
      maxWidth: {
        'mobile': '100%',
        'tablet': '576px',
        'desktop': '672px',
        'xl-wide': '1000px',
      },
    },
  },
  plugins: [],
}
