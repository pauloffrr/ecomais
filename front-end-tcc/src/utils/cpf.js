export const onlyCpfDigits = (value = '') => value.replace(/\D/g, '').slice(0, 11);

export const formatCpf = (value) => {
  const digits = onlyCpfDigits(value);

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};
