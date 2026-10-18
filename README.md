# Лабораторна робота 3 — варіант 5

CLI для замовлень інтернет-магазину. Це інструкція запуску, не звіт.
data.json містить нові демонстраційні дані, оскільки файл із ЛР1 відсутній.
Ціни та суми подано у гривнях. Обчислення виконуються у копійках.

У Git Bash, із теки проєкту:

```bash
npm install
npm start -- --help
npm start -- list --limit 2
npm start -- show ORD-001
npm start -- field ORD-001 delivery.address.city
npm start -- field ORD-001 items.0.name
npm start -- items ORD-001 --sort sum --desc
npm start -- total ORD-001
npm start -- summary ORD-001
npm start -- list --file data.json
npm test
```

Опція `--file` (`-f`) працює до або після будь-якої команди.
Типовий файл — `data.json` у поточній робочій теці.
`--sort` приймає name, quantity, price або sum; типово name за зростанням.
`--desc` змінює напрям сортування. `--limit 0` повертає порожній список.
Порожній масив товарів має суму 0.00. Поле зі значенням null виводиться як null;
відсутнє поле спричиняє помилку з кодом завершення 1.

Єдина стороння залежність — commander. Тести використовують вбудовані модулі Node.js.
Довідка commander: https://github.com/tj/commander.js

Публікацію на GitHub ще не виконано. JSON перевірено командою `jq empty data.json`: код 0.

