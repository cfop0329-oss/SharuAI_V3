import prisma from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/token.js";

export async function findUserByBin(bin_iin) {
  return prisma.user.findUnique({
    where: { bin_iin },
  });
}

export async function findExistingUser({ email, bin_iin }) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email }, { bin_iin }],
    },
  });
}

export async function createUser(data, certificateFileUrl = null) {
  const password_hash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      bin_iin: data.bin_iin,
      user_type: data.user_type,
      org_form: data.org_form,
      organization_name: data.organization_name,
      registration_date: data.registration_date
        ? new Date(data.registration_date)
        : null,
      director: data.director,
      region: data.region,
      district: data.district || null,
      rural_district: data.rural_district || null,
      locality: data.locality || null,
      phone: data.phone || null,
      postal_address: data.postal_address || null,
      email: data.email,
      password_hash,
      certificate_file_url: certificateFileUrl,
    },
  });

  return user;
}

export async function loginUser(bin_iin, password) {
  const user = await findUserByBin(bin_iin);

  if (!user) {
    return { error: "Пользователь не найден", status: 401 };
  }

  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    return { error: "Неверный пароль", status: 401 };
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      bin_iin: user.bin_iin,
      email: user.email,
      organization_name: user.organization_name,
      user_type: user.user_type,
    },
  };
}