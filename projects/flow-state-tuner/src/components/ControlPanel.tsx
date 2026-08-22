import React from 'react';

interface ControlPanelProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  baseFrequency: number;
  setBaseFrequency: (val: number) => void;
  modulationIntensity: number;
  setModulationIntensity: (val: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onTogglePlay,
  baseFrequency,
  setBaseFrequency,
  modulationIntensity,
  setModulationIntensity,
}) => {
  return (
    <div className="control-panel">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
        
        .control-panel {
          font-family: 'Inter', sans-serif;
          background: rgba(20, 20, 25, 0.8);
          backdrop-filter: blur(12px);
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .btn-play {
          background: ${isPlaying ? '#ff4757' : '#2ed573'};
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }

        .btn-play:active { transform: scale(0.98); }

        .slider-group { display: flex; flex-direction: column; gap: 0.5rem; }
        
        input[type=range] {
          width: 100%;
          accent-color: #70a1ff;
        }

        label { font-size: 0.8rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
      `}</style>

      <button className="btn-play" onClick={onTogglePlay}>
        {isPlaying ? 'STOP FLOW' : 'START FLOW'}
      </button>

      <div className="slider-group">
        <label>Base Frequency ({baseFrequency}Hz)</label>
        <input 
          type="range" 
          min="100" 
          max="500" 
          value={baseFrequency} 
          onChange={(e) => setBaseFrequency(Number(e.target.value))} 
        />
      </div>

      <div className="slider-group">
        <label>Modulation Intensity ({Math.round(modulationIntensity * 100)}%)</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={modulationIntensity} 
          onChange={(e) => setModulationIntensity(Number(e.target.value))} 
        />
      </div>
    </div>
  );
};

export default ControlPanel;