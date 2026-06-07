export const isAdminUser = (user) => {
  const role = String(user?.role ?? user?.user_type ?? '').toLowerCase();
  return user?.is_admin === true || role === 'admin';
};
