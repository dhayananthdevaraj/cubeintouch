// // src/pages/Dashboard.jsx
// import { useNavigate } from "react-router-dom";
// import "./Dashboard.css";

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const token = localStorage.getItem("examly_token");
//   const isAuthenticated = !!token;

//   const tools = [
//     {
//       id: 'finder',
//       icon: '📚',
//       title: 'PB & CB Finder',
//       description: 'Search and manage courses, projects, and content banks across your domain.',
//       path: '/finder',
//       status: isAuthenticated ? 'active' : 'inactive',
//       gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//     },
//     {
//       id: 'mcq-qc',
//       icon: '🔍',
//       title: 'MCQ QC',
//       description: 'Quality check and validate MCQ questions for accuracy and consistency.',
//       path: '/mcq-qc',
//       status: isAuthenticated ? 'active' : 'inactive',
//       gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
//     },
//     {
//       id: 'course-qb',
//       icon: '🎓',
//       title: 'QB Space',
//       description: 'Find and analyze question banks linked to courses and tests.',
//       path: '/course-qb',
//       status: isAuthenticated ? 'active' : 'inactive',
//       gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
//     },
//     {
//       id: 'qb-access',
//       icon: '🔄',
//       title: 'QB Access',
//       description: 'Clone and move question banks between departments with ease.',
//       path: '/qb-access',
//       status: 'active',
//       gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
//     },
//     {
//       id: 'meta-thinkly',
//       icon: '📝',
//       title: 'Meta Thinkly-X',
//       description: 'Edit question bank metadata.',
//       path: '/meta-thinkly',
//       status: 'active',
//       gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
//     },
//     {
//       id: 'mcq-uploader',
//       icon: '📤',
//       title: 'MCQ Sync',
//       description: 'Bulk upload MCQ questions from Excel/CSV files to question banks.',
//       path: '/mcq-uploader',
//       status: isAuthenticated ? 'active' : 'inactive',
//       gradient: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
//     },
//     {
//       id: 'cod-sync',
//       icon: '📤',
//       title: 'COD Sync',
//       description: 'Bulk upload Compiler / Coding questions from JSON files to question banks.',
//       path: '/cod-sync',
//       status: 'active',
//       gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
//     },
//     {
//       id: 'result-x',
//       icon: '⚡',
//       title: 'Result X',
//       description: 'AI-powered result analysis — weekly assessments & milestone code review.',
//       path: '/result-x',
//       status: 'active',
//       gradient: 'linear-gradient(135deg, #6366f1 0%, #f59e0b 100%)',
//     },
//     {
//     id: 'codelens',
//     icon: '🔭',
//     title: 'CodeLens',
//     description: 'Compiler mode code QC automation — AI-powered code quality analysis & test case validation.',
//     path: '/codelens',
//     status: 'active',
//     gradient: 'linear-gradient(135deg, #0080ff 0%, #7c3aed 100%)',
//   },
//   {
//   id: 'scaffa',
//   icon: '🏗️',
//   title: 'Scaffa',
//   description: 'Scaffold & structure manager — organise components, routes, and services in one place.',
//   path: '/scaffa',
//   status: 'active',
//   gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
// },
//     {
//       id: 'reports',
//       icon: '📊',
//       title: 'Reports',
//       description: 'Generate detailed reports about course usage and content distribution.',
//       status: 'coming-soon',
//       gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
//     },
//     {
//       id: 'automations',
//       icon: '⚙️',
//       title: 'Automations',
//       description: 'Automate repetitive tasks and bulk operations across content banks.',
//       status: 'coming-soon',
//       gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
//     }, 
//     {
//   id: 'specq',
//   icon: '⚗️',
//   title: 'specQ',
//   description: 'Automated QC pipeline — AI-powered question quality analysis and batch validation.',
//   path: 'https://qc-automation-frontend.onrender.com/',
//   status: 'active',
//   gradient: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
//   external: true,
//   highlight: true,
// },
//   ];

// const handleCardClick = (tool) => {
//   if (tool.status === 'coming-soon') return;
//   if (tool.external && tool.path) {
//     window.open(tool.path, '_blank');
//     return;
//   }
//   if (tool.path) navigate(tool.path);
// };

//   const activeTools = tools.filter(t => t.status === 'active').length;
//   const availableTools = tools.filter(t => t.status !== 'coming-soon').length;
//   const comingSoonTools = tools.filter(t => t.status === 'coming-soon').length;

