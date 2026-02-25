import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, ok } from '@/core/http/apiResponse';

type CashLogInput = {
  date: string;
  description: string;
  amount: number;
  walletName: string;
};

type CashLogRecord = CashLogInput & {
  id: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createSampleLogs(): CashLogRecord[] {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const samples: Array<Omit<CashLogRecord, 'id'>> = [];

  const currentMonthDescriptions = [
    'Lunch',
    'Coffee',
    'Transport',
    'Groceries',
    'Freelance',
    'Internet',
    'Dinner',
    'Fuel',
    'Snacks',
    'Salary',
  ];
  const currentMonthDays = [2, 2, 5, 5, 10, 10, 15, 15, 20, 20];

  for (let index = 0; index < 10; index++) {
    samples.push({
      date: formatDate(
        new Date(year, currentMonthIndex, currentMonthDays[index]),
      ),
      description: currentMonthDescriptions[index],
      amount: 25000 + index * 15000,
      walletName: index % 3 === 0 ? 'Cash' : index % 3 === 1 ? 'BCA' : 'OVO',
    });
  }

  const januaryDescriptions = [
    'January Salary',
    'January Rent',
    'January Utility',
    'January Transport',
    'January Grocery',
  ];
  const januaryDays = [5, 5, 12, 12, 20];

  for (let index = 0; index < 5; index++) {
    samples.push({
      date: formatDate(new Date(year, 0, januaryDays[index])),
      description: januaryDescriptions[index],
      amount: 50000 + index * 20000,
      walletName: index % 2 === 0 ? 'Cash' : 'BCA',
    });
  }

  const futureStart = new Date(year, Math.max(2, currentMonthIndex + 1), 1);
  const futureDescriptions = [
    'Future Saving Plan',
    'Future Subscription',
    'Future Transport',
    'Future Bonus',
    'Future Shopping',
  ];
  const futureDays = [8, 8, 14, 14, 21];

  for (let index = 0; index < 5; index++) {
    samples.push({
      date: formatDate(
        new Date(
          futureStart.getFullYear(),
          futureStart.getMonth() + index,
          futureDays[index],
        ),
      ),
      description: futureDescriptions[index],
      amount: 60000 + index * 25000,
      walletName: index % 2 === 0 ? 'OVO' : 'Cash',
    });
  }

  return samples.map((sample, index) => ({
    id: String(index + 1),
    ...sample,
  }));
}

let logs: CashLogRecord[] = createSampleLogs();
let nextId = logs.length + 1;

function validateCreatePayload(payload: Partial<CashLogInput>) {
  if (
    !payload.date ||
    !payload.description?.trim() ||
    payload.amount === undefined ||
    !payload.walletName?.trim()
  ) {
    return 'date, description, amount, and walletName are required';
  }

  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: Partial<CashLogInput> = await req.json();
    const validationError = validateCreatePayload(payload);

    if (validationError) {
      return badRequest(validationError);
    }

    const record: CashLogRecord = {
      id: String(nextId++),
      date: payload.date!,
      description: payload.description!.trim(),
      amount: payload.amount!,
      walletName: payload.walletName!.trim(),
    };

    logs.push(record);

    return ok(record, 201);
  } catch {
    return badRequest();
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const date = req.nextUrl.searchParams.get('date');
    const month = req.nextUrl.searchParams.get('month');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (date) {
      return ok(logs.filter((log) => log.date === date));
    }

    if (month === 'future') {
      return ok(logs.filter((log) => log.date.slice(0, 7) > currentMonth));
    }

    if (month && month > currentMonth) {
      return ok(logs);
    }

    if (month) {
      return ok(logs.filter((log) => log.date.startsWith(month)));
    }

    return ok(logs);
  } catch {
    return badRequest();
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: Partial<CashLogInput> & { id?: string } = await req.json();

    if (!payload.id) {
      return badRequest('ID is required');
    }

    if (payload.walletName !== undefined && !payload.walletName.trim()) {
      return badRequest('walletName is required');
    }

    const index = logs.findIndex((log) => log.id === payload.id);

    if (index === -1) {
      return notFound('Cash log not found');
    }

    const updated: CashLogRecord = {
      ...logs[index],
      ...payload,
      description: payload.description
        ? payload.description.trim()
        : logs[index].description,
      walletName: payload.walletName
        ? payload.walletName.trim()
        : logs[index].walletName,
    };

    logs[index] = updated;

    return ok(updated);
  } catch {
    return badRequest('Failed to update cash log');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { id }: { id?: string } = await req.json();

    if (!id) {
      return badRequest('ID is required');
    }

    const exists = logs.some((log) => log.id === id);

    if (!exists) {
      return notFound('Cash log not found');
    }

    logs = logs.filter((log) => log.id !== id);

    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete cash log');
  }
}
