// src/components/WelcomeLoader.jsx
import { useState, useEffect } from 'react';

export default function WelcomeLoader({ onLoadComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('loading'); // loading, fadeout, complete

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setStage('fadeout'), 500);
          setTimeout(() => {
            setStage('complete');
            onLoadComplete();
          }, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(progressInterval);
  }, [onLoadComplete]);

  if (stage === 'complete') return null;

  return (
    <div className={`welcome-loader ${stage === 'fadeout' ? 'fade-out' : ''}`}>
      <div className="loader-content">
        {/* Animated Logo */}
        <div className="loader-logo">
          <div className="logo-cube">
            <div className="cube-face front">📦</div>
            <div className="cube-face back">📦</div>
            <div className="cube-face right">📦</div>
            <div className="cube-face left">📦</div>
            <div className="cube-face top">📦</div>
            <div className="cube-face bottom">📦</div>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="loader-title">
          <span className="title-cube">Cube</span>
          <span className="title-in">In</span>
          <span className="title-touch">Touch</span>
        </h1>

        {/* Tagline */}
        <p className="loader-tagline">Support Hub</p>

        {/* Progress Bar */}
        <div className="loader-progress-container">
          <div className="loader-progress-bar">
            <div 
              className="loader-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loader-percentage">{progress}%</div>
        </div>

        {/* Loading Text */}
        <div className="loader-status">
          {progress < 30 && "Initializing..."}
          {progress >= 30 && progress < 60 && "Loading tools..."}
          {progress >= 60 && progress < 90 && "Setting up workspace..."}
          {progress >= 90 && "Ready!"}
        </div>

        {/* Floating Icons */}
        <div className="floating-icons">
          <span className="float-icon" style={{ '--delay': '0s', '--duration': '3s' }}>📚</span>
          <span className="float-icon" style={{ '--delay': '0.5s', '--duration': '3.5s' }}>🔍</span>
          <span className="float-icon" style={{ '--delay': '1s', '--duration': '4s' }}>🎓</span>
          <span className="float-icon" style={{ '--delay': '1.5s', '--duration': '3.2s' }}>🔄</span>
          <span className="float-icon" style={{ '--delay': '2s', '--duration': '3.8s' }}>📊</span>
          <span className="float-icon" style={{ '--delay': '2.5s', '--duration': '3.3s' }}>⚙️</span>
        </div>
      </div>

      <style>{`
        .welcome-loader {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.8s ease;
        }

        .welcome-loader.fade-out {
          opacity: 0;
        }

        .loader-content {
          text-align: center;
          position: relative;
          z-index: 2;
        }

        /* 3D Rotating Cube Logo */
        .loader-logo {
          perspective: 1000px;
          margin-bottom: 40px;
        }

        .logo-cube {
          width: 100px;
          height: 100px;
          position: relative;
          transform-style: preserve-3d;
          animation: rotateCube 4s infinite linear;
          margin: 0 auto;
        }

        @keyframes rotateCube {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }

        .cube-face {
          position: absolute;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .cube-face.front  { transform: rotateY(0deg) translateZ(50px); }
        .cube-face.back   { transform: rotateY(180deg) translateZ(50px); }
        .cube-face.right  { transform: rotateY(90deg) translateZ(50px); }
        .cube-face.left   { transform: rotateY(-90deg) translateZ(50px); }
        .cube-face.top    { transform: rotateX(90deg) translateZ(50px); }
        .cube-face.bottom { transform: rotateX(-90deg) translateZ(50px); }

        /* Brand Title */
        .loader-title {
          font-size: 64px;
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
          letter-spacing: -2px;
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;
        }

        .title-cube {
          animation: slideInLeft 0.8s ease-out;
        }

        .title-in {
          animation: scaleIn 0.8s ease-out 0.2s backwards;
        }

        .title-touch {
          animation: slideInRight 0.8s ease-out 0.4s backwards;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Tagline */
        .loader-tagline {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          margin-bottom: 48px;
          letter-spacing: 3px;
          text-transform: uppercase;
          animation: fadeIn 0.8s ease-out 0.6s backwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Progress Bar */
        .loader-progress-container {
          max-width: 400px;
          margin: 0 auto 20px;
        }

        .loader-progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .loader-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
          border-radius: 10px;
          transition: width 0.3s ease;
          box-shadow: 0 0 20px rgba(67, 233, 123, 0.5);
        }

        .loader-percentage {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', monospace;
        }

        /* Loading Status */
        .loader-status {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          margin-top: 24px;
          min-height: 24px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Floating Icons */
        .floating-icons {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .float-icon {
          position: absolute;
          font-size: 40px;
          opacity: 0.3;
          animation: float var(--duration, 3s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }

        .float-icon:nth-child(1) { left: 10%; top: 20%; }
        .float-icon:nth-child(2) { left: 80%; top: 15%; }
        .float-icon:nth-child(3) { left: 15%; bottom: 20%; }
        .float-icon:nth-child(4) { right: 15%; top: 30%; }
        .float-icon:nth-child(5) { right: 10%; bottom: 25%; }
        .float-icon:nth-child(6) { left: 50%; top: 10%; }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(20px) rotate(-5deg);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .loader-title {
            font-size: 48px;
            flex-direction: column;
            gap: 4px;
          }

          .logo-cube {
            width: 80px;
            height: 80px;
          }

          .cube-face {
            width: 80px;
            height: 80px;
            font-size: 40px;
          }

          .cube-face.front, .cube-face.back,
          .cube-face.right, .cube-face.left,
          .cube-face.top, .cube-face.bottom {
            transform: rotateY(0deg) translateZ(40px);
          }

          .loader-tagline {
            font-size: 16px;
          }

          .loader-progress-container {
            max-width: 300px;
          }

          .float-icon {
            font-size: 30px;
          }
        }
      `}</style>
    </div>
  );
}