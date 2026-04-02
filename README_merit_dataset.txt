Синтетическое обогащение датасета субсидий

Файлы:
1) subsidies_merit_training_dataset.csv
   - 36 651 строка, 61 колонка
   - Основа: реальная выгрузка заявок
   - Добавлено: synthetic producer_id, профиль хозяйства, история, нарушения, пост-эффект и merit score

2) producer_profiles_synthetic.csv
   - 12 108 synthetic producer_id
   - Профиль хозяйства на уровне производителя

3) data_dictionary_merit_dataset.csv
   - Описание всех колонок и источник (real / derived / synthetic)

Важно:
- producer_id и все producer-level / outcome-поля являются синтетическими и придуманы для обучения/прототипирования.
- Реальными остаются поля по заявке, региону, району, программе, статусу, нормативу и сумме из исходной выгрузки.
- Датасет подходит для прототипа merit-based scoring, но не для регуляторного production без реальных producer-level данных.
