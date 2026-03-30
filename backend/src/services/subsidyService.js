import prisma from "../config/prisma.js";

export async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export function getRegistrationYear(date) {
  if (!date) return null;
  return new Date(date).getFullYear();
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

export async function getUserObligations(userId) {
  return prisma.counterObligation.findMany({
    where: { user_id: userId },
    orderBy: { subsidy_year: "desc" },
  });
}

export async function getApplicationAccess(userId) {
  const user = await getUserById(userId);

  if (!user) {
    return { statusCode: 404, data: { message: "Пользователь не найден" } };
  }

  if (!user.registration_date) {
    return {
      statusCode: 400,
      data: {
        status: "REGISTRATION_DATE_MISSING",
        allowApplication: false,
        needsObligationData: false,
        message: "У пользователя отсутствует дата регистрации",
      },
    };
  }

  const currentYear = getCurrentYear();
  const registrationYear = getRegistrationYear(user.registration_date);

  if (registrationYear === currentYear) {
    return {
      statusCode: 200,
      data: {
        status: "NEW_USER",
        allowApplication: true,
        needsObligationData: false,
        showMissingInfoBlock: false,
        registrationYear,
        currentYear,
        message: "Вы зарегистрированы в текущем году. Можно сразу подавать заявку.",
      },
    };
  }

  const obligations = await getUserObligations(user.id);

  if (!obligations.length) {
    return {
      statusCode: 200,
      data: {
        status: "OBLIGATION_DATA_MISSING",
        allowApplication: false,
        needsObligationData: true,
        showMissingInfoBlock: true,
        registrationYear,
        currentYear,
        message: "Отсутствуют данные по встречным обязательствам. Для продолжения заполните информацию.",
      },
    };
  }

  return {
    statusCode: 200,
    data: {
      status: "REQUIRES_OBLIGATION_CHECK",
      allowApplication: true,
      needsObligationData: true,
      showMissingInfoBlock: false,
      registrationYear,
      currentYear,
      message: "Найдены данные по встречным обязательствам. Вы можете продолжить подачу заявки.",
      obligations,
    },
  };
}

export async function saveCounterObligation(userId, payload) {
  return prisma.counterObligation.create({
    data: {
      user_id: userId,
      subsidy_year: Number(payload.subsidy_year),
      subsidy_amount: payload.subsidy_amount ? Number(payload.subsidy_amount) : null,
      obligation_description: payload.obligation_description,
      planned_value: payload.planned_value ? Number(payload.planned_value) : null,
      actual_value: payload.actual_value ? Number(payload.actual_value) : null,
      status: payload.status || "filled_manually",
      notes: payload.notes || null,
      source: "manual",
    },
  });
}

export async function createSubsidyApplication(userId, payload) {
  const access = await getApplicationAccess(userId);

  if (!access.data.allowApplication) {
    return {
      error: "Сначала заполните данные по встречным обязательствам",
      status: 400,
    };
  }

  const application = await prisma.subsidyApplication.create({
    data: {
      user_id: userId,
      subsidy_type: payload.subsidy_type,
      requested_amount: payload.requested_amount
        ? Number(payload.requested_amount)
        : null,
      description: payload.description || null,
      status: "submitted",
    },
  });

  return { application };
}