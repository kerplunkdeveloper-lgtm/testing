import React from 'react';
import GraphicDesignerDashboard from './GraphicDesignerDashboard';

const SocialMediaManagerDashboard = ({ targetDept = "Social Media Manager" }) => {
  return <GraphicDesignerDashboard targetDept={targetDept} />;
};

export default SocialMediaManagerDashboard;
