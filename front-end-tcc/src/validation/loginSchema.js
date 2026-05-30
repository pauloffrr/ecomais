import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup.string().trim().email('Digite um e-mail valido.').required('O e-mail e obrigatorio.'),
  password: yup
    .string()
    .min(6, 'A senha deve ter no minimo 6 caracteres.')
    .required('A senha e obrigatoria.'),
});
