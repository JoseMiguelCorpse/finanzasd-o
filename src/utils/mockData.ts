import { Faker, es } from "@faker-js/faker";
import {
  User,
  Transaction,
  SavingGoal,
  RecurringTransaction,
  SmartAlert,
} from "../types";
import { subDays, subMonths, addDays, format } from "date-fns";

// Configurar faker en español
const faker = new Faker({ locale: es });

export const mockUsers: User[] = [
  {
    id: "demo-user-1",
    email: "maria@email.com",
    name: "María García",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b1d7?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "demo-user-2",
    email: "carlos@email.com",
    name: "Carlos López",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
];

const categories = {
  income: ["Salario", "Freelance", "Inversiones", "Otros ingresos"],
  expense: [
    "Alimentación",
    "Transporte",
    "Entretenimiento",
    "Servicios",
    "Compras",
    "Salud",
    "Vivienda",
  ],
  saving: ["Emergencias", "Vacaciones", "Inversión", "Educación"],
} as const;

export const mockTransactions: Transaction[] = Array.from({ length: 50 }, () => {
  const type: "income" | "expense" | "saving" = faker.helpers.arrayElement([
    "income",
    "expense",
    "saving",
  ] as const);

  const user = faker.helpers.arrayElement(mockUsers);
  const date = faker.date.between({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  return {
    id: faker.string.uuid(),
    user_id: user.id,
    amount:
      type === "income"
        ? faker.number.float({ min: 800, max: 3000, fractionDigits: 2 })
        : faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    description:
      type === "income"
        ? `Ingreso de ${faker.helpers.arrayElement(categories.income)}`
        : type === "expense"
        ? `Gasto en ${faker.helpers.arrayElement(categories.expense)}`
        : `Ahorro para ${faker.helpers.arrayElement(categories.saving)}`,
    category: faker.helpers.arrayElement(categories[type]),
    type,
    date: date.toISOString(),
    status: faker.helpers.arrayElement([
      "approved",
      "pending",
      "approved",
      "approved",
    ]),
  };
});

export const mockSavingGoals: SavingGoal[] = [
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    name: "Vacaciones de verano",
    target_amount: 2000,
    current_amount: 800,
    is_shared: faker.datatype.boolean(),
    deadline: addDays(new Date(), 120).toISOString(),
  },
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    name: "Fondo de emergencia",
    target_amount: 5000,
    current_amount: 2300,
    is_shared: faker.datatype.boolean(),
    deadline: addDays(new Date(), 365).toISOString(),
  },
  {
    id: faker.string.uuid(),
    user_id: mockUsers[1].id,
    name: "Nuevo ordenador",
    target_amount: 1200,
    current_amount: 400,
    is_shared: faker.datatype.boolean(),
    deadline: addDays(new Date(), 90).toISOString(),
  },
];

export const mockRecurringTransactions: RecurringTransaction[] = [
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    description: "Suscripción Netflix",
    amount: 12.99,
    category: "Entretenimiento",
    type: "expense",
    is_shared: faker.datatype.boolean(),
    frequency: "monthly",
    day_of_month: 15,
    start_date: subMonths(new Date(), 12).toISOString(),
    next_due_date: format(
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15),
      "yyyy-MM-dd"
    ),
  },
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    description: "Ahorro mensual",
    amount: 200,
    category: "Emergencias",
    type: "saving",
    is_shared: faker.datatype.boolean(),
    frequency: "monthly",
    day_of_month: 1,
    start_date: subMonths(new Date(), 6).toISOString(),
    next_due_date: format(
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      "yyyy-MM-dd"
    ),
  },
];

export const mockSmartAlerts: SmartAlert[] = [
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    type: "warning",
    title: "Gasto alto este mes",
    message: "Has gastado €450 más que el mes pasado en entretenimiento.",
    created_at: subDays(new Date(), 2).toISOString(),
    read: false,
  },
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    type: "success",
    title: "¡Meta de ahorro alcanzada!",
    message: "Has completado el 40% de tu meta de vacaciones de verano.",
    created_at: subDays(new Date(), 5).toISOString(),
    read: true,
  },
  {
    id: faker.string.uuid(),
    user_id: mockUsers[0].id,
    type: "info",
    title: "Recordatorio de transacción recurrente",
    message: "Tu ahorro mensual se procesará mañana.",
    created_at: subDays(new Date(), 1).toISOString(),
    read: false,
  },
];

export const demoCredentials = {
  email: "maria@email.com",
  password: "password123",
};
