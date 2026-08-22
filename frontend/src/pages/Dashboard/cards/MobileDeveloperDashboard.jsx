import React from 'react';
import GraphicDesignerDashboard from './GraphicDesignerDashboard';

const MobileDeveloperDashboard = ({ targetDept = "Mobile Developer" }) => {
  return <GraphicDesignerDashboard targetDept={targetDept} />;
};

export default MobileDeveloperDashboard;
