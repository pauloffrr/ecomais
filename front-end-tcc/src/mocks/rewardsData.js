export const rewardsUser = {
  id: 'user-001',
  name: 'Alex Rivers',
  avatarInitials: 'AR',
  pointsBalance: 2450,
};

export const rewardCategories = [
  { id: 'all', label: 'Todas Recompensas' },
  { id: 'food', label: 'Alimentacao' },
  { id: 'transport', label: 'Transporte' },
  { id: 'shopping', label: 'Compras' },
  { id: 'sustainability', label: 'Sustentabilidade' },
  { id: 'experiences', label: 'Experiencias' },
];

export const featuredRewards = [
  {
    id: 'monthly-transit-pass',
    partner: 'Transporte Publico',
    category: 'transport',
    title: 'Passe Livre Mensal',
    description: 'Troque seus pontos por 30 dias de transporte urbano.',
    points: 1200,
    actionLabel: 'Resgatar recompensa',
    visual: 'bus',
  },
  {
    id: 'plant-ten-trees',
    partner: 'Meta Sustentavel',
    category: 'sustainability',
    title: 'Plantar 10 Arvores',
    description: 'Contribuicao direta para projeto de reflorestamento nacional.',
    points: 450,
    actionLabel: 'Resgatar',
    visual: 'trees',
  },
  {
    id: 'free-coffee',
    partner: 'Parceiro Cafe',
    category: 'food',
    title: 'Cafe Gratis',
    description: 'Ganhe 1 cafe expresso em cafeterias parceiras.',
    points: 150,
    actionLabel: 'Resgatar',
    visual: 'coffee',
  },
];
