import {
  getApplicationAccess,
  saveCounterObligation,
  createSubsidyApplication,
} from "../services/subsidyService.js";

export async function getSubsidyAccess(req, res) {
  try {
    const result = await getApplicationAccess(req.user.userId);
    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("SUBSIDY ACCESS ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}

export async function createObligation(req, res) {
  try {
    const { subsidy_year, obligation_description } = req.body;

    if (!subsidy_year || !obligation_description) {
      return res.status(400).json({
        message: "Заполните хотя бы год субсидии и описание обязательства",
      });
    }

    const obligation = await saveCounterObligation(req.user.userId, req.body);

    return res.status(201).json({
      message: "Данные по встречным обязательствам сохранены",
      obligation,
    });
  } catch (error) {
    console.error("CREATE OBLIGATION ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}

export async function createApplication(req, res) {
  try {
    const { subsidy_type } = req.body;

    if (!subsidy_type) {
      return res.status(400).json({ message: "Укажите вид субсидии" });
    }

    const result = await createSubsidyApplication(req.user.userId, req.body);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    return res.status(201).json({
      message: "Заявка на субсидию успешно подана",
      application: result.application,
    });
  } catch (error) {
    console.error("CREATE APPLICATION ERROR:", error);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}