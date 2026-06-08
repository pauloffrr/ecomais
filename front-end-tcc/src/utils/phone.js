export const onlyPhoneDigits = (value = '') => value.replace(/\D/g, '').slice(0, 11);

export const formatPhone = (value) => {
  const digits = onlyPhoneDigits(value);

  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) return `(${areaCode}) ${number}`;

  const prefixLength = digits.length === 11 ? 5 : 4;
  return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
};
