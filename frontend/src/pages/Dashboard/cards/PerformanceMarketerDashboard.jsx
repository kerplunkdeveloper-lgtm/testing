import React from 'react';
import GraphicDesignerDashboard from './GraphicDesignerDashboard';

const PerformanceMarketerDashboard = ({ targetDept = "Performance Marketer" }) => {
  return <GraphicDesignerDashboard targetDept={targetDept} />;
};

export default PerformanceMarketerDashboard;
