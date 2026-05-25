export const profileData = {
  user: {
    id: 'user-001',
    name: 'Alex Rivers',
    email: 'alex.rivers@ecotech.app',
    avatarInitials: 'AR',
    badge: 'ECO HERO 🌍',
    totalPoints: 12450,
    currentLevel: 14,
    nextLevel: 15,
    nextLevelPoints: 550,
    progressPercentage: 82,
    verified: true,
  },
  recentHistory: [
    {
      id: 'plastic-bottles',
      material: 'Plastic Bottles',
      date: 'October 24, 2023',
      weight: '2.4kg',
      points: 450,
      type: 'plastic',
    },
    {
      id: 'paper-cardboard',
      material: 'Paper & Cardboard',
      date: 'October 21, 2023',
      weight: '5.1kg',
      points: 820,
      type: 'paper',
    },
  ],
  tabs: [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'scanner', label: 'Scanner', icon: 'scan' },
    { key: 'history', label: 'Stats', icon: 'bar-chart' },
    { key: 'rewards', label: 'Rewards', icon: 'gift' },
    { key: 'profile', label: 'Profile', icon: 'user' },
  ],
};

export const appInformation = {
  version: 'Eco-Tech v1.0.0',
  buildNumber: '2026.01.15',
  developer: 'Eco-Tech Team',
  techStack: ['React Native', 'Expo', 'Node.js', 'PostgreSQL'],
  legal: ['Terms of Service', 'Privacy Policy', 'Open Source Licenses'],
  about:
    'Eco-Tech is a sustainable recycling ecosystem that rewards users for responsible disposal and environmental impact.',
};

export const supportData = {
  faq: [
    {
      id: 'scan-qr',
      question: 'How do I scan a machine QR?',
      answer:
        'Open the scanner tab, point the camera at the recycling machine QR code, and wait for the session to start.',
    },
    {
      id: 'points',
      question: 'How do points work?',
      answer:
        'Points are calculated from validated recyclable materials. The future API will sync your balance in real time.',
    },
    {
      id: 'redeem',
      question: 'How can I redeem rewards?',
      answer:
        'Rewards will be available from the gamification area after your points are synchronized with the backend.',
    },
  ],
  contacts: [
    {
      id: 'email',
      title: 'Email Support',
      value: 'support@ecotech.app',
      type: 'email',
    },
    {
      id: 'chat',
      title: 'Live Chat',
      value: 'Available 24/7',
      type: 'chat',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      value: '+55 (11) 99999-9999',
      type: 'phone',
    },
  ],
  systemStatus: {
    label: 'System Status',
    value: 'Operational',
    online: true,
  },
};