//   return (
//     <div className="dashboard">
//       {/* Animated Background */}
//       <div className="dashboard-bg">
//         <div className="gradient-orb orb-1"></div>
//         <div className="gradient-orb orb-2"></div>
//         <div className="gradient-orb orb-3"></div>
//       </div>

//       {/* Hero Section - Compact */}
//       <div className="dashboard-hero">
//         <div className="hero-content">
//           <div className="hero-badge">
//             <span className="badge-pulse"></span>
//             <span>CubeInTouch Internal Tools</span>
//           </div>
          
//           <h1 className="hero-title">
//             <span className="hero-emoji">👋</span>
//             <span className="title-text">Start With
//               <span className="title-highlight"> Cube - Power</span>
//             </span>
//           </h1>
          
//           <p className="hero-subtitle">
//             Your unified platform for course and content management
//           </p>
          
//           {!isAuthenticated && (
//             <div className="hero-alert">
//               <div className="alert-icon">💡</div>
//               <div className="alert-content">
//                 <div className="alert-title">Setup Required</div>
//                 <div className="alert-text">Some tools need API token configuration</div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Quick Stats - Compact */}
//       <div className="quick-stats-container">
//         <div className="quick-stats">
//           <div className="stat-card stat-card-1">
//             <div className="stat-icon-wrapper">
//               <div className="stat-icon">🛠️</div>
//             </div>
//             <div className="stat-content">
//               <div className="stat-value">{activeTools}</div>
//               <div className="stat-label">Active Tools</div>
//             </div>
//           </div>

//           <div className="stat-card stat-card-2">
//             <div className="stat-icon-wrapper">
//               <div className="stat-icon">🚀</div>
//             </div>
//             <div className="stat-content">
//               <div className="stat-value">{availableTools}</div>
//               <div className="stat-label">Available Now</div>
//             </div>
//           </div>

//           <div className="stat-card stat-card-3">
//             <div className="stat-icon-wrapper">
//               <div className="stat-icon">⏳</div>
//             </div>
//             <div className="stat-content">
//               <div className="stat-value">{comingSoonTools}</div>
//               <div className="stat-label">Coming Soon</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Tools Section - Compact */}
//       <div className="tools-section">
//         <div className="section-header">
//           <h2 className="section-title">
//             <span className="title-line"></span>
//             Available Tools
//             <span className="title-count">{availableTools}</span>
//           </h2>
//         </div>

//         <div className="tools-grid">
//           {tools.map((tool, index) => (
//             <div
//               key={tool.id}
//               className={`tool-card ${tool.status === 'coming-soon' ? 'coming-soon' : ''} ${tool.status === 'active' ? 'active' : ''} ${tool.highlight ? 'highlight' : ''}`}
//               onClick={() => handleCardClick(tool)}
//               style={{ 
//                 '--card-gradient': tool.gradient,
//                 '--animation-delay': `${index * 0.1}s`
//               }}
//             >
//               <div className="tool-card-inner">
//                 <div className="tool-gradient-border"></div>
//                 <div className="tool-gradient-bg"></div>
                
//                 <div className="tool-content">
//                   <div className="tool-header">
//                     <div className="tool-icon-wrapper">
//                       <div className="tool-icon">{tool.icon}</div>
//                       <div className="tool-icon-glow"></div>
//                     </div>
                    
//                     {tool.status === 'coming-soon' && (
//                       <span className="tool-badge badge-coming">
//                         <span className="badge-clock">⏰</span>
//                         Soon
//                       </span>
//                     )}
//                   </div>

//                   <h3 className="tool-title">{tool.title}</h3>
//                   <p className="tool-description">{tool.description}</p>
                  
//                   {tool.status !== 'coming-soon' && (
//                     <div className="tool-footer">
//                       <div className="tool-status">
//                         {tool.status === 'active' ? (
//                           <>
//                             <span className="status-dot status-active">
//                               <span className="dot-pulse"></span>
//                             </span>
//                             <span className="status-text">Ready</span>
//                           </>
//                         ) : (
//                           <>
//                             <span className="status-dot status-inactive"></span>
//                             <span className="status-text">Setup</span>
//                           </>
//                         )}
//                       </div>
                      
