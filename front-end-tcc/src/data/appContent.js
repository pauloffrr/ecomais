export const appInformation = {
  version: 'Eco+ v1.0.0',
  buildNumber: '2026.06.10',
  developer: 'Eco+ Team',
  techStack: ['React Native', 'Expo', 'FastAPI', 'MariaDB'],
  legal: ['Termos de Uso', 'Politica de Privacidade', 'Licencas de Codigo Aberto'],
  about:
    'Eco+ e um ecossistema de reciclagem que recompensa descartes responsaveis e o impacto ambiental positivo.',
};

export const supportData = {
  faq: [
    {
      id: 'scan-qr',
      question: 'Como escanear o QR da maquina?',
      answer:
        'Abra a aba Scanner, aponte a camera para o QR code da maquina e aguarde o inicio da sessao.',
    },
    {
      id: 'points',
      question: 'Como os pontos funcionam?',
      answer:
        'Os pontos sao calculados a partir dos materiais reciclaveis validados e sincronizados com sua conta.',
    },
    {
      id: 'redeem',
      question: 'Como resgatar recompensas?',
      answer:
        'Acesse a area de recompensas, escolha um beneficio disponivel e confirme o resgate.',
    },
  ],
  contacts: [
    {
      id: 'email',
      title: 'Suporte por email',
      value: 'support@ecomais.com',
      type: 'email',
    },
    {
      id: 'chat',
      title: 'Chat',
      value: 'Disponivel 24/7',
      type: 'chat',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      value: '+55 (11) 99999-9999',
      type: 'phone',
    },
  ],
  systemStatus: {
    label: 'Status do sistema',
    value: 'Operacional',
    online: true,
  },
};
