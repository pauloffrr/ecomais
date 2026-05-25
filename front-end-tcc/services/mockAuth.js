const users = [
  {
    id: 'user-eco-demo',
    name: 'Usuário Eco-Tech',
    email: 'demo@eco.com',
    phone: '(11) 99999-0000',
    password: '123456',
  },
];

let currentUser = null;

export function registerMockUser(userData) {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const existingIndex = users.findIndex((user) => user.email === normalizedEmail);
  const user = {
    id: existingIndex >= 0 ? users[existingIndex].id : `user-${Date.now()}`,
    name: userData.name.trim(),
    email: normalizedEmail,
    phone: userData.phone.trim(),
    password: userData.password,
  };

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  currentUser = user;
  return user;
}

export function loginWithEmail(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(
    (storedUser) => storedUser.email === normalizedEmail && storedUser.password === password
  );

  if (!user) return null;

  currentUser = user;
  return user;
}

export function loginWithGoogleMock() {
  currentUser = {
    id: 'google-user',
    name: 'Usuário Google',
    email: 'google@eco.com',
    phone: '',
    password: '',
  };

  return currentUser;
}

export function getCurrentUser() {
  return currentUser;
}

export function logoutMockUser() {
  currentUser = null;
}
