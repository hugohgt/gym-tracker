import React from 'react';
import { PrimaryMuscleGroup } from './Analytics';

export type FocusLevel = 'higher' | 'moderate' | 'lower';

interface BodyHeatmapProps {
  muscleFocus: Record<PrimaryMuscleGroup, FocusLevel>;
}

const COLOR_MAP: Record<FocusLevel, string> = {
  higher: '#00f5c4',   // Neon mint
  moderate: '#0d9488', // Medium teal
  lower: '#26374d'     // Inactive slate blue
};

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ muscleFocus }) => {
  const getColor = (group: PrimaryMuscleGroup) => COLOR_MAP[muscleFocus[group] || 'lower'];

  return (
    <div className="flex items-center justify-between gap-2 w-full py-2">
      {/* Figures Container */}
      <div className="flex items-center justify-center gap-4 flex-1">
        {/* FRONT VIEW */}
        <div className="w-[125px] h-[260px] flex items-center justify-center">
          <svg
            viewBox="0 0 140 280"
            className="w-full h-full drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Base Body Silhouette (Behind) */}
            <g opacity="0.35">
              {/* Head */}
              <ellipse cx="70" cy="22" rx="13" ry="16" fill="#1e2c40" stroke="#334766" strokeWidth="1.5" />
              {/* Neck */}
              <path d="M63 36 L63 46 L77 46 L77 36 Z" fill="#1e2c40" />
              {/* Hands */}
              <ellipse cx="20" cy="165" rx="5" ry="9" fill="#1e2c40" />
              <ellipse cx="120" cy="165" rx="5" ry="9" fill="#1e2c40" />
              {/* Feet */}
              <path d="M49 265 L57 265 L55 275 L45 275 Z" fill="#1e2c40" />
              <path d="M83 265 L91 265 L95 275 L85 275 Z" fill="#1e2c40" />
            </g>

            {/* MUSCLE GROUPS - FRONT */}

            {/* SHOULDERS (Front Deltoids) */}
            <g fill={getColor('Shoulders')}>
              {/* Left Shoulder */}
              <path
                d="M45 48 C37 50 33 58 34 68 C36 71 40 73 45 70 C47 62 47 54 45 48 Z"
                className="transition-colors duration-500"
              />
              {/* Right Shoulder */}
              <path
                d="M95 48 C103 50 107 58 106 68 C104 71 100 73 95 70 C93 62 93 54 95 48 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* CHEST (Pectorals) */}
            <g fill={getColor('Chest')}>
              {/* Left Pec */}
              <path
                d="M68 50 C56 50 48 53 47 64 C47 75 58 84 68 84 C69 73 69 61 68 50 Z"
                className="transition-colors duration-500"
              />
              {/* Right Pec */}
              <path
                d="M72 50 C84 50 92 53 93 64 C93 75 82 84 72 84 C71 73 71 61 72 50 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* BICEPS */}
            <g fill={getColor('Biceps')}>
              {/* Left Bicep */}
              <path
                d="M32 72 C28 77 28 92 31 102 C35 102 38 98 39 90 C40 82 38 74 32 72 Z"
                className="transition-colors duration-500"
              />
              {/* Right Bicep */}
              <path
                d="M108 72 C112 77 112 92 109 102 C105 102 102 98 101 90 C100 82 102 74 108 72 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* FOREARMS (Attached to arms) */}
            <g fill="#213248">
              {/* Left Forearm */}
              <path d="M28 106 C25 115 22 135 24 152 C27 152 30 148 32 138 C34 125 33 112 30 106 Z" />
              {/* Right Forearm */}
              <path d="M112 106 C115 115 118 135 116 152 C113 152 110 148 108 138 C106 125 107 112 110 106 Z" />
            </g>

            {/* CORE / ABS (Rectus Abdominis & Obliques) */}
            <g fill={getColor('Core')}>
              {/* Upper Abs */}
              <rect x="62" y="87" width="7" height="8" rx="2" className="transition-colors duration-500" />
              <rect x="71" y="87" width="7" height="8" rx="2" className="transition-colors duration-500" />
              {/* Mid Abs */}
              <rect x="62" y="97" width="7" height="9" rx="2" className="transition-colors duration-500" />
              <rect x="71" y="97" width="7" height="9" rx="2" className="transition-colors duration-500" />
              {/* Lower Abs */}
              <rect x="63" y="108" width="6" height="10" rx="2" className="transition-colors duration-500" />
              <rect x="71" y="108" width="6" height="10" rx="2" className="transition-colors duration-500" />
              {/* Left Obliques */}
              <path d="M54 86 C51 98 52 114 56 122 C59 122 61 118 60 106 C60 96 58 88 54 86 Z" className="transition-colors duration-500" />
              {/* Right Obliques */}
              <path d="M86 86 C89 98 88 114 84 122 C81 122 79 118 80 106 C80 96 82 88 86 86 Z" className="transition-colors duration-500" />
            </g>

            {/* HIPS / PELVIS */}
            <path d="M57 125 C64 128 76 128 83 125 C82 135 77 142 70 142 C63 142 58 135 57 125 Z" fill="#1b283b" />

            {/* QUADS (Quadriceps) */}
            <g fill={getColor('Quads')}>
              {/* Left Quad */}
              <path
                d="M55 137 C48 148 45 168 47 190 C53 194 62 193 66 182 C69 168 68 150 67 138 C63 136 58 136 55 137 Z"
                className="transition-colors duration-500"
              />
              {/* Right Quad */}
              <path
                d="M85 137 C92 148 95 168 93 190 C87 194 78 193 74 182 C71 168 72 150 73 138 C77 136 82 136 85 137 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* KNEES */}
            <circle cx="56" cy="198" r="4" fill="#1e2c40" />
            <circle cx="84" cy="198" r="4" fill="#1e2c40" />

            {/* CALVES (Front Shins / Gastrocnemius) */}
            <g fill={getColor('Calves')}>
              {/* Left Calf */}
              <path
                d="M48 206 C44 218 46 238 50 258 C55 258 58 248 60 234 C61 220 59 208 55 204 C52 204 49 205 48 206 Z"
                className="transition-colors duration-500"
              />
              {/* Right Calf */}
              <path
                d="M92 206 C96 218 94 238 90 258 C85 258 82 248 80 234 C79 220 81 208 85 204 C88 204 91 205 92 206 Z"
                className="transition-colors duration-500"
              />
            </g>
          </svg>
        </div>

        {/* BACK VIEW */}
        <div className="w-[125px] h-[260px] flex items-center justify-center">
          <svg
            viewBox="0 0 140 280"
            className="w-full h-full drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Base Body Silhouette (Behind) */}
            <g opacity="0.35">
              {/* Head (Back) */}
              <ellipse cx="70" cy="22" rx="13" ry="16" fill="#1e2c40" stroke="#334766" strokeWidth="1.5" />
              {/* Hands */}
              <ellipse cx="20" cy="165" rx="5" ry="9" fill="#1e2c40" />
              <ellipse cx="120" cy="165" rx="5" ry="9" fill="#1e2c40" />
              {/* Feet (Back heels) */}
              <ellipse cx="51" cy="268" rx="5" ry="6" fill="#1e2c40" />
              <ellipse cx="89" cy="268" rx="5" ry="6" fill="#1e2c40" />
            </g>

            {/* MUSCLE GROUPS - BACK */}

            {/* BACK (Traps, Lats, Mid & Lower Back) */}
            <g fill={getColor('Back')}>
              {/* Trapezius (Diamond shape upper back) */}
              <path
                d="M70 36 L83 48 L76 72 L64 72 L57 48 Z"
                className="transition-colors duration-500"
              />
              {/* Left Latissimus */}
              <path
                d="M55 52 C46 58 46 75 50 96 C56 94 62 88 64 76 C60 65 57 56 55 52 Z"
                className="transition-colors duration-500"
              />
              {/* Right Latissimus */}
              <path
                d="M85 52 C94 58 94 75 90 96 C84 94 78 88 76 76 C80 65 83 56 85 52 Z"
                className="transition-colors duration-500"
              />
              {/* Lower Back / Spinal erectors */}
              <path
                d="M65 80 L75 80 C74 98 73 116 71 124 L69 124 C67 116 66 98 65 80 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* SHOULDERS (Rear Deltoids) */}
            <g fill={getColor('Shoulders')}>
              {/* Left Rear Deltoid */}
              <path
                d="M44 49 C37 52 33 60 34 68 C38 69 43 65 47 58 C46 54 45 51 44 49 Z"
                className="transition-colors duration-500"
              />
              {/* Right Rear Deltoid */}
              <path
                d="M96 49 C103 52 107 60 106 68 C102 69 97 65 93 58 C94 54 95 51 96 49 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* TRICEPS */}
            <g fill={getColor('Triceps')}>
              {/* Left Tricep */}
              <path
                d="M32 72 C27 80 27 94 30 104 C35 104 38 98 39 88 C39 80 37 74 32 72 Z"
                className="transition-colors duration-500"
              />
              {/* Right Tricep */}
              <path
                d="M108 72 C113 80 113 94 110 104 C105 104 102 98 101 88 C101 80 103 74 108 72 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* FOREARMS (Back side) */}
            <g fill="#213248">
              <path d="M28 108 C25 118 22 136 24 152 C27 152 30 148 32 138 C34 126 33 114 30 108 Z" />
              <path d="M112 108 C115 118 118 136 116 152 C113 152 110 148 108 138 C106 126 107 114 110 108 Z" />
            </g>

            {/* GLUTES (Gluteus Maximus) */}
            <g fill={getColor('Glutes')}>
              {/* Left Glute */}
              <path
                d="M53 125 C50 138 52 154 62 160 C68 158 70 148 69 130 C64 126 58 124 53 125 Z"
                className="transition-colors duration-500"
              />
              {/* Right Glute */}
              <path
                d="M87 125 C90 138 88 154 78 160 C72 158 70 148 71 130 C76 126 82 124 87 125 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* HAMSTRINGS */}
            <g fill={getColor('Hamstrings')}>
              {/* Left Hamstring */}
              <path
                d="M52 165 C48 175 49 192 51 202 C58 202 65 198 67 186 C68 174 65 166 61 163 C58 163 55 164 52 165 Z"
                className="transition-colors duration-500"
              />
              {/* Right Hamstring */}
              <path
                d="M88 165 C92 175 91 192 89 202 C82 202 75 198 73 186 C72 174 75 166 79 163 C82 163 85 164 88 165 Z"
                className="transition-colors duration-500"
              />
            </g>

            {/* CALVES (Back Gastrocnemius) */}
            <g fill={getColor('Calves')}>
              {/* Left Calf */}
              <path
                d="M48 208 C42 220 44 240 48 258 C53 258 58 248 61 234 C63 218 58 208 53 206 C51 206 49 207 48 208 Z"
                className="transition-colors duration-500"
              />
              {/* Right Calf */}
              <path
                d="M92 208 C98 220 96 240 92 258 C87 258 82 248 79 234 C77 218 82 208 87 206 C89 206 91 207 92 208 Z"
                className="transition-colors duration-500"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Floating Legend Card on the Right (Exactly like screenshot) */}
      <div className="flex flex-col gap-3.5 bg-[#0b1320]/90 border border-slate-700/50 p-3.5 rounded-2xl shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f5c4] shadow-[0_0_8px_rgba(0,245,196,0.6)]" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">HIGHER FOCUS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">MODERATE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#26374d]" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">LOWER FOCUS</span>
        </div>
      </div>
    </div>
  );
};
