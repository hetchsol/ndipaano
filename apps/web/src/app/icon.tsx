import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="32"
          height="32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 56 C32 56 8 40 8 22 C8 12 16 6 24 6 C28.4 6 32 9 32 9 C32 9 35.6 6 40 6 C48 6 56 12 56 22 C56 40 32 56 32 56Z"
            fill="#DC2626"
            stroke="#991B1B"
            strokeWidth="2"
          />
          <path
            d="M21 16 C17 16 14 19 14 23 C14 25 15 27 15 27"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
