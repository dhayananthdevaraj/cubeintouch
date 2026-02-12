// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("examly_token");
  const isAuthenticated = !!token;

  const tools = [
    {
      id: 'finder',
      icon: '📚',
      title: 'PB & CB Finder',
      description: 'Search and manage courses, projects, and content banks across your domain.',
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
      title: 'QB Space',
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
      status: 'active',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      id: 'meta-thinkly',
      icon: '📝',
      title: 'Meta Thinkly-X',
      description: 'Edit question bank metadata.',
      path: '/meta-thinkly',
      status: 'active',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    },
    {
      id: 'mcq-uploader',
      icon: '📤',
      title: 'MCQ Sync',
      description: 'Bulk upload MCQ questions from Excel/CSV files to question banks.',
      path: '/mcq-uploader',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
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
      navigate(tool.path);
    }
  };

  const activeTools = tools.filter(t => t.status === 'active').length;
  const availableTools = tools.filter(t => t.status !== 'coming-soon').length;
  const comingSoonTools = tools.filter(t => t.status === 'coming-soon').length;

  return (
    <div className="dashboard">
      {/* Animated Background */}
      <div className="dashboard-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Hero Section - Compact */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-pulse"></span>
            <span>CubeInTouch Internal Tools</span>
          </div>
          
          <h1 className="hero-title">
            <span className="hero-emoji">👋</span>
            <span className="title-text">
              Welcome to
              <span className="title-highlight"> Support Hub</span>
            </span>
          </h1>
          
          <p className="hero-subtitle">
            Your unified platform for course and content management
          </p>
          
          {!isAuthenticated && (
            <div className="hero-alert">
              <div className="alert-icon">💡</div>
              <div className="alert-content">
                <div className="alert-title">Setup Required</div>
                <div className="alert-text">Some tools need API token configuration</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats - Compact */}
      <div className="quick-stats-container">
        <div className="quick-stats">
          <div className="stat-card stat-card-1">
            <div className="stat-icon-wrapper">
              <div className="stat-icon">🛠️</div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeTools}</div>
              <div className="stat-label">Active Tools</div>
            </div>
          </div>

          <div className="stat-card stat-card-2">
            <div className="stat-icon-wrapper">
              <div className="stat-icon">🚀</div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{availableTools}</div>
              <div className="stat-label">Available Now</div>
            </div>
          </div>

          <div className="stat-card stat-card-3">
            <div className="stat-icon-wrapper">
              <div className="stat-icon">⏳</div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{comingSoonTools}</div>
              <div className="stat-label">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Section - Compact */}
      <div className="tools-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-line"></span>
            Available Tools
            <span className="title-count">{availableTools}</span>
          </h2>
        </div>

        <div className="tools-grid">
          {tools.map((tool, index) => (
            <div
              key={tool.id}
              className={`tool-card ${tool.status === 'coming-soon' ? 'coming-soon' : ''} ${tool.status === 'active' ? 'active' : ''}`}
              onClick={() => handleCardClick(tool)}
              style={{ 
                '--card-gradient': tool.gradient,
                '--animation-delay': `${index * 0.1}s`
              }}
            >
              <div className="tool-card-inner">
                <div className="tool-gradient-border"></div>
                <div className="tool-gradient-bg"></div>
                
                <div className="tool-content">
                  <div className="tool-header">
                    <div className="tool-icon-wrapper">
                      <div className="tool-icon">{tool.icon}</div>
                      <div className="tool-icon-glow"></div>
                    </div>
                    
                    {tool.status === 'coming-soon' && (
                      <span className="tool-badge badge-coming">
                        <span className="badge-clock">⏰</span>
                        Soon
                      </span>
                    )}
                  </div>

                  <h3 className="tool-title">{tool.title}</h3>
                  <p className="tool-description">{tool.description}</p>
                  
                  {tool.status !== 'coming-soon' && (
                    <div className="tool-footer">
                      <div className="tool-status">
                        {tool.status === 'active' ? (
                          <>
                            <span className="status-dot status-active">
                              <span className="dot-pulse"></span>
                            </span>
                            <span className="status-text">Ready</span>
                          </>
                        ) : (
                          <>
                            <span className="status-dot status-inactive"></span>
                            <span className="status-text">Setup</span>
                          </>
                        )}
                      </div>
                      
                      <div className="tool-action">
                        <span className="action-text">Launch</span>
                        <div className="action-arrow">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {tool.status === 'coming-soon' && (
                    <div className="tool-footer coming-soon-footer">
                      <div className="coming-soon-text">
                        <span className="coming-icon">🚧</span>
                        <span>In Development</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tool-shine"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info - Compact */}
      <div className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-icon">🎯</span>
            <span className="logo-text">CubeInTouch Support Hub</span>
          </div>
          <div className="footer-info">
            <span>v27.0.1</span>
            <span className="footer-divider">•</span>
            <span>Built for Excellence</span>
          </div>
        </div>
      </div>
    </div>
  );
}