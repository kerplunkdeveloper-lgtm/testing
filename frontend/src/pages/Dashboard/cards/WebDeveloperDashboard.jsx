import React from 'react';
import GraphicDesignerDashboard from './GraphicDesignerDashboard';

const WebDeveloperDashboard = ({ targetDept = "Web Developer" }) => {
  return <GraphicDesignerDashboard targetDept={targetDept} />;
};

export default WebDeveloperDashboard;