//                       <div className="tool-action">
//                         <span className="action-text">Launch</span>
//                         <div className="action-arrow">
//                           <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
//                             <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//                           </svg>
//                         </div>
//                       </div>
//                     </div>
//                   )}
                  
//                   {tool.status === 'coming-soon' && (
//                     <div className="tool-footer coming-soon-footer">
//                       <div className="coming-soon-text">
//                         <span className="coming-icon">🚧</span>
//                         <span>In Development</span>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 <div className="tool-shine"></div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Footer Info - Compact */}
//       <div className="dashboard-footer">
//         <div className="footer-content">
//           <div className="footer-logo">
//             <span className="logo-icon">🎯</span>
//             <span className="logo-text">CubeInTouch Support Hub</span>
//           </div>
//           <div className="footer-info">
//             <span>v27.0.1</span>
//             <span className="footer-divider">•</span>
//             <span>Built for Excellence</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("examly_token");
  const isAuthenticated = !!token;
  const bentoRef = useRef(null);

  const tools = [
    {
      id: 'finder',
      icon: '📚',
      title: 'PB & CB Finder',
      description: 'Search and manage courses, projects, and content banks across your domain.',
      path: '/finder',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      span: 1,
    },
    {
      id: 'mcq-qc',
      icon: '🔍',
      title: 'MCQ QC',
      description: 'Quality check and validate MCQ questions for accuracy and consistency.',
      path: '/mcq-qc',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      span: 1,
    },
    {
      id: 'course-qb',
      icon: '🎓',
      title: 'QB Space',
      description: 'Find and analyze question banks linked to courses and tests.',
      path: '/course-qb',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      span: 1,
    },
    {
      id: 'qb-access',
      icon: '🔄',
      title: 'QB Access',
      description: 'Clone and move question banks between departments with ease.',
      path: '/qb-access',
      status: 'active',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      span: 1,
    },
    {
      id: 'result-x',
      icon: '⚡',
      title: 'Result X',
      description: 'AI-powered result analysis — weekly assessments & milestone code review.',
      path: '/result-x',
      status: 'active',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #f59e0b 100%)',
      span: 2,
    },
    {
      id: 'meta-thinkly',
      icon: '📝',
      title: 'Meta Thinkly-X',
      description: 'Edit question bank metadata.',
      path: '/meta-thinkly',
      status: 'active',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      span: 1,
    },
    {
      id: 'mcq-uploader',
      icon: '📤',
      title: 'MCQ Sync',
      description: 'Bulk upload MCQ questions from Excel/CSV files to question banks.',
      path: '/mcq-uploader',
      status: isAuthenticated ? 'active' : 'inactive',
      gradient: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
      span: 1,
    },
    {
      id: 'cod-sync',
      icon: '📤',
      title: 'COD Sync',
      description: 'Bulk upload Compiler / Coding questions from JSON files to question banks.',
      path: '/cod-sync',
      status: 'active',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      span: 1,
    },
    {
      id: 'codelens',
      icon: '🔭',
      title: 'CodeLens',
      description: 'Compiler mode code QC automation — AI-powered code quality analysis & test case validation.',
      path: '/codelens',
      status: 'active',
      gradient: 'linear-gradient(135deg, #0080ff 0%, #7c3aed 100%)',
      span: 2,
    },
    {
      id: 'scaffa',
      icon: '🏗️',
      title: 'Scaffa',
      description: 'Scaffold & structure manager — organise components, routes, and services in one place.',
      path: '/scaffa',
      status: 'active',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      span: 1,
    },
     {
      id: 'packager',
      icon: '📦',
      title: 'Packager',
      description: 'Upload a test folder zip, select a tech stack — get a packaged self-extracting artifact ready to ship.',
      path: '/packager',
      status: 'active',
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      span: 1,
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Reports',
      description: 'Generate detailed reports about course usage and content distribution.',
      status: 'coming-soon',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      span: 1,
    },
    {
      id: 'automations',
      icon: '⚙️',
      title: 'Automations',
      description: 'Automate repetitive tasks and bulk operations across content banks.',
      status: 'coming-soon',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      span: 1,
    },
  ];

  const handleCardClick = (tool) => {
    if (tool.status === 'coming-soon') return;
    if (tool.path) navigate(tool.path);
  };

  const activeTools = tools.filter(t => t.status === 'active').length + 1; // +1 for specQ
  const availableTools = tools.filter(t => t.status !== 'coming-soon').length + 1;
  const comingSoonTools = tools.filter(t => t.status === 'coming-soon').length;

  useEffect(() => {
    const cards = document.querySelectorAll('.bento-card');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, idx * 60);
          }
        });
      },
      { threshold: 0.08 }
    );
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const animateCounter = (el, target) => {
      if (!el) return;
      let current = 0;
      const step = Math.ceil(target / 20);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          el.textContent = target;
          clearInterval(timer);
        } else {
          el.textContent = current;
        }
      }, 40);
    };
    animateCounter(document.getElementById('stat-active'), activeTools);
    animateCounter(document.getElementById('stat-available'), availableTools);
    animateCounter(document.getElementById('stat-soon'), comingSoonTools);
  }, []);

  return (
    <div className="db-root">

      {/* Ambient orbs */}
      <div className="db-ambient">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Hero */}
      <div className="db-hero">
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-badge">
              <span className="db-badge-dot"></span>
              CubeInTouch Internal Tools
            </div>
            <h1 className="db-hero-title">
              Start With<br />
              <span className="db-hero-accent">Cube - Power</span>
            </h1>
            <p className="db-hero-sub">
              Your unified platform for course and content management
            </p>
            {!isAuthenticated && (
              <div className="db-alert">
                <span className="db-alert-icon">💡</span>
                <div>
                  <div className="db-alert-title">Setup Required</div>
                  <div className="db-alert-text">Some tools need API token configuration</div>
                </div>
              </div>
            )}
          </div>

          <div className="db-stats">
            <div className="db-stat">
              <div className="db-stat-n" id="stat-active">0</div>
              <div className="db-stat-l">Active</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-n" id="stat-available">0</div>
              <div className="db-stat-l">Available</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-n" id="stat-soon">0</div>
              <div className="db-stat-l">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="db-main">

        {/* specQ Featured Banner */}
        <div className="db-section-label">Featured</div>
        <a
          href="https://qc-automation-frontend.onrender.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="specq-banner"
        >
          <div className="specq-glow"></div>
          <div className="specq-left">
            <span className="specq-icon">{"⚗️"}</span>
            <div className="specq-info">
              <div className="specq-title">
                specQ
                <span className="specq-new-tag">New</span>
              </div>
              <div className="specq-desc">
                Automated QC pipeline — AI-powered question quality analysis and Question validation engine.
              </div>
            </div>
          </div>
          <div className="specq-cta">
            Open specQ
            <span className="specq-arrow">{"↗"}</span>
          </div>
        </a>

        {/* Bento Grid */}
        <div className="db-section-label" style={{ marginTop: '40px' }}>All Tools</div>
        <div className="bento-grid" ref={bentoRef}>
          {tools.map((tool, index) => (
            <div
              key={tool.id}
              className={`bento-card ${tool.status === 'coming-soon' ? 'bento-card--soon' : ''} ${tool.status === 'active' ? 'bento-card--active' : ''} ${tool.span === 2 ? 'bento-card--span2' : ''}`}
              style={{
                '--card-gradient': tool.gradient,
                '--anim-delay': `${index * 0.06}s`,
              }}
              onClick={() => handleCardClick(tool)}
            >
              <div className="bento-card-topbar"></div>

              <div className="bento-card-body">
                <div className="bento-card-head">
                  <span className="bento-icon">{tool.icon}</span>
                  {tool.status === 'coming-soon' && (
                    <span className="bento-chip bento-chip--soon">Soon</span>
                  )}
                </div>

                <h3 className="bento-title">{tool.title}</h3>
                <p className="bento-desc">{tool.description}</p>

                {tool.status !== 'coming-soon' && (
                  <div className="bento-footer">
                    <div className="bento-status">
                      <span className={`bento-dot ${tool.status === 'active' ? 'bento-dot--active' : 'bento-dot--setup'}`}></span>
                      <span className="bento-status-text">
                        {tool.status === 'active' ? 'Ready' : 'Setup required'}
                      </span>
                    </div>
                    <div className="bento-launch">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )}

                {tool.status === 'coming-soon' && (
                  <div className="bento-footer bento-footer--soon">
                    <span>🚧 In development</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="db-footer">
        <span className="db-footer-logo">🎯 CubeInTouch Support Hub</span>
        <span className="db-footer-meta">v40.5.1.2 · Built for Excellence</span>
      </div>
    </div>
  );
}