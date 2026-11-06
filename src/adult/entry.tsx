import React from'react';
import{createRoot}from'react-dom/client';
import AdultAccount from'./AdultAccount';
import{AppErrorBoundary,SafeModeNotice}from'../AppRecovery';
import{BrandIconSprite}from'../BrandIcon';
import{SAFE_MODE}from'../recovery-mode';
import'../styles.css';
document.documentElement.dataset.safeMode=String(SAFE_MODE);
createRoot(document.getElementById('root')!).render(<React.StrictMode><SafeModeNotice/><AppErrorBoundary><BrandIconSprite/><AdultAccount/></AppErrorBoundary></React.StrictMode>);
