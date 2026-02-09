

import { useState } from "react";
import QBAccessCorporate from "./QBAccessCorporate";
import QBAccessUniversity from "./QBAccessUniversity";
import "./QBAccess.css";

export default function QBAccess() {
  const [selectedOrg, setSelectedOrg] = useState(null);

  const organizations = [
    {
      id: "corporate",
      name: "Stark - Corporate",
      description: "Corporate QB Management System",
      icon: "🏢",
      component: QBAccessCorporate
    },
    {
      id: "university",
      name: "Stark University",
      description: "University QB Management System",
      icon: "🎓",
      component: QBAccessUniversity
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
    <div className="qb-access-container">
      <div className="qb-org-selection">
        <div className="qb-org-header">
          <h1 className="qb-org-title">🛠️ QB Access Tool</h1>
          <p className="qb-org-subtitle">Select your organization to continue</p>
        </div>

        <div className="qb-org-grid">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="qb-org-card"
              onClick={() => handleOrgSelect(org.id)}
            >
              <div className="qb-org-icon">{org.icon}</div>
              <h3 className="qb-org-name">{org.name}</h3>
              <p className="qb-org-description">{org.description}</p>
              <button className="qb-org-button">
                Select →
              </button>
            </div>
          ))}
        </div>

        <div className="qb-org-footer">
          <p className="qb-org-hint">
            💡 Select the organization that matches your access requirements
          </p>
        </div>
      </div>
    </div>
  );
}