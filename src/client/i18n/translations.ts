export type Language = 'en' | 'hi' | 'hi_ro';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  login: string;
  staffLogin: string;
  adminLogin: string;
  mobileNumber: string;
  pin: string;
  username: string;
  password: string;
  signIn: string;
  signOut: string;
  forgotPin: string;
  setNewPin: string;
  tempPinNotice: string;
  navHome: string;
  navScore: string;
  navSystems: string;
  navManage: string;
  navOverview: string;
  pendingTasks: string;
  noPendingTasks: string;
  allDoneToday: string;
  important: string;
  late: string;
  dueBy: string;
  workDone: string;
  workOnTime: string;
  notDoneList: string;
  flaggedFalseNotice: string;
  askForHelp: string;
  helpSlipTitle: string;
  recordVoiceNote: string;
  stopRecording: string;
  typeYourQuery: string;
  submitHelpSlip: string;
  understood: string;
  answered: string;
  waitingAnswer: string;
  delegatedWork: string;
  delegateNewTask: string;
  sendOnWhatsApp: string;
  callNow: string;
  delayDashboard: string;
  randomAudit: string;
  verified: string;
  markFalse: string;
  teamScores: string;
  exportExcel: string;
  deletedRepository: string;
  systemHealth: string;
  videoBacklog: string;
  missingVideo: string;
  watchVideo: string;
  markDone: string;
  enterDetails: string;
  step: string;
  of: string;
  submit: string;
  cancel: string;
  settleOrder: string;
  overrideMissed: string;
  resetPinBtn: string;
  tempPinGenerated: string;
  quickStaffDemo: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: 'Ketan Aditya Ops',
    tagline: 'Internal Operations & Autopilot System',
    login: 'Login',
    staffLogin: 'Staff Login (Mobile + PIN)',
    adminLogin: 'Admin / Owner Login',
    mobileNumber: 'Mobile Number',
    pin: '4-Digit PIN',
    username: 'Email / Username',
    password: 'Password',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    forgotPin: 'Forgot PIN? Ask Manager',
    setNewPin: 'Set New Permanent PIN',
    tempPinNotice: 'You logged in with a temporary PIN. Please choose a new 4-digit PIN.',
    navHome: 'Home',
    navScore: 'Score',
    navSystems: 'Systems',
    navManage: 'Manage',
    navOverview: 'Overview',
    pendingTasks: 'My Work Today',
    noPendingTasks: 'All caught up! No pending work.',
    allDoneToday: 'Great job! All tasks completed on time.',
    important: 'IMPORTANT (3x)',
    late: 'LATE',
    dueBy: 'Due by',
    workDone: 'Work Done',
    workOnTime: 'Work On Time',
    notDoneList: 'Work Not Finished / Late',
    flaggedFalseNotice: 'Marked done but not actually done — checked by',
    askForHelp: 'Ask for Help',
    helpSlipTitle: 'Help Slip',
    recordVoiceNote: 'Record Voice Note',
    stopRecording: 'Stop Recording',
    typeYourQuery: 'Or type your question here...',
    submitHelpSlip: 'Send Help Slip',
    understood: 'I Understood',
    answered: 'Answer Ready',
    waitingAnswer: 'Waiting for Manager Reply',
    delegatedWork: 'Delegated Work',
    delegateNewTask: 'Assign One-Off Work',
    sendOnWhatsApp: 'Send on WhatsApp',
    callNow: 'Call Staff',
    delayDashboard: 'Delay Dashboard (All Late Tasks)',
    randomAudit: 'Daily Random Audit (10 Samples)',
    verified: 'Verified OK',
    markFalse: 'Flag False',
    teamScores: 'Company Team Scores',
    exportExcel: 'Download Report (Excel / CSV)',
    deletedRepository: 'Deleted Records Repository',
    systemHealth: 'System Health & Backups',
    videoBacklog: 'Training Video Backlog',
    missingVideo: 'No Training Video',
    watchVideo: 'Watch Training Video',
    markDone: 'Mark Done',
    enterDetails: 'Enter Details',
    step: 'Step',
    of: 'of',
    submit: 'Submit & Continue',
    cancel: 'Cancel',
    settleOrder: 'Settle & Close Order',
    overrideMissed: 'Admin Override (Mark Done)',
    resetPinBtn: 'Reset PIN',
    tempPinGenerated: 'Temporary 4-Digit PIN:',
    quickStaffDemo: 'Quick Demo Profiles:',
  },
  hi: {
    appName: 'केतन आदित्य ऑप्स',
    tagline: 'आंतरिक संचालन एवं ऑटोपायलट प्रणाली',
    login: 'लॉग इन',
    staffLogin: 'स्टाफ लॉग इन (मोबाइल + पिन)',
    adminLogin: 'एडमिन / ओनर लॉग इन',
    mobileNumber: 'मोबाइल नंबर',
    pin: '4-अंकों का पिन',
    username: 'ईमेल / यूजरनेम',
    password: 'पासवर्ड',
    signIn: 'प्रवेश करें',
    signOut: 'लॉग आउट',
    forgotPin: 'पिन भूल गए? मैनेजर से संपर्क करें',
    setNewPin: 'नया स्थायी पिन सेट करें',
    tempPinNotice: 'आपने अस्थायी पिन से लॉग इन किया है। कृपया नया 4-अंकों का पिन सेट करें।',
    navHome: 'होम',
    navScore: 'स्कोर',
    navSystems: 'सिस्टम',
    navManage: 'प्रबंधन',
    navOverview: 'अवलोकन',
    pendingTasks: 'आज का मेरा काम',
    noPendingTasks: 'सब काम पूरा! कोई लंबित कार्य नहीं।',
    allDoneToday: 'बहुत बढ़िया! सभी कार्य समय पर पूर्ण।',
    important: 'महत्वपूर्ण (3x)',
    late: 'देरी (LATE)',
    dueBy: 'अंतिम समय',
    workDone: 'काम पूरा (Work Done)',
    workOnTime: 'समय पर पूरा (On Time)',
    notDoneList: 'अपूर्ण या देरी से हुआ कार्य',
    flaggedFalseNotice: 'डन किया गया लेकिन वास्तव में नहीं हुआ — जांचकर्ता',
    askForHelp: 'मदद मांगें (Help Slip)',
    helpSlipTitle: 'हेल्प स्लिप',
    recordVoiceNote: 'आवाज रिकॉर्ड करें',
    stopRecording: 'रिकॉर्डिंग रोकें',
    typeYourQuery: 'या यहाँ अपना सवाल लिखें...',
    submitHelpSlip: 'हेल्प स्लिप भेजें',
    understood: 'समझ गया (I Understood)',
    answered: 'उत्तर तैयार है',
    waitingAnswer: 'मैनेजर के उत्तर की प्रतीक्षा',
    delegatedWork: 'सौंपा गया कार्य (Delegation)',
    delegateNewTask: 'नया कार्य सौंपें',
    sendOnWhatsApp: 'व्हाट्सएप पर भेजें',
    callNow: 'कॉल करें',
    delayDashboard: 'देरी डैशबोर्ड (सभी लेट काम)',
    randomAudit: 'दैनिक रैंडम ऑडिट (10 सैंपल)',
    verified: 'सत्यापित (OK)',
    markFalse: 'गलत मार्क करें (False)',
    teamScores: 'पूरी टीम का स्कोर',
    exportExcel: 'रिपोर्ट डाउनलोड करें (Excel / CSV)',
    deletedRepository: 'हटाए गए रिकॉर्ड्स रिपॉजिटरी',
    systemHealth: 'सिस्टम स्वास्थ्य एवं बैकअप',
    videoBacklog: 'ट्रेनिंग वीडियो बैकलॉग',
    missingVideo: 'वीडियो उपलब्ध नहीं',
    watchVideo: 'ट्रेनिंग वीडियो देखें',
    markDone: 'डन (हो गया)',
    enterDetails: 'विवरण भरें',
    step: 'कदम',
    of: 'का',
    submit: 'जमा करें और आगे बढ़ें',
    cancel: 'रद्द करें',
    settleOrder: 'ऑर्डर सेटल व बंद करें',
    overrideMissed: 'एडमिन ओवरराइड (डन मार्क करें)',
    resetPinBtn: 'पिन रीसेट करें',
    tempPinGenerated: 'अस्थायी 4-अंकों का पिन:',
    quickStaffDemo: 'त्वरित डेमो प्रोफाइल्स:',
  },
  hi_ro: {
    appName: 'Ketan Aditya Ops',
    tagline: 'Internal Operations & Autopilot System',
    login: 'Login',
    staffLogin: 'Staff Login (Mobile + PIN)',
    adminLogin: 'Admin / Owner Login',
    mobileNumber: 'Mobile Number',
    pin: '4-Digit PIN',
    username: 'Email / Username',
    password: 'Password',
    signIn: 'Sign In Karein',
    signOut: 'Log Out',
    forgotPin: 'PIN bhool gaye? Manager se poochein',
    setNewPin: 'Naya permanent PIN set karein',
    tempPinNotice: 'Aapne temporary PIN se login kiya hai. Kripya naya 4-digit PIN banayein.',
    navHome: 'Home',
    navScore: 'Score',
    navSystems: 'Systems',
    navManage: 'Manage',
    navOverview: 'Overview',
    pendingTasks: 'Aaj Ka Mera Kaam',
    noPendingTasks: 'Sab complete hai! Koi pending kaam nahi.',
    allDoneToday: 'Bahut badhiya! Sabhi kaam time par ho gaye.',
    important: 'IMPORTANT (3x)',
    late: 'LATE (Late)',
    dueBy: 'Due time',
    workDone: 'Work Done',
    workOnTime: 'Work On Time',
    notDoneList: 'Jo kaam nahi hua ya late hua',
    flaggedFalseNotice: 'Done mark kiya par sach me nahi hua — check kiya',
    askForHelp: 'Help Maangein (Help Slip)',
    helpSlipTitle: 'Help Slip',
    recordVoiceNote: 'Voice Note Record Karein',
    stopRecording: 'Recording Rokein',
    typeYourQuery: 'Ya yahan apna sawal likhein...',
    submitHelpSlip: 'Help Slip Bhejein',
    understood: 'Samajh Gaya (I Understood)',
    answered: 'Answer Ready Hai',
    waitingAnswer: 'Manager ke reply ka wait hai',
    delegatedWork: 'Delegated Work',
    delegateNewTask: 'Naya kaam assign karein',
    sendOnWhatsApp: 'WhatsApp par bhejein',
    callNow: 'Call Karein',
    delayDashboard: 'Delay Dashboard (Sabhi Late Kaam)',
    randomAudit: 'Daily Random Audit (10 Samples)',
    verified: 'Verified OK',
    markFalse: 'False Mark Karein',
    teamScores: 'Company Team Scores',
    exportExcel: 'Report Download Karein (Excel / CSV)',
    deletedRepository: 'Deleted Records Repository',
    systemHealth: 'System Health & Backups',
    videoBacklog: 'Training Video Backlog',
    missingVideo: 'Training video nahi hai',
    watchVideo: 'Training Video Dekhein',
    markDone: 'Done Karein',
    enterDetails: 'Details Bharein',
    step: 'Step',
    of: 'ka',
    submit: 'Submit & Next',
    cancel: 'Cancel',
    settleOrder: 'Order Settle & Close Karein',
    overrideMissed: 'Admin Override (Done Karein)',
    resetPinBtn: 'PIN Reset Karein',
    tempPinGenerated: 'Temporary 4-Digit PIN:',
    quickStaffDemo: 'Quick Demo Profiles:',
  },
};
