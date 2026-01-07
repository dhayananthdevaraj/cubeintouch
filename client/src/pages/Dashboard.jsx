// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("examly_token");
  const isAuthenticated = !!token;

  const tools = [
    {
      id: 'finder',
      icon: '📚',
      title: 'Course Finder',
      description: 'Search and manage courses, projects, and content banks across your institution.',
      path: '/finder',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: 'mcq-qc',
      icon: '🔍',
      title: 'MCQ QC',
      description: 'Quality check and validate MCQ questions for accuracy and consistency.',
      path: '/mcq-qc',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: 'course-qb',
      icon: '🎓',
      title: 'Course QB Finder',
      description: 'Find and analyze question banks linked to courses and tests.',
      path: '/course-qb',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: 'qb-access',
      icon: '🔄',
      title: 'QB Access',
      description: 'Clone and move question banks between departments with ease.',
      path: '/qb-access',
      status: 'active', // Always active
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      badge: 'New'
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Reports',
      description: 'Generate detailed reports about course usage and content distribution.',
      status: 'coming-soon',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      id: 'automations',
      icon: '⚙️',
      title: 'Automations',
      description: 'Automate repetitive tasks and bulk operations across content banks.',
      status: 'coming-soon',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    },
  ];

  const handleCardClick = (tool) => {
    if (tool.status === 'active' && tool.path) {
      navigate(tool.path);
    } else if (tool.status === 'inactive') {
      navigate(tool.path); // Navigate anyway, they can configure token there
    }
  };

  const activeTools = tools.filter(t => t.status === 'active').length;
  const availableTools = tools.filter(t => t.status !== 'coming-soon').length;
  const comingSoonTools = tools.filter(t => t.status === 'coming-soon').length;

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-emoji">👋</span>
            <span>Welcome to Support Hub</span>
          </h1>
          <p className="hero-subtitle">
            Internal tools for course and content management • Powered by CubeInTouch
          </p>
          
          {!isAuthenticated && (
            <div className="hero-alert">
              <span className="alert-icon">💡</span>
              <span>Some tools require API token configuration</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">🛠️</div>
          <div className="stat-content">
            <div className="stat-value">{activeTools}</div>
            <div className="stat-label">Active Tools</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-value">{availableTools}</div>
            <div className="stat-label">Available</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{comingSoonTools}</div>
            <div className="stat-label">Coming Soon</div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="tools-section">
        <h2 className="section-title">Available Tools</h2>
        <div className="tools-grid">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={`tool-card ${tool.status === 'coming-soon' ? 'coming-soon' : ''} ${tool.status === 'active' ? 'active' : ''}`}
              onClick={() => handleCardClick(tool)}
              style={{ '--card-gradient': tool.gradient }}
            >
              <div className="tool-card-inner">
                <div className="tool-gradient-bg"></div>
                <div className="tool-content">
                  <div className="tool-header">
                    <div className="tool-icon">{tool.icon}</div>
                    {tool.badge && (
                      <span className="tool-badge">{tool.badge}</span>
                    )}
                    {tool.status === 'coming-soon' && (
                      <span className="tool-badge coming">Coming Soon</span>
                    )}
                  </div>
                  <h3 className="tool-title">{tool.title}</h3>
                  <p className="tool-description">{tool.description}</p>
                  
                  {tool.status !== 'coming-soon' && (
                    <div className="tool-footer">
                      <div className="tool-status">
                        {tool.status === 'active' ? (
                          <>
                            <span className="status-dot active"></span>
                            <span className="status-text">Ready to Use</span>
                          </>
                        ) : (
                          <>
                            <span className="status-dot inactive"></span>
                            <span className="status-text">Configure Token</span>
                          </>
                        )}
                      </div>
                      <div className="tool-arrow">→</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        /* Hero Section */
        .dashboard-hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 60px 40px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .dashboard-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }

        .hero-content {
          max-width: 800px;
          position: relative;
          z-index: 1;
        }

        .hero-title {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -1px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hero-emoji {
          font-size: 56px;
          animation: wave 2s ease-in-out infinite;
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }

        .hero-subtitle {
          font-size: 18px;
          opacity: 0.95;
          font-weight: 500;
          margin-bottom: 24px;
        }

        .hero-alert {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          font-size: 14px;
          font-weight: 600;
        }

        .alert-icon {
          font-size: 20px;
        }

        /* Quick Stats */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding: 40px;
          margin-top: -40px;
          position: relative;
          z-index: 2;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 40px;
          line-height: 1;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #667eea;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 600;
        }

        /* Tools Section */
        .tools-section {
          padding: 20px 40px 60px;
        }

        .section-title {
          font-size: 28px;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 32px;
          letter-spacing: -0.5px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .tool-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .tool-card:hover:not(.coming-soon) {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .tool-card.coming-soon {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tool-card-inner {
          position: relative;
          height: 100%;
        }

        .tool-gradient-bg {
          height: 8px;
          background: var(--card-gradient);
        }

        .tool-content {
          padding: 28px;
        }

        .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .tool-icon {
          font-size: 48px;
          line-height: 1;
        }

        .tool-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tool-badge:not(.coming) {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
        }

        .tool-badge.coming {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .tool-title {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }

        .tool-description {
          font-size: 14px;
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 24px;
          min-height: 60px;
        }

        .tool-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }

        .tool-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.active {
          background: #43e97b;
          box-shadow: 0 0 0 0 rgba(67, 233, 123, 0.7);
          animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.inactive {
          background: #ffc107;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(67, 233, 123, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(67, 233, 123, 0);
          }
        }

        .status-text {
          font-size: 13px;
          font-weight: 600;
          color: #495057;
        }

        .tool-arrow {
          font-size: 24px;
          color: #667eea;
          font-weight: 700;
          transition: transform 0.3s ease;
        }

        .tool-card:hover:not(.coming-soon) .tool-arrow {
          transform: translateX(4px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-hero {
            padding: 40px 24px;
          }

          .hero-title {
            font-size: 32px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .hero-emoji {
            font-size: 40px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .quick-stats {
            padding: 24px;
            margin-top: -30px;
            gap: 16px;
          }

          .tools-section {
            padding: 20px 24px 40px;
          }

          .section-title {
            font-size: 24px;
          }

          .tools-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}