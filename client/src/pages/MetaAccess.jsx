import { useState } from "react";
import MetaCorporate from "./MetaCorporate";
import MetaUniversity from "./MetaUniversity";
import "./MetaAccess.css";

export default function MetaAccess() {
  const [selectedOrg, setSelectedOrg] = useState(null);

  const organizations = [
    {
      id: "corporate",
      name: "Meta Corporate",
      description: "Corporate Metadata Classification System",
      icon: "🏢",
      component: MetaCorporate
    },
    {
      id: "university",
      name: "Meta University",
      description: "University Metadata Classification System",
      icon: "🎓",
      component: MetaUniversity
    }
  ];

  const handleOrgSelect = (orgId) => {
    setSelectedOrg(orgId);
  };

  const handleBackToSelection = () => {
    setSelectedOrg(null);
  };

  // If organization is selected, render the corresponding component
  if (selectedOrg) {
    const org = organizations.find(o => o.id === selectedOrg);
    const OrgComponent = org.component;
    return <OrgComponent onBack={handleBackToSelection} />;
  }

  // Organization Selection Screen
  return (
    <div className="meta-access-container">
      <div className="meta-org-selection">
        <div className="meta-org-header">
          <h1 className="meta-org-title">🤖 Meta Thinkly-X</h1>
          <p className="meta-org-subtitle">Select your organization to continue</p>
        </div>

        <div className="meta-org-grid">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="meta-org-card"
              onClick={() => handleOrgSelect(org.id)}
            >
              <div className="meta-org-icon">{org.icon}</div>
              <h3 className="meta-org-name">{org.name}</h3>
              <p className="meta-org-description">{org.description}</p>
              <button className="meta-org-button">
                Select →
              </button>
            </div>
          ))}
        </div>

        <div className="meta-org-footer">
          <p className="meta-org-hint">
            💡 Select the organization that matches your metadata requirements
          </p>
        </div>
      </div>
    </div>
  );
}