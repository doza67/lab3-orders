import { readFileSync } from 'node:fs';
import { Command, Option, InvalidArgumentError } from 'commander';

const program = new Command();
program.name('orders').description('Робота із замовленнями інтернет-магазину. Варіант 5.')
  .version('1.0.0', '-V, --version', 'Показати версію програми')
  .option('-f, --file <path>', 'Шлях до JSON-файлу замовлень', 'data.json')
  .helpOption('-h, --help', 'Показати довідку')
  .helpCommand('help [command]', 'Показати довідку про команду')
  .showSuggestionAfterError(false)
  .exitOverride()
  .configureOutput({ writeErr: () => {} });

function loadOrders() {
  const path = program.opts().file;
  let text;
  try { text = readFileSync(path, 'utf8'); }
  catch { throw new Error(`Не вдалося прочитати файл «${path}». Перевірте шлях і права доступу.`); }
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Файл «${path}» містить некоректний JSON.`); }
  if (!data || !Array.isArray(data.orders)) throw new Error('JSON має містити масив orders.');
  const ids = new Set();
  for (const order of data.orders) {
    if (!order || typeof order.id !== 'string' || !order.id.trim() || ids.has(order.id))
      throw new Error('Кожне замовлення має містити унікальний непорожній рядок id.');
    ids.add(order.id);
    if (!Array.isArray(order.items) || typeof order.status !== 'string' ||
        !order.delivery?.address || typeof order.delivery.address !== 'object' ||
        Array.isArray(order.delivery.address) || typeof order.payment?.method !== 'string' ||
        typeof order.payment?.isPaid !== 'boolean')
      throw new Error(`Замовлення ${order.id}: потрібні items, status, delivery.address, payment.method та payment.isPaid.`);
    for (const item of order.items) {
      if (!item || typeof item.name !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
          typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 ||
          Math.abs(item.price * 100 - Math.round(item.price * 100)) > 0.000001 ||
          !Number.isSafeInteger(Math.round(item.price * 100) * item.quantity))
        throw new Error(`Замовлення ${order.id}: товар має містити name, додатну цілу quantity та невід’ємну price з точністю до копійок.`);
    }
  }
  return data.orders;
}

function findOrder(id) {
  const order = loadOrders().find(order => order.id === id);
  if (!order) throw new Error(`Замовлення «${id}» не знайдено.`);
  return order;
}
const print = value => console.log(JSON.stringify(value, null, 2));
function limitValue(value) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new InvalidArgumentError('Кількість має бути невід’ємним цілим числом.');
  return Number(value);
}

program.command('list').description('Показати стислий перелік замовлень')
  .option('-l, --limit <number>', 'Максимальна кількість замовлень, 0 — жодного', limitValue)
  .action(options => {
    const orders = loadOrders();
    print(orders.slice(0, options.limit ?? orders.length).map(order => ({
      id: order.id, status: order.status, isPaid: order.payment.isPaid, itemsCount: order.items.length
    })));
  });
program.command('show').description('Показати замовлення цілком')
  .argument('<id>', 'Ідентифікатор замовлення').action(id => print(findOrder(id)));
program.command('field').description('Показати поле; вкладені поля та індекси масивів задаються через крапку')
  .argument('<id>', 'Ідентифікатор замовлення')
  .argument('<path>', 'Шлях до поля, наприклад items.0.name або delivery.address.city')
  .action((id, path) => {
    let value = findOrder(id);
    for (const key of path.split('.')) {
      if (!key || value === null || typeof value !== 'object' || !Object.hasOwn(value, key))
        throw new Error(`Поле «${path}» відсутнє. Значення null виводиться як null.`);
      value = value[key];
    }
    print(value);
  });

try {
  if (process.argv.length === 2) program.outputHelp();
  else program.parse();
} catch (error) {
  if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version' || error.code === 'commander.help') {
    process.exitCode = 0;
  } else {
    const messages = {
      'commander.missingArgument': 'Пропущено обов’язковий аргумент. Перегляньте довідку команди з --help.',
      'commander.unknownOption': 'Невідома опція. Перегляньте довідку з --help.',
      'commander.unknownCommand': 'Невідома команда. Перегляньте довідку з --help.',
      'commander.optionMissingArgument': 'Після опції потрібно вказати значення.',
      'commander.invalidArgument': 'Некоректне значення аргументу або опції. Перевірте допустимі значення в --help.',
      'commander.excessArguments': 'Зайві аргументи. Перегляньте довідку команди з --help.'
    };
    console.error(`Помилка: ${messages[error.code] ?? error.message}`);
    process.exitCode = 1;
  }
}
