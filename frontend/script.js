const fs = require('fs'); 
let content = fs.readFileSync('./src/pages/projects/ProjectTaskBoard.jsx', 'utf8'); 

content = content.replace(/dark:text-blue-\d+/g, 'dark:text-[#3b82f6]'); 
content = content.replace(/dark:hover:text-blue-\d+/g, 'dark:hover:text-[#3b82f6]'); 
content = content.replace(/dark:bg-blue-\d+(\/\d+)?/g, (match) => { 
  if (match.includes('/')) return 'dark:bg-[#3b82f6]/20'; 
  return 'dark:bg-[#3b82f6]'; 
}); 
content = content.replace(/dark:hover:bg-blue-\d+(\/\d+)?/g, (match) => { 
  if (match.includes('/')) return 'dark:hover:bg-[#3b82f6]/30'; 
  return 'dark:hover:bg-[#3b82f6]'; 
}); 
content = content.replace(/dark:border-blue-\d+(\/\d+)?/g, (match) => { 
  if (match.includes('/')) return 'dark:border-[#3b82f6]/50'; 
  return 'dark:border-[#3b82f6]'; 
}); 
content = content.replace(/dark:ring-blue-\d+(\/\d+)?/g, 'dark:ring-[#3b82f6]'); 

// Refine basic dark mode layout colors to ultra-premium
content = content.replace(/dark:bg-slate-900/g, 'dark:bg-[#111111]'); 
content = content.replace(/dark:bg-slate-950/g, 'dark:bg-[#0a0a0a]'); 
content = content.replace(/dark:bg-slate-800/g, 'dark:bg-[#1a1a1a]'); 
content = content.replace(/dark:border-slate-800/g, 'dark:border-white\/5'); 
content = content.replace(/dark:border-slate-700/g, 'dark:border-white\/10'); 

fs.writeFileSync('./src/pages/projects/ProjectTaskBoard.jsx', content);
